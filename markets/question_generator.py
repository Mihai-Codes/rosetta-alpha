"""Question Generator — orchestrates the full thesis→market pipeline.

Pipeline:
1. Run a regional agent (US / CN / CRYPTO) to produce an InvestmentThesis.
2. Pass the thesis to TranslatorAgent to produce a PredictionMarketQuestion.
3. Pin both artifacts to IPFS and record a TraceMetadata entry.

This module is the single entry-point for the end-to-end demo.

Run standalone:
    GROQ_API_KEY=xxx uv run python -m markets.question_generator --ticker AAPL --region us
    GROQ_API_KEY=xxx uv run python -m markets.question_generator --ticker ETH --region crypto
"""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
from typing import Literal

from dotenv import load_dotenv

load_dotenv()

from agents.translator_agent import TranslatorAgent
from reasoning import ipfs_pinner
from reasoning.trace_schema import InvestmentThesis, PredictionMarketQuestion

logger = logging.getLogger(__name__)

RegionKey = Literal["us", "cn", "crypto", "eu", "jp"]


def _build_agent(region: RegionKey):  # type: ignore[return]
    """Instantiate the correct regional agent for *region*."""
    if region == "us":
        from agents.us_agent import USAgent
        return USAgent()
    if region == "cn":
        from agents.china_agent import ChinaAgent
        return ChinaAgent()
    if region == "crypto":
        from agents.crypto_agent import CryptoAgent
        return CryptoAgent()
    if region == "eu":
        from agents.eu_agent import EUAgent
        return EUAgent()
    if region == "jp":
        from agents.japan_agent import JapanAgent
        return JapanAgent()
    raise ValueError(f"Unknown region: {region!r}. Choose from: us, cn, crypto, eu, jp")


async def generate(
    ticker: str,
    region: RegionKey = "us",
    *,
    pin: bool = True,
) -> tuple[InvestmentThesis, PredictionMarketQuestion | None]:
    """Full pipeline: analyze → translate → (optional) pin to IPFS.

    Returns:
        (thesis, question) — question is None if translation fails.
    """
    # 1. Regional analysis
    agent = _build_agent(region)
    logger.info("Running %s agent on %s…", region.upper(), ticker)
    thesis = await agent.analyze(ticker)
    logger.info("Thesis: %s %s (confidence=%.2f)", ticker, thesis.direction.value, thesis.confidence_score)

    # 2. Translate to prediction-market question
    translator = TranslatorAgent()
    logger.info("Translating thesis → prediction-market question…")
    question = await translator.atranslate(thesis)
    if question:
        logger.info("Question: %s", question.question_text)
    else:
        logger.warning("Translation produced no question.")

    # 3. Post Polymarket builder order (soft-fail — earns USDC fees on fills)
    if question:
        try:
            from markets.polymarket_builder import post_builder_order
            builder_result = post_builder_order(thesis, question)
            if builder_result.error:
                logger.debug("Polymarket builder order skipped: %s", builder_result.error)
            else:
                logger.info(
                    "Polymarket builder order posted: %s %s @ %.2f (est. fee=$%.6f USDC) %s",
                    builder_result.side,
                    thesis.ticker_or_asset,
                    builder_result.price,
                    builder_result.estimated_fee_usdc,
                    "[DRY RUN]" if builder_result.dry_run else "✅",
                )
        except Exception as _pm_exc:
            logger.debug("Polymarket builder integration failed (non-fatal): %s", _pm_exc)

    # 4. IPFS pinning (soft-fail)
    if pin:
        thesis_cid = await ipfs_pinner.pin_json(thesis.model_dump(mode="json"), name=f"thesis-{thesis.thesis_id[:8]}")
        logger.info("Thesis pinned → %s", thesis_cid)

        if question:
            q_cid = await ipfs_pinner.pin_json(question.model_dump(mode="json"), name=f"question-{question.question_id[:8]}")
            logger.info("Question pinned → %s", q_cid)

    return thesis, question


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


async def _main() -> None:
    parser = argparse.ArgumentParser(description="Full thesis → prediction-market pipeline.")
    parser.add_argument("--ticker", default="AAPL")
    parser.add_argument("--region", choices=["us", "cn", "crypto", "eu", "jp"], default="us")
    parser.add_argument("--no-pin", action="store_true", help="Skip IPFS pinning")
    parser.add_argument("--verbose", action="store_true")
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )

    thesis, question = await generate(args.ticker, args.region, pin=not args.no_pin)

    print("\n" + "=" * 60)
    print("INVESTMENT THESIS")
    print("=" * 60)
    print(thesis.model_dump_json(indent=2, ensure_ascii=False))

    if question:
        print("\n" + "=" * 60)
        print("PREDICTION MARKET QUESTION")
        print("=" * 60)
        print(question.model_dump_json(indent=2))


def run() -> None:
    asyncio.run(_main())


if __name__ == "__main__":
    run()
