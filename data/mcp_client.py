"""Unified MCP client wrapper.

For the hackathon, we **don't** speak the full MCP protocol from Python.
Instead we hit each MCP server's underlying HTTP/REST surface directly when
we're outside of Zed/AdaL. Inside an agent loop running under AdaL CLI, the
tools are already exposed as MCP and the agent calls them natively.

This wrapper exists so:
- Pytest / CI / FastAPI workers (no MCP runtime) can still pull data.
- We have one place to handle auth, retries, caching, and rate limits.

Each provider has its own adapter class. The shared :class:`MCPClient` is just
a thin async HTTP client with retry + structured logging.
"""

from __future__ import annotations

import logging
import os
from typing import Any

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

logger = logging.getLogger(__name__)


class MCPClientError(RuntimeError):
    pass


class MCPClient:
    """Async HTTP client with retry. Base for provider adapters."""

    def __init__(
        self,
        base_url: str,
        *,
        api_key: str | None = None,
        api_key_param: str = "apikey",
        timeout: float = 30.0,
        headers: dict[str, str] | None = None,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.api_key_param = api_key_param
        self._client = httpx.AsyncClient(timeout=timeout, headers=headers or {})

    async def __aenter__(self) -> MCPClient:
        return self

    async def __aexit__(self, *_: object) -> None:
        await self._client.aclose()

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=8))
    async def get(self, path: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
        params = dict(params or {})
        if self.api_key:
            params.setdefault(self.api_key_param, self.api_key)
        url = f"{self.base_url}/{path.lstrip('/')}"
        resp = await self._client.get(url, params=params)
        if resp.status_code >= 400:
            raise MCPClientError(f"GET {url} → {resp.status_code}: {resp.text[:200]}")
        return resp.json()


# ---------------------------------------------------------------------------
# Provider adapters — each MCP server / API gets one
# ---------------------------------------------------------------------------


class FinancialDatasetsClient(MCPClient):
    """https://financialdatasets.ai — US equities, SEC filings, fundamentals.

    The MCP server uses OAuth in interactive mode. For headless calls we hit
    the REST API directly with an API key. Free tier covers the hackathon.
    """

    def __init__(self) -> None:
        api_key = os.getenv("FINANCIAL_DATASETS_API_KEY", "")
        super().__init__(
            base_url="https://api.financialdatasets.ai",
            headers={"X-API-KEY": api_key} if api_key else None,
        )

    async def get_company_facts(self, ticker: str) -> dict[str, Any]:
        return await self.get("company/facts", params={"ticker": ticker})

    async def get_news(self, ticker: str, limit: int = 10) -> dict[str, Any]:
        return await self.get("news", params={"ticker": ticker, "limit": limit})

    async def get_price_snapshot(self, ticker: str) -> dict[str, Any]:
        return await self.get("prices/snapshot", params={"ticker": ticker})


class CoinGeckoClient(MCPClient):
    """https://www.coingecko.com — crypto market data. Demo key OK for hackathon."""

    def __init__(self) -> None:
        super().__init__(
            base_url="https://api.coingecko.com/api/v3",
            api_key=os.getenv("COINGECKO_DEMO_KEY") or None,
            api_key_param="x_cg_demo_api_key",
        )

    async def get_coin(self, coin_id: str) -> dict[str, Any]:
        return await self.get(f"coins/{coin_id}")


class DefiLlamaClient(MCPClient):
    """https://defillama.com — TVL, yields, stablecoin flows. No auth required."""

    def __init__(self) -> None:
        super().__init__(base_url="https://api.llama.fi")

    async def get_protocol(self, slug: str) -> dict[str, Any]:
        return await self.get(f"protocol/{slug}")

    async def get_chain_tvl(self, chain: str) -> dict[str, Any]:
        return await self.get(f"v2/historicalChainTvl/{chain}")
