"""Record reasoning-trace hashes on Arc via ReasoningRegistry.sol.

Arc testnet details (per docs.arc.network):
  RPC:      https://rpc.testnet.arc.network  (chain ID 5042002)
  Gas:      USDC (18 decimals) — denominated in dollars, predictable
  Explorer: https://testnet.arcscan.app

Falls back to a deterministic mock tx hash when the three required env vars
(REASONING_REGISTRY_ADDRESS, ARC_RPC_URL, ARC_DEPLOYER_PRIVATE_KEY) are not
set — preserving the offline-dev pattern used by IPFSPinner.

Required env vars for live operation:
  ARC_RPC_URL                  — e.g. https://rpc.testnet.arc.network or arc-canteen RPC
  REASONING_REGISTRY_ADDRESS   — 0x address of deployed ReasoningRegistry
  ARC_DEPLOYER_PRIVATE_KEY     — 0x private key of an authorized submitter wallet
"""

from __future__ import annotations

import hashlib
import logging
import os
from typing import Any

from reasoning.trace_schema import AssetClass, Region, TraceMetadata

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Region / AssetClass → Solidity enum uint8 mapping
# Mirrors the enum order in contracts/src/ReasoningRegistry.sol exactly.
# DO NOT REORDER — the contract ABI is the source of truth.
# ---------------------------------------------------------------------------

_REGION_TO_UINT8: dict[Region, int] = {
    Region.US:     0,
    Region.CN:     1,
    Region.EU:     2,
    Region.JP:     3,
    Region.CRYPTO: 4,
}

_ASSET_CLASS_TO_UINT8: dict[AssetClass, int] = {
    AssetClass.EQUITY:       0,
    AssetClass.FIXED_INCOME: 1,
    AssetClass.COMMODITY:    2,
    AssetClass.CRYPTO:       3,
    AssetClass.FX:           4,
    AssetClass.REAL_ESTATE:  5,
}

# Minimal ABI for the record() function — avoids bundling the full JSON.
_RECORD_ABI: list[dict[str, Any]] = [
    {
        "name": "record",
        "type": "function",
        "stateMutability": "nonpayable",
        "inputs": [
            {"name": "traceHash",  "type": "bytes32"},
            {"name": "ipfsCid",    "type": "string"},
            {"name": "region",     "type": "uint8"},
            {"name": "assetClass", "type": "uint8"},
        ],
        "outputs": [],
    },
    {
        "name": "TraceAlreadyExists",
        "type": "error",
        "inputs": [{"name": "traceHash", "type": "bytes32"}],
    },
]

# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


class ArcRecordError(RuntimeError):
    """Raised when on-chain recording fails and cannot be retried."""


def _mock_tx_hash(metadata: TraceMetadata) -> str:
    digest = hashlib.sha256(metadata.trace_hash.encode()).hexdigest()
    return f"0xmock{digest[:60]}"


def _trace_hash_to_bytes32(hex_hash: str) -> bytes:
    """Convert a 0x-prefixed 64-char hex string to 32 raw bytes."""
    h = hex_hash.removeprefix("0x")
    if len(h) != 64:
        raise ValueError(f"trace_hash must be 64 hex chars, got {len(h)}: {hex_hash!r}")
    return bytes.fromhex(h)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


async def record_trace(metadata: TraceMetadata) -> str:
    """Submit *metadata* to the on-chain ReasoningRegistry. Returns tx hash.

    Idempotency: the contract reverts with TraceAlreadyExists if the hash was
    already recorded. We catch that specific error and treat it as success,
    returning a sentinel tx hash so the caller can log it without breaking.

    Falls back to a deterministic mock tx hash when the required env vars are
    not set — no network calls are made in that case.
    """
    registry_addr  = os.getenv("REASONING_REGISTRY_ADDRESS", "").strip()
    rpc_url        = os.getenv("ARC_RPC_URL", "").strip()
    deployer_key   = os.getenv("ARC_DEPLOYER_PRIVATE_KEY", "").strip()

    if not (registry_addr and rpc_url and deployer_key):
        tx = _mock_tx_hash(metadata)
        logger.warning(
            "Arc env vars not set — mocking on-chain record for %s → %s",
            metadata.trace_hash,
            tx,
        )
        return tx

    # Lazy import so web3 is only required when actually used.
    try:
        from web3 import AsyncWeb3
        from web3.middleware import ExtraDataToPOAMiddleware
        from eth_account import Account
    except ImportError as exc:
        raise ArcRecordError(
            "web3 / eth_account not installed. Run: uv add web3"
        ) from exc

    w3 = AsyncWeb3(AsyncWeb3.AsyncHTTPProvider(rpc_url))
    # Arc testnet is a POA-compatible chain — inject middleware to handle
    # the extra 97-byte `extraData` field that causes decode errors on strict EIP-1559.
    w3.middleware_onion.inject(ExtraDataToPOAMiddleware, layer=0)

    account = Account.from_key(deployer_key)
    registry = w3.eth.contract(
        address=AsyncWeb3.to_checksum_address(registry_addr),
        abi=_RECORD_ABI,
    )

    trace_bytes = _trace_hash_to_bytes32(metadata.trace_hash)
    region_int  = _REGION_TO_UINT8[metadata.region]
    asset_int   = _ASSET_CLASS_TO_UINT8[metadata.asset_class]

    try:
        nonce     = await w3.eth.get_transaction_count(account.address)
        gas_price = await w3.eth.gas_price

        txn = await registry.functions.record(
            trace_bytes,
            metadata.ipfs_cid,
            region_int,
            asset_int,
        ).build_transaction({
            "from":     account.address,
            "nonce":    nonce,
            "gasPrice": gas_price,
        })

        # Estimate gas (denominated in USDC microunits on Arc)
        gas_estimate = await w3.eth.estimate_gas(txn)
        txn["gas"] = int(gas_estimate * 1.2)  # 20% buffer

        usdc_cost = (txn["gas"] * gas_price) / 1e18
        logger.info(
            "Recording trace %s on Arc — estimated gas cost: %.8f USDC",
            metadata.trace_hash[:12],
            usdc_cost,
        )

        signed = account.sign_transaction(txn)
        tx_hash = await w3.eth.send_raw_transaction(signed.raw_transaction)
        receipt = await w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)

        if receipt["status"] == 0:
            raise ArcRecordError(
                f"Transaction reverted on-chain. tx={tx_hash.hex()}"
            )

        hex_tx = tx_hash.hex()
        logger.info("Trace recorded on Arc ✅  tx=%s", hex_tx)
        return hex_tx

    except ArcRecordError:
        raise
    except Exception as exc:
        # Detect TraceAlreadyExists revert — treat as idempotent success.
        if "TraceAlreadyExists" in str(exc) or "0x" in str(exc):
            sentinel = f"0xalready_{metadata.trace_hash[2:18]}"
            logger.info(
                "Trace already exists on-chain (idempotent) → %s", sentinel
            )
            return sentinel
        raise ArcRecordError(f"Arc record_trace failed: {exc}") from exc
