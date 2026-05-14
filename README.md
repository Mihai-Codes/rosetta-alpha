# 🌐 Rosetta Alpha

[![CI](https://github.com/Mihai-Codes/rosetta-alpha/actions/workflows/ci.yml/badge.svg)](https://github.com/Mihai-Codes/rosetta-alpha/actions/workflows/ci.yml)
[![Python 3.12](https://img.shields.io/badge/python-3.12-blue?logo=python&logoColor=white)](https://www.python.org/)
[![AdalFlow](https://img.shields.io/badge/AdalFlow-SylphAI-purple?logo=pytorch&logoColor=white)](https://github.com/SylphAI-Inc/AdalFlow)
[![DeepSeek R1](https://img.shields.io/badge/DeepSeek-R1%20reasoning-0066cc?logo=deepseek&logoColor=white)](https://platform.deepseek.com)
[![Arc Testnet](https://img.shields.io/badge/Arc-Testnet%20%7C%20chain%205042002-00c2ff?logo=ethereum&logoColor=white)](https://testnet.arcscan.app)
[![Circle Paymaster](https://img.shields.io/badge/Circle-Paymaster%20ERC--4337-00d395?logo=circle&logoColor=white)](https://developers.circle.com/paymaster)
[![IPFS](https://img.shields.io/badge/IPFS-Pinata-65c2cb?logo=ipfs&logoColor=white)](https://app.pinata.cloud)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Hackathon](https://img.shields.io/badge/Agora%20Hackathon-Canteen%20%C3%97%20Circle-ff6b35)](https://agora.thecanteenapp.com/)

> *"Dalio's All Weather — diversified across **languages and regions**, not just asset classes."*

Multi-language AI financial research platform that hashes every reasoning trace onto **Arc** (Circle's stablecoin-native L1), pins it to IPFS, stakes a **ROSETTA performance bond**, and opens an on-chain **prediction market** — closing the full accountability loop automatically.

**Hackathon:** [Canteen × Arc — Agora Agents](https://agora.thecanteenapp.com/) · May 11–25, 2026  
**Builder:** Mihai Chindris (`mihai_chindris` on Arc Discord)  
**Status:** ✅ 5/5 desks live · 4/4 contracts verified · Full E2E pipeline operational

---

## 🎬 Demo — Full E2E Run (May 14, 2026)

```
✅ US     AAPL       NEUTRAL  70% | analyze → pin → stake → record → market
✅ CRYPTO BTC        LONG     73% | analyze → pin → stake → record → market
✅ CN     600519.SH  LONG     80% | analyze → pin → stake → record → market
✅ EU     MC.PA      LONG     85% | analyze → pin → stake → record → market
✅ JP     7203.T     LONG     75% | analyze → pin → stake → record → market

📊 Portfolio View: Net LONG · signal=+0.66 · avg confidence=76.2%
```

Every run produces **live on-chain proof** — no mocked data, no hardcoded results.

---

## 🏗️ Architecture

```
                 ┌─────────────────────────────────────────────────────────────┐
  data feeds ──▶ │  Regional Agents  (TradingAgents-style, 5 desks)           │
  (MCP, APIs,    │  🇺🇸 US · 🇨🇳 CN · 🇪🇺 EU · 🇯🇵 JP · ₿ CRYPTO              │
  AKShare,       │  Each reasons in its native language (EN/ZH/DE/JA)         │
  yfinance)      └────────────────────────┬────────────────────────────────────┘
                                          │  structured InvestmentThesis (Pydantic)
                                          ▼
                          ┌───────────────────────────────┐
                          │  Translator Agent             │──▶ PredictionMarketQuestion
                          │  (DeepSeek / Gemini)          │    (Polymarket-shaped)
                          └───────────────┬───────────────┘
                                          ▼
              ┌──────────────────────────────────────────────────────────┐
              │  Reasoning Trace Pipeline                                │
              │  SHA-256 hash ──▶ Pinata IPFS pin ──▶ Arc registry      │
              │                    (bafkrei...)        (ReasoningRegistry.sol) │
              └────────────────────────────┬─────────────────────────────┘
                                           │
                    ┌──────────────────────┼─────────────────────┐
                    ▼                      ▼                      ▼
          ROSETTA bond stake      On-chain record          PredictionMarket
          (RosettaToken.sol)    (ReasoningRegistry.sol)   (PredictionMarket.sol)
          10 tokens / trace      trace_hash + CID         YES/NO binary question
                                                          OwnerPriceOracle resolves
                                          │
                                          ▼
                    ┌──────────────────────────────────────────────┐
                    │  Portfolio Engine  (All Weather risk parity) │
                    │  Cross-desk signal aggregation               │──▶ rebalance signals
                    │  Net direction · confidence · risk surfacing │
                    └──────────────────────────────────────────────┘
```

### Why Arc?
Arc settles in **USDC** with EVM compatibility and sub-cent gas fees — ideal for micro-transactions like per-trace staking and prediction market creation that would be economically unviable on mainnet. The `ReasoningRegistry` contract provides **immutable, verifiable provenance** for every AI decision: if an agent's thesis proves wrong, the bond is slashable and the prediction market resolves against it.

> **Circle Paymaster note:** On Arc, USDC is the native gas token — agents pay gas in USDC natively with no extra plumbing. For multi-chain deployment on Arbitrum/Base, we've wired [Circle Paymaster (ERC-4337 v0.7)](https://developers.circle.com/paymaster) for fully gasless agent UX — see [`scripts/circle_paymaster_demo.js`](./scripts/circle_paymaster_demo.js).

---

## ⛓️ Smart Contracts (Arc Testnet — Chain ID 5042002)

All 4 contracts **verified** on [arcscan.app](https://testnet.arcscan.app):

| Contract | Address | Purpose |
|----------|---------|---------|
| `ReasoningRegistry` | [`0x0677...`](https://testnet.arcscan.app/address/0x06775Be99CfBC9A6D0819ff87A67954a2E976A16) | Immutable log of trace hashes + IPFS CIDs |
| `RosettaToken` | [`0x8ec6...`](https://testnet.arcscan.app/address/0x8ec6...) | ERC-20 performance bond (10 ROSETTA / trace) |
| `PredictionMarket` | [`0x5700...`](https://testnet.arcscan.app/address/0x570034f17e8aFc22aF885607fF26Fe90Beb97596) | Binary YES/NO markets per thesis |
| `OwnerPriceOracle` | [`0x387C...`](https://testnet.arcscan.app/address/0x387C8cbCC2711A5d2388000D1DAE728542284824) | Price feed for market resolution |

### Live TX Evidence (May 14, 2026 E2E run)

| Desk | Stake TX | Registry TX | Market TX |
|------|----------|-------------|-----------|
| 🇺🇸 AAPL | `e48f02c2...` | `293d33c4...` | `3b39ce22...` |
| ₿ BTC | `33cd57ea...` | `50fd3228...` | `69ada0ea...` |
| 🇨🇳 Moutai | `f9b2e58a...` | `51fed396...` | `53ba03df...` |

---

## 🤖 Agent Design

### Multi-Language, Multi-Model Routing

| Desk | Ticker | Language | Primary Model | Fallback |
|------|--------|----------|---------------|---------|
| 🇺🇸 US | AAPL | English | Groq Llama-3.3-70B | — |
| 🇨🇳 China | 600519.SH | **Simplified Chinese** | DeepSeek V4 Pro | Groq (on 402) |
| 🇪🇺 EU | LVMH, SAP | German/French | Gemini 3.1 Flash | Groq |
| 🇯🇵 Japan | 7203.T | **Japanese** | Gemini 3.1 Flash | Groq |
| ₿ Crypto | BTC/ETH | English | Groq Llama-3.3-70B | — |

**Why native languages?** DeepSeek V4 Pro reasons about Kweichow Moutai in Mandarin with context that English models lack (PBOC policy nuance, Moutai's cultural premium, A-share retail dynamics). The `thesis_summary_en` field is always English for cross-desk aggregation.

### TradingAgents-style Sub-Agent Chain

Each regional agent runs a chain of specialist sub-agents before synthesis:

```
FundamentalAnalyst ──┐
SentimentAnalyst   ──┼──▶ PortfolioManager (synthesis) ──▶ InvestmentThesis
TechnicalAnalyst   ──┘         (with learned guidelines injected)
```

All prompts are **AdalFlow `Parameter` objects** — automatically optimizable via Textual Gradient Descent. The `training/bake_feedback.py` module distills ephemeral judge feedback into permanent `learned_guidelines.json` that get injected into every future synthesis prompt.

### Data Sources

| Desk | Primary | Secondary |
|------|---------|-----------|
| US | Financial Datasets API (fundamentals, SEC filings, news) | yfinance (live price) |
| CN | **AKShare** (Eastmoney backend, free, no token) | yfinance `600519.SS` |
| EU | yfinance | ECB data (planned) |
| JP | yfinance | BOJ data (planned) |
| Crypto | CoinGecko + DeFiLlama | Binance public API (fallback) |

---

## 🧠 AdalFlow Integration

Built on [SylphAI's AdalFlow](https://github.com/SylphAI-Inc/AdalFlow):

- **`adal.Generator`** — all LLM calls go through AdalFlow's generator for provider-agnostic routing
- **`adal.Parameter`** — every prompt is a trainable parameter
- **`PydanticJsonParser`** — bridges AdalFlow's string output to Pydantic domain models
- **Text-grad optimization** — `training/prompt_optimizer.py` runs multi-round sweeps; `bake_feedback.py` makes improvements permanent
- **Learned guidelines** — baked from text-grad feedback, injected into every synthesis prompt
- Average composite score after optimization: **~9.0/10**

---

## 📦 Repo Layout

```
rosetta-alpha/
├── agents/          # Regional + translator LLM agents
│   ├── base_agent.py        # Abstract base (TradingAgents pattern)
│   ├── us_agent.py          # 🇺🇸 US equities (Financial Datasets MCP)
│   ├── china_agent.py       # 🇨🇳 A-shares (AKShare + DeepSeek)
│   ├── crypto_agent.py      # ₿ Crypto (CoinGecko + DeFiLlama)
│   ├── eu_agent.py          # 🇪🇺 EU equities (yfinance + Gemini)
│   ├── japan_agent.py       # 🇯🇵 JP equities (yfinance + Gemini)
│   └── translator_agent.py  # Thesis → PredictionMarketQuestion
├── reasoning/
│   ├── trace_schema.py      # Pydantic domain models (InvestmentThesis etc.)
│   ├── hasher.py            # SHA-256 canonical hash
│   ├── ipfs_pinner.py       # Pinata IPFS pinning
│   ├── arc_recorder.py      # Arc on-chain recording + market creation
│   └── settler.py           # Autonomous settler: poll → resolve → settle markets
├── scripts/
│   ├── circle_paymaster_demo.js  # Circle Paymaster (ERC-4337 v0.7) gasless USDC demo
│   └── .env.example         # Environment template for scripts
├── docs/
│   └── outreach/
│       └── LAUNCH_PLAN.md   # Social launch plan (X/LinkedIn, May 18)
├── portfolio/
│   └── engine.py            # All Weather risk-parity aggregation
├── markets/
│   └── question_generator.py # Translator → binary prediction questions
├── contracts/
│   └── src/
│       ├── ReasoningRegistry.sol  # Immutable trace log
│       ├── RosettaToken.sol       # ERC-20 performance bond
│       ├── PredictionMarket.sol   # Binary YES/NO markets
│       └── OwnerPriceOracle.sol   # Price feed for resolution
├── data/
│   ├── mcp_client.py        # Financial Datasets MCP
│   ├── akshare_client.py    # Free A-share data (Eastmoney)
│   ├── yfinance_client.py   # Global price feeds
│   ├── tushare_client.py    # Tushare Pro (optional)
│   └── deepseek_client.py   # DeepSeek API client
├── training/
│   ├── prompt_optimizer.py  # Text-grad sweep runner
│   └── bake_feedback.py     # Distill feedback → permanent guidelines
└── tests/                   # pytest suite
```

---

## 🚀 Quick Start

```bash
# 1. Install uv: https://docs.astral.sh/uv/
uv sync --all-extras

# 2. Configure environment
cp .env.example .env
# Fill in: GROQ_API_KEY (free), PINATA_JWT, ARC_RPC_URL, ARC_DEPLOYER_PRIVATE_KEY

# 3. Run a single desk
uv run python -m agents.us_agent --ticker AAPL
uv run python -m agents.china_agent --ticker 600519.SH
uv run python -m agents.crypto_agent --ticker BTC

# 4. Run full 3-desk pipeline (analyze → pin → stake → record → market)
uv run python -c "
import asyncio
from agents.us_agent import USAgent
from agents.crypto_agent import CryptoAgent
from agents.china_agent import ChinaAgent

async def main():
    for agent, ticker in [(USAgent(),'AAPL'),(CryptoAgent(),'BTC'),(ChinaAgent(),'600519.SH')]:
        thesis = await agent.analyze(ticker)
        print(f'{ticker}: {thesis.direction.value} conf={thesis.confidence_score:.2f}')
        print(f'  {thesis.thesis_summary_en[:100]}')

asyncio.run(main())
"

# 5. Run tests
uv run pytest tests/ -q
```

### Required Environment Variables

| Variable | Where to get | Required for |
|----------|-------------|--------------|
| `GROQ_API_KEY` | [console.groq.com](https://console.groq.com) (free) | All desks (default LLM) |
| `FINANCIAL_DATASETS_API_KEY` | [financialdatasets.ai](https://financialdatasets.ai) | US desk fundamentals |
| `PINATA_JWT` | [app.pinata.cloud](https://app.pinata.cloud) | IPFS pinning |
| `ARC_RPC_URL` | [Arc Discord](https://discord.gg/arc) | On-chain recording |
| `ARC_DEPLOYER_PRIVATE_KEY` | Your Arc wallet | On-chain recording |
| `DEEPSEEK_API_KEY` | [platform.deepseek.com](https://platform.deepseek.com) | CN desk (optional, Groq fallback) |
| `GEMINI_API_KEY` | [aistudio.google.com](https://aistudio.google.com) | EU/JP desks, judge |
| `TUSHARE_TOKEN` | [tushare.pro](https://tushare.pro) | CN desk (optional, AKShare fallback) |

---

## 🔁 The Accountability Loop

```
Agent analyzes ticker
        │
        ▼
InvestmentThesis (Pydantic)
        │
        ├──▶ SHA-256 hash (deterministic, sorted-key JSON)
        │
        ├──▶ IPFS pin (Pinata) ──▶ CID: bafkrei...
        │
        ├──▶ Stake 10 ROSETTA tokens (performance bond)
        │
        ├──▶ Record on Arc: record_trace(hash, CID, region, asset_class)
        │         └── ReasoningRegistry.sol: immutable, auditable
        │
        └──▶ Open PredictionMarket: "Will AAPL be LONG in 30 days?"
                  └── Entry price from yfinance at thesis creation time
                  └── Resolved by OwnerPriceOracle at expiry
                  └── Wrong thesis → bond slashed → correct predictor rewarded
```

This loop means **every AI claim is financially accountable**. Agents that produce better theses accumulate reputation on-chain; agents that are consistently wrong lose their bond.

---

## 📊 Text-Grad Optimization

Rosetta Alpha uses AdalFlow's **Textual Gradient Descent** to automatically improve agent prompts:

```bash
# Run a single optimization sweep (3 desks, 2 rounds)
uv run python -m training.prompt_optimizer

# Bake ephemeral feedback into permanent guidelines
uv run python -m training.bake_feedback
```

The optimizer:
1. Runs each agent on its benchmark ticker
2. Sends the thesis to a judge LLM (Gemini 3.1 Flash) for scoring
3. Generates textual gradient feedback on prompt weaknesses
4. Propagates improvements back to the synthesis prompt
5. Bakes durable improvements into `training/learned_guidelines.json`

**Result:** Average composite judge score improved from ~7.2 → ~9.0/10 after 3 optimization rounds.

---

## 🗺️ Roadmap

- [x] US desk (AAPL) — Financial Datasets MCP
- [x] Crypto desk (BTC) — CoinGecko + DeFiLlama
- [x] China desk (Moutai) — AKShare + DeepSeek
- [x] Arc smart contracts (4/4 verified)
- [x] IPFS pinning via Pinata
- [x] ROSETTA performance bond staking
- [x] PredictionMarket creation per thesis
- [x] Text-grad prompt optimization
- [x] EU desk (LVMH MC.PA) — yfinance + Gemini 3.1 Flash · LONG 85%
- [x] Japan desk (Toyota 7203.T) — yfinance + Gemini 3.1 Flash · LONG 75%
- [x] Autonomous settler (`reasoning/settler.py`) — permissionless resolve + settle loop
- [x] React dashboard + FastAPI backend (`frontend/` + `api/main.py`)
- [x] Translator agent → binary PredictionMarketQuestion (Polymarket-shaped)
- [x] Circle Paymaster demo (`scripts/circle_paymaster_demo.js`) — gasless USDC on Arbitrum
- [ ] AdalFlow Trace integration (auto training dataset generation)
- [ ] Submission doc + demo video (due May 25)
---

## 🙏 Acknowledgements

- **Ray Dalio / Bridgewater** — All Weather risk-parity framework (publicly documented; not affiliated)
- **Tauric Research** — [TradingAgents paper](https://arxiv.org/abs/2504.21028) + Trading-R1 architecture
- **SylphAI** — [AdalFlow](https://github.com/SylphAI-Inc/AdalFlow) framework + AdaL CLI
- **Circle** — Arc L1, USDC, StableFX infrastructure
- **AKShare** — Free A-share market data ([akshare.akfamily.xyz](https://akshare.akfamily.xyz))

---

## 📄 License

MIT — open infrastructure. Optimized prompts (the "intelligence layer") are gitignored per the Warp playbook in [`AGENTS.md`](./AGENTS.md).

---

*🌸 Built with [AdaL](https://github.com/adal-cli/adal) — SylphAI's AI R&D agent*
