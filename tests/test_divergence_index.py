import pytest
import math
from datetime import datetime, timezone
from pathlib import Path
from reasoning.divergence_index import (
    _tokenize,
    _cosine_distance,
    calculate_divergence,
    DivergenceStore,
    DivergenceMetrics,
)
from reasoning.trace_schema import InvestmentThesis, Direction, AssetClass, Region

def test_tokenize():
    text = "Hello, World! This is AAPL stock's 10-Q report."
    tokens = _tokenize(text)
    assert "hello" in tokens
    assert "world" in tokens
    assert "aapl" in tokens
    assert "stock" in tokens
    # One letter words/punctuation should be ignored
    assert "s" not in tokens
    assert "is" in tokens


def test_cosine_distance():
    # Identical texts should have 0 distance (1.0 similarity)
    text_a = "extremely bullish stock setup long strategy"
    text_b = "extremely bullish stock setup long strategy"
    assert math.isclose(_cosine_distance(text_a, text_b), 0.0, abs_tol=1e-5)

    # Completely disjoint texts should have 1.0 distance
    text_c = "apple microsoft technology standard"
    text_d = "banana strawberry fruits yellow red"
    assert math.isclose(_cosine_distance(text_c, text_d), 1.0, abs_tol=1e-5)

    # Partial overlap
    dist = _cosine_distance("bullish stance on growth stock", "bearish stance on technology stock")
    assert 0.0 < dist < 1.0


def test_calculate_divergence_all_consensus():
    # 3 desks, all say LONG with same confidence, same summaries
    theses = [
        {
            "direction": "LONG",
            "confidence_score": 0.8,
            "thesis_summary_en": "bullish stock setup on technology",
        },
        {
            "direction": "LONG",
            "confidence_score": 0.8,
            "thesis_summary_en": "bullish stock setup on technology",
        },
        {
            "direction": "LONG",
            "confidence_score": 0.8,
            "thesis_summary_en": "bullish stock setup on technology",
        },
    ]

    metrics = calculate_divergence(theses, "AAPL")
    assert metrics is not None
    assert metrics.ticker == "AAPL"
    assert math.isclose(metrics.direction_divergence, 0.0)
    assert math.isclose(metrics.confidence_divergence, 0.0)
    assert math.isclose(metrics.narrative_divergence, 0.0)
    assert math.isclose(metrics.composite_divergence, 0.0)


def test_calculate_divergence_maximum_divergence():
    # 2 desks: 1 LONG, 1 SHORT; confidences completely opposite (1.0 vs 0.0); summaries completely disjoint
    theses = [
        {
            "direction": "LONG",
            "confidence_score": 1.0,
            "thesis_summary_en": "apple technology growth",
        },
        {
            "direction": "SHORT",
            "confidence_score": 0.0,
            "thesis_summary_en": "banana strawberry red fruits",
        },
    ]

    metrics = calculate_divergence(theses, "AAPL")
    assert metrics is not None
    # 2 desks: max frequency of direction is 1. (2 - 1) / 2 = 0.5 direction divergence.
    assert math.isclose(metrics.direction_divergence, 0.5)
    # Std dev of [1.0, 0.0] is 0.5. Scale std_dev * 2.0 = 1.0 confidence divergence.
    assert math.isclose(metrics.confidence_divergence, 1.0)
    # Disjoint summaries: narrative divergence is 1.0.
    assert math.isclose(metrics.narrative_divergence, 1.0)
    # Composite: 0.4*0.5 + 0.3*1.0 + 0.3*1.0 = 0.2 + 0.3 + 0.3 = 0.8 -> 80.0
    assert math.isclose(metrics.composite_divergence, 80.0)


def test_calculate_divergence_single_or_empty():
    assert calculate_divergence([], "AAPL") is None
    
    metrics = calculate_divergence([{"direction": "LONG", "confidence": 0.7}], "AAPL")
    assert metrics is not None
    assert metrics.composite_divergence == 0.0


def test_calculate_divergence_partial_data():
    # 3 desks, but some data is missing or incomplete
    theses = [
        {
            "direction": "LONG",
            "confidence_score": 0.8,
            # missing summary
        },
        {
            # missing direction
            "confidence_score": 0.4,
            "thesis_summary_en": "bullish stock setup on technology",
        },
        {
            "direction": "SHORT",
            # missing confidence
            "thesis_summary_en": "bearish stance on technology stock",
        },
    ]

    metrics = calculate_divergence(theses, "AAPL")
    assert metrics is not None
    # 2 directions present (LONG, SHORT) -> max count = 1. (2 - 1)/2 = 0.5 direction divergence
    assert math.isclose(metrics.direction_divergence, 0.5)
    # 2 confidences present (0.8, 0.4) -> mean = 0.6, variance = 0.04, std_dev = 0.2. scaled = 0.4
    assert math.isclose(metrics.confidence_divergence, 0.4)
    # 2 summaries present -> cosine distance
    assert 0.0 < metrics.narrative_divergence < 1.0


def test_divergence_store(tmp_path):
    db_file = tmp_path / "test_divergence.db"
    store = DivergenceStore(db_path=db_file)
    
    # Save a metrics calculation
    metrics = DivergenceMetrics(
        ticker="BTC",
        composite_divergence=45.5,
        direction_divergence=0.3333,
        confidence_divergence=0.25,
        narrative_divergence=0.6,
    )
    store.save_divergence(metrics)
    
    retrieved = store.get_latest_divergence("BTC")
    assert retrieved is not None
    assert retrieved.ticker == "BTC"
    assert retrieved.composite_divergence == 45.5
    assert retrieved.direction_divergence == 0.3333
    assert retrieved.confidence_divergence == 0.25
    assert retrieved.narrative_divergence == 0.6
    assert isinstance(retrieved.timestamp, datetime)

    # Missing ticker
    assert store.get_latest_divergence("ETH") is None
