from __future__ import annotations

import math
from pathlib import Path

import pandas as pd

from reasoning.market_price_store import MarketPriceStore


def _prices(values: list[float], *, start: str = "2026-01-01", adj_multiplier: float | None = None) -> pd.DataFrame:
    index = pd.date_range(start, periods=len(values), freq="D")
    df = pd.DataFrame(
        {
            "Open": [v * 0.99 for v in values],
            "High": [v * 1.01 for v in values],
            "Low": [v * 0.98 for v in values],
            "Close": values,
            "Volume": [1_000_000 + i for i in range(len(values))],
        },
        index=index,
    )
    if adj_multiplier is not None:
        df["Adj Close"] = [v * adj_multiplier for v in values]
    return df


def test_upsert_and_retrieve_ohlcv(tmp_path: Path) -> None:
    store = MarketPriceStore(tmp_path / "prices.db")

    inserted = store.upsert_ohlcv("aapl", _prices([100, 101, 102]), source="unit")

    df = store.get_ohlcv("AAPL", source="unit")
    assert inserted == 3
    assert list(df["Close"]) == [100.0, 101.0, 102.0]
    assert store.latest_timestamp("AAPL", source="unit") is not None


def test_upsert_is_idempotent_and_updates_duplicate_rows(tmp_path: Path) -> None:
    store = MarketPriceStore(tmp_path / "prices.db")
    store.upsert_ohlcv("AAPL", _prices([100, 101]), source="unit")
    store.upsert_ohlcv("AAPL", _prices([110, 111]), source="unit")

    df = store.get_ohlcv("AAPL", source="unit")

    assert len(df) == 2
    assert list(df["Close"]) == [110.0, 111.0]


def test_malformed_rows_are_dropped(tmp_path: Path) -> None:
    store = MarketPriceStore(tmp_path / "prices.db")
    df = _prices([100, -1, 102])
    df.loc[df.index[2], "Close"] = float("nan")

    inserted = store.upsert_ohlcv("AAPL", df, source="unit")

    assert inserted == 1
    assert list(store.get_ohlcv("AAPL", source="unit")["Close"]) == [100.0]


def test_adjusted_close_preferred_for_log_returns(tmp_path: Path) -> None:
    store = MarketPriceStore(tmp_path / "prices.db")
    store.upsert_ohlcv("AAPL", _prices([100, 200, 300], adj_multiplier=0.5), source="unit")
    store.upsert_ohlcv("MSFT", _prices([50, 100, 150], adj_multiplier=1.0), source="unit")

    returns = store.get_log_returns(["AAPL", "MSFT"], lookback_days=None, source="unit")

    assert math.isclose(returns["AAPL"].iloc[0], math.log(100 / 50))
    assert math.isclose(returns["MSFT"].iloc[0], math.log(100 / 50))


def test_aligned_closes_inner_join(tmp_path: Path) -> None:
    store = MarketPriceStore(tmp_path / "prices.db")
    store.upsert_ohlcv("AAPL", _prices([100, 101, 102], start="2026-01-01"), source="unit")
    store.upsert_ohlcv("MSFT", _prices([200, 201, 202], start="2026-01-02"), source="unit")

    aligned = store.get_aligned_closes(["AAPL", "MSFT"], lookback_days=None, source="unit")

    assert list(aligned.columns) == ["AAPL", "MSFT"]
    assert len(aligned) == 2


def test_rolling_correlation_detects_high_positive_correlation(tmp_path: Path) -> None:
    store = MarketPriceStore(tmp_path / "prices.db")
    base = [100 + i for i in range(40)]
    other = [200 + 2 * i for i in range(40)]
    store.upsert_ohlcv("AAPL", _prices(base), source="unit")
    store.upsert_ohlcv("6758.T", _prices(other), source="unit")

    corr = store.rolling_correlation("AAPL", "6758.T", window_days=20, lookback_days=None)

    assert corr is not None
    assert corr > 0.99


def test_insufficient_overlap_returns_none(tmp_path: Path) -> None:
    store = MarketPriceStore(tmp_path / "prices.db")
    store.upsert_ohlcv("AAPL", _prices([100, 101, 102], start="2026-01-01"), source="unit")
    store.upsert_ohlcv("MSFT", _prices([200, 201, 202], start="2026-02-01"), source="unit")

    assert store.rolling_correlation("AAPL", "MSFT", window_days=20, lookback_days=None) is None


def test_empty_dataframe_input_is_safe(tmp_path: Path) -> None:
    store = MarketPriceStore(tmp_path / "prices.db")

    inserted = store.upsert_ohlcv("AAPL", pd.DataFrame(), source="unit")

    assert inserted == 0
    assert store.get_ohlcv("AAPL", source="unit").empty
