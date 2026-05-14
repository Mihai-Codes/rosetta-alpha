"""Distil accumulated text-grad feedback into permanent LEARNED_GUIDELINES.

Reads  training/feedback_cache.json  (ephemeral, gitignored)
Writes training/learned_guidelines.json  (committed, loaded by agents at startup)

Usage:
    uv run python -m training.bake_feedback
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
from pathlib import Path

import httpx
from dotenv import load_dotenv

load_dotenv(override=True)

logger = logging.getLogger(__name__)

_CACHE_PATH = Path(__file__).parent / "feedback_cache.json"
_OUTPUT_PATH = Path(__file__).parent / "learned_guidelines.json"

_DISTIL_PROMPT = """\
You are a prompt-engineering expert distilling iterative LLM feedback into permanent guidelines.

Below is accumulated text-gradient feedback for the '{region}' investment desk, collected over
multiple optimization rounds. Your job: extract the 3 most important, actionable, non-redundant
instructions that should be permanently added to the analyst prompt for this desk.

Rules:
- Each guideline must be a single imperative sentence (≤25 words).
- Focus on WHAT to include, not what was wrong.
- Remove CRITICAL OVERRIDE instructions (those are runtime, not template-level).
- Remove API-error lines.
- Output ONLY a JSON array of 3 strings, no prose.

Feedback to distil:
{feedback}

Output format: ["guideline 1", "guideline 2", "guideline 3"]
"""

_GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"


async def distil_region(client: httpx.AsyncClient, region: str, feedback: str) -> list[str]:
    """Call Gemini Flash Lite to distil feedback into 3 crisp guidelines."""
    api_key = os.environ.get("GEMINI_API_KEY", "")
    if not api_key:
        logger.error("GEMINI_API_KEY not set — cannot distil feedback")
        return []

    prompt = _DISTIL_PROMPT.format(region=region, feedback=feedback)
    payload = {
        "model": "gemini-3.1-flash-lite",
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": 512,
        "temperature": 0.1,
    }
    try:
        resp = await client.post(
            _GEMINI_URL,
            json=payload,
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=30,
        )
        resp.raise_for_status()
        raw = resp.json()["choices"][0]["message"]["content"].strip()
        # Strip markdown code fences if present
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        guidelines = json.loads(raw)
        assert isinstance(guidelines, list) and len(guidelines) > 0
        logger.info("Distilled %d guidelines for '%s'", len(guidelines), region)
        return guidelines
    except Exception as exc:
        logger.error("Distil failed for '%s': %s", region, exc)
        return []


async def bake() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s: %(message)s",
    )

    if not _CACHE_PATH.exists():
        logger.error("feedback_cache.json not found at %s — run a sweep first", _CACHE_PATH)
        return

    cache: dict[str, str] = json.loads(_CACHE_PATH.read_text())
    logger.info("Loaded feedback cache: %d regions", len(cache))

    # Load existing guidelines so we can merge/update rather than overwrite
    existing: dict[str, list[str]] = {}
    if _OUTPUT_PATH.exists():
        existing = json.loads(_OUTPUT_PATH.read_text())
        logger.info("Loaded existing learned_guidelines.json (%d regions)", len(existing))

    async with httpx.AsyncClient() as client:
        tasks = {region: distil_region(client, region, feedback)
                 for region, feedback in cache.items()}
        results: dict[str, list[str]] = {}
        for region, coro in tasks.items():
            results[region] = await coro

    # Merge: new distilled guidelines replace old for regions present in cache
    merged = {**existing, **{r: g for r, g in results.items() if g}}

    _OUTPUT_PATH.write_text(json.dumps(merged, indent=2, ensure_ascii=False))
    logger.info("Saved learned_guidelines.json — %d regions", len(merged))

    print("\n===== BAKED GUIDELINES =====")
    for region, guidelines in merged.items():
        print(f"\n[{region.upper()}]")
        for i, g in enumerate(guidelines, 1):
            print(f"  {i}. {g}")
    print("\n✅ Agents will load these at startup automatically.")


def run() -> None:
    asyncio.run(bake())


if __name__ == "__main__":
    run()
