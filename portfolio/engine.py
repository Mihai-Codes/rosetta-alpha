"""Portfolio Engine — cross-region conviction aggregator.

Pipeline:
1. Accept a list of (ticker, region) pairs.
2. Run all regional agents in parallel via asyncio.gather.
3. Compute per-position signals and aggregate into a PortfolioView.
4. Optionally pin the snapshot to IPFS.

Inspired by the MarketSenseAI multi-agent routing pattern and PolySwarm's
cross-agent signal aggregation for prediction markets.

Run standalone:
    GROQ_API_KEY=xxx uv run python -m portfolio.engine \
        --positions AAPL:us MSFT:us ETH:crypto
"""

from __future__ import annotations

import asyncio
import logging
from collections import Counter
from dataclasses import dataclass
from typing import Sequence

from dotenv import load_dotenv

load_dotenv(override=True)

from reasoning import ipfs_pinner
from reasoning.trace_schema import (
    Direction,
    InvestmentThesis,
    PortfolioPosition,
    PortfolioView,
    Region,
)

logger = logging.getLogger(__name__)

# Thresholds for discretising the net signal into a Direction
_LONG_THRESHOLD = 0.10
_SHORT_THRESHOLD = -0.10


@dataclass(frozen=True)
class AnalysisRequest:
    """A single (ticker, region) analysis request."""

    ticker: str
    region: str  # "us" | "cn" | "crypto" — matches _build_agent keys


def _direction_to_signal(direction: Direction, confidence: float) -> float:
    """Convert direction + confidence into a signed scalar in [-1, 1]."""
    multiplier = {Direction.LONG: 1.0, Direction.SHORT: -1.0, Direction.NEUTRAL: 0.0}
    return multiplier[direction] * confidence


def _net_to_direction(net: float) -> Direction:
    if net >= _LONG_THRESHOLD:
        return Direction.LONG
    if net <= _SHORT_THRESHOLD:
        return Direction.SHORT
    return Direction.NEUTRAL


def _top_risks(theses: list[InvestmentThesis], top_n: int = 8) -> list[str]:
    """Deduplicate and frequency-rank risk factors across all theses."""
    counter: Counter[str] = Counter()
    for t in theses:
        for r in t.risk_factors:
            counter[r.strip()] += 1
    return [risk for risk, _ in counter.most_common(top_n)]


def _build_agent(region: str, model_client=None, model_kwargs=None):
    """Instantiate the correct regional agent.

    Args:
        region: Desk identifier — "us" | "cn" | "jp" | "eu" | "crypto".
        model_client: Override the default model client. When None, each agent
            uses its own routing logic (DeepSeek for CN, Gemini for JP/EU, etc.).
            Set ROSETTA_TRAINING_MODEL=gemini to use Gemini Flash Lite for all
            desks during training (avoids Groq TPD exhaustion).
        model_kwargs: Override model kwargs (model name, temperature, etc.).
    """
    import os

    # Training model override — swap non-CN agents to Gemini Flash Lite to avoid
    # Groq 100K TPD exhaustion when running multi-round optimization sweeps.
    # CN is excluded: Chinese synthesis prompts require DeepSeek/Groq for correct formatting.
    training_model = os.environ.get("ROSETTA_TRAINING_MODEL", "")
    if training_model == "gemini" and model_client is None and region != "cn":
        gemini_key = os.environ.get("GEMINI_API_KEY", "")
        if gemini_key:
            from data.gemini_client import GeminiClient
            model_client = GeminiClient(api_key=gemini_key)
            model_kwargs = model_kwargs or {
                "model": os.environ.get("GEMINI_MODEL", "gemini-3.1-flash-lite"),
                "temperature": 0.2,
                "max_tokens": 2048,
            }

    kwargs = {}
    if model_client is not None:
        kwargs["model_client"] = model_client
    if model_kwargs is not None:
        kwargs["model_kwargs"] = model_kwargs

    if region == "us":
        from agents.us_agent import USAgent
        return USAgent(**kwargs)
    if region == "cn":
        from agents.china_agent import ChinaAgent
        return ChinaAgent(**kwargs)
    if region == "jp":
        from agents.japan_agent import JapanAgent
        return JapanAgent(**kwargs)
    if region == "eu":
        from agents.eu_agent import EUAgent
        return EUAgent(**kwargs)
    if region == "crypto":
        from agents.crypto_agent import CryptoAgent
        return CryptoAgent(**kwargs)
    raise ValueError(f"Unknown region: {region!r}. Choose from: us, cn, jp, eu, crypto")


class PortfolioEngine:
    """Runs multiple regional agents in parallel and aggregates their signals."""

    def __init__(self, *, pin: bool = False) -> None:
        self.pin = pin

    async def _analyze_one(self, request: AnalysisRequest) -> InvestmentThesis:
        """Run a single regional agent and return its thesis."""
        agent = _build_agent(request.region)
        logger.info("Analyzing %s (%s)…", request.ticker, request.region.upper())
        return await agent.analyze(request.ticker)

    async def run(self, requests: Sequence[AnalysisRequest]) -> PortfolioView:
        """Run all requests in parallel and return an aggregated PortfolioView.

        Soft-fails per request: if one agent raises, it logs and skips that
        position rather than aborting the whole portfolio run.
        """
        if not requests:
            raise ValueError("No analysis requests provided.")

        # Fan-out: run all regional agents concurrently
        tasks = [self._analyze_one(r) for r in requests]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        theses: list[InvestmentThesis] = []
        for req, result in zip(requests, results):
            if isinstance(result, Exception):
                logger.warning("Agent failed for %s/%s: %s", req.ticker, req.region, result)
            else:
                theses.append(result)

        if not theses:
            raise RuntimeError("All regional agents failed — no theses to aggregate.")

        # Build positions
        positions: list[PortfolioPosition] = []
        for thesis in theses:
            sig = _direction_to_signal(thesis.direction, thesis.confidence_score)
            positions.append(
                PortfolioPosition(
                    ticker_or_asset=thesis.ticker_or_asset,
                    region=thesis.region,
                    asset_class=thesis.asset_class,
                    direction=thesis.direction,
                    confidence_score=thesis.confidence_score,
                    thesis_id=thesis.thesis_id,
                    thesis_summary_en=thesis.thesis_summary_en,
                    signal=sig,
                )
            )

        # Aggregate
        net_signal = sum(p.signal for p in positions) / len(positions)
        net_signal = round(max(-1.0, min(1.0, net_signal)), 4)
        agg_confidence = sum(p.confidence_score for p in positions) / len(positions)

        view = PortfolioView(
            positions=positions,
            net_signal=net_signal,
            net_direction=_net_to_direction(net_signal),
            aggregate_confidence=round(agg_confidence, 4),
            top_risk_factors=_top_risks(theses),
        )

        # Optional IPFS pin
        if self.pin:
            cid = await ipfs_pinner.pin_json(
                view.model_dump(mode="json"),
                name=f"portfolio-{view.snapshot_id[:8]}",
            )
            logger.info("Portfolio snapshot pinned → %s", cid)

        return view


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


async def _main() -> None:
    import argparse

    parser = argparse.ArgumentParser(description="Run the portfolio engine on multiple positions.")
    parser.add_argument(
        "--positions",
        nargs="+",
        default=["AAPL:us", "ETH:crypto"],
        metavar="TICKER:REGION",
        help="e.g. AAPL:us MSFT:us ETH:crypto 600519.SH:cn 7203.T:jp MC.PA:eu",
    )
    parser.add_argument("--pin", action="store_true", help="Pin snapshot to IPFS")
    parser.add_argument("--verbose", action="store_true")
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )

    requests = []
    for pos in args.positions:
        parts = pos.split(":")
        if len(parts) != 2:
            parser.error(f"Invalid position format {pos!r} — use TICKER:REGION")
        requests.append(AnalysisRequest(ticker=parts[0], region=parts[1]))

    engine = PortfolioEngine(pin=args.pin)
    view = await engine.run(requests)

    print("\n" + "=" * 60)
    print(f"PORTFOLIO SNAPSHOT  net={view.net_signal:+.4f}  {view.net_direction.value}")
    print("=" * 60)
    print(view.model_dump_json(indent=2, ensure_ascii=False))


def run() -> None:
    asyncio.run(_main())


if __name__ == "__main__":
    run()
