# Rosetta Alpha

**Multi-language AI reasoning, settled on Arc L1.**

> *Five regional agents. One verifiable thesis. Every reasoning trace hashed on-chain.*

[![Live Demo](https://img.shields.io/badge/Live-rosetta--alpha.vercel.app-D82B2B?style=flat-square)](https://rosetta-alpha.vercel.app)
[![Arc Testnet](https://img.shields.io/badge/Chain-Arc%20Testnet%205042002-C9A84C?style=flat-square)](https://testnet.arcscan.app)
[![USDC](https://img.shields.io/badge/Settlement-USDC-2775CA?style=flat-square)](https://developers.circle.com/stablecoins/what-is-usdc)

---

## The Problem

Prediction markets suffer from one structural flaw: **the reasoning is invisible.** You see the bet, you see the odds — you never see why an agent called LONG on BTC or NEUTRAL on AAPL. That opacity is the bottleneck. You can't learn from it. You can't verify it. You can't bet on it.

The [Trading-R1 paper](https://arxiv.org/abs/2509.11420) from Tauric Research shows the insight: **the reasoning trace is the product, not the trade.** Arc's ~$0.01 fees make it economical to hash and pin every trace on-chain without eroding PnL. That unlocks a new primitive — verifiable, cite-able, copy-able AI reasoning.

**Rosetta Alpha** is that primitive, deployed as a full-stack product.

---

## What It Does

Five AI analysts — one per global desk (US Equities, China, Europe, Japan, Crypto) — produce investment theses in real-time using a multi-agent reasoning stack built on [TradingAgents](https://github.com/TauricResearch/TradingAgents). Every thesis is:

1. **Generated** by a chain of specialist sub-agents (Technical Analyst → Research Manager → Portfolio Manager)
2. **Pinned to IPFS** — full reasoning JSON, permanent and decentralized
3. **Settled on Arc L1** — the IPFS CID hash is recorded on-chain, creating an immutable audit trail
4. **Exposed to users** — live feed, registry, and a knowledge quiz that pays USDC for correct directional calls

```
Market Data → AdalFlow Agents → IPFS (CID) → Arc L1 (tx hash) → Rosetta Frontend
                                                                        ↓
                                                               User reads trace
                                                               User calls direction
                                                               User claims 0.5 USDC
                                                               Score posted to Leaderboard
```

---

## Live Demo

🔴 **[rosetta-alpha.vercel.app](https://rosetta-alpha.vercel.app)**

| Page | What to see |
|---|---|
| `/` | Hero — "Enter Terminal" |
| `/desks` | Regional AI thesis cards with conviction meters |
| `/feed` | Real-time reasoning trace stream with Arc TX hashes |
| `/registry` | Verifiable ledger — every thesis → IPFS CID → Arc L1 tx |
| `/quiz` | Pick LONG/SHORT/NEUTRAL → match AI → claim 0.5 USDC |
| `/dashboard` | Wallet-gated: live USDC balance (Arc Testnet), prediction history, Arc receipts |
| `/leaderboard` | Rankings by accuracy, USDC earned, win streak |

---

## Judging Criteria Mapping

### 🤖 Agentic Sophistication (30%)

The AI isn't a single model making a call. It's a **three-layer deliberation chain**:

```
PortfolioManager
    └── ResearchManager
            ├── TechnicalAnalyst (chart patterns, RSI, MACD)
            ├── FundamentalsAnalyst (balance sheet, earnings)
            └── MacroAnalyst (regime, sentiment, flows)
```

Each agent emits structured JSON with `thought_process`, `content`, and `confidence_score`. The Portfolio Manager synthesizes the sub-agents and produces a final directional call with a thesis summary. This matches the [TauricResearch/TradingAgents](https://github.com/TauricResearch/TradingAgents) v0.2.4 architecture described in the hackathon research brief.

**What the AI decides autonomously:**
- Direction (LONG / SHORT / NEUTRAL) per asset per desk
- Confidence score (0–1)
- Thesis summary across all agent roles
- Which reasoning steps to surface to the user

### 📈 Traction (30%)

- **All pages are live and functional** — zero "coming soon" placeholders
- **Quiz rewards are claimable** — wallet connect → answer → claim USDC flow is complete
- **Auth system live** — email magic links (Resend) + Google/GitHub OAuth + wallet connect
- **Leaderboard tracks** active traders, accuracy rates, USDC earned, Arc settlement count
- **Screenshot CI** — 32 automated screenshots (8 pages × 4 breakpoints) via Playwright

### 🔵 Circle Tool Usage (20%)

| Tool | Usage |
|---|---|
| **USDC on Arc** | Native settlement currency for all quiz rewards |
| **Arc L1** | Every thesis trace hashed and recorded on-chain (chain ID 5042002) |
| **Circle Paymaster** | Designed for gasless UX — USDC-denominated fees, no volatile gas token |
| **Wagmi + RainbowKit** | Live USDC balance read from Arc Testnet via `useBalance` hook |
| **Arc Explorer** | Direct links to every tx: `testtest.arcscan.app/tx/<hash>` |

### 💡 Innovation (20%)

**The insight from the hackathon research brief:**

> *"What people actually want to copy is how someone thinks — which traces finally make legible and Arc finally makes affordable to publish."* — Agora Research, RFB 06

Rosetta Alpha operationalizes this. The reasoning trace is published, verified, and bet on. The leaderboard isn't ranked by PnL — it's ranked by **accuracy of directional conviction**, which is a proxy for understanding the AI's reasoning methodology. That's a new gamification primitive: **learn-to-earn by reading machine reasoning**.

The multi-language angle (US + China + Europe + Japan desks) maps directly to Research Brief 04 — translation as alpha. A Tokyo-based retail investor reading a LVMH thesis summarized in their regional context is a net new market that doesn't exist on any existing prediction platform.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                              │
│  Next.js 15 (App Router) · Tailwind v4 · Framer Motion      │
│  Auth.js v5 · Wagmi · RainbowKit · TanStack Query           │
└─────────────────┬───────────────────────────────────────────┘
                  │ /api/feed (proxy)
┌─────────────────▼───────────────────────────────────────────┐
│                        Backend                               │
│  FastAPI (Python) · AdalFlow multi-agent pipeline           │
│  results.json → thesis structs with reasoning chains        │
└─────────────────┬───────────────────────────────────────────┘
                  │
      ┌───────────┴───────────┐
      │                       │
┌─────▼──────┐        ┌───────▼──────┐
│    IPFS    │        │   Arc L1     │
│  (thesis   │        │  (CID hash   │
│   JSON)    │        │   on-chain)  │
└────────────┘        └──────────────┘
                             │
                      ┌──────▼──────┐
                      │ Arc Testnet │
                      │ USDC Wallet │
                      │ (quiz pay)  │
                      └─────────────┘
```

---

## Tech Stack

```
Frontend          Next.js 15, React 19, Tailwind CSS v4
Auth              Auth.js v5 (Email magic links via Resend, Google, GitHub)
Database          Prisma 5 + SQLite (verification token store)
Web3              Wagmi v2, RainbowKit, viem
Chain             Arc Testnet (chain ID: 5042002)
Settlement        USDC on Arc L1
Storage           IPFS (thesis JSON), Arc L1 (audit hashes)
Backend           FastAPI (Python), AdalFlow agent framework
Deployment        Vercel (frontend), Arc Testnet (on-chain)
Visual QA         Playwright (32 screenshots, 8 pages × 4 breakpoints)
```

---

## Arc Testnet Config

```typescript
export const arcTestnet = {
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.testnet.arc.network'] }
  },
  blockExplorers: {
    default: { name: 'ArcScan', url: 'https://testnet.arcscan.app' }
  },
}
```

---

## Local Setup

```bash
# 1. Clone
git clone https://github.com/Mihai-Codes/rosetta-alpha.git
cd rosetta-alpha/frontend

# 2. Install
npm install

# 3. Environment
cp .env.example .env.local
# Set: AUTH_SECRET, AUTH_RESEND_KEY, NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID

# 4. Database
npx prisma generate && npx prisma db push

# 5. Run
npm run dev

# 6. Visual QA screenshots (optional)
node scripts/screenshot.mjs
```

### Required Environment Variables

| Variable | Description |
|---|---|
| `AUTH_SECRET` | NextAuth secret (generate: `openssl rand -hex 32`) |
| `AUTH_RESEND_KEY` | [Resend](https://resend.com) API key for magic links |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | [WalletConnect Cloud](https://cloud.walletconnect.com) project ID |
| `NEXT_PUBLIC_ARC_RPC_URL` | Arc Testnet RPC (default: `https://rpc.testnet.arc.network`) |
| `NEXT_PUBLIC_ARC_CHAIN_ID` | Arc Testnet chain ID (default: `5042002`) |

---

## Why Arc

Arc's ~$0.01 fees and sub-second finality unlock something that wasn't economical on other chains: **hashing every AI reasoning trace on-chain in real-time**. On Ethereum mainnet, publishing 50 thesis hashes per day would cost hundreds of dollars in gas. On Arc, it costs $0.50. That's the economic argument for the entire product.

The Paymaster integration means users never touch a gas token — USDC in, USDC out. No MetaMask confusion, no ETH top-ups. That's what makes a prediction-market-style quiz viable for retail.

---

## Submission

Built for the **Agora Agents Hackathon** (Canteen × Circle × Arc) · May 11–25, 2026

**Stack used from Circle**: USDC, Arc L1, Paymaster (architecture), App Kit (RainbowKit integration)  
**RFB alignment**: RFB 02 (Prediction Market Trader Intelligence) + RFB 03 (Prediction Market Verticals)  
**Research insight applied**: Trading-R1 — reasoning traces as the product

---

*"The agora is, as it were, the heart of the city."* — Aristotle, Politics VII  
*Rosetta Alpha is where the reasoning is made public.*
