"""Crypto/DeFi regional agent.

Data sources:
- CoinGecko (price, market cap, metadata for 15k+ coins)
- DefiLlama (protocol TVL, chain TVL, stablecoin flows)

Run standalone:
    uv run python -m agents.crypto_agent --asset bitcoin
"""

from __future__ import annotations

import argparse
import asyncio
import json
import logging

from dotenv import load_dotenv

load_dotenv()

from agents.base_agent import RegionalAgent
from data.mcp_client import CoinGeckoClient, DefiLlamaClient
from reasoning.trace_schema import AgentRole, AssetClass, Region

logger = logging.getLogger(__name__)


class CryptoAgent(RegionalAgent):
    region = Region.CRYPTO
    working_language = "en"
    sub_agent_roles = (
        AgentRole.FUNDAMENTAL_ANALYST,  # on-chain metrics, tokenomics
        AgentRole.SENTIMENT_ANALYST,    # market sentiment, news
        AgentRole.MACRO_ANALYST,        # DeFi ecosystem, TVL trends
    )

    @property
    def asset_class_for(self) -> AssetClass:
        return AssetClass.CRYPTO

    async def get_data_sources(self, ticker: str) -> dict[AgentRole, str]:
        """Pull CoinGecko + DefiLlama data concurrently.

        `ticker` is a CoinGecko coin ID (e.g. 'bitcoin', 'ethereum', 'usd-coin').
        For DeFi protocols, it's also the DefiLlama slug.
        """
        async with CoinGeckoClient() as cg, DefiLlamaClient() as dl:
            coin_task = cg.get_coin(ticker)
            # DefiLlama protocol slug often matches CoinGecko id — soft-fail if not
            protocol_task = dl.get_protocol(ticker)
            coin, protocol = await asyncio.gather(
                coin_task, protocol_task, return_exceptions=True
            )

        # ---- fundamental: tokenomics + market data from CoinGecko ----
        if isinstance(coin, Exception):
            fundamental_data = f"[CoinGecko ERROR: {coin}]"
        else:
            # Trim to relevant fields — full response can be 50KB+
            trimmed = {
                "id": coin.get("id"),
                "name": coin.get("name"),
                "symbol": coin.get("symbol"),
                "market_data": {
                    k: coin.get("market_data", {}).get(k)
                    for k in [
                        "current_price",
                        "market_cap",
                        "total_volume",
                        "circulating_supply",
                        "total_supply",
                        "price_change_percentage_24h",
                        "price_change_percentage_7d_in_currency",
                    ]
                },
                "categories": coin.get("categories", [])[:5],
                "description_snippet": (coin.get("description", {}).get("en", "") or "")[:500],
            }
            fundamental_data = json.dumps(trimmed, indent=2)[:4000]

        # ---- macro: DeFi protocol TVL + chain flows from DefiLlama ----
        if isinstance(protocol, Exception):
            macro_data = f"[DefiLlama protocol not found for '{ticker}': {protocol}]\n"
            macro_data += "Note: DefiLlama slug may differ from CoinGecko id. TVL data unavailable."
        else:
            trimmed_proto = {
                "name": protocol.get("name"),
                "tvl": protocol.get("tvl"),
                "chainTvls": protocol.get("chainTvls", {}),
                "category": protocol.get("category"),
                "description": (protocol.get("description") or "")[:300],
            }
            macro_data = json.dumps(trimmed_proto, indent=2)[:3000]

        # ---- sentiment: derive from CoinGecko community + market sentiment ----
        if isinstance(coin, Exception):
            sentiment_data = "[No sentiment data — CoinGecko unavailable]"
        else:
            sentiment_data = json.dumps(
                {
                    "sentiment_votes_up_percentage": coin.get("sentiment_votes_up_percentage"),
                    "sentiment_votes_down_percentage": coin.get("sentiment_votes_down_percentage"),
                    "community_data": coin.get("community_data", {}),
                    "developer_data": {
                        k: coin.get("developer_data", {}).get(k)
                        for k in ["stars", "forks", "pull_request_contributors", "commit_count_4_weeks"]
                    },
                },
                indent=2,
            )[:2000]

        return {
            AgentRole.FUNDAMENTAL_ANALYST: fundamental_data,
            AgentRole.SENTIMENT_ANALYST: sentiment_data,
            AgentRole.MACRO_ANALYST: macro_data,
        }


# ---------------------------------------------------------------------------
# CLI smoke test
# ---------------------------------------------------------------------------


async def _main() -> None:
    parser = argparse.ArgumentParser(description="Run the Crypto agent on a CoinGecko coin ID.")
    parser.add_argument("--asset", default="bitcoin")
    parser.add_argument("--verbose", action="store_true")
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )

    agent = CryptoAgent()
    thesis = await agent.analyze(args.asset)
    print(thesis.model_dump_json(indent=2))


def run() -> None:
    asyncio.run(_main())


if __name__ == "__main__":
    run()
