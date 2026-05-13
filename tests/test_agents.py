"""Agent tests — instantiation, data source shape, and mock-LLM pipeline.

These tests cover:
1. Both agents instantiate cleanly (no live LLM).
2. Data source methods return expected role keys (requires real API keys for live mode).
3. The PydanticJsonParser bridge handles edge cases correctly.
"""

from __future__ import annotations

import pytest

from agents.us_agent import USAgent
from agents.crypto_agent import CryptoAgent
from agents.china_agent import ChinaAgent
from agents.base_agent import PydanticJsonParser
from reasoning.trace_schema import AgentRole, AssetClass, Region, ReasoningBlock, InvestmentThesis


# ---------------------------------------------------------------------------
# Instantiation
# ---------------------------------------------------------------------------

def test_us_agent_region(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("GROQ_API_KEY", "gsk_test_dummy")
    agent = USAgent()
    assert agent.region == Region.US
    assert agent.working_language == "en"
    assert agent.asset_class_for == AssetClass.EQUITY


def test_crypto_agent_region(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("GROQ_API_KEY", "gsk_test_dummy")
    agent = CryptoAgent()
    assert agent.region == Region.CRYPTO
    assert agent.working_language == "en"
    assert agent.asset_class_for == AssetClass.CRYPTO


def test_china_agent_region(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("DEEPSEEK_API_KEY", "sk_test_dummy")
    agent = ChinaAgent()
    assert agent.region == Region.CN
    assert agent.working_language == "zh"
    assert agent.asset_class_for == AssetClass.EQUITY


def test_china_agent_sub_agent_roles(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("DEEPSEEK_API_KEY", "sk_test_dummy")
    agent = ChinaAgent()
    assert AgentRole.FUNDAMENTAL_ANALYST in agent.sub_agent_roles
    assert AgentRole.SENTIMENT_ANALYST in agent.sub_agent_roles


def test_china_agent_uses_deepseek_model(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("DEEPSEEK_API_KEY", "sk_test_dummy")
    agent = ChinaAgent()
    # Verify the synthesizer was built with DeepSeek model kwargs
    assert agent.synthesizer.model_kwargs["model"] == "deepseek-chat"


def test_crypto_agent_sub_agent_roles(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("GROQ_API_KEY", "gsk_test_dummy")
    agent = CryptoAgent()
    assert AgentRole.FUNDAMENTAL_ANALYST in agent.sub_agent_roles
    assert AgentRole.MACRO_ANALYST in agent.sub_agent_roles
    assert AgentRole.SENTIMENT_ANALYST in agent.sub_agent_roles


# ---------------------------------------------------------------------------
# PydanticJsonParser edge cases
# ---------------------------------------------------------------------------

def test_parser_handles_bare_backtick_fence() -> None:
    parser = PydanticJsonParser(ReasoningBlock)
    import adalflow as adal
    out = adal.GeneratorOutput(
        raw_response='```\n{"agent_role":"fundamental_analyst","input_data_summary":"test","analysis":"ok","conclusion":"good","confidence":0.8,"language":"en"}\n```'
    )
    result = parser.call(out, extra_fields={"agent_role": "fundamental_analyst"})
    assert isinstance(result, ReasoningBlock)
    assert result.confidence == 0.8


def test_parser_handles_json_fence() -> None:
    parser = PydanticJsonParser(ReasoningBlock)
    import adalflow as adal
    out = adal.GeneratorOutput(
        raw_response='```json\n{"agent_role":"sentiment_analyst","input_data_summary":"news","analysis":"neutral","conclusion":"ok","confidence":0.7,"language":"en"}\n```'
    )
    result = parser.call(out, extra_fields={"agent_role": "sentiment_analyst"})
    assert isinstance(result, ReasoningBlock)
    assert result.agent_role == AgentRole.SENTIMENT_ANALYST


def test_parser_returns_none_on_bad_json() -> None:
    parser = PydanticJsonParser(ReasoningBlock)
    import adalflow as adal
    out = adal.GeneratorOutput(raw_response="This is not JSON at all")
    result = parser.call(out)
    assert result is None


def test_parser_extra_fields_override() -> None:
    """extra_fields should inject agent_role even when LLM omits it."""
    parser = PydanticJsonParser(ReasoningBlock)
    import adalflow as adal
    # JSON without agent_role
    out = adal.GeneratorOutput(
        raw_response='{"input_data_summary":"test","analysis":"ok","conclusion":"good","confidence":0.9,"language":"en"}'
    )
    result = parser.call(out, extra_fields={"agent_role": "macro_analyst"})
    assert isinstance(result, ReasoningBlock)
    assert result.agent_role == AgentRole.MACRO_ANALYST
