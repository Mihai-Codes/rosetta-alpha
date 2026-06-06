from __future__ import annotations

import inspect

from agents.base_agent import RegionalAgent
from agents.japan_agent import JapanAgent, _JP_SYNTHESIS_TEMPLATE
from reasoning.trace_schema import AgentRole, Direction, ReasoningBlock


def _block(role: AgentRole, direction: Direction | None, confidence: float) -> ReasoningBlock:
    return ReasoningBlock(
        agent_role=role,
        input_data_summary="fixture",
        analysis=f"{role.value} analysis",
        conclusion=f"{direction or 'none'} conclusion",
        direction=direction,
        confidence=confidence,
        language="en",
    )


def test_debate_pairs_require_opposite_direction_and_material_signed_gap() -> None:
    fundamental = _block(AgentRole.FUNDAMENTAL_ANALYST, Direction.LONG, 0.61)
    technical = _block(AgentRole.TECHNICAL_ANALYST, Direction.SHORT, 0.62)
    sentiment = _block(AgentRole.SENTIMENT_ANALYST, Direction.LONG, 0.95)
    neutral = _block(AgentRole.MACRO_ANALYST, Direction.NEUTRAL, 0.99)

    pairs = RegionalAgent._debate_pairs([fundamental, technical, sentiment, neutral])

    assert pairs == [(fundamental, technical), (technical, sentiment)]


def test_debate_pairs_ignore_neutral_and_missing_direction() -> None:
    fundamental = _block(AgentRole.FUNDAMENTAL_ANALYST, Direction.NEUTRAL, 0.95)
    technical = _block(AgentRole.TECHNICAL_ANALYST, None, 0.95)

    assert RegionalAgent._debate_pairs([fundamental, technical]) == []


def test_japan_compact_synthesis_schema_mentions_debate_summary() -> None:
    init_source = inspect.getsource(JapanAgent.__init__)

    assert "debate_summary" in _JP_SYNTHESIS_TEMPLATE
    assert '"debate_summary"' in init_source
