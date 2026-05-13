# Sprint Plan — Rosetta Alpha

**Hackathon window:** May 11 → May 25, 2026 (14 days)
**Today:** May 13 (Day 3)

Update checkboxes at end of every session. Each task notes the **suggested model**.

---

## SPRINT 1 — Foundation (May 11–17) · "Make it work"

### Day 1–2 (May 11–12) · Project Scaffolding
- [x] Repo structure — *Opus 4.7*
- [x] `pyproject.toml`, `.env.example`, `.gitignore` — *Opus 4.7*
- [x] `AGENTS.md`, `README.md`, this sprint plan — *Opus 4.7*
- [x] `reasoning/trace_schema.py` — Pydantic models — *Opus 4.7*
- [x] `agents/base_agent.py` — AdalFlow Component pattern — *Opus 4.7*

### Day 3 (May 13) · MCP + first agent (TODAY)
- [x] `data/mcp_client.py` — unified MCP/HTTP wrapper — *Opus 4.7*
- [x] `agents/us_agent.py` — Financial Datasets MCP, end-to-end — *Opus 4.7*
- [x] `reasoning/hasher.py` — canonical SHA-256 — *Opus 4.7*
- [x] `reasoning/ipfs_pinner.py` — Pinata stub — *Opus 4.7*
- [x] `reasoning/arc_recorder.py` — web3.py stub — *Opus 4.7*
- [ ] First smoke test: US agent → thesis → hash → (mock) pin — *Sonnet 4.6*

### Day 4 (May 14) · Crypto agent + tests
- [ ] `agents/crypto_agent.py` — CoinGecko + DefiLlama MCP — *Sonnet 4.6*
- [ ] `tests/test_agents.py` baseline — *Sonnet 4.6*
- [ ] Unify MCP error handling — *Sonnet 4.6*

### Day 5–6 (May 15–16) · Chinese agent + Translator 🇨🇳
- [ ] `data/tushare_client.py` — *Sonnet 4.6*
- [ ] `agents/china_agent.py` — **DeepSeek V4 Pro, prompt in Chinese**
- [ ] `agents/translator_agent.py` — non-English thesis → PM question — *Sonnet 4.6*
- [ ] `markets/question_generator.py` — *Sonnet 4.6*

### Day 7 (May 17) · Reasoning pipeline real
- [ ] Real Pinata integration (replace stub) — *Sonnet 4.6*
- [ ] `workflows/research_pipeline.py` — end-to-end — *Sonnet 4.6*
- [ ] **Sprint 1 demo:** US + CN agent → real IPFS pin → hash logged — *Sonnet 4.6*

---

## SPRINT 2 — Blockchain + Polish (May 18–25) · "Make it real"

### Day 8–9 (May 18–19) · Smart contracts on Arc
- [ ] `contracts/ReasoningRegistry.sol` — *Opus 4.6*
- [ ] `contracts/RosettaToken.sol` (ERC-20) — *Opus 4.6*
- [ ] `contracts/PredictionMarket.sol` — *Opus 4.6*
- [ ] `contracts/PerformanceBond.sol` — *Opus 4.6*
- [ ] Foundry config + tests — *Opus 4.6*
- [ ] Deploy to Arc testnet — *Opus 4.6*
- [ ] Wire `arc_recorder.py` to real registry — *Sonnet 4.6*

### Day 10–11 (May 20–21) · Portfolio + markets engines
- [ ] `portfolio/all_weather.py` — risk parity, inverse-vol weighting — *Opus 4.6*
- [ ] `portfolio/risk_metrics.py` — Sharpe, Sortino, max DD — *Opus 4.6*
- [ ] `portfolio/rebalancer.py` — *Sonnet 4.6*
- [ ] `markets/betting_engine.py` — USDC staking — *Sonnet 4.6*
- [ ] `markets/slash_engine.py` — performance-bond decay — *Opus 4.6*

### Day 12–13 (May 22–23) · EU + JP agents + API
- [ ] `data/ecb_client.py` — *Sonnet 4.6*
- [ ] `agents/eu_agent.py` — *Sonnet 4.6*
- [ ] `agents/japan_agent.py` — **Gemini 3.1 Pro**
- [ ] `api/main.py` + all routes — *Sonnet 4.6*
- [ ] WebSocket for live agent output — *Sonnet 4.6*

### Day 14–15 (May 24–25) · Frontend + demo + submit
- [ ] React dashboard (agent cards, portfolio chart, trace explorer, market board) — *Gemini 3 Flash + Sonnet 4.6*
- [ ] AdalFlow Trainer pass — auto-optimize agent prompts — *Sonnet 4.6*
- [ ] Record demo video — *Mihai*
- [ ] Polish README + submit — *Mihai + Gemini 3 Flash*

---

## Stretch goals (only if ahead)
- [ ] StableFX integration (USDC ↔ EURC ↔ JPYC) — pending Anuhya/Circle access
- [ ] SignalFuse MCP for Hyperliquid whale signal
- [ ] Learn-to-Earn quizzes from agent theses
- [ ] Slashing oracle reading Hyperliquid leaderboard
