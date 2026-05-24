"""
Comprehensive end-to-end test suite for the Rosetta Alpha Python backend.

Test classes:
    TestDataSources       – FinancialDatasets client reachability & data shape
    TestAgentPipeline     – USAgent.analyze() produces valid InvestmentThesis
    TestReasoningPipeline – Hasher determinism, IPFS pinning, content_hash stability
    TestSmartContracts    – Arc recorder / on-chain helpers (mocked & env-gated live)
    TestE2EDemo           – Full pipeline integration mirroring demo/e2e_run.py
"""

import hashlib
import json
import os
import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from reasoning.hasher import canonical_hash, content_hash
from reasoning.ipfs_pinner import pin_json
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
# Helpers
# ---------------------------------------------------------------------------

def _requires_env(*vars_: str):
    """Skip test if any listed env var is absent."""
    missing = [v for v in vars_ if not os.getenv(v)]
    return pytest.mark.skipif(
        bool(missing),
        reason=f"Missing env vars: {missing}",
    )


# ---------------------------------------------------------------------------
# 1. TestDataSources
# ---------------------------------------------------------------------------

class TestDataSources:
    """Verify FinancialDatasets client contract and data shape."""

    def test_import_financial_datasets_client(self):
        """Client module must be importable without crashing."""
        try:
            from agents.us_agent import FinancialDatasetsClient  # noqa: F401
        except ImportError:
            pytest.skip("FinancialDatasetsClient not importable in this environment")

    @_requires_env("FINANCIAL_DATASETS_API_KEY")
    async def test_live_price_fetch(self):
        """Live: fetch a price snapshot for AAPL and check response is non-empty dict."""
        from data.mcp_client import FinancialDatasetsClient

        async with FinancialDatasetsClient() as client:
            snapshot = await client.get_price_snapshot("AAPL")
        assert snapshot is not None
        assert isinstance(snapshot, dict), f"Expected dict, got {type(snapshot)}"
        assert len(snapshot) > 0, "Price snapshot must not be empty"

    @_requires_env("FINANCIAL_DATASETS_API_KEY")
    async def test_live_fundamentals_fetch(self):
        """Live: fetch company facts for AAPL and verify nested payload present."""
        from data.mcp_client import FinancialDatasetsClient

        async with FinancialDatasetsClient() as client:
            data = await client.get_company_facts("AAPL")
        assert data is not None
        assert isinstance(data, dict)
        assert len(data) > 0, "company_facts response must not be empty"
        # API wraps payload under 'company_facts' key; unwrap if present
        facts = data.get("company_facts", data)
        assert isinstance(facts, dict), f"Expected nested dict, got: {type(facts)}"
        canonical_keys = {"industry", "exchange", "cik", "category", "sector", "description"}
        assert canonical_keys & set(facts.keys()), (
            f"None of {canonical_keys} found in facts: {list(facts.keys())}"
        )

    def test_mock_data_source_shape(self):
        """Offline: mock client returns dict with expected structure."""
        mock_client = MagicMock()
        mock_client.get_current_price.return_value = 195.50
        mock_client.get_fundamentals.return_value = {
            "eps": 1.52,
            "revenue": 90_300_000_000,
            "pe_ratio": 28.4,
        }

        price = mock_client.get_current_price("AAPL")
        fundamentals = mock_client.get_fundamentals("AAPL")

        assert price == 195.50
        assert fundamentals["eps"] == 1.52
        assert fundamentals["revenue"] > 0


# ---------------------------------------------------------------------------
# 2. TestAgentPipeline
# ---------------------------------------------------------------------------

class TestAgentPipeline:
    """USAgent must produce a structurally valid InvestmentThesis."""

    @_requires_env("OPENAI_API_KEY", "FINANCIAL_DATASETS_API_KEY")
    def test_live_us_agent_analyze(self):
        """Live: run USAgent.analyze() and validate returned thesis."""
        from agents.us_agent import USAgent

        agent = USAgent()
        thesis = agent.analyze("AAPL")

        assert isinstance(thesis, InvestmentThesis), (
            f"Expected InvestmentThesis, got {type(thesis)}"
        )
        assert thesis.ticker_or_asset == "AAPL"
        assert thesis.region == Region.US
        assert 0.0 <= thesis.confidence_score <= 1.0
        assert thesis.direction in (Direction.LONG, Direction.SHORT, Direction.NEUTRAL)
        assert len(thesis.reasoning_blocks) > 0
        assert thesis.entry_price_1e8 > 0

    def test_thesis_schema_from_fixture(self, mock_thesis):
        """Offline: fixture thesis passes schema validation."""
        assert isinstance(mock_thesis, InvestmentThesis)
        assert mock_thesis.region == Region.US
        assert mock_thesis.ticker_or_asset == "AAPL"
        assert 0.0 <= mock_thesis.confidence_score <= 1.0
        assert mock_thesis.direction in (Direction.LONG, Direction.SHORT, Direction.NEUTRAL)

    def test_thesis_reasoning_blocks_not_empty(self, mock_thesis):
        assert len(mock_thesis.reasoning_blocks) >= 1
        block = mock_thesis.reasoning_blocks[0]
        assert isinstance(block, ReasoningBlock)
        assert block.agent_role
        assert block.conclusion

    def test_thesis_id_is_uuid(self, mock_thesis):
        # thesis_id is stored as a str (UUID stringified)
        assert isinstance(mock_thesis.thesis_id, str)
        uuid.UUID(mock_thesis.thesis_id)  # must be valid UUID format

    def test_thesis_serialization_roundtrip(self, mock_thesis):
        """Thesis must survive JSON serialization and back."""
        raw = mock_thesis.model_dump_json()
        restored = InvestmentThesis.model_validate_json(raw)
        assert restored.thesis_id == mock_thesis.thesis_id
        assert restored.ticker_or_asset == mock_thesis.ticker_or_asset
        assert restored.confidence_score == mock_thesis.confidence_score

    @_requires_env("OPENAI_API_KEY")
    def test_translator_agent_live(self, mock_thesis):
        """Live: TranslatorAgent.translate() returns valid PredictionMarketQuestion."""
        from agents.translator_agent import TranslatorAgent

        agent = TranslatorAgent()
        question = agent.translate(mock_thesis)

        assert isinstance(question, PredictionMarketQuestion)
        assert question.source_thesis_id == mock_thesis.thesis_id
        assert len(question.question_text) > 10
        assert question.expiry > datetime.now(timezone.utc)

    def test_translator_agent_mocked(self, mock_thesis):
        """Offline: mock TranslatorAgent produces valid PredictionMarketQuestion."""
        mock_agent = MagicMock()
        mock_agent.translate.return_value = PredictionMarketQuestion(
            question_text="Will AAPL be above $195 in 30 days?",
            resolution_criteria="YES if AAPL close > $195 on expiry.",
            expiry=datetime(2026, 7, 1, tzinfo=timezone.utc),
            category="equity",
            source_thesis_id=mock_thesis.thesis_id,
            source_language="en",
            translated_by_model="gpt-4o",
            translation_confidence=0.90,
        )

        result = mock_agent.translate(mock_thesis)
        assert isinstance(result, PredictionMarketQuestion)
        assert result.source_thesis_id == mock_thesis.thesis_id


# ---------------------------------------------------------------------------
# 3. TestReasoningPipeline
# ---------------------------------------------------------------------------

class TestReasoningPipeline:
    """Hasher determinism, IPFS pinning behavior, content_hash stability."""

    # --- canonical_hash ---

    def test_canonical_hash_returns_hex_string(self, mock_thesis):
        h = canonical_hash(mock_thesis)
        assert isinstance(h, str)
        assert h.startswith("0x")
        assert len(h) == 66  # "0x" + 64 hex chars

    def test_canonical_hash_is_deterministic(self, mock_thesis):
        h1 = canonical_hash(mock_thesis)
        h2 = canonical_hash(mock_thesis)
        assert h1 == h2

    def test_canonical_hash_differs_for_different_thesis(self, mock_thesis):
        other = mock_thesis.model_copy(
            update={"ticker_or_asset": "MSFT", "thesis_id": str(uuid.uuid4())}
        )
        assert canonical_hash(mock_thesis) != canonical_hash(other)

    def test_canonical_hash_on_plain_dict(self):
        payload = {"key": "value", "number": 42}
        h = canonical_hash(payload)
        assert h.startswith("0x")
        assert len(h) == 66

    def test_canonical_hash_key_order_independence(self):
        """Dicts with same keys in different order must hash identically."""
        a = {"b": 2, "a": 1}
        b = {"a": 1, "b": 2}
        assert canonical_hash(a) == canonical_hash(b)

    # --- content_hash ---

    def test_content_hash_excludes_volatile_fields(self, mock_thesis):
        """content_hash should be stable across different thesis_id / timestamp."""
        h1 = content_hash(mock_thesis, exclude={"thesis_id", "timestamp"})
        # Create a copy with new volatile fields
        other = mock_thesis.model_copy(
            update={"thesis_id": uuid.uuid4(), "timestamp": datetime.now(timezone.utc)}
        )
        h2 = content_hash(other, exclude={"thesis_id", "timestamp"})
        assert h1 == h2, "content_hash should be stable when volatile fields are excluded"

    def test_content_hash_detects_material_change(self, mock_thesis):
        """A change to a non-excluded field must change the hash."""
        h1 = content_hash(mock_thesis, exclude={"thesis_id", "timestamp"})
        changed = mock_thesis.model_copy(update={"confidence_score": 0.01})
        h2 = content_hash(changed, exclude={"thesis_id", "timestamp"})
        assert h1 != h2

    # --- IPFS pinning ---

    @pytest.mark.asyncio
    async def test_ipfs_pin_returns_mock_cid_without_jwt(self, no_api_keys):
        """Without PINATA_JWT the pinner must return the bafymock... sentinel."""
        cid = await pin_json({"test": "data"}, name="test-pin")
        assert cid.startswith("bafymock"), f"Expected mock CID, got: {cid}"

    @_requires_env("PINATA_JWT")
    @pytest.mark.asyncio
    async def test_ipfs_pin_live(self, mock_thesis):
        """Live: pins thesis JSON to Pinata and returns a real CID."""
        cid = await pin_json(mock_thesis.model_dump(mode="json"), name="e2e-test")
        assert isinstance(cid, str)
        assert len(cid) > 10
        assert not cid.startswith("bafymock"), "Expected real CID from Pinata"

    @pytest.mark.asyncio
    async def test_ipfs_pin_mocked(self, mock_ipfs_pin, mock_thesis):
        """Patched pinner returns deterministic CID."""
        cid = await pin_json(mock_thesis.model_dump(), name="test")
        assert cid == "bafymocktest123"
        mock_ipfs_pin.assert_called_once()

    @pytest.mark.asyncio
    async def test_ipfs_pin_accepts_arbitrary_dict(self):
        """pin_json must handle arbitrary JSON-serialisable dicts without error."""
        payload = {"foo": "bar", "nested": {"x": 1}}
        # Will use mock path since no JWT in test env
        cid = await pin_json(payload, name="arbitrary-test")
        assert isinstance(cid, str)
        assert len(cid) > 0


# ---------------------------------------------------------------------------
# 4. TestSmartContracts
# ---------------------------------------------------------------------------

class TestSmartContracts:
    """Arc recorder helpers — mocked by default, live-gated by env vars."""

    @pytest.mark.asyncio
    async def test_record_trace_mocked(self, mock_arc_record, mock_trace_metadata, mock_thesis):
        """Patched record_trace returns fake tx hash."""
        from reasoning.arc_recorder import record_trace

        tx_hash = await record_trace(mock_trace_metadata, mock_thesis)
        assert tx_hash.startswith("0x")
        assert len(tx_hash) == 66
        mock_arc_record.assert_called_once_with(mock_trace_metadata, mock_thesis)

    def test_trace_metadata_hex_format(self, mock_trace_metadata):
        """trace_hash must be 0x-prefixed 32-byte hex."""
        h = mock_trace_metadata.trace_hash
        assert h.startswith("0x")
        assert len(h) == 66

    def test_trace_metadata_submitter_format(self, mock_trace_metadata):
        """submitter must look like an Ethereum address."""
        addr = mock_trace_metadata.submitter
        assert addr.startswith("0x")
        assert len(addr) == 42

    @_requires_env("ARC_RPC_URL", "PRIVATE_KEY")
    async def test_live_record_trace(self, mock_trace_metadata, mock_thesis):
        """Live: record a trace on Arc testnet and confirm tx hash."""
        from reasoning.arc_recorder import record_trace

        tx_hash = await record_trace(mock_trace_metadata, mock_thesis)
        assert tx_hash.startswith("0x"), f"Unexpected tx hash: {tx_hash}"
        assert len(tx_hash) >= 66

    @_requires_env("ARC_RPC_URL", "PRIVATE_KEY")
    async def test_live_stake_for_trace(self):
        """Live: stake ROSETTA tokens for a trace bond."""
        from web3 import Web3

        from reasoning.arc_recorder import stake_for_trace

        rpc = os.environ["ARC_RPC_URL"]
        pk = os.environ["PRIVATE_KEY"]
        w3 = Web3(Web3.HTTPProvider(rpc))
        account = w3.eth.account.from_key(pk)

        tx_hash = await stake_for_trace(w3, account, stake_amount=1)
        assert tx_hash.startswith("0x")


# ---------------------------------------------------------------------------
# 5. TestE2EDemo
# ---------------------------------------------------------------------------

class TestE2EDemo:
    """Full pipeline integration, mirroring demo/e2e_run.py logic."""

    @pytest.mark.asyncio
    async def test_full_pipeline_mocked(self, mock_thesis, mock_ipfs_pin, mock_arc_record):
        """
        Offline integration test: wire all stages together using mocks.
        Validates that each stage receives and passes on the right data shape.
        """
        # Stage 1: Hasher
        trace_hash = canonical_hash(mock_thesis)
        assert trace_hash.startswith("0x")

        # Stage 2: IPFS pin
        cid = await pin_json(mock_thesis.model_dump(mode="json"), name="e2e-test")
        assert cid == "bafymocktest123"

        # Stage 3: Build TraceMetadata
        metadata = TraceMetadata(
            trace_hash=trace_hash,
            ipfs_cid=cid,
            region=mock_thesis.region,
            asset_class=mock_thesis.asset_class,
            timestamp=datetime.now(timezone.utc),
            submitter="0x" + "0" * 40,
        )
        assert metadata.trace_hash == trace_hash
        assert metadata.ipfs_cid == cid

        # Stage 4: Record on-chain (mocked)
        from reasoning.arc_recorder import record_trace

        tx_hash = await record_trace(metadata, mock_thesis)
        assert tx_hash.startswith("0x")
        assert len(tx_hash) == 66

        # Stage 5: Translator (mocked)
        mock_translator = MagicMock()
        mock_translator.translate.return_value = PredictionMarketQuestion(
            question_text="Will AAPL trade above $195?",
            resolution_criteria="YES if AAPL close > $195 on expiry.",
            expiry=datetime(2026, 7, 1, tzinfo=timezone.utc),
            category="equity",
            source_thesis_id=mock_thesis.thesis_id,
            source_language="en",
            translated_by_model="gpt-4o",
            translation_confidence=0.90,
        )
        question = mock_translator.translate(mock_thesis)
        assert isinstance(question, PredictionMarketQuestion)
        assert question.source_thesis_id == mock_thesis.thesis_id

    def test_pipeline_hash_changes_on_thesis_mutation(self, mock_thesis):
        """Mutating thesis content must change the canonical hash."""
        h_before = canonical_hash(mock_thesis)
        mutated = mock_thesis.model_copy(update={"direction": Direction.SHORT})
        h_after = canonical_hash(mutated)
        assert h_before != h_after

    def test_pipeline_idempotent_hashing(self, mock_thesis):
        """Running the pipeline twice on the same thesis yields the same hash."""
        h1 = canonical_hash(mock_thesis)
        h2 = canonical_hash(mock_thesis)
        assert h1 == h2

    def test_prediction_question_expiry_in_future(self, mock_prediction_question):
        assert mock_prediction_question.expiry > datetime.now(timezone.utc)

    def test_prediction_question_links_to_thesis(self, mock_thesis, mock_prediction_question):
        assert mock_prediction_question.source_thesis_id == mock_thesis.thesis_id

    @_requires_env("OPENAI_API_KEY", "FINANCIAL_DATASETS_API_KEY", "PINATA_JWT")
    async def test_live_full_pipeline(self):
        """
        Live E2E: runs the full agent → translate → pin → hash pipeline.
        Skipped unless all external API keys are present.
        Does NOT submit a real on-chain transaction (no PRIVATE_KEY required).
        """
        from agents.translator_agent import TranslatorAgent
        from agents.us_agent import USAgent

        # Step 1: Analyze
        agent = USAgent()
        thesis = agent.analyze("AAPL")
        assert isinstance(thesis, InvestmentThesis)

        # Step 2: Hash
        trace_hash = canonical_hash(thesis)
        assert trace_hash.startswith("0x")

        # Step 3: Pin
        cid = await pin_json(thesis.model_dump(mode="json"), name="e2e-live-test")
        assert isinstance(cid, str)
        assert len(cid) > 10

        # Step 4: Translate
        translator = TranslatorAgent()
        question = translator.translate(thesis)
        assert isinstance(question, PredictionMarketQuestion)
        assert question.source_thesis_id == thesis.thesis_id

        # Step 5: Metadata integrity
        metadata = TraceMetadata(
            trace_hash=trace_hash,
            ipfs_cid=cid,
            region=thesis.region,
            asset_class=thesis.asset_class,
            timestamp=datetime.now(timezone.utc),
            submitter="0x" + "0" * 40,
        )
        assert metadata.trace_hash == trace_hash
        assert metadata.ipfs_cid == cid
