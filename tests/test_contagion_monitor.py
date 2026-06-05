from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path

from agents.contagion_monitor import (
    ContagionMonitor,
    CorrelationLink,
    DeskAnalysisComplete,
    SignalType,
)


def _event(
    *,
    desk: str = "us",
    ticker: str = "AAPL",
    thesis: dict | None = None,
) -> DeskAnalysisComplete:
    return DeskAnalysisComplete(
        desk=desk,
        ticker=ticker,
        thesis=thesis or {},
        timestamp=datetime(2026, 6, 6, 12, tzinfo=UTC),
    )


def test_no_alert_below_correlation_threshold(tmp_path: Path) -> None:
    monitor = ContagionMonitor(
        db_path=tmp_path / "contagion.db",
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
    monitor = ContagionMonitor(db_path=tmp_path / "contagion.db")

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
    monitor = ContagionMonitor(db_path=tmp_path / "contagion.db")

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
    monitor = ContagionMonitor(db_path=tmp_path / "contagion.db")

    alerts = monitor.handle_desk_analysis_complete(
        _event(thesis={"narrative_velocity": {"narrative_type": "FEAR"}})
    )

    assert len(alerts) == 1
    assert alerts[0].signal_type is SignalType.NARRATIVE_SHIFT
    assert "narrative" in alerts[0].recommended_action.lower()


def test_malformed_partial_payload_does_not_crash(tmp_path: Path) -> None:
    monitor = ContagionMonitor(db_path=tmp_path / "contagion.db")

    alerts = monitor.handle_desk_analysis_complete(
        _event(ticker="UNKNOWN", thesis={"regime_context": "bad", "mob_extremity": "not-a-number"})
    )

    assert alerts == []


def test_json_recent_alerts_limit_and_hours(tmp_path: Path) -> None:
    monitor = ContagionMonitor(db_path=tmp_path / "contagion.db")

    monitor.handle_desk_analysis_complete(_event(thesis={"mob_extremity": 95}))

    alerts = monitor.recent_alerts(limit=1, hours=1)
    assert len(alerts) == 1
    assert alerts[0].message.startswith("Contagion detected:")
    assert alerts[0].correlation_matrix
