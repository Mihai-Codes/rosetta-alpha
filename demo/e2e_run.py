"""Rosetta Alpha — Full End-to-End Demo Script.

Runs all 5 regional desks in sequence:
  analyze → translate → IPFS pin → ROSETTA stake → Arc record → PredictionMarket

Usage:
    uv run python -m demo.e2e_run
    uv run python -m demo.e2e_run --desks us crypto          # subset
    uv run python -m demo.e2e_run --no-chain                 # skip on-chain (faster dev loop)
    uv run python -m demo.e2e_run --verbose                  # show full thesis JSON
"""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
import os
from datetime import datetime, timezone
from typing import Any

from dotenv import load_dotenv

load_dotenv(override=True)

from agents.translator_agent import TranslatorAgent
from reasoning.arc_recorder import record_trace
from reasoning.hasher import canonical_hash
from reasoning.ipfs_pinner import pin_json
from reasoning.trace_schema import InvestmentThesis, PredictionMarketQuestion, TraceMetadata
from training.adalflow_trace import log_thesis_run

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Desk registry
# ---------------------------------------------------------------------------

DESK_CONFIGS: dict[str, tuple[Any, str]] = {}  # filled lazily below


def _build_desks() -> dict[str, tuple[Any, str]]:
    from agents.us_agent import USAgent
    from agents.crypto_agent import CryptoAgent
    from agents.china_agent import ChinaAgent
    from agents.eu_agent import EUAgent
    from agents.japan_agent import JapanAgent

    return {
        "us":     (USAgent(),     "AAPL"),
        "crypto": (CryptoAgent(), "BTC"),
        "cn":     (ChinaAgent(),  "600519.SH"),
        "eu":     (EUAgent(),     "MC.PA"),
        "jp":     (JapanAgent(),  "7203.T"),
    }


# ---------------------------------------------------------------------------
# Per-desk runner
# ---------------------------------------------------------------------------

async def run_desk(
    desk: str,
    agent: Any,
    ticker: str,
    translator: TranslatorAgent,
    deployer: str,
    *,
    on_chain: bool = True,
    verbose: bool = False,
) -> dict[str, Any]:
    """Run the full pipeline for a single desk. Returns a result dict."""
    result: dict[str, Any] = {
        "desk": desk,
        "ticker": ticker,
        "status": "error",
        "direction": None,
        "confidence": None,
        "question": None,
        "ipfs_thesis_cid": None,
        "ipfs_question_cid": None,
        "arc_tx": None,
        "market_tx": None,
        "error": None,
    }

    try:
        # 1. Analyze
        print(f"\n{'═'*68}")
        print(f"  [{desk.upper()}] {ticker}")
        print(f"{'═'*68}")
        thesis: InvestmentThesis = await agent.analyze(ticker)
        result["direction"] = thesis.direction.value
        result["confidence"] = thesis.confidence_score
        result["summary"] = thesis.thesis_summary_en
        result["reasoning_blocks"] = [b.model_dump() for b in thesis.reasoning_blocks]
        if thesis.entry_price_1e8:
            result["price"] = f"{thesis.entry_price_1e8 / 1e8:,.2f}"
            
        print(f"  🧠 Thesis:    {thesis.direction.value} | conf={thesis.confidence_score:.0%}")
        print(f"  📝 Summary:   {thesis.thesis_summary_en[:100]}...")
        if thesis.entry_price_1e8:
            price = thesis.entry_price_1e8 / 1e8
            print(f"  💰 Price:     {price:,.4f} ({ticker})")
        if verbose:
            print(thesis.model_dump_json(indent=2, ensure_ascii=False))

        # 2. Translate → prediction-market question
        question: PredictionMarketQuestion | None = await translator.atranslate(thesis)
        if question:
            result["question"] = question.question_text
            print(f"  ❓ Question:  {question.question_text}")
            print(f"  📅 Expiry:    {question.expiry.strftime('%Y-%m-%d')} | category={question.category}")
            print(f"  ✅ Resolves:  {question.resolution_criteria[:80]}")
        else:
            print("  ⚠️  Question:  [translation failed — skipping]")

        # 3. Pin thesis + question to IPFS
        thesis_payload = thesis.model_dump(mode="json")
        thesis_cid = await pin_json(thesis_payload, name=f"{desk}-{ticker}-thesis")
        result["ipfs_thesis_cid"] = thesis_cid
        print(f"  📌 Thesis CID: {thesis_cid}")

        if question:
            q_payload = question.model_dump(mode="json")
            q_cid = await pin_json(q_payload, name=f"{desk}-{ticker}-question")
            result["ipfs_question_cid"] = q_cid
            print(f"  📌 Q-CID:      {q_cid}")

        # 4. On-chain: stake → record → open market
        if on_chain:
            trace_hash = canonical_hash(thesis)
            metadata = TraceMetadata(
                trace_hash=trace_hash,
                ipfs_cid=thesis_cid,
                region=thesis.region,
                asset_class=thesis.asset_class,
                timestamp=thesis.timestamp,
                submitter=deployer,
            )
            arc_tx = await record_trace(metadata, thesis=thesis)
            result["arc_tx"] = arc_tx
            print(f"  ⛓️  Arc TX:     {arc_tx}")
        else:
            print("  ⛓️  Arc TX:     [skipped — --no-chain]")

        result["status"] = "ok"

        # Wire AdalFlow training dataset — logs every successful run for future optimization
        try:
            _th_hash = canonical_hash(thesis)
            _meta = TraceMetadata(
                trace_hash=_th_hash,
                ipfs_cid=result.get("ipfs_thesis_cid", ""),
                region=thesis.region,
                asset_class=thesis.asset_class,
                timestamp=thesis.timestamp,
                submitter=deployer,
            )
            await log_thesis_run(thesis, _meta, "")
            logger.debug("AdalFlow trace logged for %s", ticker)
        except Exception as _trace_exc:
            logger.debug("AdalFlow trace logging skipped: %s", _trace_exc)

    except Exception as exc:
        result["error"] = str(exc)
        logger.exception("[%s] Pipeline failed for %s", desk, ticker)
        print(f"  ❌ ERROR: {exc}")

    return result


# ---------------------------------------------------------------------------
# Main orchestrator
# ---------------------------------------------------------------------------

async def main(args: argparse.Namespace) -> None:
    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(levelname)s %(name)s: %(message)s",
    )
    # Suppress noisy adalflow/google internals unless verbose
    if not args.verbose:
        for noisy in ("adalflow", "google_genai", "httpx"):
            logging.getLogger(noisy).setLevel(logging.WARNING)

    deployer = os.getenv("ARC_DEPLOYER_ADDRESS", "0x0000000000000000000000000000000000000000")
    translator = TranslatorAgent()
    desks = _build_desks()

    # Filter desks if --desks flag was provided
    selected = {k: v for k, v in desks.items() if k in args.desks} if args.desks else desks

    start = datetime.now(timezone.utc)
    print(f"\n{'█'*68}")
    print(f"  🌐 ROSETTA ALPHA — Full E2E Demo  ({start.strftime('%Y-%m-%d %H:%M UTC')})")
    print(f"  Desks: {', '.join(selected.keys()).upper()} | Chain: {'ON' if not args.no_chain else 'OFF'}")
    print(f"{'█'*68}")

    results = []
    for desk, (agent, ticker) in selected.items():
        r = await run_desk(
            desk, agent, ticker, translator, deployer,
            on_chain=not args.no_chain,
            verbose=args.verbose,
        )
        results.append(r)

    # Final summary
    elapsed = (datetime.now(timezone.utc) - start).total_seconds()
    ok = [r for r in results if r["status"] == "ok"]
    signals = [
        r["confidence"] * (1 if r["direction"] == "LONG" else -1 if r["direction"] == "SHORT" else 0)
        for r in ok
    ]
    net_signal = sum(signals) / len(signals) if signals else 0.0
    avg_conf = sum(r["confidence"] for r in ok) / len(ok) if ok else 0.0

    print(f"\n{'═'*68}")
    print(f"  FINAL RESULTS  ({elapsed:.1f}s)")
    print(f"{'═'*68}")
    for r in results:
        icon = "✅" if r["status"] == "ok" else "❌"
        q_preview = (r["question"] or "")[:60] + "..." if r["question"] else "[no question]"
        print(f"  {icon} {r['desk'].upper():8s} {r['ticker']:12s} {(r['direction'] or '?'):8s} {(r['confidence'] or 0):.0%}")
        print(f"           ❓ {q_preview}")

    print(f"\n  📊 Portfolio: Net signal={net_signal:+.2f} | Avg confidence={avg_conf:.1%} | {len(ok)}/{len(results)} desks OK")
    print(f"{'═'*68}\n")

    # Optionally dump JSON summary
    if args.output:
        with open(args.output, "w") as f:
            json.dump(results, f, indent=2, default=str)
        print(f"  💾 Results saved to {args.output}")


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

def cli() -> None:
    parser = argparse.ArgumentParser(
        description="Rosetta Alpha — Full E2E demo (5 desks, analyze → chain)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  uv run python -m demo.e2e_run                      # all 5 desks, full chain
  uv run python -m demo.e2e_run --desks us crypto    # US + Crypto only
  uv run python -m demo.e2e_run --no-chain           # skip Arc (fast dev loop)
  uv run python -m demo.e2e_run --output results.json
        """,
    )
    parser.add_argument(
        "--desks",
        nargs="+",
        choices=["us", "cn", "crypto", "eu", "jp"],
        help="Run only these desks (default: all 5)",
    )
    parser.add_argument(
        "--no-chain",
        action="store_true",
        help="Skip ROSETTA staking and Arc on-chain recording (faster iteration)",
    )
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Show full thesis JSON and debug logs",
    )
    parser.add_argument(
        "--output", "-o",
        metavar="FILE",
        help="Save JSON results to file",
    )
    asyncio.run(main(parser.parse_args()))


if __name__ == "__main__":
    cli()
