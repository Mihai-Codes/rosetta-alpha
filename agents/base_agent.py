"""Base class for all regional agents.

Each regional agent is an :class:`adal.Component` that:
1. Pulls locale-specific data via one or more MCP/HTTP clients.
2. Runs a chain of sub-agents (fundamental, technical, sentiment, macro,
   portfolio manager) — TradingAgents-style.
3. Synthesizes a structured :class:`InvestmentThesis`.

Subclasses override:
- :meth:`get_data_sources` — return the data the analyst sub-agents will see.
- :meth:`build_synthesis_prompt` — the portfolio-manager synthesis prompt.
- :attr:`region`, :attr:`working_language`, :attr:`default_model` — class attrs.

Why we use AdalFlow's Generator (not raw httpx → Anthropic):
- ``adal.Parameter`` wraps prompts so the AdalFlow Trainer can optimize them
  later via Textual Gradient Descent. Day-1 prompts are fine; Day-14 prompts
  will be auto-tuned.
- Provider-agnostic: swap Claude → DeepSeek for the China agent by changing
  ``model_client`` and ``model_kwargs``. No code changes downstream.
"""

from __future__ import annotations

import logging
from abc import abstractmethod
from typing import Any

import os

import adalflow as adal

from reasoning.trace_schema import (
    AgentRole,
    AssetClass,
    Direction,
    InvestmentThesis,
    LangCode,
    ReasoningBlock,
    Region,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Prompts — baseline (open-source). Optimized variants live in prompts/optimized/
# (gitignored) per the Warp playbook in AGENTS.md §5.
# ---------------------------------------------------------------------------

SUB_AGENT_TEMPLATE = """\
You are the {{ role }} for the {{ region }} desk at Rosetta Alpha.
Working language: {{ language }}.

Subject: {{ ticker }} ({{ asset_class }})

Available data:
{{ data_summary }}

Produce a JSON object with these fields:
- input_data_summary: short description of what you used
- analysis: your reasoning IN {{ language }}
- analysis_en: English translation (omit if language is 'en')
- conclusion: one-sentence bottom line
- confidence: 0.0–1.0
- language: '{{ language }}'

{{ output_format_str }}
"""

SYNTHESIS_TEMPLATE = """\
You are the portfolio manager for the {{ region }} desk.
You receive analyst reports below. Synthesize them into a single
InvestmentThesis. Be honest about disagreements — surface them in risk_factors.

Subject: {{ ticker }} ({{ asset_class }})
Working language: {{ language }}

Analyst reports:
{{ analyst_reports }}

{{ output_format_str }}
"""


# ---------------------------------------------------------------------------
# Base agent
# ---------------------------------------------------------------------------


class RegionalAgent(adal.Component):
    """Abstract base. Subclass per region (US, CN, EU, JP, CRYPTO)."""

    # Class-level attributes — subclass overrides
    region: Region
    working_language: LangCode = "en"
    # Default to Groq (free tier, zero local compute) when running outside AdaL CLI.
    # Override in subclass for region-specific routing (e.g. DeepSeek for CN agent).
    default_model_client: type[adal.ModelClient] = adal.GroqAPIClient  # type: ignore[attr-defined]
    default_model_kwargs: dict[str, Any] = {"model": "llama-3.3-70b-versatile"}
    sub_agent_roles: tuple[AgentRole, ...] = (
        AgentRole.FUNDAMENTAL_ANALYST,
        AgentRole.TECHNICAL_ANALYST,
        AgentRole.SENTIMENT_ANALYST,
    )

    def __init__(
        self,
        *,
        model_client: adal.ModelClient | None = None,
        model_kwargs: dict[str, Any] | None = None,
    ) -> None:
        super().__init__()

        client = model_client or self.default_model_client()
        kwargs = model_kwargs or self.default_model_kwargs

        # Sub-agent generator — one Generator instance, called per role.
        self.sub_agent = adal.Generator(
            model_client=client,
            model_kwargs=kwargs,
            template=SUB_AGENT_TEMPLATE,
            output_processors=adal.JsonOutputParser(data_class=ReasoningBlock),  # type: ignore[arg-type]
        )

        # Synthesis generator — emits the full InvestmentThesis.
        self.synthesizer = adal.Generator(
            model_client=client,
            model_kwargs=kwargs,
            template=SYNTHESIS_TEMPLATE,
            output_processors=adal.JsonOutputParser(data_class=InvestmentThesis),  # type: ignore[arg-type]
        )

    # -- subclass contract --------------------------------------------------

    @abstractmethod
    async def get_data_sources(self, ticker: str) -> dict[AgentRole, str]:
        """Return ``{role: data_summary_string}`` for each sub-agent role.

        Each sub-agent sees only its own slice — fundamental gets filings,
        technical gets price/indicator data, sentiment gets news, etc.
        """

    @property
    @abstractmethod
    def asset_class_for(self) -> AssetClass:
        """Default asset class for this region. Override in subclass."""

    # -- main entry point ---------------------------------------------------

    async def analyze(self, ticker: str) -> InvestmentThesis:
        """Run the full pipeline → return a structured thesis."""
        logger.info("Analyzing %s on %s desk", ticker, self.region.value)

        data_by_role = await self.get_data_sources(ticker)

        # 1. Run each sub-agent in parallel could be a future optimization.
        #    Sequential for now — easier to debug and AdalFlow's Trainer wants
        #    deterministic ordering for textual-gradient computation.
        blocks: list[ReasoningBlock] = []
        for role in self.sub_agent_roles:
            data_summary = data_by_role.get(role, "(no data routed to this sub-agent)")
            block_output = self.sub_agent(
                prompt_kwargs={
                    "role": role.value,
                    "region": self.region.value,
                    "language": self.working_language,
                    "ticker": ticker,
                    "asset_class": self.asset_class_for.value,
                    "data_summary": data_summary,
                }
            )
            block = block_output.data
            if not isinstance(block, ReasoningBlock):
                raise RuntimeError(f"{role} sub-agent returned non-ReasoningBlock: {block!r}")
            blocks.append(block)

        # 2. Portfolio-manager synthesis.
        analyst_reports = "\n\n".join(
            f"[{b.agent_role.value}]\n{b.analysis}\nConclusion: {b.conclusion} (conf={b.confidence:.2f})"
            for b in blocks
        )
        thesis_output = self.synthesizer(
            prompt_kwargs={
                "region": self.region.value,
                "language": self.working_language,
                "ticker": ticker,
                "asset_class": self.asset_class_for.value,
                "analyst_reports": analyst_reports,
            }
        )
        thesis = thesis_output.data
        if not isinstance(thesis, InvestmentThesis):
            raise RuntimeError(f"Synthesizer returned non-InvestmentThesis: {thesis!r}")

        # 3. Splice the sub-agent blocks back in (synthesizer may have summarized them).
        if not thesis.reasoning_blocks:
            thesis = thesis.model_copy(update={"reasoning_blocks": blocks})

        # 4. Defensive: ensure region/language match what we configured.
        return thesis.model_copy(
            update={
                "region": self.region,
                "working_language": self.working_language,
                "asset_class": thesis.asset_class or self.asset_class_for,
            }
        )

    # Convenience for callers that don't need a thesis, just a direction.
    async def quick_signal(self, ticker: str) -> Direction:
        thesis = await self.analyze(ticker)
        return thesis.direction
