"""Smoke tests — no live LLM or API calls required.

These run offline and verify:
1. All domain schemas instantiate and serialize correctly.
2. Hashing is deterministic and stable.
3. IPFS pinner returns a mock CID (no PINATA_JWT set).
4. Arc recorder returns a mock tx hash (no Arc env vars set).
5. USAgent can be instantiated (no LLM call triggered).
"""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone

import pytest

from reasoning.trace_schema import (
    AgentRole,
    AssetClass,
    Direction,
    InvestmentThesis,
    PredictionMarketQuestion,
    ReasoningBlock,
    Region,
    TraceMetadata,
)
from reasoning.hasher import canonical_hash, content_hash, HASHER_VERSION
from reasoning.ipfs_pinner import pin_json, _mock_cid
from reasoning.arc_recorder import record_trace, _mock_tx_hash
from agents.us_agent import USAgent


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def sample_block() -> ReasoningBlock:
    return ReasoningBlock(
        agent_role=AgentRole.FUNDAMENTAL_ANALYST,
        input_data_summary="10-Q for AAPL Q1-2026",
        analysis="Revenue grew 8% YoY driven by Services.",
        conclusion="Fundamentally strong, slight valuation stretch.",
        confidence=0.75,
        language="en",
    )


@pytest.fixture
def sample_thesis(sample_block: ReasoningBlock) -> InvestmentThesis:
    return InvestmentThesis(
        region=Region.US,
        asset_class=AssetClass.EQUITY,
        ticker_or_asset="AAPL",
        thesis_summary_en="Apple remains fundamentally strong with modest upside.",
        direction=Direction.LONG,
        confidence_score=0.72,
        time_horizon_days=90,
        reasoning_blocks=[sample_block],
        data_sources_used=["mcp:financial-datasets/company_facts"],
    )


# ---------------------------------------------------------------------------
# Schema tests
# ---------------------------------------------------------------------------

def test_thesis_serializes(sample_thesis: InvestmentThesis) -> None:
    json_str = sample_thesis.model_dump_json()
    assert "AAPL" in json_str
    assert "reasoning_blocks" in json_str


def test_thesis_round_trip(sample_thesis: InvestmentThesis) -> None:
    data = sample_thesis.model_dump(mode="json")
    restored = InvestmentThesis.model_validate(data)
    assert restored.ticker_or_asset == sample_thesis.ticker_or_asset
    assert restored.direction == Direction.LONG


def test_prediction_market_question() -> None:
    q = PredictionMarketQuestion(
        question_text="Will AAPL exceed $250 before 2026-09-01?",
        resolution_criteria="AAPL closing price > $250 on any trading day before 2026-09-01 per Yahoo Finance.",
        expiry=datetime(2026, 9, 1, tzinfo=timezone.utc),
        category="earnings",
        source_thesis_id="test-id-123",
        source_language="en",
        translated_by_model="groq/llama-3.3-70b",
        translation_confidence=0.88,
    )
    assert q.question_text.startswith("Will")


# ---------------------------------------------------------------------------
# Hashing tests
# ---------------------------------------------------------------------------

def test_canonical_hash_deterministic(sample_thesis: InvestmentThesis) -> None:
    h1 = canonical_hash(sample_thesis)
    h2 = canonical_hash(sample_thesis)
    assert h1 == h2
    assert h1.startswith("0x")
    assert len(h1) == 66  # "0x" + 64 hex chars


def test_canonical_hash_changes_on_mutation(sample_thesis: InvestmentThesis) -> None:
    h1 = canonical_hash(sample_thesis)
    mutated = sample_thesis.model_copy(update={"ticker_or_asset": "MSFT"})
    h2 = canonical_hash(mutated)
    assert h1 != h2


def test_content_hash_excludes_volatile_fields(sample_thesis: InvestmentThesis) -> None:
    # Two theses identical except thesis_id/timestamp should have the same content hash
    t1 = sample_thesis
    t2 = sample_thesis.model_copy(update={"thesis_id": "different-id"})
    assert content_hash(t1) == content_hash(t2)


def test_hasher_version_is_stable() -> None:
    assert HASHER_VERSION == "1.0.0"


# ---------------------------------------------------------------------------
# IPFS pinner — mock mode (no PINATA_JWT)
# ---------------------------------------------------------------------------

def test_mock_cid_deterministic() -> None:
    payload = {"test": "data", "value": 42}
    cid1 = _mock_cid(payload)
    cid2 = _mock_cid(payload)
    assert cid1 == cid2
    assert cid1.startswith("bafymock")


def test_pin_json_mock(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("PINATA_JWT", raising=False)
    cid = asyncio.run(pin_json({"thesis": "test"}))
    assert cid.startswith("bafymock")


# ---------------------------------------------------------------------------
# Arc recorder — mock mode
# ---------------------------------------------------------------------------

def test_arc_record_mock(monkeypatch: pytest.MonkeyPatch, sample_thesis: InvestmentThesis) -> None:
    monkeypatch.delenv("REASONING_REGISTRY_ADDRESS", raising=False)
    monkeypatch.delenv("ARC_RPC_URL", raising=False)
    monkeypatch.delenv("ARC_DEPLOYER_PRIVATE_KEY", raising=False)

    metadata = TraceMetadata(
        trace_hash=canonical_hash(sample_thesis),
        ipfs_cid="bafymocktest123",
        region=Region.US,
        asset_class=AssetClass.EQUITY,
        timestamp=datetime.now(timezone.utc),
        submitter="0x" + "a" * 40,
    )
    tx = asyncio.run(record_trace(metadata))
    assert tx.startswith("0xmock")


# ---------------------------------------------------------------------------
# Agent instantiation (no LLM call)
# ---------------------------------------------------------------------------

def test_us_agent_instantiates(monkeypatch: pytest.MonkeyPatch) -> None:
    # GroqAPIClient validates key at init time — inject a dummy for this test.
    monkeypatch.setenv("GROQ_API_KEY", "gsk_test_dummy_key_for_instantiation_only")
    agent = USAgent()
    assert agent.region == Region.US
    assert agent.working_language == "en"
    # Generators are registered as sub-components
    assert hasattr(agent, "sub_agent")
    assert hasattr(agent, "synthesizer")
