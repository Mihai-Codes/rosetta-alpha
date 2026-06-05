"""Tests for reasoning.narrative_engine — narrative detection pipeline.

Covers:
- NarrativeStore CRUD operations
- Velocity computation
- Shift detection
- Contagion detection
- End-to-end pipeline (mocked LLM)
"""

from __future__ import annotations

import json
import tempfile
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from reasoning.narrative_engine import (
    ContagionAlert,
    CrossDeskContagionDetector,
    Narrative,
    NarrativeEngine,
    NarrativeShift,
    NarrativeStore,
    NarrativeType,
    NarrativeVelocity,
    NarrativeVelocityTracker,
    _narrative_hash,
)
from reasoning.trace_schema import Region


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def tmp_db(tmp_path: Path) -> Path:
    return tmp_path / "test_narratives.db"


@pytest.fixture
def store(tmp_db: Path) -> NarrativeStore:
    return NarrativeStore(db_path=tmp_db)


@pytest.fixture
def sample_narrative() -> Narrative:
    return Narrative(
        narrative_title="AI Bubble Fears",
        narrative_type=NarrativeType.FEAR,
        entities_mentioned=["AAPL", "NVDA", "MSFT"],
        sentiment_intensity=0.8,
        source_region=Region.US,
        source_text_snippet="Markets tumble on concerns that AI valuations...",
    )


@pytest.fixture
def sample_narrative_china() -> Narrative:
    """Same narrative appearing in China — for contagion testing."""
    return Narrative(
        narrative_title="AI Bubble Fears",
        narrative_type=NarrativeType.FEAR,
        entities_mentioned=["BABA", "9988.HK"],
        sentiment_intensity=0.6,
        source_region=Region.CN,
        source_text_snippet="中国科技股受美国AI泡沫担忧影响...",
    )


# ---------------------------------------------------------------------------
# Unit Tests: NarrativeStore
# ---------------------------------------------------------------------------


class TestNarrativeStore:
    def test_init_creates_tables(self, store: NarrativeStore) -> None:
        """Schema initializes without error."""
        # Second init should also be idempotent
        store._init_schema()

    def test_upsert_insert(self, store: NarrativeStore, sample_narrative: Narrative) -> None:
        """First upsert inserts a new record."""
        store.upsert("AAPL", sample_narrative)
        rows = store.get_narratives_for_ticker("AAPL")
        assert len(rows) == 1
        assert rows[0]["title"] == "AI Bubble Fears"
        assert rows[0]["mention_count"] == 1

    def test_upsert_increment(self, store: NarrativeStore, sample_narrative: Narrative) -> None:
        """Repeated upsert increments mention_count."""
        store.upsert("AAPL", sample_narrative)
        store.upsert("AAPL", sample_narrative)
        store.upsert("AAPL", sample_narrative)
        rows = store.get_narratives_for_ticker("AAPL")
        assert len(rows) == 1
        assert rows[0]["mention_count"] == 3

    def test_upsert_max_intensity(self, store: NarrativeStore) -> None:
        """Intensity is MAX'd, not overwritten."""
        n1 = Narrative(
            narrative_title="Fed Pivot",
            narrative_type=NarrativeType.GREED,
            sentiment_intensity=0.5,
            source_region=Region.US,
        )
        n2 = Narrative(
            narrative_title="Fed Pivot",
            narrative_type=NarrativeType.GREED,
            sentiment_intensity=0.9,
            source_region=Region.US,
        )
        store.upsert("SPY", n1)
        store.upsert("SPY", n2)
        rows = store.get_narratives_for_ticker("SPY")
        assert rows[0]["intensity"] == 0.9

    def test_filter_by_region(
        self, store: NarrativeStore, sample_narrative: Narrative, sample_narrative_china: Narrative
    ) -> None:
        """Region filter works."""
        store.upsert("AAPL", sample_narrative)
        store.upsert("AAPL", sample_narrative_china)
        us_rows = store.get_narratives_for_ticker("AAPL", region=Region.US)
        cn_rows = store.get_narratives_for_ticker("AAPL", region=Region.CN)
        assert len(us_rows) == 1
        assert len(cn_rows) == 1

    def test_get_narrative_by_hash(
        self, store: NarrativeStore, sample_narrative: Narrative, sample_narrative_china: Narrative
    ) -> None:
        """Cross-region lookup by hash."""
        store.upsert("AAPL", sample_narrative)
        store.upsert("AAPL", sample_narrative_china)
        nhash = _narrative_hash("AI Bubble Fears", "AAPL")
        rows = store.get_narrative_by_hash(nhash)
        assert len(rows) == 2
        regions = {r["region"] for r in rows}
        assert regions == {"US", "CN"}

    def test_record_and_get_shifts(self, store: NarrativeStore) -> None:
        """Shift recording and retrieval."""
        shift = NarrativeShift(
            ticker="AAPL",
            region=Region.US,
            previous_narrative="AI Bubble Fears",
            new_narrative="Fed Pivot Greed",
            previous_type=NarrativeType.FEAR,
            new_type=NarrativeType.GREED,
            shift_magnitude=0.7,
        )
        store.record_shift(shift)
        shifts = store.get_shifts("AAPL")
        assert len(shifts) == 1
        assert shifts[0]["new_narrative"] == "Fed Pivot Greed"


# ---------------------------------------------------------------------------
# Unit Tests: Velocity Tracker
# ---------------------------------------------------------------------------


class TestVelocityTracker:
    def test_compute_velocity_empty(self, store: NarrativeStore) -> None:
        tracker = NarrativeVelocityTracker(store)
        result = tracker.compute_velocity("NONEXIST")
        assert result == []

    def test_compute_velocity_single(self, store: NarrativeStore, sample_narrative: Narrative) -> None:
        store.upsert("AAPL", sample_narrative)
        tracker = NarrativeVelocityTracker(store)
        velocities = tracker.compute_velocity("AAPL")
        assert len(velocities) == 1
        assert velocities[0].is_dominant is True
        assert velocities[0].narrative_title == "AI Bubble Fears"

    def test_dominant_is_fastest(self, store: NarrativeStore) -> None:
        """The narrative with highest mentions_per_day is marked dominant."""
        # Insert two narratives, one with more mentions
        n1 = Narrative(
            narrative_title="AI Bubble",
            narrative_type=NarrativeType.FEAR,
            sentiment_intensity=0.5,
            source_region=Region.US,
        )
        n2 = Narrative(
            narrative_title="Fed Pivot",
            narrative_type=NarrativeType.GREED,
            sentiment_intensity=0.7,
            source_region=Region.US,
        )
        store.upsert("SPY", n1)
        store.upsert("SPY", n2)
        store.upsert("SPY", n2)  # n2 has 2 mentions
        store.upsert("SPY", n2)  # n2 has 3 mentions

        tracker = NarrativeVelocityTracker(store)
        velocities = tracker.compute_velocity("SPY")
        dominant = next(v for v in velocities if v.is_dominant)
        assert dominant.narrative_title == "Fed Pivot"


# ---------------------------------------------------------------------------
# Unit Tests: Contagion Detection
# ---------------------------------------------------------------------------


class TestContagionDetector:
    def test_no_contagion_single_region(self, store: NarrativeStore, sample_narrative: Narrative) -> None:
        store.upsert("AAPL", sample_narrative)
        detector = CrossDeskContagionDetector(store)
        alerts = detector.detect_contagion()
        assert alerts == []

    def test_contagion_cross_region(
        self, store: NarrativeStore, sample_narrative: Narrative, sample_narrative_china: Narrative
    ) -> None:
        store.upsert("AAPL", sample_narrative)
        store.upsert("AAPL", sample_narrative_china)
        detector = CrossDeskContagionDetector(store)
        alerts = detector.detect_contagion()
        assert len(alerts) == 1
        assert alerts[0].narrative_title == "AI Bubble Fears"
        assert len(alerts[0].spread_to) >= 1

    def test_entity_overlap_contagion_cross_language(self, store: NarrativeStore) -> None:
        """Cross-language contagion via shared entities (different titles, same companies)."""
        # US narrative about NVDA and MSFT
        n_us = Narrative(
            narrative_title="AI Spending Unsustainable",
            narrative_type=NarrativeType.FEAR,
            entities_mentioned=["NVDA", "MSFT", "GOOG"],
            sentiment_intensity=0.8,
            source_region=Region.US,
        )
        # China narrative with different title but overlapping entities
        n_cn = Narrative(
            narrative_title="AI泡沫担忧加剧",
            narrative_type=NarrativeType.FEAR,
            entities_mentioned=["NVDA", "MSFT", "BABA"],
            sentiment_intensity=0.7,
            source_region=Region.CN,
        )
        store.upsert("NVDA", n_us)
        store.upsert("NVDA", n_cn)
        detector = CrossDeskContagionDetector(store)
        alerts = detector.detect_contagion()
        # Should find contagion via entity overlap (NVDA + MSFT shared)
        assert len(alerts) >= 1
        # At least one alert should mention entity overlap
        entity_alerts = [a for a in alerts if "↔" in a.narrative_title]
        assert len(entity_alerts) == 1, f"Expected entity-overlap alert, got: {[a.narrative_title for a in alerts]}"

    def test_no_entity_contagion_below_threshold(self, store: NarrativeStore) -> None:
        """Single shared entity is below threshold — no contagion alert."""
        n_us = Narrative(
            narrative_title="Tech Rally",
            narrative_type=NarrativeType.GREED,
            entities_mentioned=["AAPL"],
            sentiment_intensity=0.6,
            source_region=Region.US,
        )
        n_eu = Narrative(
            narrative_title="European Tech Momentum",
            narrative_type=NarrativeType.GREED,
            entities_mentioned=["AAPL", "SAP"],
            sentiment_intensity=0.5,
            source_region=Region.EU,
        )
        store.upsert("AAPL", n_us)
        store.upsert("AAPL", n_eu)
        detector = CrossDeskContagionDetector(store)
        alerts = detector.detect_contagion()
        # Only 1 shared entity (AAPL) — below threshold of 2
        entity_alerts = [a for a in alerts if "↔" in a.narrative_title]
        assert len(entity_alerts) == 0


# ---------------------------------------------------------------------------
# Unit Tests: Hash function
# ---------------------------------------------------------------------------


class TestNarrativeHash:
    def test_deterministic(self) -> None:
        h1 = _narrative_hash("AI Bubble", "AAPL")
        h2 = _narrative_hash("AI Bubble", "AAPL")
        assert h1 == h2

    def test_case_insensitive(self) -> None:
        h1 = _narrative_hash("AI Bubble", "AAPL")
        h2 = _narrative_hash("ai bubble", "aapl")
        assert h1 == h2

    def test_different_inputs(self) -> None:
        h1 = _narrative_hash("AI Bubble", "AAPL")
        h2 = _narrative_hash("Fed Pivot", "AAPL")
        assert h1 != h2


# ---------------------------------------------------------------------------
# Integration: NarrativeEngine (mocked LLM)
# ---------------------------------------------------------------------------


class TestEdgeCases:
    """Edge cases that could cause silent failures."""

    def test_empty_text_returns_none(self, store: NarrativeStore) -> None:
        """Empty/whitespace text should not crash or call LLM."""
        from reasoning.narrative_engine import NarrativeExtractor
        import adalflow as adal

        mock_client = MagicMock(spec=adal.ModelClient)
        extractor = NarrativeExtractor(model_client=mock_client)
        assert extractor.extract("", "AAPL", Region.US) is None
        assert extractor.extract("   \n  ", "AAPL", Region.US) is None

    def test_ticker_case_normalization(self, store: NarrativeStore, sample_narrative: Narrative) -> None:
        """Tickers stored and queried in consistent case."""
        store.upsert("aapl", sample_narrative)  # lowercase input
        rows = store.get_narratives_for_ticker("AAPL")  # uppercase query
        assert len(rows) == 1

    def test_upsert_with_special_chars_in_title(self, store: NarrativeStore) -> None:
        """Narrative titles with unicode/special chars don't crash."""
        n = Narrative(
            narrative_title="中国AI泡沫 — fears & 'concerns'",
            narrative_type=NarrativeType.FEAR,
            sentiment_intensity=0.7,
            source_region=Region.CN,
        )
        store.upsert("BABA", n)
        rows = store.get_narratives_for_ticker("BABA")
        assert len(rows) == 1
        assert rows[0]["title"] == "中国AI泡沫 — fears & 'concerns'"

    def test_velocity_same_day_multiple_mentions(self, store: NarrativeStore) -> None:
        """Multiple mentions on same day → days_active=1, velocity=mention_count."""
        n = Narrative(
            narrative_title="Flash Crash",
            narrative_type=NarrativeType.RISK,
            sentiment_intensity=0.95,
            source_region=Region.US,
        )
        for _ in range(10):
            store.upsert("SPY", n)
        tracker = NarrativeVelocityTracker(store)
        velocities = tracker.compute_velocity("SPY")
        assert len(velocities) == 1
        assert velocities[0].mentions_per_day == 10.0
        assert velocities[0].days_active == 1


class TestNarrativeEngine:
    @staticmethod
    def _make_mock_client():
        """Create a mock that passes AdalFlow's isinstance(ModelClient) check."""
        import adalflow as adal
        mock = MagicMock(spec=adal.ModelClient)
        return mock

    def test_engine_init(self, tmp_db: Path) -> None:
        """Engine initializes without errors (mocked LLM client)."""
        engine = NarrativeEngine(db_path=tmp_db, model_client=self._make_mock_client())
        assert engine.store is not None

    @pytest.mark.asyncio
    async def test_process_and_track_mocked(self, tmp_db: Path) -> None:
        """End-to-end with mocked extractor."""
        engine = NarrativeEngine(db_path=tmp_db, model_client=self._make_mock_client())

        # Mock the extractor to return a known narrative
        mock_narrative = Narrative(
            narrative_title="Quantum Leap",
            narrative_type=NarrativeType.INNOVATION,
            entities_mentioned=["GOOG", "IBM"],
            sentiment_intensity=0.75,
            source_region=Region.US,
            source_text_snippet="Google announces quantum supremacy milestone...",
        )
        engine._extractor.extract_batch = MagicMock(return_value=[mock_narrative])

        velocities = await engine.process_and_track(
            ticker="GOOG",
            region=Region.US,
            texts=["Google announces quantum supremacy milestone today."],
        )

        assert len(velocities) == 1
        assert velocities[0].narrative_title == "Quantum Leap"
        assert velocities[0].is_dominant is True

        # Verify stored
        stored = engine.get_ticker_narratives("GOOG")
        assert len(stored) == 1
