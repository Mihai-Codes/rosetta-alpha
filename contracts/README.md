# Smart Contracts (Arc)

## Status

| Contract | Status | Notes |
|----------|--------|-------|
| `ReasoningRegistry.sol` | ✅ Sprint 2 Day 2 | Append-only trace registry, 19 Foundry tests |
| `RosettaToken.sol` | 🔜 Sprint 2 | ERC-20 backed by USDC, OpenZeppelin base |
| `PredictionMarket.sol` | 🔜 Sprint 2 | Binary market, USDC settlement |
| `PerformanceBond.sol` | 🔜 Sprint 2 | Slash-bonded staking |

## Foundry setup (run once before deploying)

```bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Install OpenZeppelin (from contracts/)
cd contracts/
forge install OpenZeppelin/openzeppelin-contracts --no-git

# Run tests
forge test -vv

# Deploy to Arc testnet
forge script script/DeployReasoningRegistry.s.sol \
  --rpc-url $ARC_RPC_URL \
  --broadcast \
  --private-key $DEPLOYER_PRIVATE_KEY \
  -vvvv
```

## Security non-negotiables (AGENTS.md §6)

- OpenZeppelin `Ownable` + `ReentrancyGuard` — no custom auth primitives
- No `tx.origin` anywhere
- Traces are append-only — duplicate hash reverts with `TraceAlreadyExists`
- Authorized submitter whitelist — only pipeline wallets can write
- Custom errors (gas-efficient) instead of `require` strings

## Architecture

```
Python pipeline
  └─ reasoning/arc_recorder.py  ──calls──▶  ReasoningRegistry.record()
       ├─ traceHash (bytes32)    SHA-256 of canonical thesis JSON
       ├─ ipfsCid   (string)     Pinata CIDv1
       ├─ region    (enum)       US=0 CN=1 EU=2 JP=3 CRYPTO=4
       └─ assetClass(enum)       EQUITY=0 CRYPTO=3 …
```

See [`../AGENTS.md`](../AGENTS.md) §6 for full security non-negotiables.
