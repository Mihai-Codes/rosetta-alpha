"""Cross-desk contagion monitoring for Rosetta Alpha.

The monitor is intentionally event-driven and storage-backed:
- producers emit ``DeskAnalysisComplete`` after a regional desk finishes analysis;
- the monitor detects origin signals on that event;
- correlated desks/assets are resolved from an explicit historical-prior map;
- emitted alerts are persisted in SQLite for polling by the frontend.

This keeps the demo deterministic while leaving a clean seam for replacing the
static correlation priors with rolling return correlations once a price-history
store is available.
"""

from __future__ import annotations

import hashlib
import json
import sqlite3
from collections.abc import Generator as PyGenerator
from collections.abc import Iterable
from contextlib import contextmanager
from datetime import UTC, datetime, timedelta
from enum import StrEnum
from pathlib import Path
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from reasoning.mob_meter import normalize_thesis_record

_DEFAULT_DB_PATH = Path(__file__).parent.parent / "data" / "contagion_alerts.db"
_CORRELATION_THRESHOLD = 0.70


class SignalType(StrEnum):
    """Origin signals that can spread from one regional desk to another."""

    REGIME_CHANGE = "REGIME_CHANGE"
    EXTREME_CONSENSUS = "EXTREME_CONSENSUS"
    NARRATIVE_SHIFT = "NARRATIVE_SHIFT"


class DeskAnalysisComplete(BaseModel):
    """Event emitted after one desk completes ``analyze()``."""

    model_config = ConfigDict(extra="forbid")

    desk: str
    ticker: str
    thesis: dict[str, Any] = Field(default_factory=dict)
    timestamp: datetime = Field(default_factory=lambda: datetime.now(UTC))


class CorrelationLink(BaseModel):
    """Historical-prior cross-market linkage used for contagion routing."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    origin_ticker: str
    affected_ticker: str
    affected_desk: str
    correlation_score: float = Field(ge=0.0, le=1.0)
    rationale: str


class CorrelationCell(BaseModel):
    """Frontend heatmap cell for an alert's correlation matrix."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    origin_ticker: str
    affected_ticker: str
    affected_desk: str
    correlation_score: float = Field(ge=0.0, le=1.0)


class CrossDeskContagionAlert(BaseModel):
    """Contagion alert output consumed by API and frontend."""

    model_config = ConfigDict(extra="forbid")

    alert_id: str
    origin_desk: str
    origin_ticker: str
    signal_type: SignalType
    affected_desks: list[str]
    affected_tickers: list[str]
    correlation_score: float = Field(ge=0.0, le=1.0)
    recommended_action: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    message: str
    correlation_matrix: list[CorrelationCell] = Field(default_factory=list)


class _DeskState(BaseModel):
    """Last-seen state for detecting changes instead of repeated static alerts."""

    model_config = ConfigDict(extra="forbid")

    regime: str | None = None
    narrative_type: str | None = None


def _normalize_desk(desk: str) -> str:
    text = str(desk or "").strip().lower()
    aliases = {
        "china": "cn",
        "japan": "jp",
        "usa": "us",
        "united_states": "us",
        "united-states": "us",
    }
    return aliases.get(text, text)


def _display_desk(desk: str) -> str:
    return _normalize_desk(desk).upper()


def _normalize_ticker(ticker: str) -> str:
    return str(ticker or "").upper().strip()


def _extract_regime(thesis: dict[str, Any]) -> str | None:
    regime_context = thesis.get("regime_context")
    if not isinstance(regime_context, dict):
        return None
    value = (
        regime_context.get("current_regime")
        or regime_context.get("regime")
        or regime_context.get("label")
    )
    return str(value).upper().strip() if value else None


def _extract_narrative_type(thesis: dict[str, Any]) -> str | None:
    narrative = thesis.get("narrative_velocity") or thesis.get("narrative_context")
    if not isinstance(narrative, dict):
        return None
    value = (
        narrative.get("narrative_type")
        or narrative.get("type")
        or narrative.get("new_type")
    )
    return str(value).upper().strip() if value else None


def _extract_mob_index(thesis: dict[str, Any]) -> float | None:
    value = thesis.get("mob_extremity", thesis.get("mob_index"))
    if value is None and isinstance(thesis.get("mob_meter"), dict):
        value = thesis["mob_meter"].get("mob_index")
    if value is None:
        return None
    try:
        return max(0.0, min(100.0, float(value)))
    except (TypeError, ValueError):
        return None


def _is_regime_break(current: str | None, previous: str | None) -> bool:
    if current is None:
        return False
    crisis_like = {"CRISIS", "STRESS", "RISK_OFF", "RISK-OFF", "SHOCK"}
    if current in crisis_like and previous != current:
        return True
    return previous is not None and previous != current


def _dedupe_preserve_order(values: Iterable[str]) -> list[str]:
    seen: set[str] = set()
    deduped: list[str] = []
    for value in values:
        if value in seen:
            continue
        seen.add(value)
        deduped.append(value)
    return deduped


class ContagionAlertStore:
    """SQLite persistence for historical contagion alerts and desk state."""

    def __init__(self, db_path: Path | str = _DEFAULT_DB_PATH) -> None:
        self._db_path = Path(db_path)
        self._db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_schema()

    @contextmanager
    def _conn(self) -> PyGenerator[sqlite3.Connection, None, None]:
        conn = sqlite3.connect(str(self._db_path), timeout=10.0)
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA busy_timeout=5000")
        conn.row_factory = sqlite3.Row
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    def _init_schema(self) -> None:
        with self._conn() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS contagion_alerts (
                    alert_id TEXT PRIMARY KEY,
                    origin_desk TEXT NOT NULL,
                    origin_ticker TEXT NOT NULL,
                    signal_type TEXT NOT NULL,
                    affected_desks_json TEXT NOT NULL,
                    affected_tickers_json TEXT NOT NULL,
                    correlation_score REAL NOT NULL,
                    recommended_action TEXT NOT NULL,
                    message TEXT NOT NULL,
                    correlation_matrix_json TEXT NOT NULL,
                    created_at TEXT NOT NULL
                )
            """)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS desk_contagion_state (
                    desk TEXT NOT NULL,
                    ticker TEXT NOT NULL,
                    regime TEXT,
                    narrative_type TEXT,
                    updated_at TEXT NOT NULL,
                    PRIMARY KEY (desk, ticker)
                )
            """)
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_contagion_created_at
                ON contagion_alerts(created_at DESC)
            """)

    def get_state(self, desk: str, ticker: str) -> _DeskState:
        with self._conn() as conn:
            row = conn.execute(
                """
                SELECT regime, narrative_type
                FROM desk_contagion_state
                WHERE desk = ? AND ticker = ?
                """,
                (_normalize_desk(desk), _normalize_ticker(ticker)),
            ).fetchone()
        if row is None:
            return _DeskState()
        return _DeskState(regime=row["regime"], narrative_type=row["narrative_type"])

    def update_state(self, desk: str, ticker: str, *, regime: str | None, narrative_type: str | None) -> None:
        with self._conn() as conn:
            conn.execute(
                """
                INSERT INTO desk_contagion_state (desk, ticker, regime, narrative_type, updated_at)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(desk, ticker) DO UPDATE SET
                    regime = excluded.regime,
                    narrative_type = excluded.narrative_type,
                    updated_at = excluded.updated_at
                """,
                (
                    _normalize_desk(desk),
                    _normalize_ticker(ticker),
                    regime,
                    narrative_type,
                    datetime.now(UTC).isoformat(),
                ),
            )

    def save_alert(self, alert: CrossDeskContagionAlert) -> bool:
        """Persist alert. Returns ``True`` only for newly inserted alerts."""

        payload = alert.model_dump(mode="json")
        with self._conn() as conn:
            cursor = conn.execute(
                """
                INSERT OR IGNORE INTO contagion_alerts (
                    alert_id,
                    origin_desk,
                    origin_ticker,
                    signal_type,
                    affected_desks_json,
                    affected_tickers_json,
                    correlation_score,
                    recommended_action,
                    message,
                    correlation_matrix_json,
                    created_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    alert.alert_id,
                    alert.origin_desk,
                    alert.origin_ticker,
                    alert.signal_type.value,
                    json.dumps(payload["affected_desks"]),
                    json.dumps(payload["affected_tickers"]),
                    alert.correlation_score,
                    alert.recommended_action,
                    alert.message,
                    json.dumps(payload["correlation_matrix"]),
                    alert.created_at.isoformat(),
                ),
            )
            return cursor.rowcount > 0

    def recent_alerts(self, *, limit: int = 10, hours: int = 72) -> list[CrossDeskContagionAlert]:
        since = datetime.now(UTC) - timedelta(hours=hours)
        with self._conn() as conn:
            rows = conn.execute(
                """
                SELECT *
                FROM contagion_alerts
                WHERE created_at >= ?
                ORDER BY created_at DESC
                LIMIT ?
                """,
                (since.isoformat(), limit),
            ).fetchall()

        alerts: list[CrossDeskContagionAlert] = []
        for row in rows:
            matrix = json.loads(row["correlation_matrix_json"])
            alerts.append(
                CrossDeskContagionAlert(
                    alert_id=row["alert_id"],
                    origin_desk=row["origin_desk"],
                    origin_ticker=row["origin_ticker"],
                    signal_type=SignalType(row["signal_type"]),
                    affected_desks=json.loads(row["affected_desks_json"]),
                    affected_tickers=json.loads(row["affected_tickers_json"]),
                    correlation_score=float(row["correlation_score"]),
                    recommended_action=row["recommended_action"],
                    message=row["message"],
                    correlation_matrix=[CorrelationCell(**cell) for cell in matrix],
                    created_at=datetime.fromisoformat(row["created_at"]),
                )
            )
        return alerts


class ContagionMonitor:
    """Event listener that promotes desk-level signals into cross-desk alerts."""

    def __init__(
        self,
        *,
        db_path: Path | str = _DEFAULT_DB_PATH,
        correlation_threshold: float = _CORRELATION_THRESHOLD,
        correlation_map: dict[str, list[CorrelationLink]] | None = None,
    ) -> None:
        self._store = ContagionAlertStore(db_path=db_path)
        self._correlation_threshold = max(0.0, min(1.0, correlation_threshold))
        self._correlation_map = correlation_map or self._default_correlation_map()

    @property
    def store(self) -> ContagionAlertStore:
        return self._store

    @staticmethod
    def _default_correlation_map() -> dict[str, list[CorrelationLink]]:
        links = [
            # US mega-cap technology → Japan technology/export complex
            CorrelationLink(
                origin_ticker="AAPL",
                affected_ticker="6758.T",
                affected_desk="jp",
                correlation_score=0.82,
                rationale="US hardware demand and Japan electronics supply-chain beta.",
            ),
            CorrelationLink(
                origin_ticker="NVDA",
                affected_ticker="6758.T",
                affected_desk="jp",
                correlation_score=0.84,
                rationale="AI semiconductor cycle transmits into Japanese tech suppliers.",
            ),
            CorrelationLink(
                origin_ticker="MSFT",
                affected_ticker="9984.T",
                affected_desk="jp",
                correlation_score=0.76,
                rationale="Global software/cloud risk appetite leaks into SoftBank/tech beta.",
            ),
            # EU luxury → China premium consumption
            CorrelationLink(
                origin_ticker="MC.PA",
                affected_ticker="600519.SH",
                affected_desk="cn",
                correlation_score=0.81,
                rationale="Luxury demand and China premium consumer sentiment share macro drivers.",
            ),
            CorrelationLink(
                origin_ticker="RMS.PA",
                affected_ticker="600519.SH",
                affected_desk="cn",
                correlation_score=0.74,
                rationale="High-end consumption proxy linkage across EU luxury and China spirits.",
            ),
            # China consumer/credit stress → EU luxury
            CorrelationLink(
                origin_ticker="600519.SH",
                affected_ticker="MC.PA",
                affected_desk="eu",
                correlation_score=0.81,
                rationale="China consumer weakness often reprices EU luxury earnings expectations.",
            ),
            # Japan autos/exporters → EU/US cyclicals
            CorrelationLink(
                origin_ticker="7203.T",
                affected_ticker="BMW.DE",
                affected_desk="eu",
                correlation_score=0.72,
                rationale="Global auto cycle and FX-sensitive exporter beta.",
            ),
            # Crypto risk appetite → US risk proxies
            CorrelationLink(
                origin_ticker="BTC",
                affected_ticker="COIN",
                affected_desk="us",
                correlation_score=0.86,
                rationale="Crypto spot/liquidity shocks transmit directly into listed crypto beta.",
            ),
            CorrelationLink(
                origin_ticker="BTC",
                affected_ticker="MSTR",
                affected_desk="us",
                correlation_score=0.88,
                rationale="Treasury BTC exposure creates high beta to crypto selloffs.",
            ),
            CorrelationLink(
                origin_ticker="ETH",
                affected_ticker="BTC",
                affected_desk="crypto",
                correlation_score=0.83,
                rationale="Major crypto assets share liquidity and leverage cycles.",
            ),
        ]

        by_origin: dict[str, list[CorrelationLink]] = {}
        for link in links:
            by_origin.setdefault(link.origin_ticker, []).append(link)
        return by_origin

    def handle_desk_analysis_complete(self, event: DeskAnalysisComplete) -> list[CrossDeskContagionAlert]:
        """Process one event and return newly inserted alerts."""

        origin_desk = _normalize_desk(event.desk)
        origin_ticker = _normalize_ticker(event.ticker)
        thesis = normalize_thesis_record({**event.thesis, "desk": origin_desk, "ticker": origin_ticker})
        state = self._store.get_state(origin_desk, origin_ticker)

        current_regime = _extract_regime(thesis)
        current_narrative_type = _extract_narrative_type(thesis)
        signal_types = self._detect_signal_types(thesis, state)

        self._store.update_state(
            origin_desk,
            origin_ticker,
            regime=current_regime or state.regime,
            narrative_type=current_narrative_type or state.narrative_type,
        )

        if not signal_types:
            return []

        links = [
            link for link in self._correlation_map.get(origin_ticker, [])
            if link.correlation_score >= self._correlation_threshold
        ]
        if not links:
            return []

        alerts: list[CrossDeskContagionAlert] = []
        for signal_type in signal_types:
            alert = self._build_alert(origin_desk, origin_ticker, signal_type, links, event.timestamp)
            if self._store.save_alert(alert):
                alerts.append(alert)

        return alerts

    def recent_alerts(self, *, limit: int = 10, hours: int = 72) -> list[CrossDeskContagionAlert]:
        return self._store.recent_alerts(limit=limit, hours=hours)

    def _detect_signal_types(self, thesis: dict[str, Any], state: _DeskState) -> list[SignalType]:
        signals: list[SignalType] = []

        current_regime = _extract_regime(thesis)
        if _is_regime_break(current_regime, state.regime):
            signals.append(SignalType.REGIME_CHANGE)

        mob_index = _extract_mob_index(thesis)
        if mob_index is not None and mob_index >= 80.0:
            signals.append(SignalType.EXTREME_CONSENSUS)

        current_narrative_type = _extract_narrative_type(thesis)
        if current_narrative_type is not None and current_narrative_type != state.narrative_type:
            signals.append(SignalType.NARRATIVE_SHIFT)

        return signals

    def _build_alert(
        self,
        origin_desk: str,
        origin_ticker: str,
        signal_type: SignalType,
        links: list[CorrelationLink],
        timestamp: datetime,
    ) -> CrossDeskContagionAlert:
        affected_desks = _dedupe_preserve_order(_display_desk(link.affected_desk) for link in links)
        affected_tickers = _dedupe_preserve_order(link.affected_ticker for link in links)
        max_corr = max(link.correlation_score for link in links)
        matrix = [
            CorrelationCell(
                origin_ticker=origin_ticker,
                affected_ticker=link.affected_ticker,
                affected_desk=_display_desk(link.affected_desk),
                correlation_score=link.correlation_score,
            )
            for link in links
        ]

        primary = matrix[0]
        action = _recommended_action(signal_type, origin_ticker, affected_tickers)
        message = (
            f"Contagion detected: {_display_desk(origin_desk)} {origin_ticker} "
            f"{_signal_label(signal_type)} → watch {primary.affected_desk} "
            f"{primary.affected_ticker} (correlation {max_corr:.2f})"
        )
        alert_id = _alert_id(origin_desk, origin_ticker, signal_type, affected_tickers, timestamp)

        return CrossDeskContagionAlert(
            alert_id=alert_id,
            origin_desk=_display_desk(origin_desk),
            origin_ticker=origin_ticker,
            signal_type=signal_type,
            affected_desks=affected_desks,
            affected_tickers=affected_tickers,
            correlation_score=max_corr,
            recommended_action=action,
            created_at=timestamp,
            message=message,
            correlation_matrix=matrix,
        )


def _signal_label(signal_type: SignalType) -> str:
    if signal_type is SignalType.REGIME_CHANGE:
        return "regime break"
    if signal_type is SignalType.EXTREME_CONSENSUS:
        return "crowding shock"
    return "narrative shift"


def _recommended_action(signal_type: SignalType, origin_ticker: str, affected_tickers: list[str]) -> str:
    watched = ", ".join(affected_tickers[:3])
    if signal_type is SignalType.REGIME_CHANGE:
        return f"Stress-test exposure to {watched}; reduce correlated beta until the new regime stabilizes."
    if signal_type is SignalType.EXTREME_CONSENSUS:
        return f"Treat consensus in {origin_ticker} as crowded; watch {watched} for second-order reversal risk."
    return f"Monitor narrative migration into {watched}; require independent confirmation before adding exposure."


def _alert_id(
    origin_desk: str,
    origin_ticker: str,
    signal_type: SignalType,
    affected_tickers: list[str],
    timestamp: datetime,
) -> str:
    hour_bucket = timestamp.astimezone(UTC).strftime("%Y%m%dT%H")
    canonical = "::".join(
        [
            _normalize_desk(origin_desk),
            _normalize_ticker(origin_ticker),
            signal_type.value,
            ",".join(sorted(affected_tickers)),
            hour_bucket,
        ]
    )
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()[:16]


__all__ = [
    "ContagionMonitor",
    "DeskAnalysisComplete",
    "CrossDeskContagionAlert",
    "SignalType",
    "CorrelationLink",
]
