"""SQLite-backed market price history for Rosetta Alpha.

Stores normalized daily OHLCV bars so regime detection, contagion monitoring,
and future backtests can share one durable price-history layer.

Design:
- no extra network calls; producers upsert already-fetched OHLCV frames;
- adjusted close is preserved and preferred for return/correlation math;
- malformed rows are dropped rather than silently poisoning correlations;
- SQLite WAL mode matches the repository's other embedded stores.
"""

from __future__ import annotations

import math
import sqlite3
from collections.abc import Generator as PyGenerator
from contextlib import contextmanager
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

_DEFAULT_DB_PATH = Path(__file__).parent.parent / "data" / "market_prices.db"
_REQUIRED_PRICE_COLUMNS = {"Close"}


def _normalize_ticker(ticker: str) -> str:
    return str(ticker or "").upper().strip()


def _utc_now_iso() -> str:
    return datetime.now(UTC).isoformat()


def _normalize_ohlcv_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Normalize common OHLCV variants to title-case column names.

    Handles yfinance-style MultiIndex frames, lowercase columns, and adjusted
    close spellings such as ``Adj Close`` / ``adj_close``.
    """

    normalized = df.copy()
    if isinstance(normalized.columns, pd.MultiIndex):
        normalized.columns = [
            col[0] if isinstance(col, tuple) else col
            for col in normalized.columns
        ]

    rename: dict[Any, str] = {}
    for col in normalized.columns:
        key = str(col).strip().lower().replace("_", " ")
        if key == "open":
            rename[col] = "Open"
        elif key == "high":
            rename[col] = "High"
        elif key == "low":
            rename[col] = "Low"
        elif key == "close":
            rename[col] = "Close"
        elif key in {"adj close", "adjusted close"}:
            rename[col] = "Adj Close"
        elif key == "volume":
            rename[col] = "Volume"

    return normalized.rename(columns=rename)


def _to_float(value: Any) -> float | None:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(number):
        return None
    return number


def _timestamp_iso(value: Any) -> str | None:
    try:
        ts = pd.Timestamp(value)
    except (TypeError, ValueError):
        return None
    if pd.isna(ts):
        return None
    if ts.tzinfo is not None:
        ts = ts.tz_convert("UTC").tz_localize(None)
    return ts.isoformat()


class MarketPriceStore:
    """SQLite-backed persistence and analysis helpers for daily OHLCV bars."""

    def __init__(self, db_path: Path | str = _DEFAULT_DB_PATH) -> None:
        self._db_path = Path(db_path)
        self._db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_schema()

    @contextmanager
    def _conn(self) -> PyGenerator[sqlite3.Connection, None, None]:
        conn = sqlite3.connect(str(self._db_path), timeout=10.0)
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA busy_timeout=5000")
        conn.row_factory = sqlite3.Row
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    def _init_schema(self) -> None:
        with self._conn() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS market_prices (
                    ticker TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    open REAL,
                    high REAL,
                    low REAL,
                    close REAL NOT NULL,
                    adj_close REAL,
                    volume REAL,
                    source TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    PRIMARY KEY (ticker, timestamp, source)
                )
            """)
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_market_prices_ticker_timestamp
                ON market_prices(ticker, timestamp DESC)
            """)
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_market_prices_timestamp
                ON market_prices(timestamp)
            """)
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_market_prices_ticker_source
                ON market_prices(ticker, source)
            """)

    def upsert_ohlcv(self, ticker: str, df: pd.DataFrame, *, source: str = "yfinance") -> int:
        """Normalize and persist an OHLCV frame.

        Returns the number of rows accepted for insertion/upsert.
        """

        ticker_key = _normalize_ticker(ticker)
        if not ticker_key or df is None or df.empty:
            return 0

        normalized = _normalize_ohlcv_columns(df)
        if not _REQUIRED_PRICE_COLUMNS.issubset(normalized.columns):
            return 0

        now = _utc_now_iso()
        rows: list[tuple[Any, ...]] = []

        for index, row in normalized.iterrows():
            timestamp = _timestamp_iso(index)
            close = _to_float(row.get("Close"))
            if timestamp is None or close is None or close <= 0.0:
                continue

            open_price = _to_float(row.get("Open"))
            high = _to_float(row.get("High"))
            low = _to_float(row.get("Low"))
            adj_close = _to_float(row.get("Adj Close"))
            volume = _to_float(row.get("Volume"))

            if adj_close is not None and adj_close <= 0.0:
                adj_close = None

            rows.append(
                (
                    ticker_key,
                    timestamp,
                    open_price,
                    high,
                    low,
                    close,
                    adj_close,
                    volume,
                    source,
                    now,
                    now,
                )
            )

        if not rows:
            return 0

        with self._conn() as conn:
            conn.executemany(
                """
                INSERT INTO market_prices (
                    ticker,
                    timestamp,
                    open,
                    high,
                    low,
                    close,
                    adj_close,
                    volume,
                    source,
                    created_at,
                    updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(ticker, timestamp, source) DO UPDATE SET
                    open = excluded.open,
                    high = excluded.high,
                    low = excluded.low,
                    close = excluded.close,
                    adj_close = excluded.adj_close,
                    volume = excluded.volume,
                    updated_at = excluded.updated_at
                """,
                rows,
            )

        return len(rows)

    def latest_timestamp(self, ticker: str, *, source: str | None = None) -> str | None:
        ticker_key = _normalize_ticker(ticker)
        params: list[Any] = [ticker_key]
        source_clause = ""
        if source:
            source_clause = " AND source = ?"
            params.append(source)

        with self._conn() as conn:
            row = conn.execute(
                f"""
                SELECT MAX(timestamp) AS latest
                FROM market_prices
                WHERE ticker = ?{source_clause}
                """,
                params,
            ).fetchone()

        return row["latest"] if row and row["latest"] else None

    def get_ohlcv(
        self,
        ticker: str,
        *,
        lookback_days: int | None = None,
        source: str | None = None,
    ) -> pd.DataFrame:
        """Return OHLCV rows as a timestamp-indexed DataFrame sorted ascending."""

        ticker_key = _normalize_ticker(ticker)
        params: list[Any] = [ticker_key]
        clauses = ["ticker = ?"]

        if source:
            clauses.append("source = ?")
            params.append(source)
        if lookback_days is not None:
            since = datetime.now(UTC) - timedelta(days=lookback_days)
            clauses.append("timestamp >= ?")
            params.append(since.replace(tzinfo=None).isoformat())

        where = " AND ".join(clauses)
        with self._conn() as conn:
            rows = conn.execute(
                f"""
                SELECT timestamp, open, high, low, close, adj_close, volume, source
                FROM market_prices
                WHERE {where}
                ORDER BY timestamp ASC, updated_at DESC
                """,
                params,
            ).fetchall()

        if not rows:
            return pd.DataFrame(columns=["Open", "High", "Low", "Close", "Adj Close", "Volume", "Source"])

        seen_timestamps: set[str] = set()
        records: list[dict[str, Any]] = []
        for row in rows:
            timestamp = row["timestamp"]
            if source is None and timestamp in seen_timestamps:
                continue
            seen_timestamps.add(timestamp)
            records.append(
                {
                    "timestamp": pd.Timestamp(timestamp),
                    "Open": row["open"],
                    "High": row["high"],
                    "Low": row["low"],
                    "Close": row["close"],
                    "Adj Close": row["adj_close"],
                    "Volume": row["volume"],
                    "Source": row["source"],
                }
            )

        out = pd.DataFrame.from_records(records).set_index("timestamp")
        return out.sort_index()

    def get_aligned_closes(
        self,
        tickers: list[str],
        *,
        lookback_days: int | None = 90,
        source: str | None = None,
    ) -> pd.DataFrame:
        """Return inner-joined close/adjusted-close series for all tickers."""

        series: list[pd.Series] = []
        for ticker in tickers:
            ticker_key = _normalize_ticker(ticker)
            df = self.get_ohlcv(ticker_key, lookback_days=lookback_days, source=source)
            if df.empty:
                return pd.DataFrame()
            close_column = "Adj Close" if df["Adj Close"].notna().any() else "Close"
            close = pd.to_numeric(df[close_column], errors="coerce").dropna()
            close = close[close > 0.0]
            if close.empty:
                return pd.DataFrame()
            close.name = ticker_key
            series.append(close)

        if not series:
            return pd.DataFrame()

        return pd.concat(series, axis=1, join="inner").dropna()

    def get_log_returns(
        self,
        tickers: list[str],
        *,
        lookback_days: int | None = 90,
        source: str | None = None,
    ) -> pd.DataFrame:
        """Compute aligned log returns from stored close history."""

        closes = self.get_aligned_closes(tickers, lookback_days=lookback_days, source=source)
        if closes.empty or len(closes) < 2:
            return pd.DataFrame(columns=[_normalize_ticker(t) for t in tickers])

        returns = np.log(closes / closes.shift(1))
        return returns.replace([np.inf, -np.inf], np.nan).dropna()

    def rolling_correlation(
        self,
        origin_ticker: str,
        affected_ticker: str,
        *,
        window_days: int = 20,
        lookback_days: int = 90,
        min_periods: int | None = None,
    ) -> float | None:
        """Return the latest rolling log-return correlation for two tickers."""

        min_obs = min_periods or window_days
        if window_days < 2 or min_obs < 2:
            return None

        tickers = [_normalize_ticker(origin_ticker), _normalize_ticker(affected_ticker)]
        returns = self.get_log_returns(tickers, lookback_days=lookback_days)
        if returns.empty or len(returns) < min_obs:
            return None

        window = returns.tail(window_days)
        if len(window) < min_obs:
            return None

        corr = window[tickers[0]].corr(window[tickers[1]])
        if corr is None or not math.isfinite(float(corr)):
            return None
        return round(float(corr), 4)


__all__ = ["MarketPriceStore"]
