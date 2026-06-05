"""Multi-regime market detection using Hidden Markov Models.

Detects three market regimes per regional desk:
- TRENDING: sustained directional moves, lower volatility relative to trend
- MEAN_REVERTING: range-bound, oscillating around a central value
- CRISIS: high volatility, fat tails, correlation spikes

Architecture:
- GaussianHMM with 3 hidden states fitted on daily returns + volatility features
- Fallback to GARCH(1,1) volatility regime when insufficient data (<60 days)
- Confidence thresholding: regime_confidence <0.6 → "UNCERTAIN"

Integration:
- Called by base_agent.analyze() to enrich every InvestmentThesis with regime context
- Consumed by frontend RegimeIndicator component for visual display
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from enum import Enum
from typing import Any

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

# Minimum observations required for HMM fitting
_MIN_HMM_OBSERVATIONS = 60
# Minimum observations for GARCH fallback
_MIN_GARCH_OBSERVATIONS = 20
# Confidence threshold below which regime is flagged as uncertain
CONFIDENCE_THRESHOLD = 0.6
# Number of regimes
N_REGIMES = 3


class MarketRegime(str, Enum):
    """Three canonical market regimes (Bridgewater-inspired)."""

    TRENDING = "TRENDING"
    MEAN_REVERTING = "MEAN_REVERTING"
    CRISIS = "CRISIS"
    UNCERTAIN = "UNCERTAIN"  # When confidence < threshold


@dataclass(frozen=True)
class RegimeDetectionResult:
    """Output of regime detection for a single asset/desk."""

    current_regime: MarketRegime
    regime_confidence: float  # 0.0–1.0, posterior probability of assigned regime
    regime_duration_days: int  # consecutive days in current regime
    transition_probabilities: dict[str, float]  # probabilities of transitioning to each regime
    method: str  # "hmm" or "garch_fallback"

    def to_dict(self) -> dict[str, Any]:
        """Serialize for inclusion in InvestmentThesis."""
        return {
            "current_regime": self.current_regime.value,
            "regime_confidence": round(self.regime_confidence, 4),
            "regime_duration_days": self.regime_duration_days,
            "transition_probabilities": {
                k: round(v, 4) for k, v in self.transition_probabilities.items()
            },
            "method": self.method,
        }


# ---------------------------------------------------------------------------
# Feature engineering
# ---------------------------------------------------------------------------


def _compute_features(df: pd.DataFrame) -> np.ndarray:
    """Extract regime-discriminative features from OHLCV data.

    Features:
    1. Log returns (captures trend direction)
    2. Realized volatility (20-day rolling std of returns)
    3. Return-to-volatility ratio (trend strength signal)
    4. High-Low range normalized by close (intraday volatility proxy)

    Args:
        df: DataFrame with columns: Open, High, Low, Close, Volume (daily OHLCV)

    Returns:
        (n_samples, n_features) array with NaN rows dropped.
    """
    close = df["Close"].astype(float)
    high = df["High"].astype(float)
    low = df["Low"].astype(float)

    # Log returns
    log_returns = np.log(close / close.shift(1))

    # Realized volatility (20-day rolling)
    realized_vol = log_returns.rolling(window=20).std()

    # Trend strength: return / vol ratio (avoids division by zero)
    rolling_return = log_returns.rolling(window=20).mean()
    trend_strength = rolling_return / (realized_vol + 1e-8)

    # Normalized range (intraday vol proxy)
    norm_range = (high - low) / (close + 1e-8)

    features = pd.DataFrame({
        "log_return": log_returns,
        "realized_vol": realized_vol,
        "trend_strength": trend_strength,
        "norm_range": norm_range,
    }).replace([np.inf, -np.inf], np.nan).dropna()

    return features.values


# ---------------------------------------------------------------------------
# HMM regime detection (primary method)
# ---------------------------------------------------------------------------

# Regime label assignment based on state characteristics:
# - Highest volatility state → CRISIS
# - Highest |mean return| / vol ratio → TRENDING
# - Remaining → MEAN_REVERTING


def _assign_regime_labels(model: Any) -> list[MarketRegime]:
    """Map HMM hidden states to semantic regime labels based on learned parameters.

    Strategy:
    - State with highest mean realized_vol → CRISIS
    - Of remaining, state with highest |trend_strength| mean → TRENDING
    - Last state → MEAN_REVERTING
    """
    # model.means_ shape: (n_states, n_features)
    # Features: [log_return, realized_vol, trend_strength, norm_range]
    means = model.means_
    n_states = means.shape[0]

    # Index 1 = realized_vol, Index 2 = trend_strength
    vol_means = means[:, 1]  # realized volatility
    trend_means = np.abs(means[:, 2])  # absolute trend strength

    labels: list[MarketRegime | None] = [None] * n_states

    # Highest vol → CRISIS
    crisis_idx = int(np.argmax(vol_means))
    labels[crisis_idx] = MarketRegime.CRISIS

    # Of remaining, highest trend → TRENDING
    remaining = [i for i in range(n_states) if i != crisis_idx]
    trending_idx = remaining[int(np.argmax([trend_means[i] for i in remaining]))]
    labels[trending_idx] = MarketRegime.TRENDING

    # Last → MEAN_REVERTING
    for i in range(n_states):
        if labels[i] is None:
            labels[i] = MarketRegime.MEAN_REVERTING

    return labels  # type: ignore[return-value]


def _compute_regime_duration(states: np.ndarray, current_state: int) -> int:
    """Count consecutive days the asset has been in the current regime."""
    duration = 0
    for s in reversed(states):
        if s == current_state:
            duration += 1
        else:
            break
    return max(duration, 1)


def detect_regime_hmm(df: pd.DataFrame) -> RegimeDetectionResult:
    """Detect market regime using a Gaussian HMM.

    Args:
        df: OHLCV DataFrame (must have Open, High, Low, Close, Volume columns).
            Should contain at least 60 rows for reliable fitting.

    Returns:
        RegimeDetectionResult with regime, confidence, duration, and transitions.

    Raises:
        ValueError: If insufficient data (< MIN_HMM_OBSERVATIONS after feature computation)
            or if features are degenerate (e.g. constant price / stablecoin).
    """
    import warnings

    from hmmlearn.hmm import GaussianHMM

    features = _compute_features(df)

    if len(features) < _MIN_HMM_OBSERVATIONS:
        raise ValueError(
            f"Insufficient data for HMM: {len(features)} observations "
            f"(need {_MIN_HMM_OBSERVATIONS})"
        )

    # Guard against degenerate features (e.g. stablecoins with ~zero variance)
    feature_stds = np.std(features, axis=0)
    if np.any(feature_stds < 1e-10):
        raise ValueError(
            "Degenerate features detected (near-zero variance) — "
            "asset may have constant price (e.g. stablecoin)"
        )

    # Fit GaussianHMM with 3 states; suppress ConvergenceWarning (common with
    # short financial data — partial convergence still yields usable posteriors)
    model = GaussianHMM(
        n_components=N_REGIMES,
        covariance_type="full",
        n_iter=100,
        random_state=42,
        tol=0.01,
    )

    with warnings.catch_warnings():
        warnings.filterwarnings("ignore", message=".*did not converge.*")
        model.fit(features)

    # Predict hidden states
    states = model.predict(features)
    posteriors = model.predict_proba(features)

    # Guard against NaN posteriors (can occur with near-singular covariance)
    if np.any(np.isnan(posteriors[-1])):
        raise ValueError("HMM produced NaN posteriors — model fit is degenerate")

    # Map states to semantic labels
    state_labels = _assign_regime_labels(model)

    # Current regime (last observation)
    current_state = int(states[-1])
    current_label = state_labels[current_state]
    confidence = float(posteriors[-1, current_state])

    # If confidence below threshold, flag as uncertain
    if confidence < CONFIDENCE_THRESHOLD:
        current_label = MarketRegime.UNCERTAIN

    # Regime duration
    duration = _compute_regime_duration(states, current_state)

    # Transition probabilities from current state
    transmat_row = model.transmat_[current_state]
    transition_probs = {
        state_labels[i].value: float(transmat_row[i])
        for i in range(N_REGIMES)
    }

    return RegimeDetectionResult(
        current_regime=current_label,
        regime_confidence=confidence,
        regime_duration_days=duration,
        transition_probabilities=transition_probs,
        method="hmm",
    )


# ---------------------------------------------------------------------------
# GARCH(1,1) fallback for insufficient data
# ---------------------------------------------------------------------------


def detect_regime_garch_fallback(df: pd.DataFrame) -> RegimeDetectionResult:
    """Fallback regime detection using GARCH(1,1) volatility estimation.

    Used when HMM has insufficient data (newly listed assets, <60 days).
    Classifies based on conditional volatility percentile:
    - Top 25% → CRISIS
    - Bottom 25% → TRENDING (low vol = sustained moves)
    - Middle 50% → MEAN_REVERTING

    Args:
        df: OHLCV DataFrame with at least 20 rows.

    Returns:
        RegimeDetectionResult with regime classification.

    Raises:
        ValueError: If insufficient data (< MIN_GARCH_OBSERVATIONS).
    """
    close = df["Close"].astype(float)
    log_rets = np.log(close / close.shift(1))
    returns = log_rets.replace([np.inf, -np.inf], np.nan).dropna().values

    if len(returns) < _MIN_GARCH_OBSERVATIONS:
        raise ValueError(
            f"Insufficient data for GARCH fallback: {len(returns)} observations "
            f"(need {_MIN_GARCH_OBSERVATIONS})"
        )

    # Simple GARCH(1,1) implementation (no arch dependency needed)
    # σ²_t = ω + α·ε²_{t-1} + β·σ²_{t-1}
    # Use typical parameters: ω=0.00001, α=0.1, β=0.85
    omega = 0.00001
    alpha = 0.1
    beta = 0.85

    n = len(returns)
    sigma2 = np.zeros(n)
    sigma2[0] = np.var(returns)  # Initialize with unconditional variance

    for t in range(1, n):
        sigma2[t] = omega + alpha * returns[t - 1] ** 2 + beta * sigma2[t - 1]

    # Current conditional volatility
    current_vol = np.sqrt(sigma2[-1])
    vol_series = np.sqrt(sigma2)

    # Percentile-based classification
    sorted_vol = np.sort(vol_series)
    percentile = np.searchsorted(sorted_vol, current_vol) / len(vol_series)

    if percentile >= 0.75:
        regime = MarketRegime.CRISIS
        confidence = min(0.5 + (percentile - 0.75) * 2, 0.85)  # Scale confidence
    elif percentile <= 0.25:
        regime = MarketRegime.TRENDING
        confidence = min(0.5 + (0.25 - percentile) * 2, 0.85)  # Scale confidence
    else:
        regime = MarketRegime.MEAN_REVERTING
        confidence = 0.5 + (0.5 - abs(percentile - 0.5)) * 0.6  # Highest at center

    # Classify regime before confidence thresholding (needed for transition probs)
    classified_regime = regime

    # Flag uncertain if below threshold
    if confidence < CONFIDENCE_THRESHOLD:
        regime = MarketRegime.UNCERTAIN

    # Simple duration: count consecutive days in same vol quartile
    quartile_current = _vol_percentile_to_quartile(percentile)
    duration = 1
    for i in range(len(vol_series) - 2, -1, -1):
        p = np.searchsorted(sorted_vol, vol_series[i]) / len(vol_series)
        if _vol_percentile_to_quartile(p) == quartile_current:
            duration += 1
        else:
            break

    # Approximate transition probabilities (bias toward self-persistence)
    # Use classified_regime (not UNCERTAIN) for transition bias
    transition_probs = _UNIFORM_TRANSITION_PROBS.copy()
    transition_probs[classified_regime.value] = 0.6
    remaining_prob = 0.4 / 2
    for k in transition_probs:
        if k != classified_regime.value:
            transition_probs[k] = remaining_prob

    return RegimeDetectionResult(
        current_regime=regime,
        regime_confidence=confidence,
        regime_duration_days=duration,
        transition_probabilities=transition_probs,
        method="garch_fallback",
    )


# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------

_UNIFORM_TRANSITION_PROBS: dict[str, float] = {
    MarketRegime.TRENDING.value: 0.33,
    MarketRegime.MEAN_REVERTING.value: 0.34,
    MarketRegime.CRISIS.value: 0.33,
}


def _vol_percentile_to_quartile(percentile: float) -> int:
    """Map a volatility percentile to quartile bucket (0=low, 1=mid, 2=high)."""
    if percentile >= 0.75:
        return 2
    elif percentile <= 0.25:
        return 0
    return 1


def _uncertain_result(method: str) -> RegimeDetectionResult:
    """Construct a standard UNCERTAIN result (DRY helper)."""
    return RegimeDetectionResult(
        current_regime=MarketRegime.UNCERTAIN,
        regime_confidence=0.0,
        regime_duration_days=0,
        transition_probabilities=_UNIFORM_TRANSITION_PROBS.copy(),
        method=method,
    )


# ---------------------------------------------------------------------------
# Public API — unified entry point
# ---------------------------------------------------------------------------

# Desk-to-representative-ticker mapping for desk-level regime detection
DESK_REPRESENTATIVE_TICKERS: dict[str, str] = {
    "US": "SPY",       # S&P 500 ETF
    "CN": "000300.SS",  # CSI 300 (via Yahoo)
    "EU": "STOXX50E",  # Euro Stoxx 50
    "JP": "^N225",     # Nikkei 225
    "CRYPTO": "BTC-USD",  # Bitcoin as crypto regime proxy
}


async def detect_regime(
    ticker: str | None = None,
    desk: str | None = None,
    ohlcv_df: pd.DataFrame | None = None,
    lookback_days: int = 252,
) -> RegimeDetectionResult:
    """Detect the current market regime for a ticker or desk.

    Priority:
    1. If ohlcv_df is provided, use it directly (for testing / pre-fetched data)
    2. If ticker is provided, fetch via yfinance
    3. If only desk is provided, use the desk's representative index ticker

    Args:
        ticker: Asset ticker symbol (yfinance format)
        desk: Desk name ("US", "CN", "EU", "JP", "CRYPTO")
        ohlcv_df: Pre-fetched OHLCV DataFrame (optional)
        lookback_days: Number of trading days to fetch (default: 252 = ~1 year)

    Returns:
        RegimeDetectionResult with current regime and metadata.
    """
    if ohlcv_df is None:
        # Resolve ticker
        resolved_ticker = ticker
        if resolved_ticker is None and desk:
            resolved_ticker = DESK_REPRESENTATIVE_TICKERS.get(desk.upper())
        if resolved_ticker is None:
            logger.warning("No ticker or desk provided for regime detection; defaulting to SPY")
            resolved_ticker = "SPY"

        # Fetch OHLCV data via yfinance
        ohlcv_df = await _fetch_ohlcv(resolved_ticker, lookback_days)

    if ohlcv_df is None or ohlcv_df.empty:
        logger.warning("No OHLCV data available — returning UNCERTAIN regime")
        return _uncertain_result("no_data")

    # Try HMM first, fall back to GARCH
    try:
        return detect_regime_hmm(ohlcv_df)
    except ValueError as e:
        logger.info("HMM insufficient data (%s), trying GARCH fallback", e)
        try:
            return detect_regime_garch_fallback(ohlcv_df)
        except ValueError as e2:
            logger.warning("GARCH fallback also insufficient (%s) — returning UNCERTAIN", e2)
            return _uncertain_result("insufficient_data")


async def _fetch_ohlcv(ticker: str, lookback_days: int) -> pd.DataFrame | None:
    """Fetch OHLCV data via yfinance (async-compatible wrapper).

    Uses the existing YFinanceClient pattern from data/yfinance_client.py.
    """
    import asyncio

    def _sync_fetch() -> pd.DataFrame | None:
        try:
            import yfinance as yf

            period = "1y" if lookback_days <= 252 else "2y"
            data = yf.Ticker(ticker).history(period=period)
            if data is not None and not data.empty:
                return data
        except Exception as exc:
            logger.warning("yfinance fetch failed for %s: %s", ticker, exc)
        return None

    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, _sync_fetch)
