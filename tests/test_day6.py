"""Day 6 tests — TranslatorAgent and QuestionGenerator pipeline."""

from __future__ import annotations

import pytest
import adalflow as adal

from reasoning.trace_schema import (
    AgentRole, AssetClass, Direction, InvestmentThesis,
    PredictionMarketQuestion, Region,
)
from agents.translator_agent import TranslatorAgent
from agents.base_agent import PydanticJsonParser


# ---------------------------------------------------------------------------
# TranslatorAgent instantiation
# ---------------------------------------------------------------------------

def test_translator_agent_instantiates(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("GROQ_API_KEY", "gsk_test_dummy")
    agent = TranslatorAgent()
    assert agent._model_name == "llama-3.3-70b-versatile"


def test_translator_agent_custom_model(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("GROQ_API_KEY", "gsk_test_dummy")
    agent = TranslatorAgent(model_kwargs={"model": "gemma2-9b-it", "temperature": 0.0, "max_tokens": 512})
    assert agent._model_name == "gemma2-9b-it"


# ---------------------------------------------------------------------------
# PydanticJsonParser handles PredictionMarketQuestion
# ---------------------------------------------------------------------------

def _make_thesis() -> InvestmentThesis:
    return InvestmentThesis(
        ticker_or_asset="AAPL",
        region=Region.US,
        asset_class=AssetClass.EQUITY,
        direction=Direction.LONG,
        confidence_score=0.80,
        time_horizon_days=90,
        thesis_summary_en="Apple shows strong iPhone 17 cycle and AI monetisation tailwinds.",
        risk_factors=["Fed rate hike risk", "China sales slowdown"],
        data_sources_used=["mcp:financial-datasets/get_earnings"],
        working_language="en",
    )


def test_prediction_market_question_parser_round_trip() -> None:
    """PydanticJsonParser can parse a well-formed PredictionMarketQuestion JSON."""
    from datetime import datetime, timezone

    parser = PydanticJsonParser(PredictionMarketQuestion)
    thesis = _make_thesis()
    raw_json = (
        '{"question_text": "Will AAPL close above $200 before 2026-08-01?", '
        '"resolution_criteria": "YES if AAPL daily close > $200 on any trading day before 2026-08-01 per Yahoo Finance.", '
        '"expiry": "2026-08-01T00:00:00Z", '
        '"category": "earnings", '
        '"source_thesis_id": "' + thesis.thesis_id + '", '
        '"source_language": "en", '
        '"translated_by_model": "llama-3.3-70b-versatile", '
        '"translation_confidence": 0.85}'
    )
    out = adal.GeneratorOutput(raw_response=raw_json)
    result = parser.call(out, extra_fields={
        "source_thesis_id": thesis.thesis_id,
        "source_language": "en",
        "translated_by_model": "llama-3.3-70b-versatile",
    })
    assert isinstance(result, PredictionMarketQuestion)
    assert result.translation_confidence == 0.85
    assert result.category == "earnings"


def test_prediction_market_question_parser_bad_json() -> None:
    parser = PydanticJsonParser(PredictionMarketQuestion)
    out = adal.GeneratorOutput(raw_response="not json at all")
    result = parser.call(out)
    assert result is None


# ---------------------------------------------------------------------------
# ChinaAgent Groq fallback
# ---------------------------------------------------------------------------

def test_china_agent_groq_fallback(monkeypatch: pytest.MonkeyPatch) -> None:
    """ChinaAgent falls back to Groq when DEEPSEEK_API_KEY is absent."""
    monkeypatch.delenv("DEEPSEEK_API_KEY", raising=False)
    monkeypatch.setenv("GROQ_API_KEY", "gsk_test_dummy")

    from agents.china_agent import ChinaAgent
    agent = ChinaAgent()
    # Should have fallen back — model_kwargs should reference groq model
    assert "llama" in agent.sub_agent.model_kwargs["model"]


# ---------------------------------------------------------------------------
# Question generator _build_agent routing
# ---------------------------------------------------------------------------

def test_build_agent_us(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("GROQ_API_KEY", "gsk_test_dummy")
    from markets.question_generator import _build_agent
    from agents.us_agent import USAgent
    assert isinstance(_build_agent("us"), USAgent)


def test_build_agent_crypto(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("GROQ_API_KEY", "gsk_test_dummy")
    from markets.question_generator import _build_agent
    from agents.crypto_agent import CryptoAgent
    assert isinstance(_build_agent("crypto"), CryptoAgent)


def test_build_agent_cn(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("DEEPSEEK_API_KEY", raising=False)
    monkeypatch.setenv("GROQ_API_KEY", "gsk_test_dummy")
    from markets.question_generator import _build_agent
    from agents.china_agent import ChinaAgent
    assert isinstance(_build_agent("cn"), ChinaAgent)


def test_build_agent_invalid() -> None:
    from markets.question_generator import _build_agent
    with pytest.raises(ValueError, match="Unknown region"):
        _build_agent("mars")  # type: ignore[arg-type]
