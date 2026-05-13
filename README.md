# 🌐 Rosetta Alpha

> Dalio's All Weather strategy — diversified across **languages and regions**, not just asset classes.
> Reasoning traces hashed onto **Arc**, Circle's stablecoin-native L1.

**Hackathon:** Canteen × Arc — *Agora Agents* (May 11–25, 2026)
**Status:** 🚧 Sprint 1 in progress

---

## What it is

Rosetta Alpha deploys five specialized LLM agents — one per regional market (US, China 🇨🇳, EU 🇪🇺, Japan 🇯🇵, Crypto/DeFi) — each consuming **locale-native data** and reasoning **in its native language** before synthesizing a structured investment thesis. A *Translator Agent* converts non-English macro signals into Polymarket-shaped prediction-market questions. Every reasoning trace is hashed (SHA-256), pinned to IPFS/Irys, and the hash is recorded on **Arc**. A risk-parity portfolio engine balances exposure across regions; users stake USDC on which agent's analysis will be most predictive.

This hits all four hackathon idea-prompts simultaneously:
1. **Trading-R1** — reasoning traces as the product, hashed on Arc
2. **Hyperliquid Whale Index** — multi-region rebalancing via Arc Gateway
3. **Slash-bonded copy trading** — performance bonds on agent track records
4. **Translation as alpha** — agents bid in USDC for translation rights

## Architecture (high level)

```
                ┌──────────────────────────────────────────┐
   data feeds ─▶│ Regional Agents (TradingAgents-style)    │
  (MCP, APIs)   │ US · CN · EU · JP · CRYPTO               │
                └────────────────┬─────────────────────────┘
                                 │ structured InvestmentThesis (Pydantic)
                                 ▼
                  ┌──────────────────────────────┐
                  │ Translator Agent             │──▶ PredictionMarketQuestion
                  └──────────────┬───────────────┘
                                 ▼
            ┌────────────────────────────────────────────┐
            │ Reasoning Trace Pipeline                   │
            │ SHA-256 ─▶ IPFS/Irys pin ─▶ Arc registry   │
            └──────────────────────┬─────────────────────┘
                                   ▼
        ┌──────────────────────────────────────────────────┐
        │ Portfolio Engine (All Weather risk parity)       │──▶ rebalance signals
        │ Prediction Market + Performance Bonds (USDC)     │──▶ on-chain settlement
        └──────────────────────────────────────────────────┘
```

## Quick start

```bash
# 1. install uv if needed: https://docs.astral.sh/uv/
uv sync --all-extras
cp .env.example .env       # fill in keys you have; skip the rest for now

# 2. smoke test the US agent (uses Financial Datasets MCP — OAuth in browser)
uv run python -m agents.us_agent --ticker AAPL

# 3. run the API server
uv run rosetta
```

## Repo layout

| Path | Purpose | Owner model |
|------|---------|-------------|
| `agents/`       | Regional + translator LLM agents | Sonnet 4.6 daily; **DeepSeek V4 Pro** for `china_agent`; **Gemini 3.1 Pro** for `japan_agent` |
| `reasoning/`    | Trace schemas, hashing, IPFS, Arc recorder | Sonnet 4.6 |
| `portfolio/`    | All Weather risk-parity engine | Opus 4.6 (math-heavy) |
| `markets/`      | Prediction market + slash logic | Opus 4.6 |
| `contracts/`    | Solidity for Arc | **Opus 4.6** (production-grade) |
| `data/`         | MCP client, Tushare, ECB, BOJ wrappers | Sonnet 4.6 |
| `workflows/`    | AdalFlow pipelines + Trainer optimization | Sonnet 4.6 |
| `api/`          | FastAPI server | Sonnet 4.6 |
| `frontend/`     | React dashboard | Gemini 3 Flash / Sonnet 4.6 |
| `tests/`        | pytest | Sonnet 4.6 |
| `docs/`         | Sprint plan, architecture notes | Gemini 3 Flash |

See [`AGENTS.md`](./AGENTS.md) for the multi-model handoff protocol and [`docs/SPRINT_PLAN.md`](./docs/SPRINT_PLAN.md) for the day-by-day plan.

## License

MIT — open infrastructure. Optimized prompts (the "intelligence layer") live outside this repo. See `AGENTS.md` for the open-vs-closed rationale (the Warp playbook).

## Acknowledgements

- **Ray Dalio / Bridgewater** — All Weather risk-parity framework (publicly documented; not affiliated)
- **Tauric Research** — TradingAgents framework + Trading-R1 paper
- **SylphAI** — AdalFlow + AdaL CLI
- **Circle** — Arc, USDC, StableFX
