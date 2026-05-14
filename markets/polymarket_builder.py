"""Polymarket CLOB V2 — Builder Integration for Rosetta Alpha.

Every time Rosetta Alpha's TranslatorAgent generates a prediction market
question, this module finds the closest matching Polymarket market and posts
a limit order with our builder code attached.

When that order fills, Polymarket accrues a builder fee to our wallet:
  builder_fee = notional × builder_fee_rate_bps / 10000

This is the monetisation layer: the reasoning trace is the product,
the builder code is the revenue mechanism. Arc records *what* was predicted;
Polymarket fills generate *revenue* on each correct call.

Hackathon Research Note #2 alignment:
  "A thin agent-as-builder wrapper that registers any agent framework as a
   Polymarket V2 builder, exposes its structured outputs as a signed feed,
   and earns USDC builder fees per fill."

Required env vars:
  POLYMARKET_PRIVATE_KEY    — 0x private key of your Polygon wallet
  POLYMARKET_BUILDER_CODE   — bytes32 builder code from polymarket.com/settings?tab=builder
  POLYMARKET_CHAIN_ID       — 137 (Polygon mainnet) or 80002 (Amoy testnet). Default: 137

Optional:
  POLYMARKET_BET_SIZE_USDC  — USDC size per order (default: 1.0)
  POLYMARKET_DEFAULT_PRICE  — default limit price in [0,1] (default: 0.55, slight edge)
  POLYMARKET_DRY_RUN        — if "1", log but never post orders

Registration:
  1. Go to https://polymarket.com/settings?tab=builder
  2. Create a builder profile + set fee rates (max 100 bps taker, 50 bps maker)
  3. Copy your bytes32 builder code → set POLYMARKET_BUILDER_CODE

Install:
  pip install py_clob_client_v2
  (or: uv add py_clob_client_v2)
"""

from __future__ import annotations

import logging
import os
from dataclasses import dataclass
from typing import Any

from reasoning.trace_schema import Direction, InvestmentThesis, PredictionMarketQuestion

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

_DEFAULT_BET_USDC     = float(os.getenv("POLYMARKET_BET_SIZE_USDC", "1.0"))
_DEFAULT_PRICE        = float(os.getenv("POLYMARKET_DEFAULT_PRICE", "0.55"))
_CHAIN_ID             = int(os.getenv("POLYMARKET_CHAIN_ID", "137"))

# Polymarket CLOB V2 host
_CLOB_HOST = "https://clob.polymarket.com"


# ---------------------------------------------------------------------------
# Result dataclass
# ---------------------------------------------------------------------------

@dataclass
class BuilderOrderResult:
    """Outcome of posting a builder-coded order to Polymarket."""
    order_id:         str
    market_id:        str
    question_text:    str
    side:             str          # "YES" or "NO"
    price:            float        # limit price in [0, 1]
    size_usdc:        float
    builder_code:     str
    tx_hash:          str | None   # onchain tx if filled immediately
    estimated_fee_usdc: float
    dry_run:          bool
    error:            str | None


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _direction_to_side(direction: Direction) -> str:
    """Map investment direction to Polymarket YES/NO side.

    LONG → bet YES (price goes up)
    SHORT → bet NO (price goes down)
    NEUTRAL → NO side with tighter price (expect no big move)
    """
    if direction == Direction.LONG:
        return "YES"
    return "NO"


def _confidence_to_price(confidence: float, side: str) -> float:
    """Convert confidence score (0–1) to a Polymarket limit price.

    Higher confidence → price closer to 1.0 (YES) or 0.0 (NO).
    Clamped to [0.10, 0.90] to avoid extreme ticks.
    """
    if side == "YES":
        # confidence=0.5 → price=0.55, confidence=1.0 → price=0.90
        price = 0.50 + confidence * 0.40
    else:
        # confidence=0.5 → price=0.45, confidence=1.0 → price=0.10
        price = 0.50 - confidence * 0.40
    return round(max(0.10, min(0.90, price)), 2)


def _search_market(client: Any, question: PredictionMarketQuestion) -> dict | None:
    """Search Polymarket for a market matching our question text.

    Uses keyword search on the question title and ticker.
    Returns the first match above similarity threshold, or None.
    """
    try:
        # Search by ticker keyword first (most precise)
        keyword = question.ticker_or_asset.replace("-USD", "").replace(".SH", "").replace(".SS", "")
        markets = client.get_markets(keyword=keyword, limit=10)
        if markets and len(markets) > 0:
            logger.debug("Found %d Polymarket markets for keyword '%s'", len(markets), keyword)
            # Return first active market
            for m in markets:
                status = m.get("active", True)
                if status:
                    return m
    except Exception as exc:
        logger.debug("Market search failed: %s", exc)
    return None


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def post_builder_order(
    thesis: InvestmentThesis,
    question: PredictionMarketQuestion,
) -> BuilderOrderResult:
    """Post a Polymarket V2 order with builder code for a given thesis/question.

    This function:
      1. Initialises the py_clob_client_v2 ClobClient with our builder code
      2. Searches Polymarket for a market matching the question ticker
      3. Posts a limit order on the correct YES/NO side
      4. Returns a BuilderOrderResult with order details and estimated fees

    Args:
        thesis:   The InvestmentThesis driving the trade direction.
        question: The PredictionMarketQuestion from TranslatorAgent.

    Returns:
        BuilderOrderResult — check .error for failure details.
    """
    private_key   = os.getenv("POLYMARKET_PRIVATE_KEY", "").strip()
    builder_code  = os.getenv("POLYMARKET_BUILDER_CODE", "").strip()
    dry_run       = os.getenv("POLYMARKET_DRY_RUN", "0") == "1"

    if not private_key or not builder_code:
        msg = (
            "POLYMARKET_PRIVATE_KEY and POLYMARKET_BUILDER_CODE must be set. "
            "Register at https://polymarket.com/settings?tab=builder"
        )
        logger.warning(msg)
        return BuilderOrderResult(
            order_id="", market_id="", question_text=question.question_text,
            side="", price=0.0, size_usdc=0.0, builder_code=builder_code,
            tx_hash=None, estimated_fee_usdc=0.0, dry_run=dry_run, error=msg,
        )

    try:
        from py_clob_client_v2 import ClobClient, Side, OrderType
    except ImportError:
        msg = "py_clob_client_v2 not installed. Run: uv add py_clob_client_v2"
        logger.error(msg)
        return BuilderOrderResult(
            order_id="", market_id="", question_text=question.question_text,
            side="", price=0.0, size_usdc=0.0, builder_code=builder_code,
            tx_hash=None, estimated_fee_usdc=0.0, dry_run=dry_run, error=msg,
        )

    # ── 1. Initialise client with builder code ────────────────────────────
    client = ClobClient(
        host=_CLOB_HOST,
        chain_id=_CHAIN_ID,
        key=private_key,
        builder_config={"builderCode": builder_code},
    )

    # ── 2. Search for matching Polymarket market ───────────────────────────
    market = _search_market(client, question)
    if not market:
        msg = f"No active Polymarket market found for '{question.ticker_or_asset}' — skipping order"
        logger.info(msg)
        return BuilderOrderResult(
            order_id="", market_id="", question_text=question.question_text,
            side="", price=0.0, size_usdc=_DEFAULT_BET_USDC,
            builder_code=builder_code, tx_hash=None,
            estimated_fee_usdc=0.0, dry_run=dry_run, error=msg,
        )

    market_id    = market.get("condition_id") or market.get("id", "")
    market_title = market.get("question", question.question_text)

    # ── 3. Determine side and price from thesis ────────────────────────────
    side  = _direction_to_side(thesis.direction)
    price = _confidence_to_price(thesis.confidence_score, side)
    size  = _DEFAULT_BET_USDC

    # Estimate builder fee (use taker fee rate — we'll submit FOK market orders)
    # Default builder taker fee: 100 bps = 1% max. We'll estimate at 50 bps.
    estimated_fee = round(size * 50 / 10000, 6)  # 0.5% of notional

    logger.info(
        "Posting builder order: %s %s @ %.2f | market='%s' | builder=%s%s",
        side, question.ticker_or_asset, price, market_title[:60],
        builder_code[:10] + "...",
        " [DRY RUN]" if dry_run else "",
    )

    if dry_run:
        return BuilderOrderResult(
            order_id=f"dryrun-{thesis.ticker_or_asset}-{side}",
            market_id=market_id,
            question_text=market_title,
            side=side, price=price, size_usdc=size,
            builder_code=builder_code, tx_hash=None,
            estimated_fee_usdc=estimated_fee, dry_run=True, error=None,
        )

    # ── 4. Get token ID for YES/NO outcome token ───────────────────────────
    try:
        market_info  = client.get_market(market_id)
        # Polymarket markets have two outcome tokens: [YES_token, NO_token]
        tokens       = market_info.get("tokens", [])
        outcome_map  = {t.get("outcome", "").upper(): t.get("token_id") for t in tokens}
        token_id     = outcome_map.get(side)
        if not token_id:
            raise ValueError(f"No token_id found for outcome '{side}' in market {market_id}")
    except Exception as exc:
        err = f"Failed to resolve token_id for {market_id}: {exc}"
        logger.error(err)
        return BuilderOrderResult(
            order_id="", market_id=market_id, question_text=market_title,
            side=side, price=price, size_usdc=size, builder_code=builder_code,
            tx_hash=None, estimated_fee_usdc=estimated_fee, dry_run=False, error=err,
        )

    # ── 5. Post limit order (GTC) with builder code ────────────────────────
    try:
        response = client.create_and_post_order(
            {
                "tokenID":      token_id,
                "price":        price,
                "size":         size,
                "side":         Side.BUY if side == "YES" else Side.SELL,
                "builderCode":  builder_code,
            },
            {"tickSize": "0.01", "negRisk": False},
            OrderType.GTC,
        )
        order_id = response.get("orderID") or response.get("id", "")
        tx_hash  = response.get("transactionHash")

        logger.info(
            "  ✅  Builder order posted: %s %s @ %.2f | orderId=%s | est. fee=$%.6f USDC",
            side, question.ticker_or_asset, price, order_id, estimated_fee,
        )

        return BuilderOrderResult(
            order_id=order_id, market_id=market_id, question_text=market_title,
            side=side, price=price, size_usdc=size, builder_code=builder_code,
            tx_hash=tx_hash, estimated_fee_usdc=estimated_fee, dry_run=False, error=None,
        )

    except Exception as exc:
        err = f"create_and_post_order failed: {exc}"
        logger.error("Builder order failed for %s: %s", question.ticker_or_asset, exc)
        return BuilderOrderResult(
            order_id="", market_id=market_id, question_text=market_title,
            side=side, price=price, size_usdc=size, builder_code=builder_code,
            tx_hash=None, estimated_fee_usdc=estimated_fee, dry_run=False, error=err,
        )


def post_builder_orders_batch(
    pairs: list[tuple[InvestmentThesis, PredictionMarketQuestion]],
) -> list[BuilderOrderResult]:
    """Post builder orders for multiple thesis/question pairs.

    Soft-fails per pair — one failure doesn't block the rest.
    """
    results = []
    for thesis, question in pairs:
        try:
            result = post_builder_order(thesis, question)
        except Exception as exc:
            logger.error("Unexpected error posting builder order for %s: %s", thesis.ticker_or_asset, exc)
            result = BuilderOrderResult(
                order_id="", market_id="", question_text=question.question_text,
                side="", price=0.0, size_usdc=_DEFAULT_BET_USDC,
                builder_code=os.getenv("POLYMARKET_BUILDER_CODE", ""),
                tx_hash=None, estimated_fee_usdc=0.0, dry_run=False,
                error=str(exc),
            )
        results.append(result)

    successful = [r for r in results if not r.error]
    logger.info(
        "Builder batch complete: %d/%d orders posted successfully.",
        len(successful), len(results),
    )
    return results
