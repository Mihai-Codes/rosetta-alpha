"""China regional agent — A-share equity analysis in Mandarin.

Data sources:
- Tushare Pro (daily OHLCV, financial indicators)

Model routing (per AGENTS.md):
- DeepSeek V3 / deepseek-chat — Chinese-language reasoning at cost-efficient rates.
  Prompts are intentionally in Simplified Chinese so DeepSeek uses its strongest
  reasoning path. The output InvestmentThesis is still English-schema Pydantic.

Run standalone:
    TUSHARE_TOKEN=xxx DEEPSEEK_API_KEY=xxx uv run python -m agents.china_agent --ticker 600519.SH
"""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
import os
from typing import Any

from dotenv import load_dotenv

load_dotenv()

import adalflow as adal
from adalflow.components.model_client import OpenAIClient

from agents.base_agent import PydanticJsonParser, RegionalAgent
from data.tushare_client import TushareClient
from reasoning.trace_schema import (
    AgentRole,
    AssetClass,
    InvestmentThesis,
    ReasoningBlock,
    Region,
)

logger = logging.getLogger(__name__)

# DeepSeek exposes an OpenAI-compatible endpoint — reuse OpenAIClient.
_DEEPSEEK_BASE_URL = "https://api.deepseek.com/v1"
_DEEPSEEK_MODEL = "deepseek-chat"

# ---------------------------------------------------------------------------
# Chinese-language prompt templates
# ---------------------------------------------------------------------------

_CN_SUB_AGENT_TEMPLATE = """\
<SYS>
你是一位专注于A股市场的专业分析师，角色为：{{role}}。
请根据以下市场数据对股票进行深入分析，重点关注盈利能力、估值水平、市场情绪及政策影响。
请用中文进行详细分析。

输出必须是严格的JSON格式，不要有任何额外文字：
{"analysis": "<详细分析内容>", "conclusion": "<买入/卖出/持有及理由>", "key_points": ["要点1", "要点2", "要点3"], "confidence": <0.0到1.0的置信度>, "risks": ["风险1", "风险2"]}
</SYS>

【股票】{{ticker}} | 【市场】{{region}} | 【类别】{{asset_class}}

{{data_summary}}\
"""

_CN_SYNTHESIS_TEMPLATE = """\
<SYS>
你是一位资深的A股组合经理，负责综合各位分析师的意见，形成最终投资建议。
请综合以下分析报告，生成一份结构化的投资建议报告。

输出必须是严格的JSON格式，符合以下Schema（字段名使用英文，内容可以是中文）：
{{schema}}

重要提示：
- direction字段必须是: BUY、SELL或HOLD之一（大写英文）
- conviction字段范围: 0.0到1.0
- region字段: CHINA
- asset_class字段: EQUITY
- lang字段: zh
- ticker字段填写股票代码
只输出JSON，不要有任何额外文字。
</SYS>

【股票】{{ticker}} | 【市场】{{region}} | 【类别】{{asset_class}}

分析师报告汇总：
{{analyst_reports}}\
"""


class ChinaAgent(RegionalAgent):
    """A-share analyst — runs all reasoning in Simplified Chinese via DeepSeek."""

    region = Region.CN
    working_language = "zh"
    sub_agent_roles = (
        AgentRole.FUNDAMENTAL_ANALYST,
        AgentRole.SENTIMENT_ANALYST,
    )

    @property
    def asset_class_for(self) -> AssetClass:
        return AssetClass.EQUITY

    def __init__(
        self,
        *,
        model_client: adal.ModelClient | None = None,
        model_kwargs: dict[str, Any] | None = None,
    ) -> None:
        # Build DeepSeek client; fall back to whatever the caller passes.
        if model_client is None:
            api_key = os.environ.get("DEEPSEEK_API_KEY", "")
            model_client = OpenAIClient(base_url=_DEEPSEEK_BASE_URL, api_key=api_key)
        if model_kwargs is None:
            model_kwargs = {"model": _DEEPSEEK_MODEL, "temperature": 0.2, "max_tokens": 2048}

        # Call parent — it initialises self._block_parser / self._thesis_parser.
        super().__init__(model_client=model_client, model_kwargs=model_kwargs)

        # Rebuild generators with Chinese-language templates.
        schema_str = json.dumps(
            InvestmentThesis.model_json_schema(), ensure_ascii=False, indent=2
        )
        cn_synthesis = _CN_SYNTHESIS_TEMPLATE.replace("{{schema}}", schema_str)

        self.sub_agent = adal.Generator(
            model_client=model_client,
            model_kwargs=model_kwargs,
            template=_CN_SUB_AGENT_TEMPLATE,
        )
        self.synthesizer = adal.Generator(
            model_client=model_client,
            model_kwargs=model_kwargs,
            template=cn_synthesis,
        )

        # Re-assign parsers (parent already created them; keep consistent refs).
        self._block_parser = PydanticJsonParser(ReasoningBlock)
        self._thesis_parser = PydanticJsonParser(InvestmentThesis)

    # ------------------------------------------------------------------
    # Data sources — Tushare
    # ------------------------------------------------------------------

    async def get_data_sources(self, ticker: str) -> dict[AgentRole, str]:
        """Pull daily bars + financial indicators from Tushare Pro."""
        async with TushareClient() as ts:
            daily_task = ts.get_daily(ticker, limit=10)
            fina_task = ts.get_fina_indicator(ticker)
            daily, fina = await asyncio.gather(daily_task, fina_task, return_exceptions=True)

        daily_summary = (
            json.dumps(daily, ensure_ascii=False)[:3000]
            if not isinstance(daily, Exception)
            else f"[ERROR: {daily}]"
        )
        fina_summary = (
            json.dumps(fina, ensure_ascii=False)[:3000]
            if not isinstance(fina, Exception)
            else f"[ERROR: {fina}]"
        )

        combined = (
            f"【股票代码】{ticker}\n"
            f"【近期日线数据（最近10交易日）】\n{daily_summary}\n\n"
            f"【财务指标（近4期）】\n{fina_summary}"
        )

        return {
            AgentRole.FUNDAMENTAL_ANALYST: combined,
            AgentRole.SENTIMENT_ANALYST: combined,
        }


# ---------------------------------------------------------------------------
# CLI smoke test
# ---------------------------------------------------------------------------


async def _main() -> None:
    parser = argparse.ArgumentParser(description="Run the China agent on an A-share ticker.")
    parser.add_argument("--ticker", default="600519.SH")  # Kweichow Moutai
    parser.add_argument("--verbose", action="store_true")
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )

    agent = ChinaAgent()
    thesis = await agent.analyze(args.ticker)
    print(thesis.model_dump_json(indent=2, ensure_ascii=False))


def run() -> None:
    asyncio.run(_main())


if __name__ == "__main__":
    run()
