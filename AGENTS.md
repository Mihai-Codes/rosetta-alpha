# AGENTS.md — Rosetta Alpha

> Context file for **AdaL CLI** and any model picking up work mid-stream.
> Read this first. It's how we coordinate across models without re-deriving context every session.

---

## 1. Project one-liner

Five LLM agents (one per region, each thinking in its native language) produce structured investment theses → hashed and recorded on **Arc** → risk-parity portfolio engine + USDC-staked prediction markets on top.

## 2. Tech stack — locked decisions

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Language | Python 3.12+ | AdalFlow + web3.py + FastAPI all native |
| Package manager | **uv** | Faster than poetry; lockfile via `uv.lock` |
| LLM orchestration | **AdalFlow** (`adal.Component`, `adal.Generator`) | Auto-optimization via Trainer is our edge |
| Domain models | **Pydantic v2** | FastAPI + JSON Schema + serialization for hashing |
| LLM-structured output | `adal.JsonOutputParser` (NOT `DataClassParser`) wrapping Pydantic schemas | Keeps domain models Pydantic-native; converts at the boundary |
| Multi-agent base | TradingAgents v0.2.4 — **import schemas, wrap agents** | Don't reimplement; their structured outputs are mature |
| Blockchain | Arc (EVM, USDC-gas) via `web3.py` | Hackathon target chain |
| Smart contracts | Solidity + Foundry (preferred over Hardhat for speed) | Decide at contracts sprint |
| Storage | IPFS via Pinata (free tier) | Irys/Arweave as backup |
| API | FastAPI + uvicorn | Standard; easy WebSocket for live agent output |
| **Frontend** | **Next.js 15 App Router + Tailwind CSS v4 + Auth.js v5** | Migrated from Vite SPA for SSR, middleware, real routing |
| Auth | **Auth.js v5** (Google + GitHub + Apple) | Edge middleware, server-side session |

## 3. Repository conventions

- **Pydantic everywhere** for domain models. The bridge to AdalFlow is `JsonOutputParser(data_class=YourPydanticModel)`.
- **All agent outputs include both `*_native` and `*_en` fields** for any free-text reasoning. Hashing is over the canonical JSON (sorted keys, UTF-8) — language order matters.
- **One file = one Component class** where possible. Easier multi-model handoff.
- **No silent fallbacks.** If a data source fails, the agent must surface the failure in its `risk_factors` list, not return mock data.
- **Reasoning traces are append-only.** Once hashed, never mutate — re-run produces a new trace with a new hash.
- **Comments**: explain *why*, not *what*. Code shows what.
- **Frontend**: All interactive components need `'use client'` directive. Server components are the default in App Router.

## 4. Model routing — who handles what

| Task | Model | Context window | Why |
|------|-------|----------------|-----|
| Architecture, scaffolding, cross-cutting refactors, IA restructuring | **Claude Opus 4.6** | 200K | Reasoning depth + production-grade precision |
| Daily coding, tests, single-feature work | **Claude Sonnet 4.6** | 200K | Default. Cheap, fast, good. |
| Python pipeline dev/test loop (outside AdaL) | **Groq + Llama 3.3-70B** | 32K | Free tier, AdalFlow `GroqAPIClient` built-in |
| Smart contracts, financial math, security-critical | **Claude Opus 4.6** | 200K | Production-grade precision |
| `agents/china_agent.py` + Chinese prompts | **DeepSeek V4 Pro** | 936K | Native Chinese reasoning |
| Bulk Chinese data parsing | DeepSeek V4 Flash | 984K | Cheaper than V4 Pro |
| `agents/japan_agent.py` + Japanese prompts | **Gemini 3.1 Pro** | 1M | Strong Japanese; multimodal for chart reading |
| Visual review (screenshots, responsive QA) | **Gemini 3.1 Pro** | 1M | Multimodal: feed screenshots, get design feedback |
| Frontend responsive pass (public pages 375→1920px) | **Claude Sonnet 4.6** | 200K | Fast frontend work |
| Frontend responsive pass (gated pages) | **Claude Sonnet 4.6** | 200K | After public pages done |
| RainbowKit + wallet connection | **Claude Sonnet 4.6** | 200K | After auth/IA locked in |
| ShareButton component | **DeepSeek V4 Flash** | 984K | Fast, self-contained component |
| /dashboard page | **Kimi K2.6** | - | Solid frontend feature work |
| EarnQuiz component | **MiniMax M2.7** | - | Fast component build |
| Long refactor, second opinion on architecture | GPT-5.3 Codex / GPT-5.5 | 272K / 922K | Different reasoning trace |

## 5. Priority task queue (updated 2025-05-17)

```
✅ 1. Claude Opus 4.6   → IA restructure + Auth.js v5 + gated routing [DONE]
⏳ 2. Claude Sonnet 4.6 → RainbowKit + wallet connection
⏳ 3. Claude Sonnet 4.6 → Responsive: public pages (375→1920px)
⏳ 4. Gemini 3.1 Pro    → Visual review (multimodal screenshots)
⏳ 5. Claude Sonnet 4.6 → Responsive: gated pages
⏳ 6. DeepSeek V4 Flash → ShareButton.tsx
⏳ 7. Kimi K2.6         → /dashboard page
⏳ 8. MiniMax M2.7      → EarnQuiz.tsx
⏳ 9. You (Mihai)       → Demo video
```

**Handoff protocol (CRITICAL):**
When a model finishes a unit of work that should change the active model, the model **must** end its turn with a clear handoff block:

```
🔁 HANDOFF
Next task:    <one-line description>
Suggested model: <model name + why>
Touch points:  <files / functions to edit>
Open questions: <anything the next model needs from the user>
```

This is non-negotiable. It's how we keep token cost down across 14 days.

## 6. Information Architecture (new — 2025-05-17)

| Page / Route | Public | Signed In | Notes |
|---|---|---|---|
| `/` (hero landing) | ✅ | ✅ | First impression |
| `/desks` (thesis view) | ✅ Partial | ✅ Full | Blur gate on reasoning chain |
| `/leaderboard` | ✅ Partial | ✅ Full | Top 3 public, full stats behind auth |
| `/about` | ✅ | ✅ | Always public |
| `/feed` (Live Feed) | ❌ Gated | ✅ | FOMO conversion driver |
| `/registry` (Arc traces) | ❌ Gated | ✅ | Power user feature |
| `/dashboard` (portfolio) | ❌ Gated | ✅ | Personal |
| `/quiz` (earn USDC) | ❌ Gated | ✅ | Requires identity |
| Staking / prediction market | ❌ Gated | ✅ + wallet | Requires wallet |

## 7. Open vs closed — Warp playbook

**Open-source (this repo):** framework scaffold, smart contracts, schemas, MCP integrations, API routes, frontend.
**Closed (separate private location):** AdalFlow Trainer-optimized prompts, translation pipeline tuning, slash-bond calibration.

The `prompts/optimized/` and `prompts/private/` directories are gitignored.
Public prompts (the un-optimized baselines) live in `agents/<region>/prompts/baseline.py`.

## 8. Smart contract security non-negotiables

Whichever model writes Solidity:
- Use **OpenZeppelin** base contracts (no rolling our own ERC-20 / Ownable / ReentrancyGuard).
- Every external function: reentrancy guard or explicit justification in the doc-comment.
- USDC interactions use SafeERC20 (USDC has weird approve semantics historically).
- Slashing math: prove conservation (slashed = redistributed + burned) in a comment.
- No `tx.origin`. No unchecked low-level calls without explanation.
- Tests **before** deploy script. Foundry `forge test` must pass.

## 9. GitHub remote

Repo lives under the **`Mihai-Codes`** GitHub organization (NOT the personal
`chindris-mihai-alexandru` account). URL: **https://github.com/Mihai-Codes/rosetta-alpha**
Don't push to the personal account.

## 10. Sprint status

See [`docs/SPRINT_PLAN.md`](./docs/SPRINT_PLAN.md). Update the checkbox state at the end of every session.

## 11. When in doubt

1. Re-read this file.
2. Check `docs/SPRINT_PLAN.md` for current sprint focus.
3. Check the most recent commit message for context.
4. **Ask Mihai.** This is his first web3 project — flag jargon explicitly.

---
_Last updated: 2025-05-17 by Claude Opus 4.6 (IA restructuring + Next.js migration session)._
