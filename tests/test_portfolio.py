"""Portfolio engine tests — signal math, aggregation, and routing."""

from __future__ import annotations

import pytest

from reasoning.trace_schema import (
    AssetClass,
    Direction,
    InvestmentThesis,
    PortfolioPosition,
    PortfolioView,
    Region,
)
from portfolio.engine import (
    AnalysisRequest,
    PortfolioEngine,
    _build_agent,
    _direction_to_signal,
    _net_to_direction,
    _top_risks,
)


# ---------------------------------------------------------------------------
# Signal math
# ---------------------------------------------------------------------------

def test_long_signal() -> None:
    assert _direction_to_signal(Direction.LONG, 0.8) == pytest.approx(0.8)


def test_short_signal() -> None:
    assert _direction_to_signal(Direction.SHORT, 0.6) == pytest.approx(-0.6)


def test_neutral_signal_always_zero() -> None:
    assert _direction_to_signal(Direction.NEUTRAL, 0.99) == 0.0


def test_net_to_direction_long() -> None:
    assert _net_to_direction(0.5) == Direction.LONG


def test_net_to_direction_short() -> None:
    assert _net_to_direction(-0.5) == Direction.SHORT


def test_net_to_direction_neutral_boundary() -> None:
    assert _net_to_direction(0.09) == Direction.NEUTRAL
    assert _net_to_direction(-0.09) == Direction.NEUTRAL


def test_net_to_direction_at_threshold() -> None:
    assert _net_to_direction(0.10) == Direction.LONG
    assert _net_to_direction(-0.10) == Direction.SHORT


# ---------------------------------------------------------------------------
# Risk factor deduplication
# ---------------------------------------------------------------------------

def _make_thesis(ticker: str, risks: list[str], direction: Direction = Direction.LONG) -> InvestmentThesis:
    return InvestmentThesis(
        ticker_or_asset=ticker,
        region=Region.US,
        asset_class=AssetClass.EQUITY,
        direction=direction,
        confidence_score=0.7,
        time_horizon_days=90,
        thesis_summary_en=f"Test thesis for {ticker}",
        risk_factors=risks,
        data_sources_used=["test"],
        working_language="en",
    )


def test_top_risks_deduplicates() -> None:
    t1 = _make_thesis("AAPL", ["Fed rate hike", "China slowdown"])
    t2 = _make_thesis("MSFT", ["Fed rate hike", "AI regulation"])
    risks = _top_risks([t1, t2])
    # "Fed rate hike" appears twice — must be first
    assert risks[0] == "Fed rate hike"
    assert "China slowdown" in risks
    assert "AI regulation" in risks


def test_top_risks_empty() -> None:
    t = _make_thesis("AAPL", [])
    assert _top_risks([t]) == []


def test_top_risks_respects_top_n() -> None:
    risks = [f"risk_{i}" for i in range(20)]
    t = _make_thesis("AAPL", risks)
    result = _top_risks([t], top_n=5)
    assert len(result) == 5


# ---------------------------------------------------------------------------
# PortfolioPosition schema
# ---------------------------------------------------------------------------

def test_portfolio_position_signal_bounds() -> None:
    pos = PortfolioPosition(
        ticker_or_asset="AAPL",
        region=Region.US,
        asset_class=AssetClass.EQUITY,
        direction=Direction.LONG,
        confidence_score=0.9,
        thesis_id="abc",
        thesis_summary_en="Strong buy",
        signal=0.9,
    )
    assert pos.signal == 0.9


# ---------------------------------------------------------------------------
# PortfolioView schema
# ---------------------------------------------------------------------------

def test_portfolio_view_constructs() -> None:
    pos = PortfolioPosition(
        ticker_or_asset="ETH",
        region=Region.CRYPTO,
        asset_class=AssetClass.CRYPTO,
        direction=Direction.LONG,
        confidence_score=0.75,
        thesis_id="xyz",
        thesis_summary_en="Bullish ETH",
        signal=0.75,
    )
    view = PortfolioView(
        positions=[pos],
        net_signal=0.75,
        net_direction=Direction.LONG,
        aggregate_confidence=0.75,
        top_risk_factors=["regulatory risk"],
    )
    assert view.net_direction == Direction.LONG
    assert view.aggregate_confidence == 0.75


# ---------------------------------------------------------------------------
# Agent routing
# ---------------------------------------------------------------------------

def test_build_agent_us(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("GROQ_API_KEY", "gsk_test_dummy")
    from agents.us_agent import USAgent
    assert isinstance(_build_agent("us"), USAgent)


def test_build_agent_cn(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("DEEPSEEK_API_KEY", raising=False)
    monkeypatch.setenv("GROQ_API_KEY", "gsk_test_dummy")
    from agents.china_agent import ChinaAgent
    assert isinstance(_build_agent("cn"), ChinaAgent)


def test_build_agent_unknown() -> None:
    with pytest.raises(ValueError, match="Unknown region"):
        _build_agent("mars")


# ---------------------------------------------------------------------------
# PortfolioEngine — aggregation logic with mock theses
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_engine_aggregates_signals(monkeypatch: pytest.MonkeyPatch) -> None:
    """Engine correctly aggregates two mock theses without hitting any API."""
    monkeypatch.setenv("GROQ_API_KEY", "gsk_test_dummy")

    t1 = _make_thesis("AAPL", ["Fed hike"], Direction.LONG)
    t1_with_conf = t1.model_copy(update={"confidence_score": 0.8})
    t2 = _make_thesis("ETH", ["regulation"], Direction.SHORT)
    t2_with_conf = t2.model_copy(update={"confidence_score": 0.6})

    engine = PortfolioEngine(pin=False)

    # Patch _analyze_one to return mock theses without API calls
    call_count = 0
    async def mock_analyze(req: AnalysisRequest) -> InvestmentThesis:
        nonlocal call_count
        if call_count == 0:
            call_count += 1
            return t1_with_conf
        return t2_with_conf

    engine._analyze_one = mock_analyze  # type: ignore[method-assign]

    reqs = [
        AnalysisRequest(ticker="AAPL", region="us"),
        AnalysisRequest(ticker="ETH", region="crypto"),
    ]
    view = await engine.run(reqs)

    # LONG(0.8) + SHORT(0.6) → signals: +0.8, -0.6 → mean = +0.1 → LONG
    assert view.net_signal == pytest.approx(0.1)
    assert view.net_direction == Direction.LONG
    assert len(view.positions) == 2


@pytest.mark.asyncio
async def test_engine_soft_fails_on_one_error(monkeypatch: pytest.MonkeyPatch) -> None:
    """Engine skips failed agents and still produces a view from remaining theses."""
    monkeypatch.setenv("GROQ_API_KEY", "gsk_test_dummy")

    good_thesis = _make_thesis("AAPL", ["Fed hike"], Direction.LONG)

    engine = PortfolioEngine(pin=False)

    async def mock_analyze(req: AnalysisRequest) -> InvestmentThesis:
        if req.ticker == "FAIL":
            raise RuntimeError("Simulated API failure")
        return good_thesis

    engine._analyze_one = mock_analyze  # type: ignore[method-assign]

    reqs = [
        AnalysisRequest(ticker="AAPL", region="us"),
        AnalysisRequest(ticker="FAIL", region="us"),
    ]
    view = await engine.run(reqs)

    # Only one position survives
    assert len(view.positions) == 1
    assert view.positions[0].ticker_or_asset == "AAPL"


@pytest.mark.asyncio
async def test_engine_raises_if_all_fail() -> None:
    engine = PortfolioEngine(pin=False)

    async def mock_analyze(req: AnalysisRequest) -> InvestmentThesis:
        raise RuntimeError("all fail")

    engine._analyze_one = mock_analyze  # type: ignore[method-assign]

    with pytest.raises(RuntimeError, match="All regional agents failed"):
        await engine.run([AnalysisRequest(ticker="X", region="us")])
