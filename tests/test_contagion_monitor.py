from __future__ import annotations

import math
import sqlite3
from datetime import UTC, datetime
from pathlib import Path

import pandas as pd

from agents.contagion_monitor import (
    ContagionMonitor,
    CorrelationLink,
    DeskAnalysisComplete,
    SignalType,
)
from reasoning.market_price_store import MarketPriceStore


def _event(
    *,
    desk: str = "us",
    ticker: str = "AAPL",
    thesis: dict | None = None,
    timestamp: datetime | None = None,
) -> DeskAnalysisComplete:
    return DeskAnalysisComplete(
        desk=desk,
        ticker=ticker,
        thesis=thesis or {},
        timestamp=timestamp or datetime.now(UTC),
    )


def _monitor(tmp_path: Path, **kwargs) -> ContagionMonitor:
    return ContagionMonitor(
        db_path=tmp_path / "contagion.db",
        price_store=MarketPriceStore(tmp_path / "prices.db"),
        **kwargs,
    )


def _prices(values: list[float]) -> pd.DataFrame:
    index = pd.date_range("2026-05-01", periods=len(values), freq="D")
    return pd.DataFrame(
        {
            "Open": values,
            "High": [v * 1.01 for v in values],
            "Low": [v * 0.99 for v in values],
            "Close": values,
            "Volume": [1_000_000 + i for i in range(len(values))],
        },
        index=index,
    )


def _prices_from_log_returns(returns: list[float], *, start_price: float = 100.0) -> pd.DataFrame:
    prices = [start_price]
    for value in returns:
        prices.append(prices[-1] * math.exp(value))
    return _prices(prices)


def test_no_alert_below_correlation_threshold(tmp_path: Path) -> None:
    monitor = _monitor(
        tmp_path,
        correlation_map={
            "AAPL": [
                CorrelationLink(
                    origin_ticker="AAPL",
                    affected_ticker="6758.T",
                    affected_desk="jp",
                    correlation_score=0.69,
                    rationale="Below threshold.",
                )
            ]
        },
    )

    alerts = monitor.handle_desk_analysis_complete(
        _event(thesis={"mob_extremity": 92})
    )

    assert alerts == []
    assert monitor.recent_alerts() == []


def test_extreme_consensus_alert_persists_and_dedupes(tmp_path: Path) -> None:
    monitor = _monitor(tmp_path)

    event = _event(thesis={"mob_extremity": 91})
    first = monitor.handle_desk_analysis_complete(event)
    second = monitor.handle_desk_analysis_complete(event)

    assert len(first) == 1
    assert second == []
    assert first[0].signal_type is SignalType.EXTREME_CONSENSUS
    assert first[0].origin_desk == "US"
    assert first[0].origin_ticker == "AAPL"
    assert "JP" in first[0].affected_desks
    assert first[0].correlation_score >= 0.8

    persisted = monitor.recent_alerts()
    assert len(persisted) == 1
    assert persisted[0].alert_id == first[0].alert_id


def test_regime_change_alert_uses_previous_state(tmp_path: Path) -> None:
    monitor = _monitor(tmp_path)

    monitor.handle_desk_analysis_complete(
        _event(thesis={"regime_context": {"current_regime": "TRENDING"}})
    )
    alerts = monitor.handle_desk_analysis_complete(
        _event(thesis={"regime_context": {"current_regime": "CRISIS"}})
    )

    assert len(alerts) == 1
    assert alerts[0].signal_type is SignalType.REGIME_CHANGE
    assert "Stress-test" in alerts[0].recommended_action


def test_narrative_shift_alert_on_new_narrative_type(tmp_path: Path) -> None:
    monitor = _monitor(tmp_path)

    alerts = monitor.handle_desk_analysis_complete(
        _event(thesis={"narrative_velocity": {"narrative_type": "FEAR"}})
    )

    assert len(alerts) == 1
    assert alerts[0].signal_type is SignalType.NARRATIVE_SHIFT
    assert "narrative" in alerts[0].recommended_action.lower()


def test_malformed_partial_payload_does_not_crash(tmp_path: Path) -> None:
    monitor = _monitor(tmp_path)

    alerts = monitor.handle_desk_analysis_complete(
        _event(ticker="UNKNOWN", thesis={"regime_context": "bad", "mob_extremity": "not-a-number"})
    )

    assert alerts == []


def test_json_recent_alerts_limit_and_hours(tmp_path: Path) -> None:
    monitor = _monitor(tmp_path)

    monitor.handle_desk_analysis_complete(
        _event(thesis={"mob_extremity": 95}, timestamp=datetime.now(UTC))
    )

    alerts = monitor.recent_alerts(limit=1, hours=1)
    assert len(alerts) == 1
    assert alerts[0].message.startswith("Contagion detected:")
    assert alerts[0].correlation_matrix


def test_real_price_store_correlation_overrides_static_prior(tmp_path: Path) -> None:
    price_store = MarketPriceStore(tmp_path / "prices.db")
    returns = [0.001 * i for i in range(1, 41)]
    price_store.upsert_ohlcv("AAPL", _prices_from_log_returns(returns))
    price_store.upsert_ohlcv("6758.T", _prices_from_log_returns([-value for value in returns]))
    monitor = ContagionMonitor(db_path=tmp_path / "contagion.db", price_store=price_store)

    alerts = monitor.handle_desk_analysis_complete(_event(thesis={"mob_extremity": 95}))

    assert alerts == []


def test_static_prior_used_when_price_history_is_insufficient(tmp_path: Path) -> None:
    monitor = _monitor(tmp_path)

    alerts = monitor.handle_desk_analysis_complete(_event(thesis={"mob_extremity": 95}))

    assert len(alerts) == 1
    assert alerts[0].correlation_score == 0.82


def test_static_prior_used_when_price_store_fails(tmp_path: Path) -> None:
    class BrokenPriceStore:
        def rolling_correlation(self, origin_ticker: str, affected_ticker: str) -> float | None:
            raise sqlite3.DatabaseError("boom")

    monitor = ContagionMonitor(
        db_path=tmp_path / "contagion.db",
        price_store=BrokenPriceStore(),  # type: ignore[arg-type]
    )

    alerts = monitor.handle_desk_analysis_complete(_event(thesis={"mob_extremity": 95}))

    assert len(alerts) == 1
    assert alerts[0].correlation_score == 0.82
