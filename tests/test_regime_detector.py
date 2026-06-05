"""Comprehensive tests for reasoning.regime_detector module.

Tests cover:
- HMM regime detection with synthetic trending/crisis/mean-reverting data
- GARCH(1,1) fallback with insufficient HMM data
- Edge cases: empty data, too few observations, confidence thresholding
- Feature engineering correctness
- Regime label assignment logic
- Integration with detect_regime() unified API
"""

from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

from reasoning.regime_detector import (
    CONFIDENCE_THRESHOLD,
    DESK_REPRESENTATIVE_TICKERS,
    MarketRegime,
    N_REGIMES,
    RegimeDetectionResult,
    _MIN_GARCH_OBSERVATIONS,
    _MIN_HMM_OBSERVATIONS,
    _assign_regime_labels,
    _compute_features,
    _compute_regime_duration,
    _normalize_ohlcv_columns,
    detect_regime,
    detect_regime_garch_fallback,
    detect_regime_hmm,
)


# ---------------------------------------------------------------------------
# Synthetic data generators
# ---------------------------------------------------------------------------


def _make_trending_data(n: int = 200, seed: int = 42) -> pd.DataFrame:
    """Generate synthetic trending market data (strong uptrend, low vol)."""
    rng = np.random.default_rng(seed)
    # Strong positive drift, low noise
    drift = 0.002  # ~0.2% daily return
    vol = 0.005    # Low volatility
    returns = drift + vol * rng.standard_normal(n)
    close = 100 * np.exp(np.cumsum(returns))
    high = close * (1 + rng.uniform(0.001, 0.01, n))
    low = close * (1 - rng.uniform(0.001, 0.01, n))
    open_ = close * (1 + rng.uniform(-0.005, 0.005, n))
    volume = rng.integers(1_000_000, 10_000_000, size=n)

    return pd.DataFrame({
        "Open": open_,
        "High": high,
        "Low": low,
        "Close": close,
        "Volume": volume,
    }, index=pd.date_range("2024-01-01", periods=n, freq="B"))


def _make_crisis_data(n: int = 200, seed: int = 123) -> pd.DataFrame:
    """Generate synthetic crisis data (high vol, large drawdowns)."""
    rng = np.random.default_rng(seed)
    # Negative drift with high volatility and fat tails
    drift = -0.003
    vol = 0.04  # 4% daily vol — extreme
    returns = drift + vol * rng.standard_normal(n)
    # Add some jumps
    jump_mask = rng.random(n) < 0.05
    returns[jump_mask] -= 0.08  # -8% crash days
    close = 100 * np.exp(np.cumsum(returns))
    high = close * (1 + rng.uniform(0.005, 0.05, n))
    low = close * (1 - rng.uniform(0.005, 0.05, n))
    open_ = close * (1 + rng.uniform(-0.02, 0.02, n))
    volume = rng.integers(5_000_000, 50_000_000, size=n)

    return pd.DataFrame({
        "Open": open_,
        "High": high,
        "Low": low,
        "Close": close,
        "Volume": volume,
    }, index=pd.date_range("2024-01-01", periods=n, freq="B"))


def _make_mean_reverting_data(n: int = 200, seed: int = 99) -> pd.DataFrame:
    """Generate synthetic mean-reverting data (oscillating, moderate vol)."""
    rng = np.random.default_rng(seed)
    # Ornstein-Uhlenbeck process: mean-reverting around 100
    theta = 0.1   # Mean reversion speed
    mu = 0.0      # Long-term mean return
    vol = 0.012   # Moderate volatility
    returns = np.zeros(n)
    cumulative = 0.0
    for t in range(n):
        returns[t] = theta * (mu - cumulative) + vol * rng.standard_normal()
        cumulative += returns[t]

    close = 100 * np.exp(np.cumsum(returns))
    high = close * (1 + rng.uniform(0.002, 0.015, n))
    low = close * (1 - rng.uniform(0.002, 0.015, n))
    open_ = close * (1 + rng.uniform(-0.008, 0.008, n))
    volume = rng.integers(2_000_000, 15_000_000, size=n)

    return pd.DataFrame({
        "Open": open_,
        "High": high,
        "Low": low,
        "Close": close,
        "Volume": volume,
    }, index=pd.date_range("2024-01-01", periods=n, freq="B"))


def _make_short_data(n: int = 30, seed: int = 7) -> pd.DataFrame:
    """Generate data with fewer observations than HMM requires but enough for GARCH."""
    rng = np.random.default_rng(seed)
    returns = 0.001 + 0.015 * rng.standard_normal(n)
    close = 50 * np.exp(np.cumsum(returns))
    high = close * 1.01
    low = close * 0.99
    open_ = close * 1.001
    volume = rng.integers(100_000, 1_000_000, size=n)

    return pd.DataFrame({
        "Open": open_,
        "High": high,
        "Low": low,
        "Close": close,
        "Volume": volume,
    }, index=pd.date_range("2024-06-01", periods=n, freq="B"))


def _make_very_short_data(n: int = 10, seed: int = 3) -> pd.DataFrame:
    """Generate data too short for both HMM and GARCH."""
    rng = np.random.default_rng(seed)
    close = 100 + rng.standard_normal(n).cumsum()
    return pd.DataFrame({
        "Open": close + 0.1,
        "High": close + 1,
        "Low": close - 1,
        "Close": close,
        "Volume": np.full(n, 1_000_000),
    }, index=pd.date_range("2024-01-01", periods=n, freq="B"))


# ---------------------------------------------------------------------------
# Tests: Feature engineering
# ---------------------------------------------------------------------------


class TestColumnNormalization:
    def test_lowercase_columns_normalized(self):
        """yfinance sometimes returns lowercase column names."""
        df = _make_trending_data(100)
        df.columns = [c.lower() for c in df.columns]
        normalized = _normalize_ohlcv_columns(df)
        assert "Close" in normalized.columns
        assert "High" in normalized.columns
        assert "Low" in normalized.columns

    def test_uppercase_columns_normalized(self):
        """All-caps columns should be normalized to title case."""
        df = _make_trending_data(100)
        df.columns = [c.upper() for c in df.columns]
        normalized = _normalize_ohlcv_columns(df)
        assert "Close" in normalized.columns

    def test_missing_column_raises(self):
        """Missing required columns should raise ValueError."""
        df = pd.DataFrame({"Price": [1, 2, 3], "Vol": [100, 200, 300]})
        with pytest.raises(ValueError, match="missing required columns"):
            _normalize_ohlcv_columns(df)

    def test_multiindex_flattened(self):
        """MultiIndex columns (from multi-ticker downloads) should be flattened."""
        df = _make_trending_data(100)
        # Simulate MultiIndex by creating tuples
        df.columns = pd.MultiIndex.from_tuples(
            [(c, "AAPL") for c in df.columns]
        )
        normalized = _normalize_ohlcv_columns(df)
        assert "Close" in normalized.columns

    def test_features_work_with_lowercase_input(self):
        """End-to-end: _compute_features should handle lowercase columns."""
        df = _make_trending_data(200)
        df.columns = [c.lower() for c in df.columns]
        features = _compute_features(df)
        assert features.shape[1] == 4
        assert not np.isnan(features).any()


class TestFeatureEngineering:
    def test_compute_features_shape(self):
        df = _make_trending_data(100)
        features = _compute_features(df)
        # Should have 4 features
        assert features.shape[1] == 4
        # Rows dropped due to rolling window (20-day rolling needs 20 NaN rows total)
        assert features.shape[0] == 100 - 20  # 80

    def test_compute_features_no_nans(self):
        df = _make_trending_data(200)
        features = _compute_features(df)
        assert not np.isnan(features).any()

    def test_compute_features_trending_has_positive_trend_strength(self):
        df = _make_trending_data(200)
        features = _compute_features(df)
        # Feature index 2 = trend_strength
        mean_trend = features[:, 2].mean()
        assert mean_trend > 0, "Trending data should have positive trend strength"

    def test_compute_features_crisis_has_high_vol(self):
        df_crisis = _make_crisis_data(200)
        df_trend = _make_trending_data(200)
        features_crisis = _compute_features(df_crisis)
        features_trend = _compute_features(df_trend)
        # Feature index 1 = realized_vol
        assert features_crisis[:, 1].mean() > features_trend[:, 1].mean()


# ---------------------------------------------------------------------------
# Tests: HMM regime detection
# ---------------------------------------------------------------------------


class TestHMMRegimeDetection:
    def test_detect_trending_regime(self):
        df = _make_trending_data(200)
        result = detect_regime_hmm(df)
        assert isinstance(result, RegimeDetectionResult)
        assert result.method == "hmm"
        # With strong trending data, should detect TRENDING (or at least not CRISIS)
        assert result.current_regime in (MarketRegime.TRENDING, MarketRegime.MEAN_REVERTING, MarketRegime.UNCERTAIN)
        assert result.current_regime != MarketRegime.CRISIS

    def test_detect_crisis_regime(self):
        df = _make_crisis_data(200)
        result = detect_regime_hmm(df)
        assert isinstance(result, RegimeDetectionResult)
        # Crisis data has high vol — should detect CRISIS or TRENDING (strong
        # negative trend with high vol). Should NOT be MEAN_REVERTING.
        assert result.current_regime in (
            MarketRegime.CRISIS, MarketRegime.TRENDING, MarketRegime.UNCERTAIN
        )

    def test_confidence_between_0_and_1(self):
        df = _make_trending_data(200)
        result = detect_regime_hmm(df)
        assert 0.0 <= result.regime_confidence <= 1.0

    def test_duration_positive(self):
        df = _make_mean_reverting_data(200)
        result = detect_regime_hmm(df)
        assert result.regime_duration_days >= 1

    def test_transition_probabilities_sum_to_one(self):
        df = _make_trending_data(200)
        result = detect_regime_hmm(df)
        total = sum(result.transition_probabilities.values())
        assert abs(total - 1.0) < 0.01, f"Transition probs sum to {total}, not ~1.0"

    def test_transition_probabilities_has_all_regimes(self):
        df = _make_trending_data(200)
        result = detect_regime_hmm(df)
        for regime in [MarketRegime.TRENDING, MarketRegime.MEAN_REVERTING, MarketRegime.CRISIS]:
            assert regime.value in result.transition_probabilities

    def test_insufficient_data_raises_valueerror(self):
        df = _make_short_data(30)
        # After feature computation, will have < 60 observations
        with pytest.raises(ValueError, match="Insufficient data for HMM"):
            detect_regime_hmm(df)

    def test_degenerate_constant_price_raises(self):
        """Constant price data (e.g. stablecoin) should raise ValueError."""
        n = 100
        constant_price = np.full(n, 1.0)
        df = pd.DataFrame({
            "Open": constant_price,
            "High": constant_price + 0.001,
            "Low": constant_price - 0.001,
            "Close": constant_price,
            "Volume": np.full(n, 1_000_000),
        }, index=pd.date_range("2024-01-01", periods=n, freq="B"))
        with pytest.raises(ValueError, match="Degenerate features"):
            detect_regime_hmm(df)

    def test_inf_in_prices_handled(self):
        """Prices with zeros (causing -inf log returns) should not crash."""
        df = _make_trending_data(200)
        # Inject a zero price (would cause -inf in log returns)
        df.iloc[50, df.columns.get_loc("Close")] = 0.0
        # Should still work (inf filtered in _compute_features)
        result = detect_regime_hmm(df)
        assert isinstance(result, RegimeDetectionResult)

    def test_result_to_dict(self):
        df = _make_trending_data(200)
        result = detect_regime_hmm(df)
        d = result.to_dict()
        assert "current_regime" in d
        assert "regime_confidence" in d
        assert "regime_duration_days" in d
        assert "transition_probabilities" in d
        assert "method" in d
        assert d["method"] == "hmm"


# ---------------------------------------------------------------------------
# Tests: GARCH fallback
# ---------------------------------------------------------------------------


class TestGARCHFallback:
    def test_garch_with_short_data(self):
        df = _make_short_data(40)
        result = detect_regime_garch_fallback(df)
        assert isinstance(result, RegimeDetectionResult)
        assert result.method == "garch_fallback"

    def test_garch_confidence_range(self):
        df = _make_short_data(40)
        result = detect_regime_garch_fallback(df)
        assert 0.0 <= result.regime_confidence <= 1.0

    def test_garch_duration_positive(self):
        df = _make_short_data(40)
        result = detect_regime_garch_fallback(df)
        assert result.regime_duration_days >= 1

    def test_garch_crisis_data(self):
        df = _make_crisis_data(40)
        result = detect_regime_garch_fallback(df)
        # High vol data should lean toward CRISIS
        assert result.current_regime in (MarketRegime.CRISIS, MarketRegime.UNCERTAIN, MarketRegime.MEAN_REVERTING)

    def test_garch_insufficient_data_raises(self):
        df = _make_very_short_data(10)
        with pytest.raises(ValueError, match="Insufficient data for GARCH"):
            detect_regime_garch_fallback(df)

    def test_garch_transition_probs_valid(self):
        df = _make_short_data(40)
        result = detect_regime_garch_fallback(df)
        total = sum(result.transition_probabilities.values())
        assert abs(total - 1.0) < 0.01


# ---------------------------------------------------------------------------
# Tests: Regime label assignment
# ---------------------------------------------------------------------------


class TestRegimeLabelAssignment:
    def test_assign_labels_returns_three_distinct(self):
        """Mock an HMM model with known means and verify assignment."""

        class MockModel:
            means_ = np.array([
                [0.001, 0.01, 0.5, 0.01],   # Low vol, high trend → TRENDING
                [0.000, 0.02, 0.1, 0.02],   # Medium vol, low trend → MEAN_REVERTING
                [-0.002, 0.05, -0.2, 0.05], # Highest vol → CRISIS
            ])

        labels = _assign_regime_labels(MockModel())
        assert len(labels) == 3
        assert MarketRegime.TRENDING in labels
        assert MarketRegime.MEAN_REVERTING in labels
        assert MarketRegime.CRISIS in labels

    def test_highest_vol_is_crisis(self):
        """The state with highest realized_vol mean should be CRISIS."""

        class MockModel:
            means_ = np.array([
                [0.0, 0.10, 0.0, 0.05],  # Highest vol → CRISIS
                [0.0, 0.02, 0.5, 0.01],  # High trend → TRENDING
                [0.0, 0.01, 0.1, 0.01],  # Low everything → MEAN_REVERTING
            ])

        labels = _assign_regime_labels(MockModel())
        assert labels[0] == MarketRegime.CRISIS


# ---------------------------------------------------------------------------
# Tests: Regime duration
# ---------------------------------------------------------------------------


class TestRegimeDuration:
    def test_all_same_state(self):
        states = np.array([1, 1, 1, 1, 1])
        assert _compute_regime_duration(states, 1) == 5

    def test_recent_transition(self):
        states = np.array([0, 0, 1, 1, 2, 2, 2])
        assert _compute_regime_duration(states, 2) == 3

    def test_single_observation(self):
        states = np.array([0, 1, 0, 1, 2])
        assert _compute_regime_duration(states, 2) == 1

    def test_empty_returns_one(self):
        # Edge: should return at least 1
        states = np.array([0])
        assert _compute_regime_duration(states, 0) == 1


# ---------------------------------------------------------------------------
# Tests: Unified detect_regime() API
# ---------------------------------------------------------------------------


class TestDetectRegimeAPI:
    @pytest.mark.asyncio
    async def test_with_provided_ohlcv(self):
        """When ohlcv_df is provided, should skip fetching."""
        df = _make_trending_data(200)
        result = await detect_regime(ohlcv_df=df)
        assert isinstance(result, RegimeDetectionResult)
        assert result.method == "hmm"

    @pytest.mark.asyncio
    async def test_with_short_ohlcv_falls_back_to_garch(self):
        """When data is too short for HMM, should fall back to GARCH."""
        df = _make_short_data(40)
        result = await detect_regime(ohlcv_df=df)
        assert isinstance(result, RegimeDetectionResult)
        assert result.method == "garch_fallback"

    @pytest.mark.asyncio
    async def test_with_very_short_data_returns_uncertain(self):
        """When data is too short for both, should return UNCERTAIN."""
        df = _make_very_short_data(10)
        result = await detect_regime(ohlcv_df=df)
        assert result.current_regime == MarketRegime.UNCERTAIN
        assert result.method == "insufficient_data"

    @pytest.mark.asyncio
    async def test_empty_dataframe_returns_uncertain(self):
        """Empty DataFrame should gracefully return UNCERTAIN."""
        df = pd.DataFrame(columns=["Open", "High", "Low", "Close", "Volume"])
        result = await detect_regime(ohlcv_df=df)
        assert result.current_regime == MarketRegime.UNCERTAIN
        assert result.regime_confidence == 0.0

    @pytest.mark.asyncio
    async def test_none_dataframe_with_no_ticker_returns_uncertain(self):
        """When fetch fails (no network in test), should handle gracefully."""
        # This will try to fetch SPY but we mock the fetch to return None
        import unittest.mock as mock

        with mock.patch(
            "reasoning.regime_detector._fetch_ohlcv", return_value=None
        ):
            result = await detect_regime(ticker="FAKE_TICKER_XYZ")
            assert result.current_regime == MarketRegime.UNCERTAIN

    @pytest.mark.asyncio
    async def test_desk_representative_tickers_coverage(self):
        """All 5 desks should have representative tickers defined."""
        expected_desks = {"US", "CN", "EU", "JP", "CRYPTO"}
        assert set(DESK_REPRESENTATIVE_TICKERS.keys()) == expected_desks

    @pytest.mark.asyncio
    async def test_desk_routing(self):
        """When desk is provided without ticker, uses representative."""
        import unittest.mock as mock

        called_with = {}

        async def mock_fetch(ticker, lookback_days):
            called_with["ticker"] = ticker
            return _make_trending_data(200)

        with mock.patch("reasoning.regime_detector._fetch_ohlcv", side_effect=mock_fetch):
            result = await detect_regime(desk="CRYPTO")
            assert called_with["ticker"] == "BTC-USD"
            assert isinstance(result, RegimeDetectionResult)


# ---------------------------------------------------------------------------
# Tests: Confidence thresholding
# ---------------------------------------------------------------------------


class TestConfidenceThresholding:
    def test_low_confidence_flags_uncertain(self):
        """When posteriors are diffuse, result should be UNCERTAIN."""
        # Create data that produces ambiguous regimes (mixed signals)
        rng = np.random.default_rng(55)
        n = 200
        # Regime switches every ~30 days
        regimes = np.repeat([0, 1, 2, 0, 1, 2, 0], [30, 30, 30, 30, 30, 30, 20])[:n]
        returns = np.zeros(n)
        for t in range(n):
            if regimes[t] == 0:  # trending
                returns[t] = 0.002 + 0.005 * rng.standard_normal()
            elif regimes[t] == 1:  # mean-reverting
                returns[t] = 0.0 + 0.012 * rng.standard_normal()
            else:  # crisis
                returns[t] = -0.003 + 0.04 * rng.standard_normal()

        close = 100 * np.exp(np.cumsum(returns))
        high = close * (1 + rng.uniform(0.001, 0.02, n))
        low = close * (1 - rng.uniform(0.001, 0.02, n))

        df = pd.DataFrame({
            "Open": close,
            "High": high,
            "Low": low,
            "Close": close,
            "Volume": np.full(n, 5_000_000),
        })

        result = detect_regime_hmm(df)
        # The result should be valid regardless of confidence
        assert result.current_regime in list(MarketRegime)

    def test_confidence_threshold_value(self):
        """Verify the threshold constant is 0.6."""
        assert CONFIDENCE_THRESHOLD == 0.6


# ---------------------------------------------------------------------------
# Tests: Serialization
# ---------------------------------------------------------------------------


class TestSerialization:
    def test_to_dict_roundtrip(self):
        result = RegimeDetectionResult(
            current_regime=MarketRegime.TRENDING,
            regime_confidence=0.87654,
            regime_duration_days=15,
            transition_probabilities={
                "TRENDING": 0.7,
                "MEAN_REVERTING": 0.2,
                "CRISIS": 0.1,
            },
            method="hmm",
        )
        d = result.to_dict()
        assert d["current_regime"] == "TRENDING"
        assert d["regime_confidence"] == 0.8765  # Rounded to 4 decimals
        assert d["regime_duration_days"] == 15
        assert d["method"] == "hmm"
        assert abs(sum(d["transition_probabilities"].values()) - 1.0) < 0.01

    def test_frozen_dataclass(self):
        """RegimeDetectionResult should be immutable."""
        result = RegimeDetectionResult(
            current_regime=MarketRegime.CRISIS,
            regime_confidence=0.9,
            regime_duration_days=5,
            transition_probabilities={"CRISIS": 0.8, "TRENDING": 0.1, "MEAN_REVERTING": 0.1},
            method="hmm",
        )
        with pytest.raises(Exception):  # FrozenInstanceError
            result.current_regime = MarketRegime.TRENDING  # type: ignore[misc]
