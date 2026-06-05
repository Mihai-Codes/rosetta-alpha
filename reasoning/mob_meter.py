"""Crowd extremity detection for Rosetta Alpha.

Theory:
    Consensus is useful until it becomes reflexive. When regional desks and
    sub-agents converge too tightly, the signal can become a crowding warning
    rather than confirmation.

Design notes:
- Pure-Python scoring keeps this deterministic and testable.
- SQLite calibration follows the same embedded pattern as narrative/divergence
  stores: local, zero-dependency, and safe for hackathon-scale writes.
- Thresholds are intentionally simple: research on forecast calibration and
  wisdom-of-crowds emphasizes that diversity/independence matter; this module
  treats loss of diversity as the risk signal.
"""

from __future__ import annotations

import json
import math
import sqlite3
from collections import Counter
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path
from typing import Any, Generator as PyGenerator, Iterable

from pydantic import BaseModel, ConfigDict, Field

from reasoning.trace_schema import Direction, InvestmentThesis

_DEFAULT_PERFORMANCE_DB = Path(__file__).parent.parent / "data" / "performance.db"


class MobFlag(str, Enum):
    """Human-readable risk flags surfaced by the mob meter."""

    EXTREME_CONSENSUS = "EXTREME_CONSENSUS"
    HIGH_UNCERTAINTY = "HIGH_UNCERTAINTY"
    OVERCONFIDENCE = "OVERCONFIDENCE"


class ConsensusSnapshot(BaseModel):
    """Agreement snapshot for a ticker/cycle."""

    model_config = ConfigDict(extra="forbid")

    agreement: float = Field(ge=0.0, le=1.0)
    dominant_direction: Direction | None = None
    participant_count: int = Field(ge=0)
    flags: list[MobFlag] = Field(default_factory=list)


class MobMetrics(BaseModel):
    """Composite mob-extremity score for a ticker."""

    model_config = ConfigDict(extra="forbid")

    ticker: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    mob_index: float = Field(ge=0.0, le=100.0)
    consensus_level: float = Field(ge=0.0, le=1.0)
    confidence_extremity: float = Field(ge=0.0, le=1.0)
    narrative_intensity: float = Field(ge=0.0, le=1.0)
    dominant_direction: Direction | None = None
    cross_desk_consensus: ConsensusSnapshot
    within_desk_consensus: dict[str, ConsensusSnapshot] = Field(default_factory=dict)
    flags: list[MobFlag] = Field(default_factory=list)
    label: str


@dataclass(frozen=True)
class CalibrationRecord:
    """Historical calibration row for one agent/confidence bucket."""

    agent_id: str
    confidence_bucket: str
    actual_accuracy: float
    sample_count: int
    correct_count: int


def _clamp(value: float, low: float = 0.0, high: float = 1.0) -> float:
    return max(low, min(high, value))


def _bucket_confidence(confidence: float, *, width: float = 0.1) -> str:
    """Map confidence to a stable bucket label such as ``0.8-0.9``."""

    c = _clamp(float(confidence))
    lower = math.floor(c / width) * width
    if math.isclose(c, 1.0):
        lower = 1.0 - width
    upper = min(1.0, lower + width)
    return f"{lower:.1f}-{upper:.1f}"


def _coerce_direction(value: Any) -> Direction | None:
    """Normalize Direction enum/string/dict values to Direction."""

    if value is None:
        return None
    if isinstance(value, Direction):
        return value
    if isinstance(value, dict) and "value" in value:
        value = value["value"]
    text = str(value).upper().strip()
    try:
        return Direction(text)
    except ValueError:
        return None


_BULLISH_TERMS = {
    "bullish", "long", "buy", "upside", "rally", "outperform", "accumulate",
    "breakout", "positive", "strengthen", "higher",
}
_BEARISH_TERMS = {
    "bearish", "short", "sell", "downside", "decline", "underperform", "drop",
    "negative", "weaken", "lower", "risk-off",
}
_NEUTRAL_TERMS = {"neutral", "range-bound", "sideways", "hold", "flat"}


def _infer_direction_from_text(text: str) -> Direction | None:
    lowered = text.lower()
    bull = sum(1 for term in _BULLISH_TERMS if term in lowered)
    bear = sum(1 for term in _BEARISH_TERMS if term in lowered)
    neutral = sum(1 for term in _NEUTRAL_TERMS if term in lowered)
    scores = {
        Direction.LONG: bull,
        Direction.SHORT: bear,
        Direction.NEUTRAL: neutral,
    }
    direction, score = max(scores.items(), key=lambda item: item[1])
    return direction if score > 0 else None


def _as_dict(thesis: InvestmentThesis | dict[str, Any]) -> dict[str, Any]:
    if isinstance(thesis, InvestmentThesis):
        return thesis.model_dump()
    if hasattr(thesis, "model_dump"):
        return thesis.model_dump()
    return thesis if isinstance(thesis, dict) else {}


def normalize_thesis_record(thesis: InvestmentThesis | dict[str, Any]) -> dict[str, Any]:
    """Flatten common thesis/result shapes into one canonical dict.

    Live payloads can arrive as flat E2E rows, nested Pydantic thesis objects,
    or run wrappers. This keeps scoring code stable as producers evolve.
    """

    raw = _as_dict(thesis)
    data = dict(raw)

    for key in ("thesis", "investment_thesis", "source_thesis", "data"):
        nested = raw.get(key)
        if hasattr(nested, "model_dump"):
            nested = nested.model_dump()
        if isinstance(nested, dict):
            for nested_key, nested_value in nested.items():
                data.setdefault(nested_key, nested_value)

    ticker = data.get("ticker") or data.get("ticker_or_asset") or data.get("asset")
    if ticker is not None:
        data["ticker"] = str(ticker).upper().strip()
        data.setdefault("ticker_or_asset", data["ticker"])

    confidence = data.get("confidence_score", data.get("confidence"))
    if confidence is not None:
        data["confidence"] = confidence
        data.setdefault("confidence_score", confidence)

    summary = data.get("thesis_summary_en") or data.get("summary") or data.get("thesis_summary_native")
    if summary is not None:
        data["summary"] = summary
        data.setdefault("thesis_summary_en", summary)

    return data


def iter_thesis_records(payload: Any) -> PyGenerator[dict[str, Any], None, None]:
    """Yield normalized thesis-like records from nested API/result payloads."""

    if isinstance(payload, list):
        for item in payload:
            yield from iter_thesis_records(item)
        return

    if not isinstance(payload, dict):
        return

    for key in ("results", "desks"):
        nested = payload.get(key)
        if isinstance(nested, dict):
            for item in nested.values():
                yield from iter_thesis_records(item)
        elif isinstance(nested, list):
            for item in nested:
                yield from iter_thesis_records(item)

    normalized = normalize_thesis_record(payload)
    if any(normalized.get(key) is not None for key in ("ticker", "ticker_or_asset", "direction", "confidence", "confidence_score")):
        yield normalized


def _ticker(thesis: dict[str, Any]) -> str:
    normalized = normalize_thesis_record(thesis)
    return str(normalized.get("ticker_or_asset") or normalized.get("ticker") or "").upper().strip()


def _desk_id(thesis: dict[str, Any], index: int) -> str:
    return str(
        thesis.get("desk")
        or thesis.get("region")
        or thesis.get("agent_id")
        or thesis.get("thesis_id")
        or f"desk_{index}"
    ).upper()


def _agent_id(thesis: dict[str, Any], index: int) -> str:
    return str(thesis.get("agent_id") or thesis.get("desk") or thesis.get("region") or f"agent_{index}")


def _confidence(thesis: dict[str, Any]) -> float | None:
    value = thesis.get("confidence_score", thesis.get("confidence"))
    if value is None:
        return None
    try:
        return _clamp(float(value))
    except (TypeError, ValueError):
        return None


def _summary_text(thesis: dict[str, Any]) -> str:
    return str(
        thesis.get("thesis_summary_en")
        or thesis.get("summary")
        or thesis.get("thesis_summary_native")
        or ""
    )


def _reasoning_blocks(thesis: dict[str, Any]) -> list[dict[str, Any]]:
    blocks = thesis.get("reasoning_blocks") or []
    normalized: list[dict[str, Any]] = []
    for block in blocks:
        if hasattr(block, "model_dump"):
            normalized.append(block.model_dump())
        elif isinstance(block, dict):
            normalized.append(block)
    return normalized


def _consensus_from_directions(directions: Iterable[Direction]) -> ConsensusSnapshot:
    usable = list(directions)
    if not usable:
        return ConsensusSnapshot(
            agreement=0.0,
            dominant_direction=None,
            participant_count=0,
            flags=[MobFlag.HIGH_UNCERTAINTY],
        )

    counts = Counter(usable)
    dominant, count = counts.most_common(1)[0]
    agreement = count / len(usable)
    flags: list[MobFlag] = []
    if agreement > 0.8:
        flags.append(MobFlag.EXTREME_CONSENSUS)
    if agreement < 0.3:
        flags.append(MobFlag.HIGH_UNCERTAINTY)

    return ConsensusSnapshot(
        agreement=round(agreement, 4),
        dominant_direction=dominant,
        participant_count=len(usable),
        flags=flags,
    )


def consensus_score(
    theses: list[InvestmentThesis] | list[dict[str, Any]],
    *,
    ticker: str | None = None,
) -> tuple[ConsensusSnapshot, dict[str, ConsensusSnapshot]]:
    """Compute cross-desk and within-desk agreement.

    Cross-desk consensus uses each thesis' top-level direction. Within-desk
    consensus uses explicit sub-agent directions when present; otherwise it
    infers direction from each reasoning block's conclusion/analysis text.
    """

    normalized = [normalize_thesis_record(t) for t in theses]
    if ticker:
        ticker_key = ticker.upper().strip()
        normalized = [t for t in normalized if not _ticker(t) or _ticker(t) == ticker_key]

    top_level_directions: list[Direction] = []
    within: dict[str, ConsensusSnapshot] = {}

    for index, thesis in enumerate(normalized):
        direction = _coerce_direction(thesis.get("direction"))
        if direction:
            top_level_directions.append(direction)

        block_directions: list[Direction] = []
        for block in _reasoning_blocks(thesis):
            block_direction = _coerce_direction(block.get("direction"))
            if block_direction is None:
                text = " ".join(
                    str(block.get(key) or "")
                    for key in ("conclusion", "analysis_en", "analysis")
                )
                block_direction = _infer_direction_from_text(text)
            if block_direction:
                block_directions.append(block_direction)

        if not block_directions and direction:
            block_directions.append(direction)

        within[_desk_id(thesis, index)] = _consensus_from_directions(block_directions)

    return _consensus_from_directions(top_level_directions), within


def _confidence_extremity(theses: list[dict[str, Any]]) -> float:
    confidences = [c for c in (_confidence(t) for t in theses) if c is not None]
    if not confidences:
        return 0.0
    # Mob risk comes from high conviction, not low-confidence uncertainty.
    extremities = [max(0.0, (c - 0.5) * 2.0) for c in confidences]
    return round(sum(extremities) / len(extremities), 4)


_INTENSITY_TERMS = {
    "crash", "panic", "euphoria", "bubble", "mania", "capitulation", "squeeze",
    "collapse", "unstoppable", "disaster", "surge", "meltdown", "parabolic",
}


def _narrative_intensity(theses: list[dict[str, Any]]) -> float:
    values: list[float] = []
    for thesis in theses:
        narrative = thesis.get("narrative_velocity")
        if isinstance(narrative, dict):
            for key in ("peak_intensity", "sentiment_intensity", "intensity"):
                if key in narrative:
                    try:
                        values.append(_clamp(float(narrative[key])))
                        break
                    except (TypeError, ValueError):
                        pass

        text = _summary_text(thesis).lower()
        if text:
            hits = sum(1 for term in _INTENSITY_TERMS if term in text)
            values.append(_clamp(hits / 3.0))

    if not values:
        return 0.0
    return round(sum(values) / len(values), 4)


def mob_label(score: float) -> str:
    """Map a 0-100 mob index to the product language."""

    if score < 30:
        return "Normal disagreement"
    if score < 60:
        return "Growing consensus"
    if score < 80:
        return "High consensus"
    return "Mob territory"


class ConfidenceCalibrationStore:
    """SQLite-backed confidence-vs-accuracy tracker."""

    def __init__(self, db_path: Path | str = _DEFAULT_PERFORMANCE_DB) -> None:
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
                CREATE TABLE IF NOT EXISTS confidence_calibration (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    agent_id TEXT NOT NULL,
                    confidence_bucket TEXT NOT NULL,
                    actual_accuracy REAL NOT NULL,
                    sample_count INTEGER NOT NULL DEFAULT 0,
                    correct_count INTEGER NOT NULL DEFAULT 0,
                    updated_at TEXT NOT NULL,
                    UNIQUE(agent_id, confidence_bucket)
                )
            """)
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_confidence_calibration_agent
                ON confidence_calibration(agent_id, confidence_bucket)
            """)

    @staticmethod
    def _sqlite_now() -> str:
        return datetime.now(timezone.utc).isoformat(timespec="seconds")

    def record_outcome(self, agent_id: str, confidence: float, was_correct: bool) -> CalibrationRecord:
        """Update historical accuracy for one confidence bucket."""

        clean_agent = agent_id.strip() or "unknown"
        bucket = _bucket_confidence(confidence)
        now = self._sqlite_now()

        with self._conn() as conn:
            row = conn.execute(
                """
                SELECT sample_count, correct_count
                FROM confidence_calibration
                WHERE agent_id = ? AND confidence_bucket = ?
                """,
                (clean_agent, bucket),
            ).fetchone()

            sample_count = int(row["sample_count"]) if row else 0
            correct_count = int(row["correct_count"]) if row else 0
            sample_count += 1
            correct_count += 1 if was_correct else 0
            accuracy = correct_count / sample_count if sample_count else 0.0

            conn.execute(
                """
                INSERT INTO confidence_calibration
                    (agent_id, confidence_bucket, actual_accuracy, sample_count, correct_count, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(agent_id, confidence_bucket) DO UPDATE SET
                    actual_accuracy = excluded.actual_accuracy,
                    sample_count = excluded.sample_count,
                    correct_count = excluded.correct_count,
                    updated_at = excluded.updated_at
                """,
                (clean_agent, bucket, accuracy, sample_count, correct_count, now),
            )

        return CalibrationRecord(clean_agent, bucket, round(accuracy, 4), sample_count, correct_count)

    def get_record(self, agent_id: str, confidence: float) -> CalibrationRecord | None:
        bucket = _bucket_confidence(confidence)
        with self._conn() as conn:
            row = conn.execute(
                """
                SELECT agent_id, confidence_bucket, actual_accuracy, sample_count, correct_count
                FROM confidence_calibration
                WHERE agent_id = ? AND confidence_bucket = ?
                """,
                (agent_id.strip() or "unknown", bucket),
            ).fetchone()

        if not row:
            return None
        return CalibrationRecord(
            agent_id=row["agent_id"],
            confidence_bucket=row["confidence_bucket"],
            actual_accuracy=round(float(row["actual_accuracy"]), 4),
            sample_count=int(row["sample_count"]),
            correct_count=int(row["correct_count"]),
        )

    def is_overconfident(
        self,
        agent_id: str,
        confidence: float,
        *,
        confidence_threshold: float = 0.8,
        accuracy_threshold: float = 0.55,
        min_samples: int = 1,
    ) -> bool:
        """Flag high confidence when historical accuracy is weak."""

        if confidence <= confidence_threshold:
            return False
        record = self.get_record(agent_id, confidence)
        if not record or record.sample_count < min_samples:
            return False
        return record.actual_accuracy < accuracy_threshold


def calculate_mob_extremity(
    theses: list[InvestmentThesis] | list[dict[str, Any]],
    ticker: str,
    *,
    calibration_store: ConfidenceCalibrationStore | None = None,
) -> MobMetrics | None:
    """Calculate the composite 0-100 mob index for a ticker."""

    normalized = [normalize_thesis_record(t) for t in theses]
    ticker_key = ticker.upper().strip()
    matching = [t for t in normalized if not _ticker(t) or _ticker(t) == ticker_key]
    if not matching:
        return None

    cross, within = consensus_score(matching, ticker=ticker_key)
    consensus_level = cross.agreement
    confidence_extremity = _confidence_extremity(matching)
    narrative_intensity = _narrative_intensity(matching)
    mob_index = (
        0.4 * consensus_level
        + 0.3 * confidence_extremity
        + 0.3 * narrative_intensity
    ) * 100.0

    flags = {flag for flag in cross.flags}
    for snapshot in within.values():
        flags.update(snapshot.flags)

    if calibration_store:
        for index, thesis in enumerate(matching):
            conf = _confidence(thesis)
            if conf is None:
                continue
            if calibration_store.is_overconfident(_agent_id(thesis, index), conf):
                flags.add(MobFlag.OVERCONFIDENCE)

    rounded_index = round(_clamp(mob_index / 100.0) * 100.0, 2)
    return MobMetrics(
        ticker=ticker_key,
        mob_index=rounded_index,
        consensus_level=round(consensus_level, 4),
        confidence_extremity=confidence_extremity,
        narrative_intensity=narrative_intensity,
        dominant_direction=cross.dominant_direction,
        cross_desk_consensus=cross,
        within_desk_consensus=within,
        flags=sorted(flags, key=lambda f: f.value),
        label=mob_label(rounded_index),
    )


def record_settlement_calibration(
    *,
    agent_id: str,
    confidence: float,
    was_correct: bool,
    db_path: Path | str = _DEFAULT_PERFORMANCE_DB,
) -> CalibrationRecord:
    """Convenience hook for settler.py after an outcome is known."""

    return ConfidenceCalibrationStore(db_path=db_path).record_outcome(
        agent_id=agent_id,
        confidence=confidence,
        was_correct=was_correct,
    )


def backtest_consensus_dataset(path: Path | str, *, ticker: str | None = None) -> dict[str, Any]:
    """Run mob scoring over a JSONL thesis dataset if available.

    The optional dataset is not part of every checkout. Missing files return a
    structured "skipped" result instead of failing the pipeline.
    """

    dataset_path = Path(path)
    if not dataset_path.exists():
        return {"status": "skipped", "reason": "dataset_not_found", "path": str(dataset_path)}

    by_cycle: dict[str, list[dict[str, Any]]] = {}
    with dataset_path.open("r", encoding="utf-8") as handle:
        for line in handle:
            if not line.strip():
                continue
            row = json.loads(line)
            row_ticker = _ticker(row)
            if ticker and row_ticker and row_ticker != ticker.upper().strip():
                continue
            cycle = str(row.get("analysis_cycle") or row.get("cycle_id") or row.get("timestamp") or "default")
            by_cycle.setdefault(cycle, []).append(row)

    scores: list[MobMetrics] = []
    for rows in by_cycle.values():
        score_ticker = ticker or (_ticker(rows[0]) if rows else "")
        if not score_ticker:
            continue
        metrics = calculate_mob_extremity(rows, score_ticker)
        if metrics:
            scores.append(metrics)

    extreme_count = sum(1 for score in scores if score.mob_index >= 80)
    return {
        "status": "ok",
        "cycles_scored": len(scores),
        "extreme_consensus_cycles": extreme_count,
        "extreme_share": round(extreme_count / len(scores), 4) if scores else 0.0,
        "average_mob_index": round(sum(s.mob_index for s in scores) / len(scores), 2) if scores else 0.0,
    }
