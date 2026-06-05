from __future__ import annotations

import asyncio
import json
import logging
import os
import re
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, AsyncGenerator, Literal

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, Field, field_validator

from agents.translator_agent import TranslatorAgent
from backend.persistence.multi_pinner import build_multi_pinner
from demo.e2e_run import _build_desks, run_desk

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan: startup (load) and shutdown (persist) knowledge graph."""
    # Startup: eagerly load the knowledge graph from SQLite
    try:
        from reasoning.knowledge_graph import get_knowledge_graph
        get_knowledge_graph(enable_embeddings=True)
        logger.info("Knowledge graph loaded on startup")
    except Exception as exc:
        logger.warning("Knowledge graph startup load failed (non-fatal): %s", exc)
    yield
    # Shutdown: persist knowledge graph to SQLite
    try:
        from reasoning.knowledge_graph import persist_knowledge_graph
        persist_knowledge_graph()
        logger.info("Knowledge graph persisted on shutdown")
    except Exception as exc:
        logger.warning("Knowledge graph shutdown persist failed: %s", exc)


app = FastAPI(title="Rosetta Alpha API", lifespan=lifespan)

# Enable CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

RESULTS_PATH = Path(__file__).parent.parent / "results.json"
DeskKey = Literal["us", "cn", "eu", "jp", "crypto"]
_TICKER_RE = re.compile(r"^[A-Za-z0-9._/-]{1,24}$")


class AnalyzeRequest(BaseModel):
    """API request model for on-demand multi-desk analysis."""

    model_config = ConfigDict(extra="forbid")

    desks: list[DeskKey] | None = Field(
        default=None,
        description="Subset of desks to run. Omit for all desks.",
    )
    tickers: dict[DeskKey, str] = Field(
        default_factory=dict,
        description="Optional per-desk ticker overrides, e.g. {'us':'MSFT','crypto':'ETH'}.",
    )
    on_chain: bool = Field(
        default=False,
        description="Whether to record traces on Arc L1 (slower, external dependency).",
    )
    timeout_seconds: float = Field(
        default=180.0,
        ge=15.0,
        le=900.0,
        description="Overall request timeout budget.",
    )
    desk_timeout_seconds: float = Field(
        default=75.0,
        ge=10.0,
        le=300.0,
        description="Per-desk timeout budget.",
    )
    circuit_breaker_failures: int = Field(
        default=3,
        ge=1,
        le=5,
        description="Open circuit after N consecutive desk failures; remaining desks are skipped.",
    )
    verbose: bool = Field(default=False)

    @field_validator("desks")
    @classmethod
    def _validate_desks_unique(cls, v: list[DeskKey] | None) -> list[DeskKey] | None:
        if v is None:
            return v
        if len(set(v)) != len(v):
            raise ValueError("desks must be unique")
        return v

    @field_validator("tickers")
    @classmethod
    def _validate_tickers(cls, v: dict[DeskKey, str]) -> dict[DeskKey, str]:
        cleaned: dict[DeskKey, str] = {}
        for desk, ticker in v.items():
            symbol = ticker.strip().upper()
            if not _TICKER_RE.fullmatch(symbol):
                raise ValueError(
                    f"Invalid ticker for desk '{desk}': '{ticker}'. "
                    "Allowed: letters, digits, ., _, /, -, max length 24."
                )
            cleaned[desk] = symbol
        return cleaned


@app.get("/api/results")
async def get_results():
    """Serve the latest E2E run results."""
    if not RESULTS_PATH.exists():
        # Fallback to empty list if no results yet
        return []

    try:
        with open(RESULTS_PATH, "r") as f:
            data = json.load(f)
            return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading results: {str(e)}")


@app.post("/api/v1/analyze")
async def analyze(payload: AnalyzeRequest) -> dict[str, Any]:
    """Run selected desks and return structured per-desk outcomes + run manifest CID."""
    deployer = os.getenv("ARC_DEPLOYER_ADDRESS", "0x0000000000000000000000000000000000000000")
    translator = TranslatorAgent()
    desks = _build_desks()
    selected_keys: list[DeskKey] = payload.desks or list(desks.keys())  # type: ignore[assignment]
    run_started = datetime.now(timezone.utc)
    run_id = run_started.strftime("%Y%m%dT%H%M%SZ")

    results: list[dict[str, Any]] = []
    consecutive_failures = 0

    async def _run_all() -> dict[str, Any]:
        nonlocal consecutive_failures
        for desk in selected_keys:
            if consecutive_failures >= payload.circuit_breaker_failures:
                default_ticker = desks[desk][1]
                results.append(
                    {
                        "desk": desk,
                        "ticker": payload.tickers.get(desk, default_ticker),
                        "status": "skipped_circuit_open",
                        "error": (
                            f"Circuit opened after {payload.circuit_breaker_failures} "
                            "consecutive failures"
                        ),
                        "direction": None,
                        "confidence": None,
                        "question": None,
                        "ipfs_thesis_cid": None,
                        "ipfs_question_cid": None,
                        "arc_tx": None,
                        "market_tx": None,
                    }
                )
                continue

            agent, default_ticker = desks[desk]
            ticker = payload.tickers.get(desk, default_ticker)

            try:
                desk_result = await asyncio.wait_for(
                    run_desk(
                        desk=desk,
                        agent=agent,
                        ticker=ticker,
                        translator=translator,
                        deployer=deployer,
                        on_chain=payload.on_chain,
                        verbose=payload.verbose,
                    ),
                    timeout=payload.desk_timeout_seconds,
                )
            except asyncio.TimeoutError:
                desk_result = {
                    "desk": desk,
                    "ticker": ticker,
                    "status": "error",
                    "error": f"Desk timeout after {payload.desk_timeout_seconds:.1f}s",
                    "direction": None,
                    "confidence": None,
                    "question": None,
                    "ipfs_thesis_cid": None,
                    "ipfs_question_cid": None,
                    "arc_tx": None,
                    "market_tx": None,
                }
            except Exception as exc:
                desk_result = {
                    "desk": desk,
                    "ticker": ticker,
                    "status": "error",
                    "error": str(exc),
                    "direction": None,
                    "confidence": None,
                    "question": None,
                    "ipfs_thesis_cid": None,
                    "ipfs_question_cid": None,
                    "arc_tx": None,
                    "market_tx": None,
                }

            results.append(desk_result)

            if desk_result.get("status") == "ok":
                consecutive_failures = 0
            else:
                consecutive_failures += 1

        ok = [r for r in results if r.get("status") == "ok"]
        status = (
            "success"
            if len(ok) == len(results) and len(results) > 0
            else "partial_success"
            if len(ok) > 0
            else "analysis_failed"
        )

        manifest_cid = None
        manifest_url = None
        if len(ok) > 0:
            try:
                manifest = {
                    "run_id": run_id,
                    "timestamp": run_started.isoformat(),
                    "desks": [
                        {
                            "desk": r.get("desk"),
                            "ticker": r.get("ticker"),
                            "thesis_cid": r.get("ipfs_thesis_cid"),
                            "question_cid": r.get("ipfs_question_cid"),
                            "direction": r.get("direction"),
                            "confidence": r.get("confidence"),
                            "status": r.get("status"),
                        }
                        for r in results
                    ],
                }
                multi = build_multi_pinner()
                manifest_cid, _ = await multi.pin(manifest, name=f"rosetta-run-{run_id}")
                manifest_url = f"https://w3s.link/ipfs/{manifest_cid}"
            except Exception as manifest_exc:
                logger.warning("Manifest pin failed (non-fatal): %s", manifest_exc)
        else:
            logger.warning("Skipping manifest pin: zero successful desks (analysis_failed)")

        desks_map = {str(r.get("desk")): r for r in results}
        return {
            "run_id": run_id,
            "timestamp": run_started.isoformat(),
            "status": status,
            "selected_desks": selected_keys,
            "ok_count": len(ok),
            "total_count": len(results),
            "manifest_cid": manifest_cid,
            "manifest_url": manifest_url,
            "desks": desks_map,
            "results": results,
        }

    try:
        return await asyncio.wait_for(_run_all(), timeout=payload.timeout_seconds)
    except asyncio.TimeoutError:
        return {
            "run_id": run_id,
            "timestamp": run_started.isoformat(),
            "status": "timeout",
            "selected_desks": selected_keys,
            "ok_count": sum(1 for r in results if r.get("status") == "ok"),
            "total_count": len(results),
            "manifest_cid": None,
            "manifest_url": None,
            "desks": {str(r.get("desk")): r for r in results},
            "results": results,
            "error": f"Overall timeout after {payload.timeout_seconds:.1f}s",
        }


@app.get("/api/health")
async def health():
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# Divergence Index endpoints
# ---------------------------------------------------------------------------


@app.get("/api/v1/divergence")
async def get_divergence(ticker: str):
    """Get the cross-desk divergence index for a ticker."""
    from reasoning.divergence_index import DivergenceStore, calculate_divergence
    import json

    if not _TICKER_RE.match(ticker):
        raise HTTPException(status_code=400, detail="Invalid ticker format")

    ticker_upper = ticker.upper().strip()
    store = DivergenceStore()
    metrics = store.get_latest_divergence(ticker_upper)

    if metrics:
        return {
            "ticker": metrics.ticker,
            "timestamp": metrics.timestamp.isoformat(),
            "composite_divergence": metrics.composite_divergence,
            "direction_divergence": metrics.direction_divergence,
            "confidence_divergence": metrics.confidence_divergence,
            "narrative_divergence": metrics.narrative_divergence,
        }

    # Dynamic fallback: check results.json to calculate on-the-fly
    if RESULTS_PATH.exists():
        try:
            with open(RESULTS_PATH, "r") as f:
                data = json.load(f)
            # Filter results matching the requested ticker
            matching_theses = []
            if isinstance(data, list):
                # E2E runs are list of runs or list of desk items
                for item in data:
                    # If it's a list of desk results
                    if isinstance(item, dict) and item.get("ticker", "").upper().strip() == ticker_upper:
                        matching_theses.append(item)
                    elif isinstance(item, dict) and "results" in item:
                        # Top level run dictionary containing results list
                        for sub_item in item["results"]:
                            if sub_item.get("ticker", "").upper().strip() == ticker_upper:
                                matching_theses.append(sub_item)
            elif isinstance(data, dict):
                # Single run payload
                if "results" in data:
                    for sub_item in data["results"]:
                        if sub_item.get("ticker", "").upper().strip() == ticker_upper:
                            matching_theses.append(sub_item)

            if matching_theses:
                computed = calculate_divergence(matching_theses, ticker_upper)
                if computed:
                    # Save computed metrics to the history table for subsequent requests
                    store.save_divergence(computed)
                    return {
                        "ticker": computed.ticker,
                        "timestamp": computed.timestamp.isoformat(),
                        "composite_divergence": computed.composite_divergence,
                        "direction_divergence": computed.direction_divergence,
                        "confidence_divergence": computed.confidence_divergence,
                        "narrative_divergence": computed.narrative_divergence,
                    }
        except Exception as e:
            logger.error("Failed to dynamically compute divergence: %s", e)

    # Return fallback neutral defaults if no metrics exist
    return {
        "ticker": ticker_upper,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "composite_divergence": 0.0,
        "direction_divergence": 0.0,
        "confidence_divergence": 0.0,
        "narrative_divergence": 0.0,
    }


# ---------------------------------------------------------------------------
# Mob Meter endpoints
# ---------------------------------------------------------------------------


@app.get("/api/v1/mob-meter")
async def get_mob_meter(ticker: str):
    """Get the crowd extremity / mob index for a ticker."""
    from reasoning.mob_meter import ConfidenceCalibrationStore, calculate_mob_extremity, iter_thesis_records
    import json

    if not _TICKER_RE.match(ticker):
        raise HTTPException(status_code=400, detail="Invalid ticker format")

    ticker_upper = ticker.upper().strip()
    matching_theses: list[dict[str, Any]] = []

    if RESULTS_PATH.exists():
        try:
            with open(RESULTS_PATH, "r") as f:
                data = json.load(f)

            matching_theses.extend(
                record for record in iter_thesis_records(data)
                if record.get("ticker", "").upper().strip() == ticker_upper
            )
        except Exception as e:
            logger.error("Failed to load mob meter inputs: %s", e)

    metrics = calculate_mob_extremity(
        matching_theses,
        ticker_upper,
        calibration_store=ConfidenceCalibrationStore(),
    )

    if metrics:
        return {
            "ticker": metrics.ticker,
            "timestamp": metrics.timestamp.isoformat(),
            "mob_index": metrics.mob_index,
            "consensus_level": metrics.consensus_level,
            "confidence_extremity": metrics.confidence_extremity,
            "narrative_intensity": metrics.narrative_intensity,
            "dominant_direction": metrics.dominant_direction.value if metrics.dominant_direction else None,
            "flags": [flag.value for flag in metrics.flags],
            "label": metrics.label,
            "cross_desk_consensus": metrics.cross_desk_consensus.model_dump(mode="json"),
            "within_desk_consensus": {
                desk: snapshot.model_dump(mode="json")
                for desk, snapshot in metrics.within_desk_consensus.items()
            },
        }

    return {
        "ticker": ticker_upper,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "mob_index": 0.0,
        "consensus_level": 0.0,
        "confidence_extremity": 0.0,
        "narrative_intensity": 0.0,
        "dominant_direction": None,
        "flags": [],
        "label": "Normal disagreement",
        "cross_desk_consensus": {
            "agreement": 0.0,
            "dominant_direction": None,
            "participant_count": 0,
            "flags": [],
        },
        "within_desk_consensus": {},
    }


# ---------------------------------------------------------------------------
# Narrative Engine endpoints
# ---------------------------------------------------------------------------


@app.get("/api/v1/narratives/{ticker}")
async def get_narratives(ticker: str, region: str | None = None):
    """Get stored narratives + velocity for a ticker.

    Query params:
        region: optional filter (US, CN, EU, JP, CRYPTO)
    """
    from reasoning.narrative_engine import NarrativeEngine
    from reasoning.trace_schema import Region

    if not _TICKER_RE.match(ticker):
        raise HTTPException(status_code=400, detail="Invalid ticker format")

    engine = NarrativeEngine()

    region_filter = None
    if region:
        try:
            region_filter = Region(region.upper())
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid region: {region}")

    narratives = engine.get_ticker_narratives(ticker.upper(), region=region_filter)
    velocities = engine.get_velocity(ticker.upper(), region=region_filter)

    return {
        "ticker": ticker.upper(),
        "region": region,
        "narratives": narratives,
        "velocities": [v.model_dump() for v in velocities],
    }


@app.get("/api/v1/narratives-contagion")
async def get_contagion(hours: int = 72):
    """Get cross-desk narrative contagion alerts."""
    from reasoning.narrative_engine import NarrativeEngine

    if hours < 1 or hours > 720:
        raise HTTPException(status_code=400, detail="hours must be 1-720")

    engine = NarrativeEngine()
    alerts = engine.check_contagion(hours=hours)
    return {
        "hours": hours,
        "alerts": [a.model_dump() for a in alerts],
        "count": len(alerts),
    }


# ---------------------------------------------------------------------------
# Knowledge Graph endpoints
# ---------------------------------------------------------------------------


@app.get("/api/v1/knowledge-graph")
async def get_knowledge_graph_data(ticker: str | None = None, region: str | None = None, max_nodes: int = 200):
    """Export knowledge graph subgraph for frontend visualization."""
    from reasoning.knowledge_graph import get_knowledge_graph

    kg = get_knowledge_graph(enable_embeddings=True)
    return kg.export_subgraph(ticker=ticker, region=region, max_nodes=max_nodes)


@app.get("/api/v1/knowledge-graph/contradictions")
async def get_contradictions(ticker: str):
    """Get contradicting thesis pairs for a ticker."""
    from reasoning.knowledge_graph import get_knowledge_graph

    if not ticker or not _TICKER_RE.fullmatch(ticker.strip().upper()):
        raise HTTPException(status_code=400, detail="Invalid ticker")
    kg = get_knowledge_graph(enable_embeddings=False)
    return {"ticker": ticker.upper(), "contradictions": kg.get_contradicting_theses(ticker)}


@app.get("/api/v1/knowledge-graph/consensus")
async def get_consensus(ticker: str, window_days: int = 30):
    """Get consensus theses for a ticker within a time window."""
    from reasoning.knowledge_graph import get_knowledge_graph

    if not ticker or not _TICKER_RE.fullmatch(ticker.strip().upper()):
        raise HTTPException(status_code=400, detail="Invalid ticker")
    if window_days < 1 or window_days > 365:
        raise HTTPException(status_code=400, detail="window_days must be 1-365")
    kg = get_knowledge_graph(enable_embeddings=False)
    return {"ticker": ticker.upper(), "window_days": window_days, "consensus": kg.get_consensus_theses(ticker, window_days)}


@app.get("/api/v1/knowledge-graph/narrative-chain")
async def get_narrative_chain(ticker: str):
    """Get narrative evolution chain for a ticker."""
    from reasoning.knowledge_graph import get_knowledge_graph

    if not ticker or not _TICKER_RE.fullmatch(ticker.strip().upper()):
        raise HTTPException(status_code=400, detail="Invalid ticker")
    kg = get_knowledge_graph(enable_embeddings=False)
    return {"ticker": ticker.upper(), "chain": kg.get_narrative_chain(ticker)}


@app.get("/api/v1/knowledge-graph/best-agent")
async def get_best_agent(region: str):
    """Get best-performing agent role for a region."""
    from reasoning.knowledge_graph import get_knowledge_graph
    from reasoning.trace_schema import Region

    try:
        Region(region.upper())
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid region: {region}")
    kg = get_knowledge_graph(enable_embeddings=False)
    return kg.get_best_agent_by_region(region)


@app.get("/api/v1/knowledge-graph/similar")
async def get_similar_theses(thesis_id: str, top_k: int = 5):
    """Find semantically similar theses."""
    from reasoning.knowledge_graph import get_knowledge_graph

    if top_k < 1 or top_k > 50:
        raise HTTPException(status_code=400, detail="top_k must be 1-50")
    kg = get_knowledge_graph(enable_embeddings=True)
    return {"thesis_id": thesis_id, "similar": kg.find_similar_theses(thesis_id, top_k=top_k)}


@app.get("/api/v1/knowledge-graph/stats")
async def get_kg_stats():
    """Get knowledge graph statistics."""
    from reasoning.knowledge_graph import get_knowledge_graph

    kg = get_knowledge_graph(enable_embeddings=False)
    return kg.stats()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
