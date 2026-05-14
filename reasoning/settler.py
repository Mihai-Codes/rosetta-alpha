"""Autonomous Settler — monitors PredictionMarket.sol and calls resolve() / settle().

Polling loop:
  1. Enumerate all market hashes from PredictionMarket.marketHashes[].
  2. For PENDING markets whose resolvesAt <= now  → call resolve(traceHash).
  3. For RESOLVED markets whose settleableAt <= now → call settle(traceHash).
  4. Sleep SETTLER_POLL_INTERVAL seconds (default 60) and repeat.

Price context (yfinance) is used only for local observability logging —
the on-chain OwnerPriceOracle drives actual correctness. This lets operators
see "LONG AAPL: entry=$180.00 exit=$192.00 (+6.7%) → CORRECT ✅" in their
terminal without needing to read chain state separately.

Required env vars (same as arc_recorder.py):
  ARC_RPC_URL                  — e.g. https://rpc.testnet.arc.network
  PREDICTION_MARKET_ADDRESS    — 0x address of deployed PredictionMarket
  ARC_DEPLOYER_PRIVATE_KEY     — private key of caller (permissionless, but needs gas)

Optional:
  SETTLER_POLL_INTERVAL        — seconds between polls (default: 60)
  SETTLER_DRY_RUN              — if "1", log actions but never send txns
  SETTLER_MAX_ROUNDS           — if set, stop after N poll rounds (useful in tests)
"""

from __future__ import annotations

import asyncio
import logging
import os
import time
from dataclasses import dataclass, field
from typing import Any

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Minimal ABI — only the functions settler needs
# ---------------------------------------------------------------------------

_MARKET_SETTLER_ABI: list[dict[str, Any]] = [
    # ── views ──────────────────────────────────────────────────────────────
    {
        "name": "totalMarkets",
        "type": "function",
        "stateMutability": "view",
        "inputs": [],
        "outputs": [{"name": "", "type": "uint256"}],
    },
    {
        "name": "marketHashes",
        "type": "function",
        "stateMutability": "view",
        "inputs": [{"name": "", "type": "uint256"}],
        "outputs": [{"name": "", "type": "bytes32"}],
    },
    {
        "name": "getMarket",
        "type": "function",
        "stateMutability": "view",
        "inputs": [{"name": "traceHash", "type": "bytes32"}],
        "outputs": [
            {
                "name": "",
                "type": "tuple",
                "components": [
                    {"name": "agent",        "type": "address"},
                    {"name": "stakeAmount",  "type": "uint256"},
                    {"name": "entryPrice",   "type": "uint256"},
                    {"name": "exitPrice",    "type": "uint256"},
                    {"name": "createdAt",    "type": "uint64"},
                    {"name": "resolvesAt",   "type": "uint64"},
                    {"name": "resolvedAt",   "type": "uint64"},
                    {"name": "confidenceBp", "type": "uint16"},
                    {"name": "direction",    "type": "uint8"},
                    {"name": "status",       "type": "uint8"},
                    {"name": "assetKey",     "type": "bytes32"},
                    {"name": "wasCorrect",   "type": "bool"},
                ],
            }
        ],
    },
    {
        "name": "settleableAt",
        "type": "function",
        "stateMutability": "view",
        "inputs": [{"name": "traceHash", "type": "bytes32"}],
        "outputs": [{"name": "", "type": "uint64"}],
    },
    {
        "name": "disputeWindowSec",
        "type": "function",
        "stateMutability": "view",
        "inputs": [],
        "outputs": [{"name": "", "type": "uint256"}],
    },
    # ── mutating ───────────────────────────────────────────────────────────
    {
        "name": "resolve",
        "type": "function",
        "stateMutability": "nonpayable",
        "inputs": [{"name": "traceHash", "type": "bytes32"}],
        "outputs": [],
    },
    {
        "name": "settle",
        "type": "function",
        "stateMutability": "nonpayable",
        "inputs": [{"name": "traceHash", "type": "bytes32"}],
        "outputs": [],
    },
    # ── custom errors (for detection in revert messages) ───────────────────
    {"name": "TooEarlyToResolve", "type": "error",
     "inputs": [{"name": "resolvesAt", "type": "uint64"}, {"name": "now", "type": "uint64"}]},
    {"name": "TooEarlyToSettle",  "type": "error",
     "inputs": [{"name": "settlesAt", "type": "uint64"}, {"name": "now", "type": "uint64"}]},
    {"name": "InvalidStatus",     "type": "error",
     "inputs": [{"name": "expected", "type": "uint8"}, {"name": "got", "type": "uint8"}]},
]

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_STATUS_NAMES  = {0: "PENDING", 1: "RESOLVED", 2: "SETTLED"}
_DIR_NAMES     = {0: "LONG", 1: "SHORT", 2: "NEUTRAL"}
_DIR_SYMBOLS   = {0: "📈", 1: "📉", 2: "➡️"}

# assetKey (keccak256 of ticker) → human-readable ticker for yfinance
# Add entries as you onboard new assets.
_ASSET_KEY_CACHE: dict[bytes, str] = {}
_KNOWN_TICKERS = [
    "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "TSLA",
    "BTC-USD", "ETH-USD", "SOL-USD",
    "EWG",   # Germany ETF proxy for EU desk
    "EWJ",   # Japan ETF proxy for JP desk
    "600519.SS",  # Moutai (CN desk)
]


def _build_asset_key_cache(w3: Any) -> None:
    """Pre-populate keccak256(ticker) → ticker for known tickers."""
    global _ASSET_KEY_CACHE
    if _ASSET_KEY_CACHE:
        return
    for ticker in _KNOWN_TICKERS:
        key_bytes = bytes(w3.keccak(text=ticker))
        _ASSET_KEY_CACHE[key_bytes] = ticker


def _resolve_ticker(asset_key_bytes: bytes) -> str | None:
    return _ASSET_KEY_CACHE.get(asset_key_bytes)


async def _get_live_price(ticker: str) -> float | None:
    """Fetch latest close price via yfinance (best-effort, non-blocking)."""
    try:
        import yfinance as yf

        loop = asyncio.get_event_loop()
        # yfinance is sync — run in thread pool to avoid blocking event loop
        data = await loop.run_in_executor(
            None,
            lambda: yf.Ticker(ticker).fast_info,
        )
        price = getattr(data, "last_price", None) or getattr(data, "previous_close", None)
        return float(price) if price else None
    except Exception as exc:
        logger.debug("yfinance price fetch failed for %s: %s", ticker, exc)
        return None


def _eip1559_params(w3_sync_fee_history: dict) -> tuple[int, int]:
    """Return (maxFeePerGas, maxPriorityFeePerGas) from fee_history result."""
    _20_gwei = 20 * 10**9
    base_fee = w3_sync_fee_history["baseFeePerGas"][-1]
    max_priority = max(_20_gwei // 20, 1 * 10**9)
    max_fee = max(base_fee * 2 + max_priority, _20_gwei)
    return max_fee, max_priority


# ---------------------------------------------------------------------------
# Market snapshot dataclass (decoded from tuple)
# ---------------------------------------------------------------------------

@dataclass
class MarketSnapshot:
    trace_hash:   bytes
    agent:        str
    stake:        int
    entry_price:  int        # 1e8 fixed-point
    exit_price:   int        # 1e8 fixed-point (0 if PENDING)
    created_at:   int
    resolves_at:  int
    resolved_at:  int
    confidence_bp: int
    direction:    int        # 0=LONG 1=SHORT 2=NEUTRAL
    status:       int        # 0=PENDING 1=RESOLVED 2=SETTLED
    asset_key:    bytes
    was_correct:  bool
    ticker:       str | None = field(default=None)

    @classmethod
    def from_tuple(cls, trace_hash: bytes, m: tuple, ticker: str | None = None) -> "MarketSnapshot":
        return cls(
            trace_hash   = trace_hash,
            agent        = m[0],
            stake        = m[1],
            entry_price  = m[2],
            exit_price   = m[3],
            created_at   = m[4],
            resolves_at  = m[5],
            resolved_at  = m[6],
            confidence_bp= m[7],
            direction    = m[8],
            status       = m[9],
            asset_key    = bytes(m[10]),
            was_correct  = m[11],
            ticker       = ticker,
        )

    @property
    def status_name(self) -> str:
        return _STATUS_NAMES.get(self.status, "UNKNOWN")

    @property
    def dir_name(self) -> str:
        return _DIR_NAMES.get(self.direction, "?")

    @property
    def dir_symbol(self) -> str:
        return _DIR_SYMBOLS.get(self.direction, "?")

    @property
    def entry_usd(self) -> float:
        return self.entry_price / 1e8

    @property
    def exit_usd(self) -> float:
        return self.exit_price / 1e8

    @property
    def change_pct(self) -> float | None:
        if self.entry_price == 0 or self.exit_price == 0:
            return None
        return (self.exit_price - self.entry_price) / self.entry_price * 100


# ---------------------------------------------------------------------------
# SettlementResult — rich outcome struct
# ---------------------------------------------------------------------------

@dataclass
class SettlementResult:
    trace_hash_hex: str
    action:         str           # "resolve" | "settle" | "skip"
    tx_hash:        str | None
    error:          str | None
    snapshot:       MarketSnapshot | None


# ---------------------------------------------------------------------------
# Core settler logic
# ---------------------------------------------------------------------------

async def _send_tx(
    w3: Any,
    account: Any,
    contract_fn: Any,
    dry_run: bool = False,
) -> str:
    """Build, sign, and send a contract call. Returns tx hash hex."""
    if dry_run:
        return "0xdryrun"

    fee_history  = await w3.eth.fee_history(5, "latest", [50])
    max_fee, max_priority = _eip1559_params(fee_history)
    nonce = await w3.eth.get_transaction_count(account.address)

    txn = await contract_fn.build_transaction({
        "from":                 account.address,
        "nonce":                nonce,
        "maxFeePerGas":         max_fee,
        "maxPriorityFeePerGas": max_priority,
        "type":                 2,
    })
    gas_estimate = await w3.eth.estimate_gas(txn)
    txn["gas"] = int(gas_estimate * 1.3)  # 30% buffer (settlement can be gas-heavy)

    signed  = account.sign_transaction(txn)
    tx_hash = await w3.eth.send_raw_transaction(signed.raw_transaction)
    receipt = await w3.eth.wait_for_transaction_receipt(tx_hash, timeout=180)

    if receipt["status"] == 0:
        raise RuntimeError(f"Transaction reverted on-chain: tx={tx_hash.hex()}")

    return tx_hash.hex()


async def _try_resolve(
    w3: Any,
    account: Any,
    contract: Any,
    snap: MarketSnapshot,
    dry_run: bool,
) -> SettlementResult:
    """Attempt to resolve a PENDING market. Returns SettlementResult."""
    now = int(time.time())
    if now < snap.resolves_at:
        wait_h = (snap.resolves_at - now) / 3600
        logger.debug(
            "Market %s not yet resolvable (%.1fh remaining).",
            snap.trace_hash.hex()[:12],
            wait_h,
        )
        return SettlementResult(
            trace_hash_hex=snap.trace_hash.hex(),
            action="skip",
            tx_hash=None,
            error=None,
            snapshot=snap,
        )

    # Fetch live price for context log
    live_price: float | None = None
    if snap.ticker:
        live_price = await _get_live_price(snap.ticker)

    logger.info(
        "Resolving market %s | %s %s $%.2f → live~$%s",
        snap.trace_hash.hex()[:12],
        snap.dir_symbol,
        snap.ticker or "???",
        snap.entry_usd,
        f"{live_price:.2f}" if live_price else "N/A",
    )

    try:
        tx = await _send_tx(
            w3, account,
            contract.functions.resolve(snap.trace_hash),
            dry_run=dry_run,
        )
        logger.info(
            "  ✅  resolve() sent for %s | tx=%s%s",
            snap.ticker or snap.trace_hash.hex()[:12],
            tx,
            " [DRY RUN]" if dry_run else "",
        )
        return SettlementResult(
            trace_hash_hex=snap.trace_hash.hex(),
            action="resolve",
            tx_hash=tx,
            error=None,
            snapshot=snap,
        )
    except Exception as exc:
        err = str(exc)
        # TooEarlyToResolve is a benign race — oracle / clock skew
        if "TooEarlyToResolve" in err:
            logger.debug("TooEarlyToResolve for %s (chain clock skew?) — skipping.", snap.trace_hash.hex()[:12])
            return SettlementResult(
                trace_hash_hex=snap.trace_hash.hex(),
                action="skip",
                tx_hash=None,
                error="TooEarlyToResolve",
                snapshot=snap,
            )
        logger.error("resolve() failed for %s: %s", snap.trace_hash.hex()[:12], exc)
        return SettlementResult(
            trace_hash_hex=snap.trace_hash.hex(),
            action="resolve",
            tx_hash=None,
            error=err,
            snapshot=snap,
        )


async def _try_settle(
    w3: Any,
    account: Any,
    contract: Any,
    snap: MarketSnapshot,
    dry_run: bool,
) -> SettlementResult:
    """Attempt to settle a RESOLVED market after the dispute window."""
    settleable_at: int = await contract.functions.settleableAt(snap.trace_hash).call()
    now = int(time.time())

    if now < settleable_at:
        wait_min = (settleable_at - now) / 60
        logger.debug(
            "Market %s in dispute window (%.1f min remaining).",
            snap.trace_hash.hex()[:12],
            wait_min,
        )
        return SettlementResult(
            trace_hash_hex=snap.trace_hash.hex(),
            action="skip",
            tx_hash=None,
            error=None,
            snapshot=snap,
        )

    outcome_icon = "✅ CORRECT" if snap.was_correct else "❌ WRONG"
    change_str = f"{snap.change_pct:+.2f}%" if snap.change_pct is not None else "N/A"
    logger.info(
        "Settling market %s | %s %s | entry=$%.2f exit=$%.2f (%s) | %s",
        snap.trace_hash.hex()[:12],
        snap.dir_symbol,
        snap.ticker or "???",
        snap.entry_usd,
        snap.exit_usd,
        change_str,
        outcome_icon,
    )

    try:
        tx = await _send_tx(
            w3, account,
            contract.functions.settle(snap.trace_hash),
            dry_run=dry_run,
        )
        pct_confidence = snap.confidence_bp / 100
        logger.info(
            "  💰  settle() sent for %s | conf=%.0f%% | tx=%s%s",
            snap.ticker or snap.trace_hash.hex()[:12],
            pct_confidence,
            tx,
            " [DRY RUN]" if dry_run else "",
        )
        return SettlementResult(
            trace_hash_hex=snap.trace_hash.hex(),
            action="settle",
            tx_hash=tx,
            error=None,
            snapshot=snap,
        )
    except Exception as exc:
        err = str(exc)
        if "TooEarlyToSettle" in err:
            logger.debug("TooEarlyToSettle for %s — skipping.", snap.trace_hash.hex()[:12])
            return SettlementResult(
                trace_hash_hex=snap.trace_hash.hex(),
                action="skip",
                tx_hash=None,
                error="TooEarlyToSettle",
                snapshot=snap,
            )
        logger.error("settle() failed for %s: %s", snap.trace_hash.hex()[:12], exc)
        return SettlementResult(
            trace_hash_hex=snap.trace_hash.hex(),
            action="settle",
            tx_hash=None,
            error=err,
            snapshot=snap,
        )


async def run_settler_round(
    w3: Any,
    account: Any,
    contract: Any,
    dry_run: bool = False,
) -> list[SettlementResult]:
    """Single poll round: scan all markets and act on eligible ones.

    Returns list of SettlementResult (one per non-SETTLED market examined).
    """
    total: int = await contract.functions.totalMarkets().call()
    if total == 0:
        logger.info("No markets on-chain yet — nothing to settle.")
        return []

    logger.info("Settler round — %d market(s) on-chain.", total)

    # Fetch all hashes in parallel (one call per hash — no batch RPC needed for hackathon scale)
    hash_calls = [contract.functions.marketHashes(i).call() for i in range(total)]
    all_hashes: list[bytes] = list(await asyncio.gather(*hash_calls))

    # Fetch all market structs in parallel
    market_calls = [contract.functions.getMarket(h).call() for h in all_hashes]
    all_markets = await asyncio.gather(*market_calls)

    results: list[SettlementResult] = []
    for trace_hash, market_tuple in zip(all_hashes, all_markets):
        ticker = _resolve_ticker(bytes(trace_hash))  # asset_key is field[10]
        # Use asset_key from struct to resolve ticker
        asset_key_bytes = bytes(market_tuple[10])
        ticker = _resolve_ticker(asset_key_bytes)

        snap = MarketSnapshot.from_tuple(trace_hash, market_tuple, ticker=ticker)

        if snap.status == 2:  # SETTLED — nothing to do
            logger.debug("Market %s already SETTLED — skip.", snap.trace_hash.hex()[:12])
            continue

        if snap.status == 0:  # PENDING → try resolve
            result = await _try_resolve(w3, account, contract, snap, dry_run)
        elif snap.status == 1:  # RESOLVED → try settle
            result = await _try_settle(w3, account, contract, snap, dry_run)
        else:
            logger.warning("Unknown status %d for market %s", snap.status, snap.trace_hash.hex()[:12])
            continue

        results.append(result)

    acted = [r for r in results if r.action in ("resolve", "settle") and r.tx_hash]
    logger.info(
        "Settler round complete — %d acted, %d skipped, %d errors.",
        len(acted),
        sum(1 for r in results if r.action == "skip"),
        sum(1 for r in results if r.error and r.action not in ("skip",)),
    )
    return results


# ---------------------------------------------------------------------------
# Long-running polling loop
# ---------------------------------------------------------------------------

async def run_settler_loop(
    poll_interval: int = 60,
    dry_run: bool = False,
    max_rounds: int | None = None,
) -> None:
    """Continuously monitor and settle markets. Runs until cancelled or max_rounds hit.

    Args:
        poll_interval:  Seconds between polls. Default: SETTLER_POLL_INTERVAL env var or 60.
        dry_run:        Log-only mode — never broadcast transactions.
        max_rounds:     Stop after N rounds (useful for CI / one-shot runs).
    """
    rpc_url      = os.getenv("ARC_RPC_URL", "").strip()
    market_addr  = os.getenv("PREDICTION_MARKET_ADDRESS", "").strip()
    deployer_key = os.getenv("ARC_DEPLOYER_PRIVATE_KEY", "").strip()

    if not (rpc_url and market_addr and deployer_key):
        logger.error(
            "Settler requires ARC_RPC_URL, PREDICTION_MARKET_ADDRESS, and "
            "ARC_DEPLOYER_PRIVATE_KEY — exiting."
        )
        return

    try:
        from web3 import AsyncWeb3
        from web3.middleware import ExtraDataToPOAMiddleware
        from eth_account import Account
    except ImportError as exc:
        logger.error("web3 / eth_account not installed. Run: uv add web3. %s", exc)
        return

    w3 = AsyncWeb3(AsyncWeb3.AsyncHTTPProvider(rpc_url))
    w3.middleware_onion.inject(ExtraDataToPOAMiddleware, layer=0)

    account  = Account.from_key(deployer_key)
    contract = w3.eth.contract(
        address=AsyncWeb3.to_checksum_address(market_addr),
        abi=_MARKET_SETTLER_ABI,
    )

    # Warm up asset-key cache so ticker resolution works
    _build_asset_key_cache(w3)

    # Read config from env (override args if provided)
    poll_interval = int(os.getenv("SETTLER_POLL_INTERVAL", str(poll_interval)))
    dry_run       = dry_run or os.getenv("SETTLER_DRY_RUN", "0") == "1"
    max_rounds_env = os.getenv("SETTLER_MAX_ROUNDS")
    if max_rounds_env:
        max_rounds = int(max_rounds_env)

    mode_str = "DRY-RUN" if dry_run else "LIVE"
    logger.info(
        "🤖 Autonomous Settler started [%s] | contract=%s | poll=%ds",
        mode_str,
        market_addr[:10] + "...",
        poll_interval,
    )

    chain_id = await w3.eth.chain_id
    balance  = await w3.eth.get_balance(account.address)
    logger.info(
        "  Operator: %s | chain=%d | balance=%.6f native",
        account.address,
        chain_id,
        balance / 1e18,
    )

    round_num = 0
    while True:
        round_num += 1
        logger.info("─── Poll round #%d ───", round_num)
        try:
            await run_settler_round(w3, account, contract, dry_run=dry_run)
        except Exception as exc:
            logger.error("Settler round #%d failed: %s", round_num, exc, exc_info=True)

        if max_rounds and round_num >= max_rounds:
            logger.info("Reached max_rounds=%d — settler exiting.", max_rounds)
            break

        logger.debug("Sleeping %ds until next poll...", poll_interval)
        await asyncio.sleep(poll_interval)


# ---------------------------------------------------------------------------
# CLI entry-point
# ---------------------------------------------------------------------------

def main() -> None:
    """CLI: python -m reasoning.settler [--dry-run] [--rounds N] [--interval N]"""
    import argparse

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%H:%M:%S",
    )

    parser = argparse.ArgumentParser(
        description="Autonomous settler for Rosetta Alpha PredictionMarket.sol"
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Log-only mode: discover eligible markets but never broadcast txns.",
    )
    parser.add_argument(
        "--rounds", type=int, default=None,
        help="Stop after N poll rounds (default: run forever).",
    )
    parser.add_argument(
        "--interval", type=int, default=None,
        help="Seconds between polls (default: SETTLER_POLL_INTERVAL env or 60).",
    )
    parser.add_argument(
        "--once", action="store_true",
        help="Run exactly one poll round and exit (equivalent to --rounds 1).",
    )
    args = parser.parse_args()

    if args.once:
        args.rounds = 1

    interval = args.interval or int(os.getenv("SETTLER_POLL_INTERVAL", "60"))

    asyncio.run(
        run_settler_loop(
            poll_interval=interval,
            dry_run=args.dry_run,
            max_rounds=args.rounds,
        )
    )


if __name__ == "__main__":
    main()
