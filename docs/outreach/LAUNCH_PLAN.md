# Rosetta Alpha — Launch & Outreach Plan
**Go-live: Monday May 18, 2026** (Week 2 of Agora Agents Hackathon)
**POC**: mihai_chindris
**Goal**: Real user traction + on-chain tx evidence before May 25 submission deadline

---

## Why Monday May 18?

Week 1 (May 11–17) = build. Week 2 (May 18–25) = traction. Judges explicitly weight traction at **30%** and want "real users, real transactions during the event window." We post when the window matters most.

---

## Platform Strategy

### Discord `#agora-hackers` — post TODAY (takes 2 min, judges read this)

This is not where users come from — it's where **credibility is established**. Judges and Aadi are there. Drop one line + GitHub link.

```
Building Rosetta Alpha — a multi-language AI financial research agent that hashes
reasoning traces on Arc + opens prediction markets on its own theses.
Live E2E demo: US/CN/EU/JP/Crypto desks → IPFS → on-chain accountability loop.
GitHub: [link] — feedback and issues very welcome 🌐
```

---

### X / Twitter — PRIMARY traction channel (Monday May 18)

**Tone reference: @tomas_hk (NotDiamond CEO)**
- Lead with the result / bold claim, not preamble
- Concrete numbers in the first sentence
- Short sentences. No fluff.
- Minimal emojis — 1–2 max, functional not decorative
- Thread format (1/n) for technical depth
- Show don't tell — demo/screenshot first

**Launch thread (1/5):**

```
We built an AI that publishes its reasoning on-chain before the trade.

Rosetta Alpha analyzes 5 markets simultaneously (US, CN, EU, JP, Crypto),
pins the full reasoning trace to IPFS, and opens a prediction market
staking tokens on its own thesis.

Wrong prediction → bond slashed. Correct → rewarded. No hiding.
```

```
The accountability loop:

Analyze → IPFS pin → stake ROSETTA → record on Arc → PredictionMarket
→ autonomous settler resolves + settles at horizon

All permissionless. All on-chain. Every reasoning step
that led to every trade is publicly verifiable. (2/5)
```

```
Why this matters: LLMs give confident-sounding financial analysis
with zero accountability.

We fix that by making every prediction a skin-in-the-game bet.
The agent's bond gets slashed if it's wrong. (3/5)
```

```
Stack:
• AdalFlow — multi-agent orchestration
• DeepSeek R1 — chain-of-thought reasoning traces
• Claude Sonnet — synthesis + architecture
• Arc testnet — on-chain recording + market settlement
• Circle Paymaster — gasless USDC tx UX
• React dashboard with live R1 trace explorer (4/5)
```

```
Live demo + full source: [GitHub link]

Built for @thecanteenapp Agora Agents Hackathon.
Issues and feedback genuinely welcome — shipping daily. (5/5)
```

---

### LinkedIn — SECONDARY channel (same day, Monday May 18)

Same punchy opener but add one personal story hook sentence.
Slightly more narrative. Still no waffle intro.

```
I wanted to know if an AI trading agent was genuinely confident — or just loud.

So we built one that bets on itself.

Rosetta Alpha is a multi-language AI financial research platform that:
• Analyzes 5 global markets in parallel (US, CN, EU, JP, Crypto)
• Publishes its full reasoning trace to IPFS — verifiable, permanent
• Hashes that trace on Arc blockchain before any trade
• Opens a prediction market staking ROSETTA tokens on its own thesis

Wrong prediction? Bond slashed. Correct? Rewarded. Permissionless settlement.

The reasoning trace is the product.
Arc makes it affordable to publish (~$0.01/tx).
DeepSeek R1 makes the trace worth reading.

Full source + live demo: [GitHub link]

Built during the Agora Agents Hackathon (Canteen × Circle × Arc).
Issues and feedback genuinely welcome — link in comments.
```

---

## "PRs Welcome" — Honest Answer: No. Issues Only.

**Use: "Issues and feedback genuinely welcome"**

Here's the brutal truth:
1. **Issues** = you want signal from users = legitimate traction evidence for judges
2. **PRs welcome** = implies you're ready to review + merge code from strangers = unrealistic in a 2-week hackathon with a fast-moving live codebase
3. Cold-outreach PRs create obligation and noise during the exact window you need to be shipping
4. Your LinkedIn/X audience = curious developers and potential users, **not** open-source maintainers looking for a project to maintain

Post-hackathon, if you continue: add `CONTRIBUTING.md`, then say "PRs welcome." Not now.

---

## Posting Schedule

| Date | Action | Platform |
|------|--------|----------|
| **May 15 (today)** | Drop link in `#agora-hackers` | Canteen Discord |
| **May 18 (Monday)** | Launch thread | X / Twitter |
| **May 18 (Monday)** | Launch post | LinkedIn |
| **May 21 (Thursday)** | ⚠️ Set Polymarket **maker fee to 25 bps** (cooldown lifts 22:41 UTC) | polymarket.com/settings?tab=builder |
| **May 19–22** | Reply to comments, share user feedback snippets | Both |
| **May 22–24** | Final push: "3 days left — here's what users taught us" | X |
| **May 25** | Submit | forms.gle/hFPM2t4Jt1zGfqzM7 |

---

## Submission Checklist (May 25)

- [ ] GitHub repo public, clean README
- [ ] Live demo — hosted or Loom walkthrough
- [ ] Arc on-chain TX links (arcscan.app)
- [ ] Traction numbers (stars, issues, demo runs)
- [ ] Circle tool usage documented (Arc + Paymaster)
- [ ] Submit: https://forms.gle/hFPM2t4Jt1zGfqzM7

---

## Judging Alignment

| Criterion (weight) | Our angle |
|--------------------|-----------|
| Agentic Sophistication (30%) | Fully autonomous: analyze → stake → record → market → settle. No human in the loop. |
| Traction (30%) | Real on-chain txns + GitHub issues + demo runs from outreach |
| Circle Tool Usage (20%) | Arc contracts + Circle Paymaster gasless USDC tx UX |
| Innovation (20%) | We literally built Research Note #1 from the hackathon page — "Trading-R1 traces as the product" |

---

*"All things that are exchanged must be somehow comparable." — Aristotle*
