"""Record reasoning-trace hashes on Arc.

**Status: stub.** Logs the call and returns a fake tx hash when contract
address / RPC env vars aren't set. Real implementation lands in Sprint 2,
Day 9, after :mod:`contracts.ReasoningRegistry` is deployed.

Design notes for the eventual real impl:
- Use ``web3.AsyncWeb3`` so we don't block the FastAPI event loop.
- Sign locally with ``eth_account`` from ``ARC_DEPLOYER_PRIVATE_KEY``.
- Gas is denominated in USDC on Arc — call ``estimate_gas`` once, log the
  USDC cost in observability for the demo.
- Idempotency: registry is keyed by ``trace_hash``. Re-recording the same
  hash should revert in the contract; we catch and treat as success here.
"""

from __future__ import annotations

import hashlib
import logging
import os

from reasoning.trace_schema import TraceMetadata

logger = logging.getLogger(__name__)


class ArcRecordError(RuntimeError):
    """Raised when on-chain recording fails."""


def _mock_tx_hash(metadata: TraceMetadata) -> str:
    digest = hashlib.sha256(metadata.trace_hash.encode()).hexdigest()
    return f"0xmock{digest[:60]}"


async def record_trace(metadata: TraceMetadata) -> str:
    """Submit ``metadata`` to the on-chain ReasoningRegistry. Returns tx hash.

    Falls back to a mock tx hash when ``REASONING_REGISTRY_ADDRESS`` or
    ``ARC_RPC_URL`` are unset — same offline-dev pattern as the IPFS pinner.
    """
    registry_addr = os.getenv("REASONING_REGISTRY_ADDRESS", "").strip()
    rpc_url = os.getenv("ARC_RPC_URL", "").strip()
    deployer_key = os.getenv("ARC_DEPLOYER_PRIVATE_KEY", "").strip()

    if not (registry_addr and rpc_url and deployer_key):
        tx = _mock_tx_hash(metadata)
        logger.warning(
            "Arc env vars not set — mocking on-chain record for %s → %s",
            metadata.trace_hash,
            tx,
        )
        return tx

    # TODO(Sprint 2 Day 9 — Opus 4.6): real web3.py call.
    # 1. AsyncWeb3.AsyncHTTPProvider(rpc_url)
    # 2. registry.functions.recordTrace(metadata.trace_hash, metadata.ipfs_cid, ...)
    # 3. sign with deployer_key, send_raw_transaction
    # 4. await tx receipt
    raise ArcRecordError("Real Arc recording not yet implemented — Sprint 2, Day 9.")
