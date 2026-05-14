"""AdalFlow Trainer — prompt optimization for regional agents.

Uses DeepSeek V3 (deepseek-chat, non-thinking mode) as a cheap LLM judge
to score InvestmentThesis quality and iteratively improve the synthesis prompt.

Architecture:
- Teacher (judge):  DeepSeek V3 / deepseek-chat — evaluates thesis quality cheaply.
- Student (agent):  Any RegionalAgent — whose synthesis prompt is being tuned.
- Dataset:          A curated set of (ticker, ground_truth_direction) examples.
- Metric:           Direction accuracy + confidence calibration score.

Run standalone:
    DEEPSEEK_API_KEY=xxx uv run python -m training.prompt_optimizer --agent us --rounds 3

References:
- AdalFlow Trainer docs: https://adalflow.sylph.ai/tutorials/trainer.html
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
from dataclasses import dataclass
from typing import Any

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Judge model — DeepSeek (cheapest, fastest for scoring loops)
# ---------------------------------------------------------------------------

_JUDGE_BASE_URL = "https://api.deepseek.com/v1"
# Default judge: Groq Llama (free tier). Override JUDGE_MODEL env var.
# Prefix with "groq/" to use Groq; bare name = DeepSeek (requires balance).
_JUDGE_MODEL = os.environ.get("JUDGE_MODEL", "groq/llama-3.3-70b-versatile")

_JUDGE_TEMPLATE = """\
You are an expert financial analyst evaluating the quality of an AI-generated
investment thesis. Score it on the following criteria (0–10 each):

1. **Direction Accuracy**: Does the direction match the ground truth? 10=exact, 5=neutral, 0=opposite.
2. **Reasoning Quality**: Are the reasoning blocks specific, data-grounded, and non-generic?
3. **Confidence Calibration**: Is the confidence score plausible given the evidence?
4. **Risk Completeness**: Are meaningful risks identified (not boilerplate)?
5. **English Clarity**: Is thesis_summary_en clear and precise?

Thesis JSON:
{{thesis_json}}

Ground truth direction (if known): {{ground_truth}}

Output MUST be strictly JSON with ALL these fields:
{
  "direction_accuracy": <0-10>,
  "reasoning_quality": <0-10>,
  "confidence_calibration": <0-10>,
  "risk_completeness": <0-10>,
  "english_clarity": <0-10>,
  "overall": <0-10>,
  "critique": "<2 sentence critique>",
  "suggested_improvement": "<1 sentence prompt fix targeting the weakest dimension>",
  "recommended_direction": "<LONG|SHORT|NEUTRAL — what direction the data actually supports>",
  "direction_mismatch": <true if thesis direction contradicts ground truth or internal evidence, else false>
}\
"""


# ---------------------------------------------------------------------------
# Training data
# ---------------------------------------------------------------------------


@dataclass
class TrainingExample:
    """A single labeled training example for prompt optimization."""
    ticker: str
    region: str                     # "us" | "cn" | "jp" | "eu" | "crypto"
    ground_truth_direction: str     # "LONG" | "SHORT" | "NEUTRAL"
    notes: str = ""


# Default curated dataset — extend with real live-run traces.
DEFAULT_DATASET: list[TrainingExample] = [
    TrainingExample("AAPL",      "us",     "LONG",    "Strong cash flow, services growth"),
    TrainingExample("NVDA",      "us",     "LONG",    "AI capex supercycle"),
    TrainingExample("600519.SH", "cn",     "LONG",    "Baijiu dominant brand, pricing power"),
    TrainingExample("BTC",       "crypto", "LONG",    "ETF inflows, halving cycle"),
    TrainingExample("7203.T",    "jp",     "NEUTRAL", "Yen sensitivity, EV transition risk"),
    TrainingExample("MC.PA",     "eu",     "LONG",    "Luxury demand resilience, China recovery"),
]


# ---------------------------------------------------------------------------
# Scorer
# ---------------------------------------------------------------------------


@dataclass
class ThesisScore:
    direction_accuracy: float
    reasoning_quality: float
    confidence_calibration: float
    risk_completeness: float
    english_clarity: float
    overall: float
    critique: str
    suggested_improvement: str
    # Structured text-grad fields — from upgraded judge prompt
    recommended_direction: str = ""      # LONG | SHORT | NEUTRAL
    direction_mismatch: bool = False     # True if thesis direction is inconsistent

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> "ThesisScore":
        return cls(
            direction_accuracy=float(d.get("direction_accuracy", 0)),
            reasoning_quality=float(d.get("reasoning_quality", 0)),
            confidence_calibration=float(d.get("confidence_calibration", 0)),
            risk_completeness=float(d.get("risk_completeness", 0)),
            english_clarity=float(d.get("english_clarity", 0)),
            overall=float(d.get("overall", 0)),
            critique=str(d.get("critique", "")),
            suggested_improvement=str(d.get("suggested_improvement", "")),
            recommended_direction=str(d.get("recommended_direction", "")),
            direction_mismatch=bool(d.get("direction_mismatch", False)),
        )

    @property
    def composite(self) -> float:
        """Weighted composite: direction 30%, reasoning 25%, others 15% each."""
        return (
            self.direction_accuracy    * 0.30
            + self.reasoning_quality   * 0.25
            + self.confidence_calibration * 0.15
            + self.risk_completeness   * 0.15
            + self.english_clarity     * 0.15
        )


def _build_judge_prompt(thesis_json: str, ground_truth: str) -> str:
    """Render the judge prompt directly — no template engine involved."""
    return (
        _JUDGE_TEMPLATE
        .replace("{{thesis_json}}", thesis_json[:3000])
        .replace("{{ground_truth}}", ground_truth)
    )


async def _call_judge_direct(prompt: str, model: str, api_key: str, base_url: str) -> str:
    """Make a direct OpenAI-compatible chat completion call and return raw text.

    Retries on 429 (rate limit) with exponential backoff up to 3 attempts.
    """
    import asyncio
    import httpx

    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    payload = {
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.1,
        "max_tokens": 512,
    }
    max_retries = 3
    for attempt in range(max_retries):
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(f"{base_url}/chat/completions", json=payload, headers=headers)
            if resp.status_code == 429 and attempt < max_retries - 1:
                wait = 2 ** (attempt + 2)  # 4s, 8s, 16s
                logger.warning("Judge hit 429 rate limit — retrying in %ds (attempt %d/%d)", wait, attempt + 1, max_retries)
                await asyncio.sleep(wait)
                continue
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"]
    raise RuntimeError("Judge failed after max retries")


async def score_thesis(
    thesis_json: str,
    ground_truth: str,
    *,
    judge_client: Any = None,  # kept for API compat but unused in direct mode
) -> ThesisScore:
    """Score a thesis by calling the judge directly (no AdalFlow Generator)."""
    judge_model_str = os.environ.get("JUDGE_MODEL", _JUDGE_MODEL)
    prompt = _build_judge_prompt(thesis_json, ground_truth)

    try:
        if judge_model_str.startswith("groq/"):
            api_key = os.environ.get("GROQ_API_KEY", "")
            if not api_key:
                logger.warning("GROQ_API_KEY not set — returning zero score")
                return ThesisScore(0, 0, 0, 0, 0, 0, "No API key", "Set GROQ_API_KEY")
            model = judge_model_str.removeprefix("groq/")
            raw = await _call_judge_direct(prompt, model, api_key, "https://api.groq.com/openai/v1")
        elif judge_model_str.startswith("gemini/"):
            api_key = os.environ.get("GEMINI_API_KEY", "")
            if not api_key:
                logger.warning("GEMINI_API_KEY not set — returning zero score")
                return ThesisScore(0, 0, 0, 0, 0, 0, "No API key", "Set GEMINI_API_KEY")
            model = judge_model_str.removeprefix("gemini/")
            raw = await _call_judge_direct(
                prompt, model, api_key,
                "https://generativelanguage.googleapis.com/v1beta/openai"
            )
        else:
            api_key = os.environ.get("DEEPSEEK_API_KEY", "")
            if not api_key:
                logger.warning("DEEPSEEK_API_KEY not set — returning zero score")
                return ThesisScore(0, 0, 0, 0, 0, 0, "No API key", "Set DEEPSEEK_API_KEY")
            raw = await _call_judge_direct(prompt, judge_model_str, api_key, _JUDGE_BASE_URL)
    except Exception as exc:
        logger.warning("Judge API call failed: %s", exc)
        return ThesisScore(0, 0, 0, 0, 0, 0, str(exc)[:100], "API error")

    raw = raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()

    try:
        parsed = json.loads(raw)
        return ThesisScore.from_dict(parsed)
    except json.JSONDecodeError:
        logger.warning("Judge returned non-JSON: %s", raw[:200])
        return ThesisScore(0, 0, 0, 0, 0, 0, raw[:100], "Parse error")


# ---------------------------------------------------------------------------
# Optimization loop
# ---------------------------------------------------------------------------


@dataclass
class OptimizationResult:
    round_num: int
    avg_composite: float
    scores: list[ThesisScore]
    critiques: list[str]
    suggested_improvements: list[str]
    # Text-grad: aggregated suggestions per region, ready to inject next round.
    feedback_by_region: dict[str, str] = None  # type: ignore[assignment]

    def __post_init__(self) -> None:
        if self.feedback_by_region is None:
            self.feedback_by_region = {}


async def run_optimization_round(
    examples: list[TrainingExample],
    *,
    round_num: int = 1,
    feedback_by_region: dict[str, str] | None = None,
) -> OptimizationResult:
    """Analyze all examples → judge each thesis → aggregate scores.

    Args:
        examples: Training examples to evaluate.
        round_num: Current round number (for logging).
        feedback_by_region: Map of region → aggregated prior feedback string.
            When provided, each agent's synthesis prompt receives the
            text-grad suggestions from the previous round so it can improve.
    """
    from portfolio.engine import _build_agent

    feedback_by_region = feedback_by_region or {}
    scores: list[ThesisScore] = []
    critiques: list[str] = []
    improvements: list[str] = []
    # Collect new feedback keyed by region for the *next* round.
    new_feedback: dict[str, list[str]] = {}

    for ex in examples:
        logger.info("[Round %d] Analyzing %s/%s…", round_num, ex.ticker, ex.region)
        try:
            agent = _build_agent(ex.region)
            prior_feedback = feedback_by_region.get(ex.region, "")
            if prior_feedback:
                logger.info("[Round %d] %s/%s injecting prior feedback (%d chars)",
                            round_num, ex.ticker, ex.region, len(prior_feedback))
            thesis = await agent.analyze(ex.ticker, prior_feedback=prior_feedback)
            thesis_json = thesis.model_dump_json(indent=2, ensure_ascii=False)

            score = await score_thesis(thesis_json, ex.ground_truth_direction)
            scores.append(score)
            critiques.append(score.critique)
            improvements.append(score.suggested_improvement)

            # Build text-grad feedback — prepend hard direction override when mismatch detected.
            feedback_line = score.suggested_improvement
            if score.direction_mismatch and score.recommended_direction:
                feedback_line = (
                    f"CRITICAL OVERRIDE: Set direction='{score.recommended_direction}' "
                    f"— current direction contradicts the evidence. "
                    f"{score.suggested_improvement}"
                )
                logger.info(
                    "[Round %d] %s/%s direction mismatch → override to %s",
                    round_num, ex.ticker, ex.region, score.recommended_direction,
                )
            new_feedback.setdefault(ex.region, []).append(feedback_line)

            logger.info(
                "[Round %d] %s/%s → composite=%.2f/10  dir_acc=%.1f  | %s",
                round_num, ex.ticker, ex.region,
                score.composite, score.direction_accuracy,
                score.critique[:80],
            )
        except Exception as exc:
            logger.warning("[Round %d] %s/%s failed: %s", round_num, ex.ticker, ex.region, exc)

    avg = sum(s.composite for s in scores) / len(scores) if scores else 0.0
    logger.info("[Round %d] ── Average composite: %.2f/10 ──", round_num, avg)

    return OptimizationResult(
        round_num=round_num,
        avg_composite=avg,
        scores=scores,
        critiques=critiques,
        suggested_improvements=improvements,
        feedback_by_region={
            region: "\n".join(f"- {s}" for s in suggestions)
            for region, suggestions in new_feedback.items()
        },
    )


# ---------------------------------------------------------------------------
# Feedback persistence — survives CLI restarts, accumulates across days
# ---------------------------------------------------------------------------

_FEEDBACK_CACHE_PATH = os.path.join(
    os.path.dirname(__file__), "feedback_cache.json"
)


def load_feedback_cache() -> dict[str, str]:
    """Load persisted text-grad feedback from disk.

    Returns an empty dict if the cache doesn't exist yet.
    """
    if not os.path.exists(_FEEDBACK_CACHE_PATH):
        return {}
    try:
        with open(_FEEDBACK_CACHE_PATH, encoding="utf-8") as fh:
            data = json.load(fh)
        logger.info("Loaded feedback cache: %d regions — %s",
                    len(data), list(data.keys()))
        return data
    except Exception as exc:
        logger.warning("Could not load feedback cache: %s — starting fresh", exc)
        return {}


def save_feedback_cache(feedback_by_region: dict[str, str]) -> None:
    """Persist text-grad feedback to disk so it survives restarts."""
    try:
        with open(_FEEDBACK_CACHE_PATH, "w", encoding="utf-8") as fh:
            json.dump(feedback_by_region, fh, ensure_ascii=False, indent=2)
        logger.info("Saved feedback cache: %d regions → %s",
                    len(feedback_by_region), _FEEDBACK_CACHE_PATH)
    except Exception as exc:
        logger.warning("Could not save feedback cache: %s", exc)


async def run_trainer(
    rounds: int = 3,
    examples: list[TrainingExample] | None = None,
    resume: bool = True,
) -> list[OptimizationResult]:
    """Run the full optimization loop for *rounds* iterations.

    Each round: run agents → score theses → log critique + suggestions.
    Feedback is persisted to disk and loaded on the next run (text-grad
    accumulates across days, not just within a single CLI invocation).

    Args:
        rounds: Number of optimization rounds to run.
        examples: Training examples. Defaults to DEFAULT_DATASET.
        resume: If True (default), load prior feedback from disk and carry
                it forward. Set False to start from a clean slate.
    """
    dataset = examples or DEFAULT_DATASET
    results: list[OptimizationResult] = []

    # Load prior feedback from disk (survives restarts).
    feedback_by_region: dict[str, str] = load_feedback_cache() if resume else {}
    if feedback_by_region:
        logger.info("Resuming with persisted feedback for: %s", list(feedback_by_region.keys()))

    for r in range(1, rounds + 1):
        result = await run_optimization_round(
            dataset, round_num=r, feedback_by_region=feedback_by_region
        )
        results.append(result)
        # Carry feedback forward: merge new suggestions into accumulator.
        for region, fb in result.feedback_by_region.items():
            if region in feedback_by_region:
                feedback_by_region[region] = feedback_by_region[region] + "\n" + fb
            else:
                feedback_by_region[region] = fb
        if feedback_by_region:
            logger.info("[Round %d] Text-grad feedback accumulated for: %s",
                        r, list(feedback_by_region.keys()))
        # Persist after every round — partial runs are not lost.
        save_feedback_cache(feedback_by_region)

        if result.suggested_improvements:
            logger.info(
                "[Round %d] Improvement suggestions:\n  %s",
                r,
                "\n  ".join(f"- {s}" for s in result.suggested_improvements[:3]),
            )

    scores_trend = " → ".join(f"{r.avg_composite:.2f}" for r in results)
    logger.info("Training complete. Composite by round: %s", scores_trend)
    return results


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


async def _main() -> None:
    import argparse

    parser = argparse.ArgumentParser(description="AdalFlow prompt optimizer for Rosetta agents.")
    parser.add_argument("--rounds", type=int, default=2, help="Optimization rounds (default: 2)")
    parser.add_argument(
        "--agent", choices=["us", "cn", "jp", "eu", "crypto", "all"], default="all",
        help="Which desk to optimize (default: all)",
    )
    parser.add_argument("--verbose", action="store_true")
    parser.add_argument(
        "--no-resume", action="store_true",
        help="Ignore persisted feedback cache and start from scratch",
    )
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )

    dataset = DEFAULT_DATASET
    if args.agent != "all":
        dataset = [ex for ex in DEFAULT_DATASET if ex.region == args.agent]
        if not dataset:
            parser.error(f"No examples for region {args.agent!r}")

    results = await run_trainer(
        rounds=args.rounds,
        examples=dataset,
        resume=not args.no_resume,
    )

    print("\n" + "=" * 60)
    print("OPTIMIZATION SUMMARY")
    print("=" * 60)
    for r in results:
        print(f"Round {r.round_num}: avg={r.avg_composite:.2f}/10  examples={len(r.scores)}")
        for imp in r.suggested_improvements[:2]:
            print(f"  → {imp}")


if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv()
    asyncio.run(_main())
