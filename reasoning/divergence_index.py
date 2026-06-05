"""Cross-desk divergence index calculations and storage for Rosetta Alpha."""

from __future__ import annotations

import math
import re
import sqlite3
import hashlib
import json
import logging
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Generator as PyGenerator

from pydantic import BaseModel, ConfigDict, Field
from reasoning.trace_schema import Region, Direction, InvestmentThesis

logger = logging.getLogger(__name__)

_DEFAULT_DB_PATH = Path(__file__).parent.parent / "data" / "divergence.db"

# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class DivergenceMetrics(BaseModel):
    """Calculated divergence metrics for a ticker."""
    model_config = ConfigDict(extra="forbid")

    ticker: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    composite_divergence: float = Field(ge=0.0, le=100.0)
    direction_divergence: float = Field(ge=0.0, le=1.0)
    confidence_divergence: float = Field(ge=0.0, le=1.0)
    narrative_divergence: float = Field(ge=0.0, le=1.0)


# ---------------------------------------------------------------------------
# Core TF-IDF / Cosine Similarity (Pure Python)
# ---------------------------------------------------------------------------

def _tokenize(text: str) -> list[str]:
    """Tokenize and normalize text."""
    text = text.lower()
    # Replace non-alphanumeric characters with spaces
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    return [w for w in text.split() if len(w) > 1]


def _cosine_distance(text_a: str, text_b: str) -> float:
    """Calculate cosine distance (1.0 - similarity) between two text blocks."""
    tokens_a = _tokenize(text_a)
    tokens_b = _tokenize(text_b)
    
    if not tokens_a or not tokens_b:
        return 1.0  # Max distance if either is empty
        
    # Standard term-frequency counts
    vocab: set[str] = set(tokens_a) | set(tokens_b)
    
    vec_a = {w: tokens_a.count(w) for w in vocab}
    vec_b = {w: tokens_b.count(w) for w in vocab}
    
    dot_product = sum(vec_a[w] * vec_b[w] for w in vocab)
    magnitude_a = math.sqrt(sum(vec_a[w] ** 2 for w in vocab))
    magnitude_b = math.sqrt(sum(vec_b[w] ** 2 for w in vocab))
    
    if magnitude_a == 0.0 or magnitude_b == 0.0:
        return 1.0
        
    similarity = dot_product / (magnitude_a * magnitude_b)
    return max(0.0, min(1.0, 1.0 - similarity))


# ---------------------------------------------------------------------------
# Index Calculations
# ---------------------------------------------------------------------------

def calculate_divergence(theses: list[InvestmentThesis] | list[dict[str, Any]], ticker: str) -> DivergenceMetrics | None:
    """Calculate the cross-desk divergence metrics from a list of theses."""
    if not theses:
        return None

    normalized_theses: list[dict[str, Any]] = []
    for t in theses:
        if isinstance(t, InvestmentThesis):
            normalized_theses.append(t.model_dump())
        elif isinstance(t, dict):
            normalized_theses.append(t)

    # 1. Extract directions, confidences, and English summaries
    directions: list[str] = []
    confidences: list[float] = []
    summaries: list[str] = []

    for t in normalized_theses:
        # Resolve Direction
        dir_val = t.get("direction")
        if isinstance(dir_val, Direction):
            dir_val = dir_val.value
        elif isinstance(dir_val, dict) and "value" in dir_val:
            dir_val = dir_val["value"]
        
        # Fallback fields if any
        conf_val = t.get("confidence_score")
        if conf_val is None:
            conf_val = t.get("confidence")
        sum_val = t.get("thesis_summary_en") or t.get("summary") or ""

        if dir_val is not None:
            directions.append(str(dir_val).upper())
        if conf_val is not None:
            try:
                confidences.append(float(conf_val))
            except ValueError:
                pass
        if sum_val:
            summaries.append(str(sum_val))

    N = len(normalized_theses)
    if N == 0:
        return None

    # a) Direction Divergence: % of desks that disagree on LONG/SHORT/NEUTRAL
    N_dir = len(directions)
    if N_dir > 1:
        counts: dict[str, int] = {}
        for d in directions:
            counts[d] = counts.get(d, 0) + 1
        max_count = max(counts.values())
        direction_divergence = (N_dir - max_count) / N_dir
    else:
        direction_divergence = 0.0

    # b) Confidence Divergence: normalized standard deviation
    N_conf = len(confidences)
    if N_conf > 1:
        mean_c = sum(confidences) / N_conf
        variance = sum((c - mean_c) ** 2 for c in confidences) / N_conf
        std_dev = math.sqrt(variance)
        # Max standard deviation of numbers in [0, 1] is 0.5 (e.g. half 0s and half 1s)
        confidence_divergence = min(1.0, std_dev * 2.0)
    else:
        confidence_divergence = 0.0

    # c) Narrative Divergence: pairwise average cosine distance
    N_sum = len(summaries)
    if N_sum > 1:
        total_dist = 0.0
        pairs_count = 0
        for i in range(N_sum):
            for j in range(i + 1, N_sum):
                total_dist += _cosine_distance(summaries[i], summaries[j])
                pairs_count += 1
        narrative_divergence = total_dist / pairs_count if pairs_count > 0 else 0.0
    else:
        narrative_divergence = 0.0

    # d) Composite Divergence: weighted average (0-100 score)
    # Weights: 40% Direction, 30% Confidence, 30% Narrative
    composite = (0.4 * direction_divergence + 0.3 * confidence_divergence + 0.3 * narrative_divergence) * 100.0

    return DivergenceMetrics(
        ticker=ticker.upper().strip(),
        composite_divergence=round(composite, 2),
        direction_divergence=round(direction_divergence, 4),
        confidence_divergence=round(confidence_divergence, 4),
        narrative_divergence=round(narrative_divergence, 4)
    )


# ---------------------------------------------------------------------------
# SQLite Storage
# ---------------------------------------------------------------------------

class DivergenceStore:
    """SQLite-backed persistence for cross-desk divergence metrics."""

    def __init__(self, db_path: Path | str = _DEFAULT_DB_PATH) -> None:
        self._db_path = Path(db_path)
        self._db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_schema()

    @contextmanager
    def _conn(self) -> PyGenerator[sqlite3.Connection, None, None]:
        """Context-managed connection with WAL mode."""
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
                CREATE TABLE IF NOT EXISTS divergence_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    ticker TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    composite REAL NOT NULL,
                    direction REAL NOT NULL,
                    confidence REAL NOT NULL,
                    narrative REAL NOT NULL
                )
            """)
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_div_ticker
                ON divergence_history(ticker, timestamp DESC)
            """)

    @staticmethod
    def _sqlite_now() -> str:
        return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")

    def save_divergence(self, metrics: DivergenceMetrics) -> None:
        """Save a new calculation of divergence metrics."""
        now = self._sqlite_now()
        with self._conn() as conn:
            conn.execute(
                """
                INSERT INTO divergence_history (ticker, timestamp, composite, direction, confidence, narrative)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    metrics.ticker,
                    now,
                    metrics.composite_divergence,
                    metrics.direction_divergence,
                    metrics.confidence_divergence,
                    metrics.narrative_divergence,
                ),
            )

    def get_latest_divergence(self, ticker: str) -> DivergenceMetrics | None:
        """Get the most recent divergence index for a given ticker."""
        ticker = ticker.upper().strip()
        with self._conn() as conn:
            row = conn.execute(
                """
                SELECT ticker, timestamp, composite, direction, confidence, narrative
                FROM divergence_history
                WHERE ticker = ?
                ORDER BY timestamp DESC
                LIMIT 1
                """,
                (ticker,),
            ).fetchone()

        if not row:
            return None

        # Convert back to DivergenceMetrics
        try:
            ts = datetime.strptime(row["timestamp"], "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)
        except ValueError:
            ts = datetime.now(timezone.utc)

        return DivergenceMetrics(
            ticker=row["ticker"],
            timestamp=ts,
            composite_divergence=row["composite"],
            direction_divergence=row["direction"],
            confidence_divergence=row["confidence"],
            narrative_divergence=row["narrative"]
        )
