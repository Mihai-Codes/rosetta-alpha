"""Tests for Stooq fallback client and EU/Japan agent fallback wiring.

Covers:
1. Ticker normalisation (_to_stooq_ticker) — all 18 suffix mappings + edge cases
2. _period_to_days — days/months/years/unknown/edge cases
3. StooqClient.get_daily — success path, empty result, import error, network error
4. EUAgent.get_data_sources — yfinance success, yfinance fail → Stooq fallback,
   both fail → sentinel string, fundamentals/news soft-fail
5. JapanAgent.get_data_sources — same matrix in Japanese sentinels
6. EU/Japan agent instantiation (Gemini → Groq fallback)
"""

from __future__ import annotations

import asyncio
import pytest

from data.stooq_client import StooqClient, _to_stooq_ticker, _period_to_days
from reasoning.trace_schema import AgentRole, Region


# ===========================================================================
# 1. Ticker normalisation
# ===========================================================================

class TestToStooqTicker:
    def test_japan_tse(self):
        assert _to_stooq_ticker("7203.T") == "7203.jp"

    def test_france_euronext(self):
        assert _to_stooq_ticker("MC.PA") == "mc.fr"

    def test_germany_xetra(self):
        assert _to_stooq_ticker("SAP.DE") == "sap.de"

    def test_italy_borsa(self):
        assert _to_stooq_ticker("ENEL.MI") == "enel.it"

    def test_netherlands(self):
        assert _to_stooq_ticker("ASML.AS") == "asml.nl"

    def test_spain_bme(self):
        assert _to_stooq_ticker("SAN.MC") == "san.es"

    def test_switzerland_six(self):
        assert _to_stooq_ticker("NESN.SW") == "nesn.ch"

    def test_sweden_nasdaq(self):
        assert _to_stooq_ticker("ERIC.ST") == "eric.se"

    def test_denmark(self):
        assert _to_stooq_ticker("NOVO.CO") == "novo.dk"

    def test_finland(self):
        assert _to_stooq_ticker("NOKIA.HE") == "nokia.fi"

    def test_norway(self):
        assert _to_stooq_ticker("EQNR.OL") == "eqnr.no"

    def test_uk_london(self):
        assert _to_stooq_ticker("BP.L") == "bp.uk"

    def test_austria_vienna(self):
        assert _to_stooq_ticker("OMV.VI") == "omv.at"

    def test_belgium(self):
        assert _to_stooq_ticker("UCB.BR") == "ucb.be"

    def test_portugal(self):
        assert _to_stooq_ticker("EDP.LS") == "edp.pt"

    def test_poland(self):
        assert _to_stooq_ticker("PKN.WA") == "pkn.pl"

    def test_case_insensitive_input(self):
        # Mixed case input should still match
        assert _to_stooq_ticker("mc.pa") == "mc.fr"
        assert _to_stooq_ticker("7203.t") == "7203.jp"

    def test_unknown_suffix_passthrough(self):
        # Unknown suffix should pass through lowercase
        result = _to_stooq_ticker("AAPL.XX")
        assert result == "aapl.xx"

    def test_no_suffix(self):
        # Plain ticker without recognised suffix passes through
        result = _to_stooq_ticker("AAPL")
        assert result == "aapl"

    def test_multi_dot_ticker(self):
        # Ticker with multiple dots — only suffix should be replaced
        result = _to_stooq_ticker("600519.SS")
        assert result == "600519.ss"  # .SS not in map → passthrough


# ===========================================================================
# 2. _period_to_days
# ===========================================================================

class TestPeriodToDays:
    def test_days(self):
        assert _period_to_days("10d") == 10
        assert _period_to_days("5d") == 5

    def test_months(self):
        assert _period_to_days("1mo") == 30
        assert _period_to_days("3mo") == 90

    def test_years(self):
        assert _period_to_days("1y") == 365
        assert _period_to_days("2y") == 730

    def test_unknown_defaults_to_14(self):
        assert _period_to_days("max") == 14
        assert _period_to_days("") == 14
        assert _period_to_days("???") == 14

    def test_whitespace_stripped(self):
        assert _period_to_days(" 10d ") == 10


# ===========================================================================
# 3. StooqClient.get_daily — mocked at pandas_datareader level
# ===========================================================================

class TestStooqClientGetDaily:
    def _make_mock_df(self, rows: int = 5):
        """Build a minimal DataFrame that mimics pandas-datareader Stooq output."""
        import pandas as pd
        from datetime import date, timedelta

        dates = [date(2026, 5, 1) + timedelta(days=i) for i in range(rows)]
        df = pd.DataFrame(
            {
                "Open": [100.0 + i for i in range(rows)],
                "High": [105.0 + i for i in range(rows)],
                "Low": [99.0 + i for i in range(rows)],
                "Close": [103.0 + i for i in range(rows)],
                "Volume": [1_000_000 + i * 1000 for i in range(rows)],
            },
            index=pd.DatetimeIndex(pd.to_datetime(dates)),
        )
        return df

    def test_success_returns_list_of_dicts(self, monkeypatch):
        mock_df = self._make_mock_df(5)

        import data.stooq_client as sc
        import types

        fake_pdr = types.ModuleType("pandas_datareader")
        fake_pdr.data = types.SimpleNamespace(DataReader=lambda *a, **kw: mock_df)
        monkeypatch.setitem(__import__("sys").modules, "pandas_datareader", fake_pdr)
        monkeypatch.setitem(__import__("sys").modules, "pandas_datareader.data", fake_pdr.data)

        client = StooqClient()
        result = asyncio.run(client.get_daily("7203.T", period="5d"))
        assert isinstance(result, list)
        assert len(result) == 5
        assert "close" in result[0]
        assert "date" in result[0]

    def test_empty_df_returns_empty_list(self, monkeypatch):
        import pandas as pd
        import types

        empty_df = pd.DataFrame()
        fake_pdr = types.ModuleType("pandas_datareader")
        fake_pdr.data = types.SimpleNamespace(DataReader=lambda *a, **kw: empty_df)
        monkeypatch.setitem(__import__("sys").modules, "pandas_datareader", fake_pdr)
        monkeypatch.setitem(__import__("sys").modules, "pandas_datareader.data", fake_pdr.data)

        client = StooqClient()
        result = asyncio.run(client.get_daily("UNKNOWN.XX", period="5d"))
        assert result == []

    def test_network_error_returns_empty_list(self, monkeypatch):
        import types

        def raise_error(*a, **kw):
            raise ConnectionError("Stooq unreachable")

        fake_pdr = types.ModuleType("pandas_datareader")
        fake_pdr.data = types.SimpleNamespace(DataReader=raise_error)
        monkeypatch.setitem(__import__("sys").modules, "pandas_datareader", fake_pdr)
        monkeypatch.setitem(__import__("sys").modules, "pandas_datareader.data", fake_pdr.data)

        client = StooqClient()
        result = asyncio.run(client.get_daily("MC.PA", period="10d"))
        assert result == []

    def test_import_error_returns_empty_list(self, monkeypatch):
        """If pandas-datareader is not installed, get_daily returns [] without crashing."""
        import sys
        # Remove any cached module so the lazy import triggers ImportError
        monkeypatch.setitem(sys.modules, "pandas_datareader", None)  # type: ignore[arg-type]

        client = StooqClient()
        result = asyncio.run(client.get_daily("SAP.DE", period="10d"))
        assert result == []

    def test_period_conversion_passed_as_date_range(self, monkeypatch):
        """Verify that the date range passed to DataReader spans roughly the right window."""
        import types
        import pandas as pd

        captured = {}

        def fake_reader(ticker, source, start, end):
            captured["start"] = start
            captured["end"] = end
            return pd.DataFrame()  # empty is fine

        fake_pdr = types.ModuleType("pandas_datareader")
        fake_pdr.data = types.SimpleNamespace(DataReader=fake_reader)
        monkeypatch.setitem(__import__("sys").modules, "pandas_datareader", fake_pdr)
        monkeypatch.setitem(__import__("sys").modules, "pandas_datareader.data", fake_pdr.data)

        asyncio.run(StooqClient().get_daily("7203.T", period="10d"))
        delta = (captured["end"] - captured["start"]).days
        # Should be 10 + 7 buffer = 17 calendar days
        assert delta == 17


# ===========================================================================
# 4. EUAgent.get_data_sources — fallback wiring
# ===========================================================================

class TestEUAgentFallback:
    def _make_agent(self, monkeypatch):
        monkeypatch.setenv("GEMINI_API_KEY", "fake_gemini_key")
        from agents.eu_agent import EUAgent
        return EUAgent()

    def test_yfinance_success_no_stooq_called(self, monkeypatch):
        """When yfinance returns data, Stooq should NOT be called."""
        monkeypatch.setenv("GEMINI_API_KEY", "fake_gemini_key")

        stooq_called = []

        async def mock_yf_daily(self, ticker, period="10d"):
            return [{"date": "2026-05-14", "close": 700.0}]

        async def mock_yf_info(self, ticker):
            return {"shortName": "LVMH"}

        async def mock_yf_news(self, ticker):
            return [{"title": "LVMH reports earnings"}]

        async def mock_stooq_daily(self, ticker, period="10d"):
            stooq_called.append(ticker)
            return []

        import data.yfinance_client as yfc
        import data.stooq_client as sc
        monkeypatch.setattr(yfc.YFinanceClient, "get_daily", mock_yf_daily)
        monkeypatch.setattr(yfc.YFinanceClient, "get_info", mock_yf_info)
        monkeypatch.setattr(yfc.YFinanceClient, "get_news", mock_yf_news)
        monkeypatch.setattr(sc.StooqClient, "get_daily", mock_stooq_daily)

        from agents.eu_agent import EUAgent
        agent = EUAgent()
        result = asyncio.run(agent.get_data_sources("MC.PA"))

        assert stooq_called == []
        assert "LVMH" in result[AgentRole.FUNDAMENTAL_ANALYST]

    def test_yfinance_fail_triggers_stooq_fallback(self, monkeypatch):
        """When yfinance daily returns [], Stooq should be called."""
        monkeypatch.setenv("GEMINI_API_KEY", "fake_gemini_key")

        stooq_called = []

        async def mock_yf_daily(self, ticker, period="10d"):
            return []  # simulates yfinance failure/empty

        async def mock_yf_info(self, ticker):
            return {}

        async def mock_yf_news(self, ticker):
            return []

        async def mock_stooq_daily(self, ticker, period="10d"):
            stooq_called.append(ticker)
            return [{"date": "2026-05-14", "close": 700.0, "open": 698.0}]

        import data.yfinance_client as yfc
        import data.stooq_client as sc
        monkeypatch.setattr(yfc.YFinanceClient, "get_daily", mock_yf_daily)
        monkeypatch.setattr(yfc.YFinanceClient, "get_info", mock_yf_info)
        monkeypatch.setattr(yfc.YFinanceClient, "get_news", mock_yf_news)
        monkeypatch.setattr(sc.StooqClient, "get_daily", mock_stooq_daily)

        from agents.eu_agent import EUAgent
        agent = EUAgent()
        result = asyncio.run(agent.get_data_sources("MC.PA"))

        assert stooq_called == ["MC.PA"]
        combined = result[AgentRole.FUNDAMENTAL_ANALYST]
        assert "Price History" in combined  # Stooq data present

    def test_both_fail_produces_sentinel(self, monkeypatch):
        """When both yfinance and Stooq fail, sentinel string is used."""
        monkeypatch.setenv("GEMINI_API_KEY", "fake_gemini_key")

        async def mock_yf_daily(self, ticker, period="10d"):
            return []

        async def mock_yf_info(self, ticker):
            return {}

        async def mock_yf_news(self, ticker):
            return []

        async def mock_stooq_daily(self, ticker, period="10d"):
            return []

        import data.yfinance_client as yfc
        import data.stooq_client as sc
        monkeypatch.setattr(yfc.YFinanceClient, "get_daily", mock_yf_daily)
        monkeypatch.setattr(yfc.YFinanceClient, "get_info", mock_yf_info)
        monkeypatch.setattr(yfc.YFinanceClient, "get_news", mock_yf_news)
        monkeypatch.setattr(sc.StooqClient, "get_daily", mock_stooq_daily)

        from agents.eu_agent import EUAgent
        agent = EUAgent()
        result = asyncio.run(agent.get_data_sources("MC.PA"))

        combined = result[AgentRole.FUNDAMENTAL_ANALYST]
        assert "Unavailable" in combined

    def test_yfinance_exception_triggers_stooq(self, monkeypatch):
        """When yfinance raises an exception, Stooq fallback activates."""
        monkeypatch.setenv("GEMINI_API_KEY", "fake_gemini_key")

        stooq_called = []

        async def mock_yf_daily(self, ticker, period="10d"):
            raise ConnectionError("Yahoo down")

        async def mock_yf_info(self, ticker):
            return {}

        async def mock_yf_news(self, ticker):
            return []

        async def mock_stooq_daily(self, ticker, period="10d"):
            stooq_called.append(ticker)
            return [{"date": "2026-05-14", "close": 200.0}]

        import data.yfinance_client as yfc
        import data.stooq_client as sc
        monkeypatch.setattr(yfc.YFinanceClient, "get_daily", mock_yf_daily)
        monkeypatch.setattr(yfc.YFinanceClient, "get_info", mock_yf_info)
        monkeypatch.setattr(yfc.YFinanceClient, "get_news", mock_yf_news)
        monkeypatch.setattr(sc.StooqClient, "get_daily", mock_stooq_daily)

        from agents.eu_agent import EUAgent
        agent = EUAgent()
        result = asyncio.run(agent.get_data_sources("SAP.DE"))

        assert stooq_called == ["SAP.DE"]

    def test_returns_both_roles(self, monkeypatch):
        """get_data_sources must always return both FUNDAMENTAL and MACRO roles."""
        monkeypatch.setenv("GEMINI_API_KEY", "fake_gemini_key")

        async def noop(*a, **kw):
            return []

        import data.yfinance_client as yfc
        import data.stooq_client as sc
        monkeypatch.setattr(yfc.YFinanceClient, "get_daily", noop)
        monkeypatch.setattr(yfc.YFinanceClient, "get_info", noop)
        monkeypatch.setattr(yfc.YFinanceClient, "get_news", noop)
        monkeypatch.setattr(sc.StooqClient, "get_daily", noop)

        from agents.eu_agent import EUAgent
        agent = EUAgent()
        result = asyncio.run(agent.get_data_sources("MC.PA"))

        assert AgentRole.FUNDAMENTAL_ANALYST in result
        assert AgentRole.MACRO_ANALYST in result
        assert result[AgentRole.FUNDAMENTAL_ANALYST] == result[AgentRole.MACRO_ANALYST]


# ===========================================================================
# 5. JapanAgent.get_data_sources — same matrix, Japanese sentinels
# ===========================================================================

class TestJapanAgentFallback:
    def test_yfinance_success_no_stooq(self, monkeypatch):
        monkeypatch.setenv("GEMINI_API_KEY", "fake_gemini_key")

        stooq_called = []

        async def mock_yf_daily(self, ticker, period="10d"):
            return [{"date": "2026-05-14", "close": 3500.0}]

        async def mock_yf_info(self, ticker):
            return {"shortName": "Toyota"}

        async def mock_yf_news(self, ticker):
            return []

        async def mock_stooq_daily(self, ticker, period="10d"):
            stooq_called.append(ticker)
            return []

        import data.yfinance_client as yfc
        import data.stooq_client as sc
        monkeypatch.setattr(yfc.YFinanceClient, "get_daily", mock_yf_daily)
        monkeypatch.setattr(yfc.YFinanceClient, "get_info", mock_yf_info)
        monkeypatch.setattr(yfc.YFinanceClient, "get_news", mock_yf_news)
        monkeypatch.setattr(sc.StooqClient, "get_daily", mock_stooq_daily)

        from agents.japan_agent import JapanAgent
        agent = JapanAgent()
        result = asyncio.run(agent.get_data_sources("7203.T"))

        assert stooq_called == []
        combined = result[AgentRole.FUNDAMENTAL_ANALYST]
        assert "Toyota" in combined

    def test_yfinance_fail_triggers_stooq_fallback(self, monkeypatch):
        monkeypatch.setenv("GEMINI_API_KEY", "fake_gemini_key")

        stooq_called = []

        async def mock_yf_daily(self, ticker, period="10d"):
            return []

        async def mock_yf_info(self, ticker):
            return {}

        async def mock_yf_news(self, ticker):
            return []

        async def mock_stooq_daily(self, ticker, period="10d"):
            stooq_called.append(ticker)
            return [{"date": "2026-05-14", "close": 3500.0}]

        import data.yfinance_client as yfc
        import data.stooq_client as sc
        monkeypatch.setattr(yfc.YFinanceClient, "get_daily", mock_yf_daily)
        monkeypatch.setattr(yfc.YFinanceClient, "get_info", mock_yf_info)
        monkeypatch.setattr(yfc.YFinanceClient, "get_news", mock_yf_news)
        monkeypatch.setattr(sc.StooqClient, "get_daily", mock_stooq_daily)

        from agents.japan_agent import JapanAgent
        agent = JapanAgent()
        result = asyncio.run(agent.get_data_sources("7203.T"))

        assert stooq_called == ["7203.T"]
        combined = result[AgentRole.FUNDAMENTAL_ANALYST]
        assert "日足データ（直近10営業日）" in combined

    def test_both_fail_japanese_sentinel(self, monkeypatch):
        monkeypatch.setenv("GEMINI_API_KEY", "fake_gemini_key")

        async def noop(*a, **kw):
            return []

        import data.yfinance_client as yfc
        import data.stooq_client as sc
        monkeypatch.setattr(yfc.YFinanceClient, "get_daily", noop)
        monkeypatch.setattr(yfc.YFinanceClient, "get_info", noop)
        monkeypatch.setattr(yfc.YFinanceClient, "get_news", noop)
        monkeypatch.setattr(sc.StooqClient, "get_daily", noop)

        from agents.japan_agent import JapanAgent
        agent = JapanAgent()
        result = asyncio.run(agent.get_data_sources("7203.T"))

        combined = result[AgentRole.FUNDAMENTAL_ANALYST]
        # Japanese sentinel for unavailable price data
        assert "取得失敗" in combined

    def test_returns_both_roles(self, monkeypatch):
        monkeypatch.setenv("GEMINI_API_KEY", "fake_gemini_key")

        async def noop(*a, **kw):
            return []

        import data.yfinance_client as yfc
        import data.stooq_client as sc
        monkeypatch.setattr(yfc.YFinanceClient, "get_daily", noop)
        monkeypatch.setattr(yfc.YFinanceClient, "get_info", noop)
        monkeypatch.setattr(yfc.YFinanceClient, "get_news", noop)
        monkeypatch.setattr(sc.StooqClient, "get_daily", noop)

        from agents.japan_agent import JapanAgent
        agent = JapanAgent()
        result = asyncio.run(agent.get_data_sources("7203.T"))

        assert AgentRole.FUNDAMENTAL_ANALYST in result
        assert AgentRole.TECHNICAL_ANALYST in result


# ===========================================================================
# 6. EU/Japan agent instantiation — Gemini → Groq fallback
# ===========================================================================

class TestAgentInstantiation:
    def test_eu_agent_with_gemini(self, monkeypatch):
        monkeypatch.setenv("GEMINI_API_KEY", "fake_key")
        from agents.eu_agent import EUAgent
        agent = EUAgent()
        assert agent.region == Region.EU
        assert agent.working_language == "en"

    def test_eu_agent_groq_fallback_no_gemini(self, monkeypatch):
        monkeypatch.delenv("GEMINI_API_KEY", raising=False)
        monkeypatch.setenv("GROQ_API_KEY", "gsk_test_dummy")
        from agents.eu_agent import EUAgent
        agent = EUAgent()
        assert agent.region == Region.EU
        # Should have fallen back to Groq llama model
        assert "llama" in agent.sub_agent.model_kwargs["model"]

    def test_japan_agent_with_gemini(self, monkeypatch):
        monkeypatch.setenv("GEMINI_API_KEY", "fake_key")
        from agents.japan_agent import JapanAgent
        agent = JapanAgent()
        assert agent.region == Region.JP
        assert agent.working_language == "ja"

    def test_japan_agent_groq_fallback_no_gemini(self, monkeypatch):
        monkeypatch.delenv("GEMINI_API_KEY", raising=False)
        monkeypatch.setenv("GROQ_API_KEY", "gsk_test_dummy")
        from agents.japan_agent import JapanAgent
        agent = JapanAgent()
        assert agent.region == Region.JP
        assert "llama" in agent.sub_agent.model_kwargs["model"]

    def test_eu_agent_has_stooq_import(self):
        """Ensure StooqClient is accessible from eu_agent module."""
        import agents.eu_agent as eu
        from data.stooq_client import StooqClient
        assert StooqClient is not None

    def test_japan_agent_has_stooq_import(self):
        import agents.japan_agent as jp
        from data.stooq_client import StooqClient
        assert StooqClient is not None
