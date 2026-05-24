"""
Shared fixtures for Rosetta Alpha test suite.
"""
import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from reasoning.trace_schema import (
    AssetClass,
    Direction,
    InvestmentThesis,
    PredictionMarketQuestion,
    ReasoningBlock,
    Region,
    TraceMetadata,
)


# ---------------------------------------------------------------------------
# Canonical fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def mock_reasoning_block() -> ReasoningBlock:
    return ReasoningBlock(
        agent_role="fundamental_analyst",
        input_data_summary="Q1 earnings beat by 12%; revenue $90.3B.",
        thought_process="Strong earnings with healthy margin expansion.",
        analysis="EPS $1.52 vs $1.38 estimate; guidance raised.",
        conclusion="Bullish near-term catalyst.",
        confidence=0.82,
        language="en",
    )


@pytest.fixture
def mock_thesis(mock_reasoning_block) -> InvestmentThesis:
    return InvestmentThesis(
        thesis_id=str(uuid.uuid4()),
        region=Region.US,
        timestamp=datetime.now(timezone.utc),
        asset_class=AssetClass.EQUITY,
        ticker_or_asset="AAPL",
        thesis_summary_en="Apple shows strong fundamentals with bullish momentum.",
        direction=Direction.LONG,
        confidence_score=0.78,
        reasoning_blocks=[mock_reasoning_block],
        entry_price_1e8=19500000000,
        time_horizon_days=30,
        data_sources_used=["financial_datasets", "sec_filings"],
        schema_version="1.0",
    )


@pytest.fixture
def mock_prediction_question(mock_thesis) -> PredictionMarketQuestion:
    return PredictionMarketQuestion(
        question_text="Will AAPL trade above $195 in the next 30 days?",
        resolution_criteria="Resolved YES if AAPL closing price > $195 on expiry date.",
        expiry=datetime(2026, 6, 24, 0, 0, tzinfo=timezone.utc),
        category="equity",
        source_thesis_id=mock_thesis.thesis_id,
        source_language="en",
        translated_by_model="gpt-4o",
        translation_confidence=0.92,
    )


@pytest.fixture
def mock_trace_metadata(mock_thesis) -> TraceMetadata:
    return TraceMetadata(
        trace_hash="0x" + "a" * 64,
        ipfs_cid="bafybeiabc123def456",
        region=mock_thesis.region,
        asset_class=mock_thesis.asset_class,
        timestamp=datetime.now(timezone.utc),
        submitter="0x" + "b" * 40,
    )


# ---------------------------------------------------------------------------
# Environment / network mock helpers
# ---------------------------------------------------------------------------

@pytest.fixture
def no_api_keys(monkeypatch):
    """Strip all external API keys to force offline/mock paths."""
    for var in ("PINATA_JWT", "OPENAI_API_KEY", "FINANCIAL_DATASETS_API_KEY",
                "ARC_RPC_URL", "PRIVATE_KEY"):
        monkeypatch.delenv(var, raising=False)


@pytest.fixture
def fake_pinata_jwt(monkeypatch):
    monkeypatch.setenv("PINATA_JWT", "test-jwt-token")


@pytest.fixture
def mock_ipfs_pin():
    """Patch pin_json at the import site in the test module (async-safe)."""
    with patch("tests.test_e2e_pipeline.pin_json", new=AsyncMock(return_value="bafymocktest123")) as m:
        yield m


@pytest.fixture
def mock_arc_record():
    """Patch record_trace at the source module (async-safe)."""
    with patch(
        "reasoning.arc_recorder.record_trace",
        new=AsyncMock(return_value="0x" + "c" * 64),
    ) as m:
        yield m
