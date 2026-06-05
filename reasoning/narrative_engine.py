"""Narrative detection pipeline for Rosetta Alpha.

Markets move on stories. This module extracts, tracks, and correlates
narratives across regional desks to surface regime-shifting sentiment
before it shows up in price.

Architecture:
- NarrativeExtractor: LLM-powered extraction via AdalFlow Generator (Groq)
- NarrativeStore: SQLite persistence (single table, no external deps)
- NarrativeVelocityTracker: spread rate + acceleration + shift detection
- CrossDeskContagionDetector: semantic matching across regions

Integration:
- Called by regional agents after data ingestion (pre-synthesis enrichment)
- Feeds narrative_velocity into InvestmentThesis schema
- Surfaces NarrativeShift events to frontend via FastAPI endpoint

Design decisions:
- SQLite over Postgres/Redis: zero-dep MVP, embedded, plenty fast for <10K narratives
- Semantic matching via normalized title hashing (not vector similarity): deterministic,
  reproducible, no embedding model dependency. Upgrade path: cosine similarity later.
- One Generator instance shared across extractions (connection pooling at Groq layer)
"""

from __future__ import annotations

import hashlib
import json
import logging
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path
from typing import Any, Generator as PyGenerator

import adalflow as adal
from pydantic import BaseModel, ConfigDict, Field

from reasoning.trace_schema import Region

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Enums & Schemas
# ---------------------------------------------------------------------------


class NarrativeType(str, Enum):
    """Taxonomy of market narratives — kept tight to avoid LLM drift."""

    FEAR = "fear"
    GREED = "greed"
    REGULATORY = "regulatory"
    INNOVATION = "innovation"
    RISK = "risk"
    MACRO_SHIFT = "macro_shift"
    GEOPOLITICAL = "geopolitical"


class Narrative(BaseModel):
    """A single extracted narrative from a news/data source."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    narrative_title: str = Field(description="Concise label, e.g. 'AI Bubble Fears'")
    narrative_type: NarrativeType
    entities_mentioned: list[str] = Field(
        default_factory=list,
        description="Tickers, companies, people, institutions referenced.",
    )
    sentiment_intensity: float = Field(
        ge=0.0, le=1.0,
        description="How strongly this narrative is expressed (0=neutral mention, 1=extreme).",
    )
    source_region: Region
    source_text_snippet: str = Field(
        default="",
        description="First 200 chars of source for provenance.",
    )


class NarrativeVelocity(BaseModel):
    """Spread dynamics of a narrative over time."""

    model_config = ConfigDict(extra="forbid")

    narrative_hash: str
    narrative_title: str
    mentions_per_day: float = Field(ge=0.0)
    acceleration: float = Field(
        description="Rate of change in mentions_per_day. Positive = spreading faster.",
    )
    days_active: int = Field(ge=1)
    peak_intensity: float = Field(ge=0.0, le=1.0)
    regions_present: list[Region] = Field(default_factory=list)
    is_dominant: bool = Field(
        default=False,
        description="True if this is the highest-velocity narrative for its ticker.",
    )


class NarrativeShift(BaseModel):
    """Event: dominant narrative changed for a ticker/region pair."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    ticker: str
    region: Region
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    previous_narrative: str
    new_narrative: str
    previous_type: NarrativeType
    new_type: NarrativeType
    shift_magnitude: float = Field(
        ge=0.0, le=1.0,
        description="How dramatic the shift is (type distance + intensity delta).",
    )


class ContagionAlert(BaseModel):
    """Cross-desk narrative spreading to new regions."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    narrative_title: str
    narrative_hash: str
    origin_region: Region
    spread_to: list[Region]
    first_seen: datetime
    spread_detected: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    intensity_by_region: dict[str, float] = Field(default_factory=dict)


# ---------------------------------------------------------------------------
# Narrative Store (SQLite)
# ---------------------------------------------------------------------------

_DEFAULT_DB_PATH = Path(__file__).parent.parent / "data" / "narratives.db"


def _narrative_hash(title: str, ticker: str) -> str:
    """Deterministic hash for deduplication. Normalized: lowercase, stripped."""
    canonical = f"{title.lower().strip()}::{ticker.lower().strip()}"
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()[:16]


class NarrativeStore:
    """SQLite-backed persistence for extracted narratives.

    Thread-safe via connection-per-call pattern (SQLite handles file locking).
    Schema auto-migrates on first use.
    """

    def __init__(self, db_path: Path | str = _DEFAULT_DB_PATH) -> None:
        self._db_path = Path(db_path)
        self._db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_schema()

    @contextmanager
    def _conn(self) -> PyGenerator[sqlite3.Connection, None, None]:
        """Context-managed connection with WAL mode for concurrent reads."""
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
                CREATE TABLE IF NOT EXISTS narratives (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    ticker TEXT NOT NULL,
                    narrative_hash TEXT NOT NULL,
                    title TEXT NOT NULL,
                    type TEXT NOT NULL,
                    region TEXT NOT NULL,
                    first_seen TEXT NOT NULL,
                    last_seen TEXT NOT NULL,
                    mention_count INTEGER DEFAULT 1,
                    intensity REAL DEFAULT 0.5,
                    entities TEXT DEFAULT '[]',
                    UNIQUE(ticker, narrative_hash, region)
                )
            """)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS narrative_shifts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    ticker TEXT NOT NULL,
                    region TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    previous_narrative TEXT NOT NULL,
                    new_narrative TEXT NOT NULL,
                    previous_type TEXT NOT NULL,
                    new_type TEXT NOT NULL,
                    shift_magnitude REAL DEFAULT 0.5
                )
            """)
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_narratives_ticker
                ON narratives(ticker, region)
            """)
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_narratives_last_seen
                ON narratives(last_seen DESC)
            """)

    @staticmethod
    def _sqlite_now() -> str:
        """UTC timestamp in SQLite-compatible format (no timezone suffix).

        SQLite's datetime() returns 'YYYY-MM-DD HH:MM:SS'. We must store in
        the same format for reliable string comparisons in WHERE clauses.
        Storing with '+00:00' suffix causes subtle comparison bugs since
        SQLite datetime arithmetic strips timezone info.
        """
        return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")

    def upsert(self, ticker: str, narrative: Narrative) -> None:
        """Insert or update a narrative observation."""
        ticker = ticker.upper().strip()
        nhash = _narrative_hash(narrative.narrative_title, ticker)
        now = self._sqlite_now()
        entities_json = json.dumps(narrative.entities_mentioned, ensure_ascii=False)

        with self._conn() as conn:
            conn.execute(
                """
                INSERT INTO narratives (ticker, narrative_hash, title, type, region,
                                        first_seen, last_seen, mention_count, intensity, entities)
                VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
                ON CONFLICT(ticker, narrative_hash, region) DO UPDATE SET
                    last_seen = excluded.last_seen,
                    mention_count = mention_count + 1,
                    intensity = MAX(intensity, excluded.intensity),
                    entities = excluded.entities
                """,
                (ticker, nhash, narrative.narrative_title, narrative.narrative_type.value,
                 narrative.source_region.value, now, now, narrative.sentiment_intensity, entities_json),
            )

    def get_narratives_for_ticker(
        self, ticker: str, *, region: Region | None = None, limit: int = 20
    ) -> list[dict[str, Any]]:
        """Retrieve narratives for a ticker, optionally filtered by region."""
        with self._conn() as conn:
            if region:
                rows = conn.execute(
                    "SELECT * FROM narratives WHERE ticker = ? AND region = ? ORDER BY last_seen DESC LIMIT ?",
                    (ticker.upper(), region.value, limit),
                ).fetchall()
            else:
                rows = conn.execute(
                    "SELECT * FROM narratives WHERE ticker = ? ORDER BY last_seen DESC LIMIT ?",
                    (ticker.upper(), limit),
                ).fetchall()
        return [dict(r) for r in rows]

    def get_active_narratives(self, *, hours: int = 72, limit: int = 50) -> list[dict[str, Any]]:
        """Get all narratives seen in the last N hours across all tickers."""
        if hours < 1:
            hours = 1  # Floor to 1 hour minimum
        cutoff = self._sqlite_now()
        with self._conn() as conn:
            rows = conn.execute(
                """
                SELECT * FROM narratives
                WHERE last_seen > datetime(?, '-' || ? || ' hours')
                ORDER BY mention_count DESC, intensity DESC
                LIMIT ?
                """,
                (cutoff, hours, limit),
            ).fetchall()
        return [dict(r) for r in rows]

    def get_narrative_by_hash(self, nhash: str) -> list[dict[str, Any]]:
        """Find a narrative across all regions (for contagion detection)."""
        with self._conn() as conn:
            rows = conn.execute(
                "SELECT * FROM narratives WHERE narrative_hash = ? ORDER BY first_seen ASC",
                (nhash,),
            ).fetchall()
        return [dict(r) for r in rows]

    def record_shift(self, shift: NarrativeShift) -> None:
        """Persist a narrative shift event."""
        with self._conn() as conn:
            conn.execute(
                """
                INSERT INTO narrative_shifts
                    (ticker, region, timestamp, previous_narrative, new_narrative,
                     previous_type, new_type, shift_magnitude)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (shift.ticker.upper().strip(), shift.region.value, shift.timestamp.isoformat(),
                 shift.previous_narrative, shift.new_narrative,
                 shift.previous_type.value, shift.new_type.value, shift.shift_magnitude),
            )

    def get_shifts(self, ticker: str, *, limit: int = 10) -> list[dict[str, Any]]:
        """Recent narrative shifts for a ticker."""
        with self._conn() as conn:
            rows = conn.execute(
                "SELECT * FROM narrative_shifts WHERE ticker = ? ORDER BY timestamp DESC LIMIT ?",
                (ticker.upper(), limit),
            ).fetchall()
        return [dict(r) for r in rows]


# ---------------------------------------------------------------------------
# Narrative Extractor (AdalFlow Generator)
# ---------------------------------------------------------------------------

_EXTRACTION_TEMPLATE = """\
You are a financial narrative analyst. Extract the dominant narrative from the
following market text. A "narrative" is the story/framing the market is telling
itself — not raw facts, but the interpretive lens.

Examples of narratives:
- "AI bubble peak" (fear)
- "Fed pivot incoming" (greed)
- "China tech crackdown 2.0" (regulatory)
- "Quantum computing breakout" (innovation)

TEXT TO ANALYZE (region: {{ region }}, ticker: {{ ticker }}):
<TEXT>
{{ text }}
</TEXT>

Respond with ONLY a valid JSON object:
{
  "narrative_title": "short evocative label (3-6 words)",
  "narrative_type": "fear" | "greed" | "regulatory" | "innovation" | "risk" | "macro_shift" | "geopolitical",
  "entities_mentioned": ["TICKER1", "Company Name", ...],
  "sentiment_intensity": 0.0 to 1.0
}
"""


class NarrativeExtractor(adal.Component):
    """Extracts structured narratives from raw text using LLM.

    Uses Groq Llama-3.3-70B by default (free tier, fast inference).
    Reuses the PydanticJsonParser pattern from base_agent.
    """

    def __init__(
        self,
        *,
        model_client: adal.ModelClient | None = None,
        model_kwargs: dict[str, Any] | None = None,
    ) -> None:
        super().__init__()
        client = model_client or adal.GroqAPIClient()
        kwargs = model_kwargs or {"model": "llama-3.3-70b-versatile", "temperature": 0.1}

        self._generator = adal.Generator(
            model_client=client,
            model_kwargs=kwargs,
            template=_EXTRACTION_TEMPLATE,
        )

    @staticmethod
    def _strip_fences(raw: str) -> str:
        """Strip markdown code fences from LLM output (DRY — shared utility)."""
        cleaned = raw.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[-1]
            if cleaned.rstrip().endswith("```"):
                cleaned = cleaned.rstrip()[:-3]
            cleaned = cleaned.strip()
        return cleaned

    def extract(self, text: str, ticker: str, region: Region) -> Narrative | None:
        """Extract a single narrative from text. Returns None on parse failure."""
        # Guard: empty/whitespace-only text is not extractable
        if not text or not text.strip():
            logger.debug("Skipping empty text for %s/%s", ticker, region.value)
            return None

        # Truncate to avoid token overflow (Groq 32K context)
        truncated = text[:8000] if len(text) > 8000 else text

        output = self._generator(prompt_kwargs={
            "text": truncated,
            "ticker": ticker,
            "region": region.value,
        })

        raw = getattr(output, "raw_response", None) or getattr(output, "data", None) or str(output)
        if not raw or not raw.strip():
            return None

        try:
            data = json.loads(self._strip_fences(raw))
            data["source_region"] = region.value
            data["source_text_snippet"] = text[:200]
            return Narrative.model_validate(data)
        except Exception as exc:
            logger.warning("Narrative extraction parse failed: %s | raw: %.200s", exc, raw)
            return None

    def extract_batch(
        self, items: list[dict[str, Any]], *, max_workers: int = 4
    ) -> list[Narrative]:
        """Extract narratives from multiple text items in parallel.

        Uses ThreadPoolExecutor since Groq API calls are I/O-bound sync operations.
        Parallel extraction reduces wall-clock time from N*latency to ~latency
        (bounded by Groq rate limits, typically 30 RPM on free tier).

        Args:
            items: list of {"text": str, "ticker": str, "region": Region}
            max_workers: concurrent extraction threads (default 4, stay under rate limits)
        """
        if not items:
            return []

        # Single item — skip thread pool overhead
        if len(items) == 1:
            narrative = self.extract(
                text=items[0]["text"],
                ticker=items[0]["ticker"],
                region=items[0]["region"],
            )
            return [narrative] if narrative else []

        from concurrent.futures import ThreadPoolExecutor, as_completed

        results: list[Narrative] = []
        with ThreadPoolExecutor(max_workers=min(max_workers, len(items))) as pool:
            futures = {
                pool.submit(self.extract, item["text"], item["ticker"], item["region"]): i
                for i, item in enumerate(items)
            }
            for future in as_completed(futures):
                try:
                    narrative = future.result()
                    if narrative:
                        results.append(narrative)
                except Exception as exc:
                    logger.warning("Parallel extraction failed for item %d: %s", futures[future], exc)

        return results


# ---------------------------------------------------------------------------
# Velocity Tracker
# ---------------------------------------------------------------------------


class NarrativeVelocityTracker:
    """Computes spread dynamics from stored narrative observations.

    Velocity = mentions_per_day (simple: total_mentions / days_active)
    Acceleration = delta in velocity over last 2 observation windows
    Dominant = highest velocity narrative for a given ticker
    """

    def __init__(self, store: NarrativeStore) -> None:
        self._store = store

    def compute_velocity(self, ticker: str, region: Region | None = None) -> list[NarrativeVelocity]:
        """Compute velocity for all narratives of a ticker."""
        narratives = self._store.get_narratives_for_ticker(ticker, region=region)
        if not narratives:
            return []

        velocities: list[NarrativeVelocity] = []
        max_velocity = 0.0

        for row in narratives:
            first_seen = datetime.fromisoformat(row["first_seen"])
            last_seen = datetime.fromisoformat(row["last_seen"])
            days_active = max(1, (last_seen - first_seen).days + 1)
            mentions_per_day = row["mention_count"] / days_active

            # Acceleration: compare current rate to what it would be without last day
            # Simple heuristic: if mention_count > days_active, accelerating
            acceleration = (row["mention_count"] - days_active) / max(days_active, 1)

            # Track which regions this narrative exists in
            cross_region_rows = self._store.get_narrative_by_hash(row["narrative_hash"])
            regions_present = list({Region(r["region"]) for r in cross_region_rows})

            velocity = NarrativeVelocity(
                narrative_hash=row["narrative_hash"],
                narrative_title=row["title"],
                mentions_per_day=round(mentions_per_day, 3),
                acceleration=round(acceleration, 3),
                days_active=days_active,
                peak_intensity=row["intensity"],
                regions_present=regions_present,
                is_dominant=False,  # Set below
            )
            velocities.append(velocity)
            max_velocity = max(max_velocity, mentions_per_day)

        # Mark the fastest-spreading narrative as dominant
        if velocities:
            dominant = max(velocities, key=lambda v: v.mentions_per_day)
            # Pydantic frozen=False on NarrativeVelocity, so we can mutate
            dominant.is_dominant = True

        return sorted(velocities, key=lambda v: v.mentions_per_day, reverse=True)

    def detect_shift(self, ticker: str, region: Region) -> NarrativeShift | None:
        """Detect if the dominant narrative has changed since last check.

        Compares current dominant vs the most recent shift record.
        Returns a NarrativeShift if a new dominant has emerged.
        """
        velocities = self.compute_velocity(ticker, region=region)
        if not velocities:
            return None

        current_dominant = next((v for v in velocities if v.is_dominant), None)
        if not current_dominant:
            return None

        # Check last recorded shift
        shifts = self._store.get_shifts(ticker, limit=1)
        if shifts:
            last_shift = shifts[0]
            if last_shift["new_narrative"] == current_dominant.narrative_title:
                return None  # Same dominant — no shift
            previous_title = last_shift["new_narrative"]
            previous_type = NarrativeType(last_shift["new_type"])
        else:
            # First time tracking — no shift to report yet
            if len(velocities) < 2:
                return None
            # Use second-highest as "previous" for initial shift
            previous_title = velocities[1].narrative_title
            previous_type = self._infer_type(velocities[1].narrative_hash)

        # Compute shift magnitude: type distance + intensity difference
        current_type = self._infer_type(current_dominant.narrative_hash)
        type_distance = 0.0 if current_type == previous_type else 0.5
        intensity_delta = abs(current_dominant.peak_intensity - 0.5)
        magnitude = min(1.0, type_distance + intensity_delta)

        shift = NarrativeShift(
            ticker=ticker,
            region=region,
            previous_narrative=previous_title,
            new_narrative=current_dominant.narrative_title,
            previous_type=previous_type,
            new_type=current_type,
            shift_magnitude=round(magnitude, 3),
        )
        self._store.record_shift(shift)
        return shift

    def _infer_type(self, nhash: str) -> NarrativeType:
        """Look up the type for a narrative hash from the store."""
        rows = self._store.get_narrative_by_hash(nhash)
        if rows:
            try:
                return NarrativeType(rows[0]["type"])
            except ValueError:
                pass
        return NarrativeType.RISK  # Safe fallback


# ---------------------------------------------------------------------------
# Cross-Desk Contagion Detector
# ---------------------------------------------------------------------------


class CrossDeskContagionDetector:
    """Detects when narratives spread across regional desks.

    Two-layer matching strategy (zero external deps):
    1. EXACT: normalized title hash — same narrative label in different regions.
    2. ENTITY OVERLAP: narratives sharing ≥2 entities across regions are
       considered contagion even if titles differ (solves cross-language gap:
       "AI bubble" in US mentioning [NVDA, MSFT] ≈ "AI泡沫" in CN mentioning [NVDA, 9988.HK]).

    This avoids embedding models while catching multi-lingual narrative spread
    through the shared entity fingerprint. Upgrade path: cosine similarity later.
    """

    # Minimum shared entities to consider two narratives as contagious
    _ENTITY_OVERLAP_THRESHOLD = 2

    def __init__(self, store: NarrativeStore) -> None:
        self._store = store

    def _parse_entities(self, row: dict[str, Any]) -> set[str]:
        """Parse entities JSON from a store row, normalized to uppercase."""
        try:
            entities = json.loads(row.get("entities", "[]"))
            return {e.upper().strip() for e in entities if e}
        except (json.JSONDecodeError, TypeError):
            return set()

    def detect_contagion(self, *, hours: int = 72) -> list[ContagionAlert]:
        """Scan active narratives for cross-region spread.

        Uses both exact hash matching AND entity-overlap matching to catch
        cross-language narrative contagion.
        """
        active = self._store.get_active_narratives(hours=hours)
        if not active:
            return []

        # Layer 1: Group by narrative_hash (exact title match)
        by_hash: dict[str, list[dict[str, Any]]] = {}
        for row in active:
            by_hash.setdefault(row["narrative_hash"], []).append(row)

        alerts: list[ContagionAlert] = []
        seen_alert_keys: set[str] = set()  # Prevent duplicate alerts

        for nhash, rows in by_hash.items():
            regions = {row["region"] for row in rows}
            if len(regions) < 2:
                continue

            sorted_rows = sorted(rows, key=lambda r: r["first_seen"])
            origin_region = Region(sorted_rows[0]["region"])
            spread_to = [Region(r) for r in regions if r != origin_region.value]

            intensity_by_region = {
                row["region"]: row["intensity"] for row in rows
            }

            alert = ContagionAlert(
                narrative_title=sorted_rows[0]["title"],
                narrative_hash=nhash,
                origin_region=origin_region,
                spread_to=spread_to,
                first_seen=datetime.fromisoformat(sorted_rows[0]["first_seen"]),
                intensity_by_region=intensity_by_region,
            )
            alerts.append(alert)
            seen_alert_keys.add(nhash)

        # Layer 2: Entity-overlap matching (cross-language contagion)
        # Compare narratives across different regions for shared entities
        by_region: dict[str, list[dict[str, Any]]] = {}
        for row in active:
            by_region.setdefault(row["region"], []).append(row)

        regions_list = list(by_region.keys())
        for i, region_a in enumerate(regions_list):
            for region_b in regions_list[i + 1:]:
                for row_a in by_region[region_a]:
                    entities_a = self._parse_entities(row_a)
                    if len(entities_a) < self._ENTITY_OVERLAP_THRESHOLD:
                        continue
                    for row_b in by_region[region_b]:
                        # Skip if already caught by exact hash match
                        if row_a["narrative_hash"] == row_b["narrative_hash"]:
                            continue
                        entities_b = self._parse_entities(row_b)
                        overlap = entities_a & entities_b
                        if len(overlap) >= self._ENTITY_OVERLAP_THRESHOLD:
                            # Create contagion alert for entity-overlap match
                            alert_key = f"{row_a['narrative_hash']}::{row_b['narrative_hash']}"
                            if alert_key in seen_alert_keys:
                                continue
                            seen_alert_keys.add(alert_key)

                            # Origin = earlier first_seen
                            if row_a["first_seen"] <= row_b["first_seen"]:
                                origin, spread = row_a, row_b
                            else:
                                origin, spread = row_b, row_a

                            alert = ContagionAlert(
                                narrative_title=f"{origin['title']} ↔ {spread['title']}",
                                narrative_hash=f"entity:{alert_key[:16]}",
                                origin_region=Region(origin["region"]),
                                spread_to=[Region(spread["region"])],
                                first_seen=datetime.fromisoformat(origin["first_seen"]),
                                intensity_by_region={
                                    origin["region"]: origin["intensity"],
                                    spread["region"]: spread["intensity"],
                                },
                            )
                            alerts.append(alert)

        return sorted(alerts, key=lambda a: len(a.spread_to), reverse=True)


# ---------------------------------------------------------------------------
# Pipeline Orchestrator — the public API
# ---------------------------------------------------------------------------


class NarrativeEngine:
    """Top-level orchestrator. Single entry point for the narrative pipeline.

    Usage:
        engine = NarrativeEngine()
        velocity = await engine.process_and_track(ticker="AAPL", region=Region.US, texts=[...])
        contagion = engine.check_contagion()
    """

    def __init__(
        self,
        *,
        db_path: Path | str = _DEFAULT_DB_PATH,
        model_client: adal.ModelClient | None = None,
        model_kwargs: dict[str, Any] | None = None,
    ) -> None:
        self._store = NarrativeStore(db_path=db_path)
        self._extractor = NarrativeExtractor(
            model_client=model_client, model_kwargs=model_kwargs
        )
        self._velocity = NarrativeVelocityTracker(self._store)
        self._contagion = CrossDeskContagionDetector(self._store)

    @property
    def store(self) -> NarrativeStore:
        """Direct store access for queries."""
        return self._store

    async def process_and_track(
        self,
        ticker: str,
        region: Region,
        texts: list[str],
    ) -> list[NarrativeVelocity]:
        """Full pipeline: extract → store → compute velocity.

        Args:
            ticker: Asset ticker (e.g. "AAPL", "600519.SH")
            region: Source region for these texts
            texts: Raw news/article texts to extract narratives from

        Returns:
            List of NarrativeVelocity objects sorted by spread rate
        """
        # Extract narratives from all texts
        items = [{"text": t, "ticker": ticker, "region": region} for t in texts]
        narratives = self._extractor.extract_batch(items)

        # Persist each extracted narrative
        for narrative in narratives:
            self._store.upsert(ticker, narrative)

        # Compute and return velocities
        return self._velocity.compute_velocity(ticker, region=region)

    def detect_shift(self, ticker: str, region: Region) -> NarrativeShift | None:
        """Check if dominant narrative has shifted for a ticker/region."""
        return self._velocity.detect_shift(ticker, region)

    def check_contagion(self, *, hours: int = 72) -> list[ContagionAlert]:
        """Scan for cross-desk narrative contagion."""
        return self._contagion.detect_contagion(hours=hours)

    def get_ticker_narratives(
        self, ticker: str, *, region: Region | None = None
    ) -> list[dict[str, Any]]:
        """Get all stored narratives for a ticker (for frontend display)."""
        return self._store.get_narratives_for_ticker(ticker, region=region)

    def get_velocity(
        self, ticker: str, *, region: Region | None = None
    ) -> list[NarrativeVelocity]:
        """Get current velocity data without processing new texts."""
        return self._velocity.compute_velocity(ticker, region=region)
