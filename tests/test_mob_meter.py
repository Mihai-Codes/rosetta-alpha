from __future__ import annotations

import math
from pathlib import Path

from reasoning.mob_meter import (
    ConfidenceCalibrationStore,
    MobFlag,
    backtest_consensus_dataset,
    calculate_mob_extremity,
    consensus_score,
    iter_thesis_records,
    record_settlement_calibration,
)


def _thesis(
    direction: str,
    confidence: float = 0.8,
    *,
    desk: str = "us",
    ticker: str = "AAPL",
    summary: str = "bullish upside rally",
    blocks: list[dict] | None = None,
) -> dict:
    return {
        "desk": desk,
        "ticker": ticker,
        "direction": direction,
        "confidence": confidence,
        "summary": summary,
        "reasoning_blocks": blocks or [
            {"agent_role": "fundamental", "conclusion": direction.lower(), "confidence": confidence},
            {"agent_role": "technical", "conclusion": direction.lower(), "confidence": confidence},
        ],
    }


def test_consensus_score_extreme_cross_desk() -> None:
    theses = [
        _thesis("LONG", desk="us"),
        _thesis("LONG", desk="cn"),
        _thesis("LONG", desk="eu"),
        _thesis("LONG", desk="jp"),
        _thesis("LONG", desk="crypto"),
    ]

    cross, within = consensus_score(theses, ticker="AAPL")

    assert cross.agreement == 1.0
    assert cross.dominant_direction == "LONG"
    assert MobFlag.EXTREME_CONSENSUS in cross.flags
    assert set(within) == {"US", "CN", "EU", "JP", "CRYPTO"}


def test_consensus_score_high_uncertainty_when_no_direction() -> None:
    cross, within = consensus_score([{"desk": "us", "ticker": "AAPL", "reasoning_blocks": []}], ticker="AAPL")

    assert cross.agreement == 0.0
    assert MobFlag.HIGH_UNCERTAINTY in cross.flags
    assert MobFlag.HIGH_UNCERTAINTY in within["US"].flags


def test_within_desk_consensus_infers_subagent_direction() -> None:
    thesis = _thesis(
        "LONG",
        desk="us",
        blocks=[
            {"agent_role": "fundamental", "conclusion": "bullish upside breakout"},
            {"agent_role": "technical", "analysis": "buy the rally"},
            {"agent_role": "sentiment", "analysis_en": "positive growth narrative"},
        ],
    )

    _, within = consensus_score([thesis], ticker="AAPL")

    assert within["US"].agreement == 1.0
    assert MobFlag.EXTREME_CONSENSUS in within["US"].flags


def test_mob_index_weighting_and_bounds() -> None:
    theses = [
        _thesis("LONG", 1.0, desk="us", summary="bubble mania parabolic"),
        _thesis("LONG", 1.0, desk="cn", summary="bubble mania parabolic"),
        _thesis("LONG", 1.0, desk="eu", summary="bubble mania parabolic"),
        _thesis("LONG", 1.0, desk="jp", summary="bubble mania parabolic"),
        _thesis("LONG", 1.0, desk="crypto", summary="bubble mania parabolic"),
    ]

    metrics = calculate_mob_extremity(theses, "AAPL")

    assert metrics is not None
    assert metrics.mob_index == 100.0
    assert metrics.label == "Mob territory"
    assert MobFlag.EXTREME_CONSENSUS in metrics.flags


def test_low_confidence_agreement_does_not_create_confidence_extremity() -> None:
    theses = [
        _thesis("LONG", 0.0, desk="us", summary="ordinary bullish setup"),
        _thesis("LONG", 0.0, desk="cn", summary="ordinary bullish setup"),
        _thesis("LONG", 0.0, desk="eu", summary="ordinary bullish setup"),
    ]

    metrics = calculate_mob_extremity(theses, "AAPL")

    assert metrics is not None
    assert metrics.confidence_extremity == 0.0
    assert metrics.mob_index < 80


def test_nested_results_shape_drift_is_normalized() -> None:
    payload = {
        "run_id": "demo",
        "results": [
            {
                "desk": "us",
                "thesis": {
                    "ticker_or_asset": "AAPL",
                    "direction": "LONG",
                    "confidence_score": 0.95,
                    "thesis_summary_en": "bubble mania parabolic",
                },
            },
            {
                "desk": "cn",
                "investment_thesis": {
                    "ticker_or_asset": "AAPL",
                    "direction": "LONG",
                    "confidence_score": 0.9,
                    "thesis_summary_en": "bubble mania parabolic",
                },
            },
        ],
    }

    records = list(iter_thesis_records(payload))
    metrics = calculate_mob_extremity(records, "AAPL")

    assert len(records) == 2
    assert {r["ticker"] for r in records} == {"AAPL"}
    assert metrics is not None
    assert metrics.consensus_level == 1.0


def test_confidence_calibration_records_accuracy(tmp_path: Path) -> None:
    store = ConfidenceCalibrationStore(tmp_path / "performance.db")

    store.record_outcome("agent-a", 0.85, True)
    record = store.record_outcome("agent-a", 0.86, False)

    assert record.confidence_bucket == "0.8-0.9"
    assert record.sample_count == 2
    assert record.correct_count == 1
    assert math.isclose(record.actual_accuracy, 0.5)


def test_overconfidence_flag_uses_historical_accuracy(tmp_path: Path) -> None:
    store = ConfidenceCalibrationStore(tmp_path / "performance.db")
    store.record_outcome("us", 0.9, False)

    metrics = calculate_mob_extremity(
        [_thesis("LONG", 0.9, desk="us")],
        "AAPL",
        calibration_store=store,
    )

    assert metrics is not None
    assert MobFlag.OVERCONFIDENCE in metrics.flags


def test_record_settlement_calibration_helper(tmp_path: Path) -> None:
    record = record_settlement_calibration(
        agent_id="0xabc",
        confidence=0.91,
        was_correct=False,
        db_path=tmp_path / "performance.db",
    )

    assert record.agent_id == "0xabc"
    assert record.sample_count == 1
    assert record.actual_accuracy == 0.0


def test_backtest_dataset_missing_is_skipped(tmp_path: Path) -> None:
    result = backtest_consensus_dataset(tmp_path / "rosetta_dataset.jsonl")

    assert result["status"] == "skipped"
    assert result["reason"] == "dataset_not_found"
