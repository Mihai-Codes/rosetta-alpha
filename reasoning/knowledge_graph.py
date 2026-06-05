"""Knowledge Graph layer for Rosetta Alpha reasoning traces.

Turns flat IPFS-pinned, Arc-recorded reasoning traces into a queryable
relational graph. Entities (tickers, theses, agents, regions, outcomes,
narratives) become nodes; their relationships become typed edges.

Architecture:
- NetworkX (in-memory) for MVP — O(1) node/edge lookup, rich traversal
- Production path: Neo4j via `neo4j` driver (same interface, swap storage)
- Optional sentence-transformers embeddings for semantic similarity search

Integration points:
- Called after each analyze() in regional agents → extract + add nodes/edges
- Called by settler on resolution → update OUTCOME edges with was_correct
- Queried by FastAPI /api/knowledge-graph for frontend visualization
- Queried by agents for historical context (contradictions, consensus)

Design decisions:
- DRY: reuse trace_schema enums, narrative_engine types directly
- Graceful degradation: embeddings optional, graph works without them
- Thread-safe: all mutations via a single lock (NetworkX is not thread-safe)
- Deterministic node IDs: ticker nodes by symbol, thesis nodes by thesis_id
"""

from __future__ import annotations

import hashlib
import json
import logging
import sqlite3
import threading
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from enum import Enum
from pathlib import Path
from typing import Any

import networkx as nx

from reasoning.trace_schema import (
    AgentRole,
    Direction,
    InvestmentThesis,
    Region,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Node & Edge type enums
# ---------------------------------------------------------------------------


class NodeType(str, Enum):
    TICKER = "ticker"
    THESIS = "thesis"
    SUB_AGENT = "sub_agent"
    REGION = "region"
    OUTCOME = "outcome"
    NARRATIVE = "narrative"


class EdgeType(str, Enum):
    GENERATED_BY = "GENERATED_BY"
    ABOUT_TICKER = "ABOUT_TICKER"
    BELONGS_TO_REGION = "BELONGS_TO_REGION"
    CONTRADICTS = "CONTRADICTS"
    SUPPORTS = "SUPPORTS"
    RESOLVED_AS = "RESOLVED_AS"
    HAS_NARRATIVE = "HAS_NARRATIVE"


# ---------------------------------------------------------------------------
# Embedding manager (optional dependency)
# ---------------------------------------------------------------------------


class EmbeddingManager:
    """Lazy-loaded sentence-transformers for semantic similarity.

    Falls back gracefully if sentence-transformers is not installed.
    True LRU cache: tracks access recency via OrderedDict.move_to_end().
    Evicts least-recently-used entries when capacity is reached.
    """

    # Max cached embeddings (~384 floats × 8 bytes × 2000 ≈ 6MB cap)
    _MAX_CACHE_SIZE = 2000

    def __init__(self, model_name: str = "all-MiniLM-L6-v2") -> None:
        from collections import OrderedDict

        self._model_name = model_name
        self._model = None
        self._cache: OrderedDict[str, list[float]] = OrderedDict()
        self._cache_lock = threading.Lock()
        self._available: bool | None = None

    @property
    def available(self) -> bool:
        """Check if sentence-transformers is importable."""
        if self._available is None:
            try:
                import sentence_transformers  # noqa: F401
                self._available = True
            except ImportError:
                self._available = False
                logger.info(
                    "sentence-transformers not installed — similarity search disabled. "
                    "Install with: uv add sentence-transformers"
                )
        return self._available

    def _load_model(self) -> Any:
        """Lazy-load the embedding model on first use."""
        if self._model is None:
            from sentence_transformers import SentenceTransformer
            self._model = SentenceTransformer(self._model_name)
        return self._model

    def get(self, cache_key: str) -> list[float] | None:
        """Retrieve embedding from cache, marking as recently used. Thread-safe."""
        with self._cache_lock:
            if cache_key in self._cache:
                self._cache.move_to_end(cache_key)  # Mark as most recently used
                return self._cache[cache_key]
        return None

    def embed(self, text: str, cache_key: str | None = None) -> list[float] | None:
        """Compute embedding for text. Returns None if unavailable.

        True LRU: accessed entries are moved to end (most recent).
        When capacity is reached, evicts from the front (least recently used).
        """
        if not self.available:
            return None

        # Check cache with LRU access tracking
        if cache_key:
            cached = self.get(cache_key)
            if cached is not None:
                return cached

        model = self._load_model()
        embedding = model.encode(text, normalize_embeddings=True).tolist()

        if cache_key:
            with self._cache_lock:
                # Evict LRU entries from front until under capacity
                while len(self._cache) >= self._MAX_CACHE_SIZE:
                    self._cache.popitem(last=False)  # Remove least recently used
                self._cache[cache_key] = embedding
        return embedding

    def cosine_similarity(self, vec_a: list[float], vec_b: list[float]) -> float:
        """Compute cosine similarity between two normalized vectors."""
        # Vectors are already L2-normalized by sentence-transformers
        return sum(a * b for a, b in zip(vec_a, vec_b))

    def clear_cache(self) -> None:
        with self._cache_lock:
            self._cache.clear()


# ---------------------------------------------------------------------------
# Knowledge Graph
# ---------------------------------------------------------------------------


class KnowledgeGraph:
    """In-memory knowledge graph over reasoning traces.

    Thread-safe. All public methods acquire self._lock before mutating state.
    Node IDs are deterministic:
      - Ticker: "ticker:{SYMBOL}" (uppercase)
      - Thesis: "thesis:{thesis_id}"
      - SubAgent: "agent:{role}" (one node per role type)
      - Region: "region:{code}"
      - Outcome: "outcome:{thesis_id}" (1:1 with thesis after resolution)
      - Narrative: "narrative:{title_hash}"
    """

    def __init__(self, *, enable_embeddings: bool = True) -> None:
        self._graph = nx.MultiDiGraph()
        self._lock = threading.RLock()
        self._embeddings = EmbeddingManager() if enable_embeddings else None

        # Pre-populate region nodes (static)
        for region in Region:
            self._add_node(
                node_id=f"region:{region.value}",
                node_type=NodeType.REGION,
                label=region.value,
            )

        # Pre-populate sub-agent role nodes (static)
        for role in AgentRole:
            self._add_node(
                node_id=f"agent:{role.value}",
                node_type=NodeType.SUB_AGENT,
                label=role.value,
            )

    # -------------------------------------------------------------------
    # Internal helpers
    # -------------------------------------------------------------------

    def _add_node(self, node_id: str, node_type: NodeType, **attrs: Any) -> None:
        """Add or update a node (no lock — caller must hold it or be __init__)."""
        self._graph.add_node(node_id, node_type=node_type.value, **attrs)

    def _add_edge(
        self, source: str, target: str, edge_type: EdgeType, **attrs: Any
    ) -> None:
        """Add a typed edge (no lock — caller must hold it)."""
        self._graph.add_edge(source, target, edge_type=edge_type.value, **attrs)

    def _thesis_text(self, thesis: InvestmentThesis) -> str:
        """Build a searchable text representation for embedding."""
        parts = [
            thesis.thesis_summary_en,
            thesis.ticker_or_asset,
            thesis.direction.value,
            thesis.region.value,
        ]
        # Include reasoning conclusions for richer semantics
        for block in thesis.reasoning_blocks[:3]:
            parts.append(block.conclusion)
        return " | ".join(parts)

    # -------------------------------------------------------------------
    # Public API: Ingestion
    # -------------------------------------------------------------------

    def ingest_thesis(self, thesis: InvestmentThesis) -> None:
        """Extract entities from a thesis and add to the graph.

        Idempotent: re-ingesting an existing thesis updates its node attributes
        but does not create duplicate edges.

        Creates nodes for the thesis, its ticker, and edges for:
        - ABOUT_TICKER, BELONGS_TO_REGION, GENERATED_BY (per reasoning block)
        - SUPPORTS/CONTRADICTS (vs existing theses on same ticker)
        - HAS_NARRATIVE (if narrative_velocity is present)
        """
        with self._lock:
            thesis_id = f"thesis:{thesis.thesis_id}"

            # Idempotency: skip edge creation if thesis already ingested
            already_exists = thesis_id in self._graph
            ticker_id = f"ticker:{thesis.ticker_or_asset.upper()}"
            region_id = f"region:{thesis.region.value}"

            # Thesis node
            self._add_node(
                thesis_id,
                NodeType.THESIS,
                label=thesis.thesis_summary_en[:80],
                full_summary=thesis.thesis_summary_en,
                direction=thesis.direction.value,
                confidence=thesis.confidence_score,
                timestamp=thesis.timestamp.isoformat(),
                ticker=thesis.ticker_or_asset.upper(),
                region=thesis.region.value,
                time_horizon_days=thesis.time_horizon_days,
            )

            # Ticker node
            self._add_node(
                ticker_id,
                NodeType.TICKER,
                label=thesis.ticker_or_asset.upper(),
                asset_class=thesis.asset_class.value,
            )

            # Skip edge creation on re-ingestion (node attrs already updated above)
            if not already_exists:
                # Core edges
                self._add_edge(thesis_id, ticker_id, EdgeType.ABOUT_TICKER)
                self._add_edge(thesis_id, region_id, EdgeType.BELONGS_TO_REGION)

                # Agent edges (one per reasoning block)
                for block in thesis.reasoning_blocks:
                    agent_id = f"agent:{block.agent_role.value}"
                    self._add_edge(
                        thesis_id,
                        agent_id,
                        EdgeType.GENERATED_BY,
                        confidence=block.confidence,
                        language=block.language,
                    )

                # Narrative edge (if narrative context available)
                if thesis.narrative_velocity:
                    title = thesis.narrative_velocity.get("narrative_title", "")
                    if title:
                        nhash = hashlib.sha256(title.lower().encode()).hexdigest()[:12]
                        narrative_id = f"narrative:{nhash}"
                        self._add_node(
                            narrative_id,
                            NodeType.NARRATIVE,
                            label=title,
                            narrative_type=thesis.narrative_velocity.get("narrative_type", ""),
                        )
                        self._add_edge(thesis_id, narrative_id, EdgeType.HAS_NARRATIVE)

                # Detect SUPPORTS/CONTRADICTS vs existing theses on same ticker
                self._detect_agreement_edges(thesis_id, thesis)

            # Compute and cache embedding
            if self._embeddings and self._embeddings.available:
                text = self._thesis_text(thesis)
                self._embeddings.embed(text, cache_key=thesis_id)

    def record_resolution(
        self,
        thesis_id: str,
        *,
        was_correct: bool,
        exit_price: float | None = None,
        resolved_at: datetime | None = None,
    ) -> None:
        """Update graph after settler resolves a prediction market.

        Adds an OUTCOME node and RESOLVED_AS edge with accuracy metadata.
        """
        with self._lock:
            full_thesis_id = f"thesis:{thesis_id}"
            outcome_id = f"outcome:{thesis_id}"

            if full_thesis_id not in self._graph:
                logger.warning("Cannot record resolution: thesis %s not in graph", thesis_id)
                return

            self._add_node(
                outcome_id,
                NodeType.OUTCOME,
                label="CORRECT" if was_correct else "INCORRECT",
                was_correct=was_correct,
                exit_price=exit_price,
                resolved_at=(resolved_at or datetime.now(timezone.utc)).isoformat(),
            )

            self._add_edge(
                full_thesis_id,
                outcome_id,
                EdgeType.RESOLVED_AS,
                was_correct=was_correct,
                exit_price=exit_price,
            )

    # -------------------------------------------------------------------
    # Agreement/contradiction detection
    # -------------------------------------------------------------------

    def _detect_agreement_edges(
        self, new_thesis_id: str, thesis: InvestmentThesis
    ) -> None:
        """Compare new thesis direction against existing theses on same ticker.

        Same direction + overlapping time horizon → SUPPORTS
        Opposite direction → CONTRADICTS

        Note: snapshot node list to avoid RuntimeError if graph is modified
        during iteration (defensive — edges don't mutate _node dict, but
        future refactors could add node creation here).
        """
        ticker = thesis.ticker_or_asset.upper()
        new_direction = thesis.direction

        # Snapshot to avoid iteration-during-mutation edge cases
        for node_id, attrs in list(self._graph.nodes(data=True)):
            if not node_id.startswith("thesis:") or node_id == new_thesis_id:
                continue
            if attrs.get("ticker") != ticker:
                continue

            existing_direction = attrs.get("direction")
            if not existing_direction:
                continue

            # Determine relationship
            if new_direction == Direction.NEUTRAL or existing_direction == Direction.NEUTRAL.value:
                continue  # Neutral doesn't contradict or support

            if new_direction.value == existing_direction:
                self._add_edge(new_thesis_id, node_id, EdgeType.SUPPORTS)
            else:
                self._add_edge(new_thesis_id, node_id, EdgeType.CONTRADICTS)

    # -------------------------------------------------------------------
    # Public API: Queries
    # -------------------------------------------------------------------

    def get_contradicting_theses(self, ticker: str) -> list[dict[str, Any]]:
        """Find pairs of theses that disagreed on a ticker's direction.

        Returns list of dicts with keys: thesis_a, thesis_b, direction_a,
        direction_b, confidence_a, confidence_b, timestamp_a, timestamp_b.
        """
        ticker = ticker.upper()
        pairs: list[dict[str, Any]] = []
        seen: set[tuple[str, str]] = set()

        with self._lock:
            for u, v, data in self._graph.edges(data=True):
                if data.get("edge_type") != EdgeType.CONTRADICTS.value:
                    continue

                # Ensure both theses are about this ticker
                u_attrs = self._graph.nodes.get(u, {})
                v_attrs = self._graph.nodes.get(v, {})

                if u_attrs.get("ticker") != ticker and v_attrs.get("ticker") != ticker:
                    continue

                pair_key = tuple(sorted([u, v]))
                if pair_key in seen:
                    continue
                seen.add(pair_key)

                pairs.append({
                    "thesis_a": u.removeprefix("thesis:"),
                    "thesis_b": v.removeprefix("thesis:"),
                    "direction_a": u_attrs.get("direction"),
                    "direction_b": v_attrs.get("direction"),
                    "confidence_a": u_attrs.get("confidence"),
                    "confidence_b": v_attrs.get("confidence"),
                    "summary_a": u_attrs.get("full_summary", ""),
                    "summary_b": v_attrs.get("full_summary", ""),
                    "timestamp_a": u_attrs.get("timestamp"),
                    "timestamp_b": v_attrs.get("timestamp"),
                })

        return pairs

    def get_consensus_theses(
        self, ticker: str, window_days: int = 30
    ) -> list[dict[str, Any]]:
        """Find theses where all desks agreed on direction within a time window.

        Returns theses that have SUPPORTS edges and no CONTRADICTS edges
        from other theses within the window.
        """
        ticker = ticker.upper()
        cutoff = datetime.now(timezone.utc) - timedelta(days=window_days)
        consensus: list[dict[str, Any]] = []

        with self._lock:
            # Gather all theses for this ticker within the window
            ticker_theses: list[tuple[str, dict]] = []
            for node_id, attrs in self._graph.nodes(data=True):
                if not node_id.startswith("thesis:"):
                    continue
                if attrs.get("ticker") != ticker:
                    continue
                ts = attrs.get("timestamp", "")
                if ts:
                    try:
                        thesis_time = datetime.fromisoformat(ts)
                        if thesis_time.tzinfo is None:
                            thesis_time = thesis_time.replace(tzinfo=timezone.utc)
                        if thesis_time < cutoff:
                            continue
                    except ValueError:
                        continue
                ticker_theses.append((node_id, attrs))

            if not ticker_theses:
                return []

            # Group by direction
            by_direction: dict[str, list[tuple[str, dict]]] = defaultdict(list)
            for node_id, attrs in ticker_theses:
                direction = attrs.get("direction", "")
                by_direction[direction].append((node_id, attrs))

            # Consensus = a direction held by ALL theses in the window
            # (or the majority if there are contradictions, return the majority group)
            if len(by_direction) == 1:
                # Perfect consensus — all theses agree
                direction = list(by_direction.keys())[0]
                for node_id, attrs in by_direction[direction]:
                    consensus.append({
                        "thesis_id": node_id.removeprefix("thesis:"),
                        "direction": direction,
                        "confidence": attrs.get("confidence"),
                        "summary": attrs.get("full_summary", ""),
                        "region": attrs.get("region"),
                        "timestamp": attrs.get("timestamp"),
                    })

        return consensus

    def get_best_agent_by_region(self, region: str) -> dict[str, Any]:
        """Determine which sub-agent type has the highest accuracy in a region.

        Looks at resolved theses in the region and tracks accuracy per
        contributing agent role.
        """
        region = region.upper()
        agent_stats: dict[str, dict[str, int]] = defaultdict(
            lambda: {"correct": 0, "total": 0}
        )

        with self._lock:
            # Find all theses in this region that have outcomes
            for node_id, attrs in self._graph.nodes(data=True):
                if not node_id.startswith("thesis:"):
                    continue
                if attrs.get("region") != region:
                    continue

                # Check if this thesis has a resolution
                outcome_id = f"outcome:{node_id.removeprefix('thesis:')}"
                if outcome_id not in self._graph:
                    continue

                outcome_attrs = self._graph.nodes[outcome_id]
                was_correct = outcome_attrs.get("was_correct", False)

                # Find which agents contributed to this thesis
                for _, target, edge_data in self._graph.edges(node_id, data=True):
                    if edge_data.get("edge_type") != EdgeType.GENERATED_BY.value:
                        continue
                    agent_role = target.removeprefix("agent:")
                    agent_stats[agent_role]["total"] += 1
                    if was_correct:
                        agent_stats[agent_role]["correct"] += 1

        # Compute accuracy and find the best
        results: list[dict[str, Any]] = []
        for role, stats in agent_stats.items():
            accuracy = stats["correct"] / stats["total"] if stats["total"] > 0 else 0.0
            results.append({
                "agent_role": role,
                "accuracy": round(accuracy, 4),
                "correct": stats["correct"],
                "total": stats["total"],
            })

        results.sort(key=lambda x: x["accuracy"], reverse=True)
        return {
            "region": region,
            "rankings": results,
            "best": results[0] if results else None,
        }

    def get_narrative_chain(self, ticker: str) -> list[dict[str, Any]]:
        """Trace how the story evolved for a ticker across theses over time.

        Returns an ordered list of narrative shifts: which narratives were
        attached to theses about this ticker, when, and how they changed.
        """
        ticker = ticker.upper()
        chain: list[dict[str, Any]] = []

        with self._lock:
            # Find all theses for this ticker, sorted by timestamp
            theses: list[tuple[str, dict]] = []
            for node_id, attrs in self._graph.nodes(data=True):
                if not node_id.startswith("thesis:"):
                    continue
                if attrs.get("ticker") != ticker:
                    continue
                theses.append((node_id, attrs))

            theses.sort(key=lambda x: x[1].get("timestamp", ""))

            for node_id, attrs in theses:
                # Find narrative edges from this thesis
                narratives_for_thesis: list[str] = []
                for _, target, edge_data in self._graph.edges(node_id, data=True):
                    if edge_data.get("edge_type") != EdgeType.HAS_NARRATIVE.value:
                        continue
                    target_attrs = self._graph.nodes.get(target, {})
                    narratives_for_thesis.append(target_attrs.get("label", "unknown"))

                chain.append({
                    "thesis_id": node_id.removeprefix("thesis:"),
                    "timestamp": attrs.get("timestamp"),
                    "direction": attrs.get("direction"),
                    "confidence": attrs.get("confidence"),
                    "summary": attrs.get("full_summary", ""),
                    "region": attrs.get("region"),
                    "narratives": narratives_for_thesis,
                })

        return chain

    def find_similar_theses(
        self, thesis_id: str, *, top_k: int = 5
    ) -> list[dict[str, Any]]:
        """Find semantically similar past theses via embedding cosine similarity.

        Requires sentence-transformers. Returns empty list if unavailable.
        Embedding computation happens outside the lock to avoid blocking.
        """
        if not self._embeddings or not self._embeddings.available:
            logger.info("Embeddings unavailable — cannot compute similarity")
            return []

        full_id = f"thesis:{thesis_id}"

        # Phase 1: get query embedding (may involve model inference outside lock)
        query_embedding = self._embeddings.get(full_id)
        if query_embedding is None:
            with self._lock:
                if full_id not in self._graph:
                    return []
                text = self._graph.nodes[full_id].get("full_summary", "")
            if not text:
                return []
            # Embedding computation outside lock (slow, I/O-bound)
            query_embedding = self._embeddings.embed(text, cache_key=full_id)

        if query_embedding is None:
            return []

        # Phase 2: compare against cached embeddings (thread-safe snapshot)
        with self._embeddings._cache_lock:
            cache_snapshot = list(self._embeddings._cache.items())
        similarities: list[tuple[str, float]] = []
        for cached_id, cached_vec in cache_snapshot:
            if cached_id == full_id or not cached_id.startswith("thesis:"):
                continue
            sim = self._embeddings.cosine_similarity(query_embedding, cached_vec)
            similarities.append((cached_id, sim))

        # Sort by similarity descending
        similarities.sort(key=lambda x: x[1], reverse=True)

        # Phase 3: enrich with node attributes (brief lock)
        results: list[dict[str, Any]] = []
        with self._lock:
            for node_id, score in similarities[:top_k]:
                attrs = self._graph.nodes.get(node_id, {})
                results.append({
                    "thesis_id": node_id.removeprefix("thesis:"),
                    "similarity": round(score, 4),
                    "summary": attrs.get("full_summary", ""),
                    "direction": attrs.get("direction"),
                    "region": attrs.get("region"),
                    "ticker": attrs.get("ticker"),
                    "timestamp": attrs.get("timestamp"),
                })

        return results

    # -------------------------------------------------------------------
    # Public API: Graph export (for frontend visualization)
    # -------------------------------------------------------------------

    def export_subgraph(
        self,
        *,
        ticker: str | None = None,
        region: str | None = None,
        max_nodes: int = 200,
    ) -> dict[str, Any]:
        """Export a subgraph as JSON for D3.js force-directed visualization.

        Filters by ticker and/or region. Returns {nodes: [...], edges: [...]}.
        """
        with self._lock:
            if ticker or region:
                relevant_nodes = self._filter_nodes(
                    ticker=ticker.upper() if ticker else None,
                    region=region.upper() if region else None,
                )
            else:
                relevant_nodes = set(self._graph.nodes())

            # Cap node count to avoid overwhelming the frontend
            if len(relevant_nodes) > max_nodes:
                # Prioritize: theses first, then connected nodes
                thesis_nodes = [n for n in relevant_nodes if n.startswith("thesis:")]
                other_nodes = [n for n in relevant_nodes if not n.startswith("thesis:")]
                relevant_nodes = set(thesis_nodes[:max_nodes // 2] + other_nodes[:max_nodes // 2])

            nodes: list[dict[str, Any]] = []
            for node_id in relevant_nodes:
                attrs = dict(self._graph.nodes[node_id])
                nodes.append({
                    "id": node_id,
                    "type": attrs.pop("node_type", "unknown"),
                    "label": attrs.pop("label", node_id),
                    **attrs,
                })

            edges: list[dict[str, Any]] = []
            for src, tgt, data in self._graph.edges(data=True):
                if src in relevant_nodes and tgt in relevant_nodes:
                    edge_attrs = {k: val for k, val in data.items() if k != "edge_type"}
                    edges.append({
                        "source": src,
                        "target": tgt,
                        "type": data.get("edge_type", "unknown"),
                        **edge_attrs,
                    })

            return {
                "nodes": nodes,
                "edges": edges,
                "meta": {
                    "total_nodes": self._graph.number_of_nodes(),
                    "total_edges": self._graph.number_of_edges(),
                    "filtered_nodes": len(nodes),
                    "filtered_edges": len(edges),
                },
            }

    def _filter_nodes(
        self, *, ticker: str | None, region: str | None
    ) -> set[str]:
        """Get nodes relevant to a ticker/region filter, including neighbors."""
        seed_nodes: set[str] = set()

        if ticker:
            ticker_node = f"ticker:{ticker}"
            if ticker_node in self._graph:
                seed_nodes.add(ticker_node)
                # Add all theses about this ticker
                for pred in self._graph.predecessors(ticker_node):
                    seed_nodes.add(pred)

        if region:
            region_node = f"region:{region}"
            if region_node in self._graph:
                seed_nodes.add(region_node)
                for pred in self._graph.predecessors(region_node):
                    seed_nodes.add(pred)

        # Expand to 1-hop neighbors for context
        expanded: set[str] = set(seed_nodes)
        for node in seed_nodes:
            for neighbor in self._graph.neighbors(node):
                expanded.add(neighbor)
            for predecessor in self._graph.predecessors(node):
                expanded.add(predecessor)

        return expanded

    # -------------------------------------------------------------------
    # Public API: Stats
    # -------------------------------------------------------------------

    def stats(self) -> dict[str, Any]:
        """Return graph statistics for monitoring."""
        with self._lock:
            node_counts: dict[str, int] = defaultdict(int)
            for _, attrs in self._graph.nodes(data=True):
                node_counts[attrs.get("node_type", "unknown")] += 1

            edge_counts: dict[str, int] = defaultdict(int)
            for _, _, data in self._graph.edges(data=True):
                edge_counts[data.get("edge_type", "unknown")] += 1

            return {
                "total_nodes": self._graph.number_of_nodes(),
                "total_edges": self._graph.number_of_edges(),
                "nodes_by_type": dict(node_counts),
                "edges_by_type": dict(edge_counts),
                "embeddings_cached": (
                    len(self._embeddings._cache) if self._embeddings else 0
                ),
            }


# ---------------------------------------------------------------------------
# SQLite persistence — survive server restarts
# ---------------------------------------------------------------------------

_DEFAULT_KG_DB = Path(__file__).parent.parent / "data" / "knowledge_graph.db"


class GraphPersistence:
    """SQLite-backed persistence for the knowledge graph.

    Schema: two tables (nodes, edges) storing the graph as an edge list.
    Designed for periodic snapshots, not per-mutation writes (MVP performance).
    """

    def __init__(self, db_path: Path | str = _DEFAULT_KG_DB) -> None:
        self._db_path = Path(db_path)
        self._db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_schema()

    def _conn(self) -> sqlite3.Connection:
        conn = sqlite3.connect(str(self._db_path), timeout=10.0)
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA busy_timeout=5000")
        return conn

    def _init_schema(self) -> None:
        conn = self._conn()
        try:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS kg_nodes (
                    node_id TEXT PRIMARY KEY,
                    attrs TEXT NOT NULL
                )
            """)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS kg_edges (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    source TEXT NOT NULL,
                    target TEXT NOT NULL,
                    attrs TEXT NOT NULL
                )
            """)
            conn.commit()
        finally:
            conn.close()

    def save(self, graph: nx.MultiDiGraph) -> None:
        """Persist entire graph to SQLite (atomic replace)."""
        conn = self._conn()
        try:
            conn.execute("DELETE FROM kg_nodes")
            conn.execute("DELETE FROM kg_edges")
            conn.executemany(
                "INSERT INTO kg_nodes (node_id, attrs) VALUES (?, ?)",
                [(nid, json.dumps(attrs, default=str)) for nid, attrs in graph.nodes(data=True)],
            )
            conn.executemany(
                "INSERT INTO kg_edges (source, target, attrs) VALUES (?, ?, ?)",
                [(u, v, json.dumps(d, default=str)) for u, v, d in graph.edges(data=True)],
            )
            conn.commit()
            logger.info("Knowledge graph persisted: %d nodes, %d edges", graph.number_of_nodes(), graph.number_of_edges())
        finally:
            conn.close()

    def load(self) -> nx.MultiDiGraph | None:
        """Load graph from SQLite. Returns None if no data."""
        if not self._db_path.exists():
            return None
        conn = self._conn()
        try:
            rows = conn.execute("SELECT COUNT(*) FROM kg_nodes").fetchone()
            if not rows or rows[0] == 0:
                return None

            graph = nx.MultiDiGraph()
            for row in conn.execute("SELECT node_id, attrs FROM kg_nodes"):
                attrs = json.loads(row[1])
                graph.add_node(row[0], **attrs)
            for row in conn.execute("SELECT source, target, attrs FROM kg_edges"):
                attrs = json.loads(row[2])
                graph.add_edge(row[0], row[1], **attrs)

            logger.info("Knowledge graph loaded: %d nodes, %d edges", graph.number_of_nodes(), graph.number_of_edges())
            return graph
        except Exception as exc:
            logger.warning("Failed to load knowledge graph from SQLite: %s", exc)
            return None
        finally:
            conn.close()


# ---------------------------------------------------------------------------
# Module-level singleton (for FastAPI dependency injection)
# ---------------------------------------------------------------------------

_graph_instance: KnowledgeGraph | None = None
_graph_lock = threading.Lock()


def get_knowledge_graph(*, enable_embeddings: bool = True) -> KnowledgeGraph:
    """Get or create the singleton KnowledgeGraph instance.

    On first creation, attempts to load persisted state from SQLite.
    """
    global _graph_instance
    if _graph_instance is None:
        with _graph_lock:
            if _graph_instance is None:
                kg = KnowledgeGraph(enable_embeddings=enable_embeddings)
                # Attempt to restore from persistence
                persistence = GraphPersistence()
                saved_graph = persistence.load()
                if saved_graph is not None:
                    kg._graph = saved_graph
                _graph_instance = kg
    return _graph_instance


def persist_knowledge_graph() -> None:
    """Save current graph state to SQLite. Call periodically or on shutdown."""
    if _graph_instance is not None:
        persistence = GraphPersistence()
        with _graph_instance._lock:
            persistence.save(_graph_instance._graph)
