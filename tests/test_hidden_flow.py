from __future__ import annotations

import asyncio
import types

import pandas as pd

from data.hidden_flow import (
    cross_desk_flow_anomalies,
    detect_potential_dark_pool_activity,
    gather_hidden_flow_context,
    scan_options_flow,
)
from reasoning.trace_schema import HiddenFlowType, Region


class _FakeTicker:
    def __init__(self, ticker: str):
        self.ticker = ticker
        self.options = ["2026-06-19"]

    def option_chain(self, expiry: str):
        calls = pd.DataFrame(
            [
                # Unusual call at strike 100 (10x OI) -> CALL_WALL
                {"strike": 100.0, "volume": 1000, "openInterest": 100, "lastPrice": 2.0, "bid": 1.9, "ask": 2.1},
                # Another unusual call at strike 110 -> helps UNUSUAL_SPREAD detection
                {"strike": 110.0, "volume": 800, "openInterest": 100, "lastPrice": 1.5, "bid": 1.4, "ask": 1.6},
            ]
        )
        puts = pd.DataFrame(
            [
                # Unusual put near strike 100 -> PUT_WALL + STRADDLE_BUILD with call 100
                {"strike": 101.0, "volume": 700, "openInterest": 100, "lastPrice": 2.2, "bid": 2.1, "ask": 2.3},
                # Another unusual put at lower strike -> helps put-side UNUSUAL_SPREAD
                {"strike": 95.0, "volume": 600, "openInterest": 100, "lastPrice": 1.8, "bid": 1.7, "ask": 1.9},
            ]
        )
        return types.SimpleNamespace(calls=calls, puts=puts)


def _install_fake_yfinance(monkeypatch):
    fake_yf = types.ModuleType("yfinance")
    fake_yf.Ticker = _FakeTicker
    monkeypatch.setitem(__import__("sys").modules, "yfinance", fake_yf)


def test_scan_options_flow_detects_unusual_and_patterns(monkeypatch):
    _install_fake_yfinance(monkeypatch)

    signals = asyncio.run(scan_options_flow("AAPL"))
    types_seen = {s.type for s in signals}

    assert HiddenFlowType.CALL_WALL in types_seen
    assert HiddenFlowType.PUT_WALL in types_seen
    assert HiddenFlowType.UNUSUAL_SPREAD in types_seen
    assert HiddenFlowType.STRADDLE_BUILD in types_seen
    assert all(s.asset == "AAPL" for s in signals)


def test_detect_potential_dark_pool_activity_proxy():
    tape = [
        {"shares": 5000, "order_book_change": 20},
        {"shares": 15000, "order_book_change": 0},
    ]
    assert detect_potential_dark_pool_activity(tape) is True
    assert detect_potential_dark_pool_activity([{"shares": 8000, "order_book_change": 0}]) is False
    assert detect_potential_dark_pool_activity([]) is False


def test_cross_desk_flow_anomalies_stablecoin_and_connect():
    signals = cross_desk_flow_anomalies(
        stablecoin_mint_burn_usd=15_000_000,
        connect_flow_usd=-1_200_000_000,
        connect_flow_zscore=-2.4,
        targets=["US", "EU"],
    )

    assert len(signals) >= 2
    assert all(s.type == HiddenFlowType.CROSS_DESK_ALERT for s in signals)
    assert any(s.metadata.get("source") == "stablecoin_mint_burn" for s in signals)
    assert any(s.metadata.get("source") == "northbound_southbound_connect" for s in signals)


def test_gather_hidden_flow_context_us_adds_dark_pool_signal(monkeypatch):
    _install_fake_yfinance(monkeypatch)
    tape = [{"shares": 20000, "order_book_change": 0}]

    signals, dark_pool = asyncio.run(
        gather_hidden_flow_context(
            region=Region.US,
            ticker="AAPL",
            tape_trades=tape,
            stablecoin_mint_burn_usd=None,
            connect_flow_usd=None,
            connect_flow_zscore=None,
        )
    )

    assert dark_pool is True
    assert any(s.type == HiddenFlowType.DARK_POOL_PROXY for s in signals)


def test_gather_hidden_flow_context_non_us_skips_options(monkeypatch):
    _install_fake_yfinance(monkeypatch)

    signals, dark_pool = asyncio.run(
        gather_hidden_flow_context(
            region=Region.EU,
            ticker="MC.PA",
            stablecoin_mint_burn_usd=20_000_000,
        )
    )

    assert dark_pool is False
    assert all(s.type == HiddenFlowType.CROSS_DESK_ALERT for s in signals)
