# Rosetta Alpha — Demo Video Script
**Runtime:** 3:00 | **Format:** Screen recording + voiceover | **Style:** Dark terminal aesthetic

---

## 0:00–0:25 — The Problem (25s)

**Visual:** Screen opens on the Rosetta Alpha hero page — "Enter Terminal." Quick montage of prediction market odds screens (Polymarket, Kalshi style).

**Narrator:**
> Prediction markets have a structural flaw. You see the bet. You see the odds. You never see *why* an agent called LONG on BTC or NEUTRAL on AAPL. The reasoning is invisible. You can't learn from it. You can't verify it. You can't improve from it.

**Visual:** Split screen — left side shows a black box with a question mark, right side shows the Trading-R1 paper cover.

> The Trading-R1 paper identified the core insight: the reasoning trace *is* the product, not the trade.

---

## 0:25–0:45 — Cambrian Network + LLM Clustering (20s) ⬅️ INSERT

**Visual:** Animated bar chart showing "Financial Agent Categories" — prediction market agents bar is tiny compared to DeFi agents, memecoin agents. Then a scatter plot showing all LLM models clustered together at the same point.

**Narrator:**
> Cambrian Network has tracked every financial agent for the past year. Their finding: prediction market agents are the most underserved category despite explosive growth in Polymarket and Kalshi. And there's a deeper problem — every major LLM gives near-identical financial advice when prompted generically. That clustering is the enemy of alpha.

**Visual:** Transition — zoom in on the scatter plot cluster, then fade to Rosetta Alpha's 5-desk layout.

---

## 0:45–1:15 — The Solution (30s)

**Visual:** Show the Architecture diagram (`docs/diagrams/architecture.svg`) with flowing arrows. Each desk lights up as mentioned.

**Narrator:**
> Rosetta Alpha is a multi-language, multi-model financial reasoning platform. Five regional agents — US, China, EU, Japan, Crypto — each running different models in different native languages. Every thesis is structured, hashed, pinned to IPFS, and recorded immutably on Arc L1. Then a prediction market opens on it. And an autonomous settler resolves it at expiry. No human in the loop.

**Visual:** Zoom into the on-chain section — show `ReasoningRegistry.sol`  → Arc TX hash → arcscan.app link.

> Arc's sub-cent fees make this economically viable. On Ethereum, publishing 50 thesis hashes a day would cost hundreds of dollars. On Arc, it's fifty cents.

---

## 1:15–1:35 — DeepSeek V4 Pro Mandarin Edge (20s) ⬅️ INSERT

**Visual:** Side-by-side comparison. Left: English LLM analysis of Kweichow Moutai showing generic "strong brand, growing market" text. Right: DeepSeek V4 Pro analysis showing PBOC policy references, retail churn metrics, cultural premium indicators — in Mandarin characters with English subtitles.

**Narrator:**
> DeepSeek V4 Pro reasoning about Kweichow Moutai in Mandarin produces structurally different analysis than any English model. It weights PBOC signaling, retail sentiment dynamics, and cultural premiums that English models systematically miss. That's not a translation trick. That's a real information edge.

**Visual:** The Mandarin analysis slides into the English analysis — they don't overlap, they coexist. Fade to the 5-desk regional map.

---

## 1:35–1:45 — The Dalio Connection (10s)

**Visual:** Show the Bridgewater All Weather portfolio — a pie chart divided into four economic regimes.

**Narrator:**
> The framework is Bridgewater's All Weather — diversified across economic regimes. But Rosetta diversifies across *languages and models*, not just asset classes.

---

## 1:45–2:05 — DeepMind AI Agent Traps Defense (20s) ⬅️ INSERT

**Visual:** Animated diagram showing a compromised agent (red glow). Arrows show: poisoned input → corrupted reasoning. Then the accountability loop kicks in — a shield icon with IPFS lock → Arc hash → bond slashed. Red glow extinguishes.

**Narrator:**
> The autonomous settler agent is also a defense against what DeepMind calls AI Agent Traps — data poisoning and manipulation. Every reasoning trace is pinned to IPFS and hashed on Arc. If an agent gets compromised, the evidence is permanent and the bond slashes automatically.

**Visual:** The red glow fades, replaced by a green checkmark overlay. Transition to the live dashboard.

---

## 2:05–2:45 — Live Walkthrough (40s)

**Visual:** Screen recording of the app. Start at `/desks` — show a thesis card with conviction meter. Click into a thesis — show the full reasoning trace.

**Narrator:**
> Here's a live thesis from the China desk. DeepSeek V4 Pro just analyzed Kweichow Moutai. You can read the full reasoning trace — `thought_process`, `confidence_score`, the sources cited. Scroll down — there's the SHA-256 hash, the IPFS CID, the Arc transaction. Every step is verifiable.

**Visual:** Navigate to `/quiz`. Pick an answer. Submit. Show the USDC reward confirmation.

> Users can then bet on whether the AI is right. Correct call → 0.5 USDC, settled directly on Arc via Circle Paymaster. No gas token. No wallet friction. Just USDC in, USDC out.

**Visual:** Flash to the `/leaderboard` — top users by accuracy and USDC earned. Then to `/registry` — the full on-chain ledger.

> The result: a learn-to-earn loop where understanding machine reasoning is the actual skill being rewarded.

---

## 2:45–3:00 — CTA + Submission (15s)

**Visual:** Return to the hero page. Text overlays appear: "Fully open source" → "Live on Vercel" → "Arc testnet chain 5042002."

**Narrator:**
> Rosetta Alpha is fully open source. The repo has everything — agents, contracts, training pipeline, frontend. Arc testnet is live at `0x0677...` — all four contracts verified. I'm Mihai Chindris, building for the Canteen × Arc Agora Agents Hackathon. Issues and feedback genuinely welcome.

**Visual:** Final frame — rosetta-alpha.vercel.app + GitHub QR code + "Agora Agents Hackathon · May 2026."

> The reasoning trace is the product. And it's now public.

---

## Appendix: Timing Summary

| Timestamp | Section | Duration |
|-----------|---------|----------|
| 0:00–0:25 | The Problem | 25s |
| **0:25–0:45** | **⬅️ Cambrian Network + LLM Clustering** | **20s** |
| 0:45–1:15 | The Solution | 30s |
| **1:15–1:35** | **⬅️ DeepSeek V4 Pro Mandarin Edge** | **20s** |
| 1:35–1:45 | The Dalio Connection | 10s |
| **1:45–2:05** | **⬅️ DeepMind AI Agent Traps** | **20s** |
| 2:05–2:45 | Live Walkthrough | 40s |
| 2:45–3:00 | CTA + Submission | 15s |
| | **Total** | **180s ✅** |

---

## Visual Asset Checklist

- [ ] Hero page "Enter Terminal" recording
- [ ] Polymarket/Kalshi market odds screens (stock footage or mock)
- [ ] Trading-R1 paper cover screenshot
- [ ] Cambrian Network-style bar chart (animated)
- [ ] LLM clustering scatter plot (animated)
- [ ] `docs/diagrams/architecture.svg` — high-res
- [ ] DeepSeek V4 Pro vs English LLM side-by-side
- [ ] Bridgewater All Weather pie chart
- [ ] Agent Traps shield animation (compromised → bond slashed)
- [ ] `/desks` → thesis detail → reasoning trace recording
- [ ] `/quiz` → answer → USDC reward recording
- [ ] `/leaderboard` and `/registry` screenshots
- [ ] Final frame with URL + QR code + hackathon credit
