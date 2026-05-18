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

## 5. Priority task queue (updated 2026-05-18)

```
✅ 1. Claude Opus 4.6   → IA restructure + Auth.js v5 + gated routing [DONE]
✅ 2. Claude Sonnet 4.6 → RainbowKit + wallet connection + Apple auth [DONE]
✅ 3. Claude Sonnet 4.6 → Responsive: public pages (375→1920px) [DONE]
✅ 4. Gemini 3.1 Pro    → Visual review round 1 → mobile pill scroll fix [DONE]
✅ 5. Claude Sonnet 4.6 → Responsive: gated pages (/feed, /registry, /dashboard, /quiz) [DONE — existing patterns already applied]
✅ 6. DeepSeek V4 Flash → ShareButton.tsx (gold border modal, flag emoji tweet template, updated props) [DONE]
✅ 7. Claude Sonnet 4.6 → EarnQuiz.tsx with real Arc useSendTransaction [DONE]
✅ 8. Claude Sonnet 4.6 → DashboardView.tsx + LeaderboardView.tsx [DONE]
✅ 9. Claude Sonnet 4.6 → Playwright screenshot script (scripts/screenshot.mjs) [DONE]
✅ 10. Claude Sonnet 4.6 → README.md restored + Mermaid diagrams + TX evidence [DONE]

⏳ 11. Gemini 3.1 Pro   → Visual review round 2 (post-ShareButton, all pages)
       → See Section 12 for exact prompt to paste into AI Studio

⏳ 12. Kimi K2.6        → /dashboard page EXTENDED version (SVG ring chart + richer tables)
       → OPTIONAL: current DashboardView.tsx works; Kimi can enhance it
       → See Section 13 for exact prompt

⏳ 13. MiniMax M2       → EarnQuiz.tsx ENHANCED version (richer multi-step flow)
       → OPTIONAL: current EarnQuiz.tsx works; MiniMax can rebuild with richer UX
       → See Section 14 for exact prompt

⏳ 14. You (Mihai)      → Demo video / pitch script
```

> **AdaL note:** Tasks 11–13 are "enhance existing working components" not blockers.
> Run them in the respective models' UIs, paste output back, AdaL integrates.
> AdaL must re-read this file at the START of every session to avoid repeating completed work.

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

## 12. Gemini 3.1 Pro — Visual Review Round 2 Prompt

**Where to run:** Google AI Studio → Gemini 1.5/2.0 Pro with image upload  
**How:** Run `node scripts/screenshot.mjs` first to capture fresh screenshots, then attach them all.

```
You are a senior UI/UX reviewer for a dark-mode institutional fintech app called Rosetta Alpha.

Design system:
- Background: #000000 (pure black)
- Accent: #D82B2B (crimson red)  
- Gold: #C9A84C
- Positive: #4A9F6F, Negative: #9F4A4A
- Typography: Playfair Display (headings), Inter (body), JetBrains Mono (data/mono)
- Breakpoints: 375px (mobile), 768px (tablet), 1440px (desktop), 1920px (TV/wide)

Pages to review (screenshots attached):
- / (landing), /desks, /leaderboard, /about (public)
- /feed, /registry, /dashboard, /quiz (authenticated, shown signed-in)

For each screenshot, check:
1. Spacing inconsistencies or padding that looks off
2. Touch target violations (interactive elements < 44px height on mobile)
3. Typography scale issues (too large, too small, wrong weight)
4. Color/contrast issues against the black background
5. Layout breaks or overflow at any breakpoint
6. The new ShareButton popover in ThesisCard footer — does it look right?
7. Any element that looks unpolished, misaligned, or inconsistent

Output format:
- One finding per line: [PAGE] [BREAKPOINT] [ELEMENT] — Issue → Fix suggestion
- Grouped by severity: CRITICAL / MINOR / POLISH
- End with a 3-sentence overall assessment
```

---

## 13. Kimi K2.6 — Enhanced /dashboard Prompt

**Where to run:** https://kimi.com or Kimi API  
**Output target:** `frontend/src/components/DashboardView.tsx` (replace existing)  
**Status:** ⏳ PENDING — current DashboardView.tsx works, this is an enhancement

```
Build the /dashboard page for Rosetta Alpha — the personal account view for signed-in users.

Current file to replace: frontend/src/components/DashboardView.tsx
Existing imports to preserve:
  import { useAccount, useBalance } from 'wagmi'
  Arc Testnet chainId: 5042002
  USDC contract: 0x... (use placeholder, typed)

Three sections:

1. Portfolio Overview
   - SVG ring/donut chart (pure SVG, no chart library) with 4 quadrants:
     Equities 40% | Bonds 30% | Commodities 15% | Crypto 15%
   - Color each segment: Equities=#4A9F6F, Bonds=#C9A84C, Commodities=#7B8FA6, Crypto=#D82B2B
   - Center label: "ALL WEATHER" in Playfair Display
   - Below chart: 4 stat pills showing the percentages with labels
   - Current wallet USDC balance from useBalance() wagmi hook

2. My Predictions — table of user's past USDC stakes
   Columns: Thesis | Region | Direction | Stake | Status | PnL
   Status badge colors: OPEN=gold, RESOLVED_WIN=green, RESOLVED_LOSS=red
   Mock data: 5 rows, typed interface PredictionRow for real hookup
   Responsive: horizontal scroll on mobile, full table on desktop

3. Leaderboard — top 10 agents by 7-day prediction accuracy
   Columns: Rank | Agent | Region | Accuracy | Theses | Streak
   Top 3 rows highlighted with gold/silver/bronze left border
   Mock data: 10 rows, typed interface LeaderboardRow

Design: #000000 bg, #D82B2B accent, #C9A84C gold, Playfair Display + Inter + JetBrains Mono
Full responsive 375px → 1920px. Use clamp() for font sizes.
'use client' at top. TypeScript. No external chart libraries (pure SVG only).
Export: export function DashboardView() as named export.
Gate with: if (!address) return <ConnectPrompt /> (simple "connect wallet" placeholder div)
```

**After Kimi delivers — AdaL integration checklist:**
- [ ] Verify `useAccount` and `useBalance` imports from `wagmi`
- [ ] Confirm no new dependencies added (pure SVG, no chart libs)
- [ ] Run `cd frontend && npm run build` — fix any TS errors
- [ ] Check wallet gate renders correctly when disconnected

---

## 14. MiniMax M2 — Enhanced EarnQuiz Prompt

**Where to run:** https://minimax.io or MiniMax API  
**Output target:** `frontend/src/components/EarnQuiz.tsx` (replace existing)  
**Status:** ⏳ PENDING — current EarnQuiz.tsx works, this is an enhancement

```
Build the EarnQuiz.tsx component for Rosetta Alpha.

Context: After reading a thesis, users take a 3-question quiz to earn USDC.
Current file to replace: frontend/src/components/EarnQuiz.tsx

Props interface (EXACT — do not change):
  interface EarnQuizProps {
    thesisId: string
    questions: QuizQuestion[]
    onComplete: (score: number) => void
  }
  interface QuizQuestion {
    text: string
    options: string[]   // exactly 4 items
    correctIndex: number
  }

Flow:
  Step 1 — Question display: show one question at a time with 4 option buttons
  Step 2 — Per-question feedback: selected answer highlights immediately
            Correct = green (#4A9F6F) border + bg tint, Wrong = red (#9F4A4A) + show correct
  Step 3 — After all 3 answered: show results screen
            Score X/3 in large Playfair Display font
            If 3/3: gold "REWARD PENDING" badge + trigger /api/quiz/reward POST + useSendTransaction
            If < 3: "Try again tomorrow" in text-tertiary
  
Arc TX on 3/3 (EXACT values — do not change):
  - Use useSendTransaction from wagmi
  - to: '0x06775Be99CfBC9A6D0819ff87A67954a2E976A16'
  - value: parseEther('0.001')  
  - chainId: 5042002

/api/quiz/reward call:
  fetch('/api/quiz/reward', { method: 'POST', body: JSON.stringify({ thesisId }) })

Design rules:
  - Option buttons: min-h-[44px], full width, border border-border, rounded
  - Selected+correct: border-[#4A9F6F] bg-[#4A9F6F]/10
  - Selected+wrong: border-[#9F4A4A] bg-[#9F4A4A]/10
  - Correct answer (when wrong chosen): border-[#4A9F6F] opacity-60
  - Progress bar at top: show Q1/Q2/Q3 progress dots
  - Question counter: "01 / 03" in JetBrains Mono

'use client' at top. TypeScript strict. No external dependencies beyond wagmi/viem.
Export: export function EarnQuiz({ thesisId, questions, onComplete }: EarnQuizProps)
```

**After MiniMax delivers — AdaL integration checklist:**
- [ ] Verify `useSendTransaction` from `wagmi`, `parseEther` from `viem`
- [ ] Verify chain ID 5042002 and rewards pool address unchanged
- [ ] Check `/api/quiz/reward` route exists at `frontend/src/app/api/quiz/reward/route.ts`
- [ ] Run `cd frontend && npm run build` — fix any TS errors

---

_Last updated: 2026-05-18 by Claude Sonnet 4.6 (ShareButton + AGENTS.md multi-model tracking)._
