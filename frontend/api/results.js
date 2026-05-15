// Vercel serverless function — serves live agent results (generated 2026-05-15)
// All traces recorded on Arc L1 Testnet | IPFS-pinned via Pinata
// CN and JP feature DeepSeek V4 and Gemini 3.1 deep reasoning traces.

const LIVE_DATA = [
  {
    "desk": "us",
    "ticker": "AAPL",
    "status": "ok",
    "direction": "LONG",
    "confidence": 0.75,
    "question": "Will Apple Inc.'s stock price (AAPL) be above $296.99 at the close of trading on 2026-08-14?",
    "ipfs_thesis_cid": "bafkreiaeiduymgnqadldwpysnxrukvn6rlzkybvlxylvdblsxy4u2tbw6q",
    "ipfs_question_cid": "bafkreicsspvcmjwm5kel26d6eyi4wn2llt4pooq57a2qwfybdoh6e2q6qe",
    "arc_tx": "6141a0161a64b84093c2655774cb73842a593bdbd5b8fe2e8272ae091052bab4",
    "market_tx": null,
    "error": null,
    "summary": "Apple Inc. is a well-established technology company with a strong market presence, neutral overall sentiment, and potential for growth.",
    "reasoning_blocks": [
      {
        "agent_role": "fundamental_analyst",
        "input_data_summary": "Company facts for AAPL, including ticker, name, sector, industry, and location",
        "thought_process": null,
        "analysis": "Based on the provided company facts, Apple Inc (AAPL) operates in the Information Technology sector, specifically in the Technology Hardware, Storage & Peripherals industry. The company is listed on the NASDAQ exchange and is actively filing with the SEC. This information suggests that AAPL is a well-established technology company with a significant presence in the market.",
        "analysis_en": null,
        "conclusion": "Apple Inc (AAPL) is a prominent player in the technology sector with a strong market presence.",
        "confidence": 0.8,
        "language": "en"
      },
      {
        "agent_role": "sentiment_analyst",
        "input_data_summary": "A collection of 8 news articles about Apple Inc. (AAPL) from various sources, including MarketBeat, Longbridge, AASTOCKS.com, Seeking Alpha, and GuruFocus, published on May 14-15, 2026.",
        "thought_process": null,
        "analysis": "The news articles cover various topics, including investments in Apple by Sterling Investment Counsel LLC and Belpointe Asset Management LLC, potential legal action by OpenAI against Apple, and a new security challenge faced by Apple. However, the overall sentiment of the articles is neutral, with some positive news about investments and some negative news about potential legal issues and security challenges. Renaissance Technologies' addition of Apple to its portfolio and a $770 million position in Q1 2026 are notable positive developments.",
        "analysis_en": null,
        "conclusion": "The overall sentiment of the news articles about Apple Inc. is neutral, with a balance of positive and negative developments.",
        "confidence": 0.7,
        "language": "en"
      }
    ],
    "price": "296.99",
    "metadata": {
      "trace_hash": "0x6141a016...",
      "ipfs_cid": "bafkreiaeiduymgnqadldwpysnxrukvn6rlzkybvlxylvdblsxy4u2tbw6q",
      "arc_tx": "6141a0161a64b84093c2655774cb73842a593bdbd5b8fe2e8272ae091052bab4",
      "arc_explorer": "https://testnet.arcscan.app/tx/6141a0161a64b84093c2655774cb73842a593bdbd5b8fe2e8272ae091052bab4"
    }
  },
  {
    "desk": "crypto",
    "ticker": "BTC",
    "status": "ok",
    "direction": "LONG",
    "confidence": 0.7,
    "question": "Will the price of Bitcoin be above $79,064.00 on 2026-08-01T00:00:00+00:00?",
    "ipfs_thesis_cid": "bafkreiengcwkadazdtp5i6iwfhwdlmburcxif5srfpsnqpbelfqmtyqege",
    "ipfs_question_cid": "bafkreiaecsxensijco3ywrg4yuasxmghl3gwsjcl2cctinuk7z6xqunxxq",
    "arc_tx": "37dd5f73e82f7855addc9a5cd74d7a2e3aa190d6407fb8e23788ed1c81ab470e",
    "market_tx": null,
    "error": null,
    "summary": "Bitcoin has a significant market capitalization and trading volume, with a strong positive sentiment and active development community, but limited macroeconomic analysis due to lack of specific data.",
    "reasoning_blocks": [
      {
        "agent_role": "fundamental_analyst",
        "input_data_summary": "Market data for Bitcoin, including current price and market capitalization in various currencies",
        "thought_process": null,
        "analysis": "Based on the provided market data, the current price of Bitcoin is approximately 79137 USD, with a market capitalization of around 1585576951115 USD. The data also shows the current price and market capitalization of Bitcoin in various other currencies, such as EUR, GBP, JPY, and CNY. The total volume of Bitcoin traded is around 46946930060 USD. This data provides a comprehensive overview of the current state of the Bitcoin market.",
        "analysis_en": null,
        "conclusion": "The current market data suggests that Bitcoin has a significant market capitalization and trading volume, indicating a high level of interest and investment in the cryptocurrency.",
        "confidence": 0.8,
        "language": "en"
      },
      {
        "agent_role": "sentiment_analyst",
        "input_data_summary": "BTC sentiment and community data",
        "thought_process": null,
        "analysis": "The sentiment votes up percentage is 84.9%, indicating a strong positive sentiment towards BTC. The community data shows no activity on Reddit and no available data on Facebook and Telegram. However, the developer data shows a significant number of stars, forks, and pull request contributors, indicating a healthy and active development community. The commit count over the past 4 weeks is also relatively high, suggesting ongoing development and maintenance.",
        "analysis_en": null,
        "conclusion": "The overall sentiment and development activity indicate a positive outlook for BTC.",
        "confidence": 0.8,
        "language": "en"
      },
      {
        "agent_role": "macro_analyst",
        "input_data_summary": "The provided data includes information about Bitcoin, such as its name, category, and description, but it lacks specific numerical data like TVL and token values.",
        "thought_process": null,
        "analysis": "Given the available data, it's challenging to perform a detailed analysis of Bitcoin's current market situation. However, we can note that Bitcoin is described as an innovative payment network and a new kind of money, categorizing it as a 'Canonical Bridge'. This suggests that Bitcoin operates as a foundational element in the cryptocurrency space, potentially influencing other digital currencies and blockchain technologies. Without specific TVL, tokens in USD, or token data, we cannot assess its current market performance, liquidity, or the breadth of its ecosystem.",
        "analysis_en": null,
        "conclusion": "The analysis of Bitcoin is limited by the lack of specific market and financial data, making it difficult to draw concrete conclusions about its current state or future prospects.",
        "confidence": 0.3,
        "language": "en"
      }
    ],
    "price": "79,064.00",
    "metadata": {
      "trace_hash": "0x37dd5f73...",
      "ipfs_cid": "bafkreiengcwkadazdtp5i6iwfhwdlmburcxif5srfpsnqpbelfqmtyqege",
      "arc_tx": "37dd5f73e82f7855addc9a5cd74d7a2e3aa190d6407fb8e23788ed1c81ab470e",
      "arc_explorer": "https://testnet.arcscan.app/tx/37dd5f73e82f7855addc9a5cd74d7a2e3aa190d6407fb8e23788ed1c81ab470e"
    }
  },
  {
    "desk": "cn",
    "ticker": "600519.SH",
    "status": "ok",
    "direction": "LONG",
    "confidence": 0.55,
    "question": "Will the closing price of Guizhou Moutai 600519.SH on 2026-08-15 be higher than 1,332.95?",
    "ipfs_thesis_cid": "bafkreifdai47e6gx3lmxsgftj3bftetgdfarmufafgvq6le2giw5ty45ha",
    "ipfs_question_cid": "bafkreicofrpi7qyunvifkwsdeauangrphdrvzjpv3ohkfgogpmnxwb5mdq",
    "arc_tx": "9e70695759ca4293c2602c9680d4b9135c3f587a09ba82b59aefd6d3bbd96f32",
    "market_tx": null,
    "error": null,
    "summary": "Based on the analysis of market data and company information, we conclude that the investment value of Guizhou Moutai 600519.SH is relatively high, but further analysis of the company's financial statements and market trends is needed to determine its investment value.",
    "reasoning_blocks": [
      {
        "agent_role": "fundamental_analyst",
        "input_data_summary": "600519.SH 股票市场数据",
        "thought_process": "由于缺乏详细的财务数据和公司基本信息，我们只能基于提供的实时价格快照和市场信息进行初步分析。首先，我们观察到当前的股价（1332.949951171875）接近52周低点（1322.010009765625），这可能表明当前的市场情绪较为谨慎或悲观。然而，考虑到缺乏具体的财务指标和公司基本信息，我们无法深入评估公司的盈利能力和估值水平。通常，分析师会通过查看公司的收入增长率、净利润率、市盈率（PE）等指标来评估公司的盈利能力和估值水平。此外，政策影响也是一个重要因素，可能会通过行业政策、税收政策等方面影响公司的盈利能力和市场表现。由于信息的匮乏，我们的分析将主要集中在市场情绪和可能的趋势上。考虑到当前的股价位置和52周的价格波动范围，我们可能会预测短期内的市场走势，但这将高度依赖于未来的市场信息和公司的具体情况。",
        "analysis": "基于当前的市场数据，尤其是股价接近52周低点，我们可能面临一个相对谨慎的市场情绪。然而，缺乏具体的财务数据和公司信息限制了我们对公司盈利能力和估值水平的深入分析。因此，短期的市场走势可能会受到更多的市场信息和公司公告的影响。",
        "analysis_en": "Based on the current market data, especially the stock price near the 52-week low, we may be facing a relatively cautious market sentiment. However, the lack of specific financial data and company information limits our in-depth analysis of the company's profitability and valuation level. Therefore, the short-term market trend may be more influenced by future market information and company announcements.",
        "conclusion": "当前的市场数据和信息不足以支持对600519.SH的详细分析。",
        "confidence": 0.3,
        "language": "zh"
      },
      {
        "agent_role": "sentiment_analyst",
        "input_data_summary": "贵州茅台600519.SH近期新闻和实时价格快照",
        "thought_process": "首先，根据近期新闻，贵州茅台600519.SH发布2026年一季报，净利润为272.43亿元，同比较去年同期上涨1.47%。这表明公司的盈利能力仍然较强。同时，公司营业总收入为547.03亿元，较去年同报告期营业总收入增加32.59亿元，同比较去年同期上涨6.34%。这表明公司的收入增长仍然较快。另外，公司的股价最高至1439元/股，超越其他股票，成为A股股价最高的股票，即A股新“股王”。这表明公司的市场地位和投资者信心较高。然而，近期新闻也提到公司的营收确认规则可能会变，这可能会对公司的财务报表产生影响。同时，公司的代售模式也可能会对公司的销售渠道和收入产生影响。因此，需要进一步分析公司的财务报表和销售渠道，以确定公司的盈利能力和增长潜力。根据实时价格快照，公司的当前股价为1332.949951171875，市值为1669213521938.2434，52周最高价为1636.989990234375，52周最低价为1322.010009765625。这些数据表明公司的股价仍然较高，市值较大，投资者信心较高。然而，公司的股价波动较大，52周最高价和最低价相差较大，这可能会对投资者产生影响。因此，需要进一步分析公司的财务报表和市场趋势，以确定公司的投资价值。",
        "analysis": "贵州茅台600519.SH的盈利能力和收入增长仍然较强，市场地位和投资者信心较高。然而，公司的营收确认规则可能会变，代售模式也可能会对公司的销售渠道和收入产生影响。公司的股价仍然较高，市值较大，投资者信心较高，但股价波动较大。因此，需要进一步分析公司的财务报表和市场趋势，以确定公司的投资价值。",
        "analysis_en": "Guizhou Moutai 600519.SH's profitability and revenue growth remain strong, with a high market position and investor confidence. However, the company's revenue recognition rules may change, and the consignment model may affect the company's sales channels and revenue. The company's stock price remains high, with a large market value and high investor confidence, but the stock price fluctuates greatly. Therefore, it is necessary to further analyze the company's financial statements and market trends to determine its investment value.",
        "conclusion": "贵州茅台600519.SH的投资价值较高，但需要进一步分析公司的财务报表和市场趋势。",
        "confidence": 0.8,
        "language": "zh"
      }
    ],
    "price": "1,332.95",
    "metadata": {
      "trace_hash": "0x9e706957...",
      "ipfs_cid": "bafkreifdai47e6gx3lmxsgftj3bftetgdfarmufafgvq6le2giw5ty45ha",
      "arc_tx": "9e70695759ca4293c2602c9680d4b9135c3f587a09ba82b59aefd6d3bbd96f32",
      "arc_explorer": "https://testnet.arcscan.app/tx/9e70695759ca4293c2602c9680d4b9135c3f587a09ba82b59aefd6d3bbd96f32"
    }
  },
  {
    "desk": "eu",
    "ticker": "MC.PA",
    "status": "ok",
    "direction": "LONG",
    "confidence": 0.85,
    "question": "Will the stock price of LVMH (MC.PA) be above 455.00 on 2026-08-14?",
    "ipfs_thesis_cid": "bafkreidioaehvkf37l7uizznouvylpoviow4hfa3agd3vo5pljj7eggisu",
    "ipfs_question_cid": "bafkreiejgrnn2ae534rxabtib5dceomdrwqzukyqpo6f5p64ealehup5um",
    "arc_tx": "2e27a822c1e67c9bb48def0805e0586ca113e7dd2907b02a0441dd2f91995d4f",
    "market_tx": null,
    "error": null,
    "summary": "LVMH maintains a strong defensive profile with resilient operating margins despite current revenue contraction. Strategic divestment of Marc Jacobs enhances capital allocation efficiency. The stock serves as a high-quality hedge against ECB policy volatility, though it remains sensitive to FX fluctuations and cyclical luxury demand.",
    "reasoning_blocks": [
      {
        "agent_role": "fundamental_analyst",
        "input_data_summary": "LVMH 10-day price history and company fundamentals.",
        "thought_process": null,
        "analysis": "LVMH shows resilient margins despite revenue contraction. Divestment of Marc Jacobs improves focus. FX sensitive; low beta offers ECB policy hedge.",
        "analysis_en": "LVMH maintains strong margins despite revenue headwinds. The Marc Jacobs divestment streamlines the portfolio. High global FX exposure creates volatility, but a low beta of 0.835 provides a defensive buffer against ECB rate sensitivity. ESG remains a core focus for luxury brand equity.",
        "conclusion": "LVMH remains a high-quality luxury play with improved capital allocation following the Marc Jacobs divestment.",
        "confidence": 0.85,
        "language": "en"
      },
      {
        "agent_role": "macro_analyst",
        "input_data_summary": "LVMH 10-day price history and fundamentals.",
        "thought_process": null,
        "analysis": "High margins and ROE support quality, but revenue contraction and Marc Jacobs divestment signal portfolio pruning. FX/ECB sensitive; ESG risk remains.",
        "analysis_en": "LVMH maintains strong margins and ROE, though revenue contraction suggests cyclical headwinds. The Marc Jacobs divestment reflects strategic portfolio optimization. High sensitivity to EUR strength and ECB rate policy persists, with luxury sector ESG scrutiny remaining a key regulatory risk factor.",
        "conclusion": "LVMH remains a high-quality defensive play despite cyclical revenue pressure and strategic restructuring.",
        "confidence": 0.85,
        "language": "en"
      }
    ],
    "price": "455.00",
    "metadata": {
      "trace_hash": "0x2e27a822...",
      "ipfs_cid": "bafkreidioaehvkf37l7uizznouvylpoviow4hfa3agd3vo5pljj7eggisu",
      "arc_tx": "2e27a822c1e67c9bb48def0805e0586ca113e7dd2907b02a0441dd2f91995d4f",
      "arc_explorer": "https://testnet.arcscan.app/tx/2e27a822c1e67c9bb48def0805e0586ca113e7dd2907b02a0441dd2f91995d4f"
    }
  },
  {
    "desk": "jp",
    "ticker": "7203.T",
    "status": "ok",
    "direction": "LONG",
    "confidence": 0.85,
    "question": "Will the closing price of Toyota Motor (7203.T) on June 15, 2026 be above 3,085.00 JPY?",
    "ipfs_thesis_cid": "bafkreihxxl5xslt4bsjv4fimuvlenvbdt4kwxi4cjr32p42vi4gk7zecpq",
    "ipfs_question_cid": "bafkreibl7nlgwmr7tpqouojdqvxw2e6nu5noe36ndmoem7gbi3skzpwmoy",
    "arc_tx": "3919bedc121c39542bdaa9b2196e0152cc9771c6ddd0a5f4be70f9d5d083ed7d",
    "market_tx": null,
    "error": null,
    "summary": "Toyota Motor exhibits strong fundamental value with a P/E of 9.5x and a 3.3% dividend yield. Strategic investments in North America and technical bottoming at the 2800 JPY level support a long-term bullish outlook, despite short-term cost pressures.",
    "reasoning_blocks": [
      {
        "agent_role": "fundamental_analyst",
        "input_data_summary": "トヨタ自動車(7203.T)の直近株価推移と財務・ニュース分析",
        "thought_process": "トヨタ自動車の株価は5月8日に2874円まで急落した後、直近では3085円まで回復しており、V字型の短期反発を見せている。ファンダメンタルズ面では、PERが10倍を下回る水準（Forward PE 9.5倍）であり、バリュエーションは割安圏にある。ROE 10.2%や3.3%の配当利回りは、機関投資家にとって魅力的な水準。懸念材料としては、自動車セクター全体の競争激化（ホンダの損失計上など）や、テキサス工場への20億ドル規模の巨額投資に伴うキャッシュフローへの圧力がある。しかし、北米での生産能力増強は中長期的なシェア拡大に寄与すると判断される。テクニカル的には、2800円台後半で強力なサポートが確認され、出来高を伴った上昇は買い意欲の強さを示唆している。マクロ環境として、円安基調が輸出企業である同社に追い風となる一方、金利上昇リスクには注意が必要。総じて、割安なバリュエーションと北米戦略の進展を評価し、押し目買いの好機と判断する。",
        "analysis": "トヨタ自動車は、PER約9.5倍と割安水準にあり、3.3%の配当利回りが下値を支えています。直近の株価は2800円台後半で底打ちし、出来高を伴い3000円台を回復しました。テキサス工場への20億ドルの投資は短期的にはコスト増ですが、北米市場での競争力強化に直結します。競合他社の苦戦を尻目に、強固な財務基盤とグローバルな生産体制を背景とした安定成長が期待でき、現在の株価水準は中長期的なエントリーポイントとして魅力的です。",
        "analysis_en": "Toyota Motor is trading at an attractive valuation with a forward P/E of 9.5x, supported by a 3.3% dividend yield. The stock bottomed in the 2,800 JPY range and has recovered to the 3,000 JPY level on strong volume. While the $2 billion investment in the Texas plant increases short-term costs, it strengthens long-term competitiveness in North America. Given its robust financial position and global production scale, Toyota remains well-positioned for growth, making current levels an attractive entry point for long-term investors.",
        "conclusion": "割安なバリュエーションと北米での戦略的投資を背景に、中長期的な買い推奨を維持する。",
        "confidence": 0.85,
        "language": "ja"
      },
      {
        "agent_role": "technical_analyst",
        "input_data_summary": "トヨタ自動車(7203.T)の直近10日間の株価推移と財務・ニュース分析",
        "thought_process": "トヨタ自動車（7203.T）の直近10日間の値動きを分析すると、5月8日に2874円まで急落したものの、その後は明確なリバウンド基調に転じています。5月15日には3085円まで回復し、直近の安値圏からの脱出に成功しました。テクニカル的には、5月8日の出来高急増（7500万株超）がセリングクライマックスを示唆しており、大口投資家による押し目買いが機能したと推察されます。ファンダメンタルズ面では、PERが10倍を下回る水準（Forward PE 9.51）であり、バリュエーションは割安圏です。テキサス工場への20億ドルの投資計画は、中長期的な北米市場での競争力強化を示唆しており、短期的にはコスト増の懸念があるものの、長期的にはポジティブな材料です。ROE 10.23%や配当利回り3.32%は安定した株主還元を示しており、マクロ環境が安定すれば、3100円のレジスタンスラインを突破し、さらなる上昇が期待できる局面です。ただし、自動車業界全体の競争激化や為替リスクには留意が必要です。",
        "analysis": "株価は5月8日の安値を底に力強い反発を見せており、テクニカル的には底打ちを確認しました。PER 9.5倍というバリュエーションは割安感が強く、北米への積極投資は中長期的な成長戦略として評価できます。3000円台の定着が当面の焦点であり、出来高を伴った上昇は買い意欲の強さを示しています。配当利回りも魅力的で、押し目買いが有効な局面と判断します。",
        "analysis_en": "The stock has shown a strong rebound from the May 8th low, confirming a technical bottom. With a Forward PE of 9.5x, the valuation is attractive, and the $2 billion investment in Texas is a positive long-term growth signal. The focus is now on consolidating above the 3,000 JPY level, supported by strong volume. Given the solid dividend yield, the current trend supports a 'buy on dips' strategy.",
        "conclusion": "テクニカル的な底打ちと割安なバリュエーションから、押し目買いを推奨する強気スタンスを維持します。",
        "confidence": 0.85,
        "language": "ja"
      }
    ],
    "price": "3,085.00",
    "metadata": {
      "trace_hash": "0x3919bedc...",
      "ipfs_cid": "bafkreihxxl5xslt4bsjv4fimuvlenvbdt4kwxi4cjr32p42vi4gk7zecpq",
      "arc_tx": "3919bedc121c39542bdaa9b2196e0152cc9771c6ddd0a5f4be70f9d5d083ed7d",
      "arc_explorer": "https://testnet.arcscan.app/tx/3919bedc121c39542bdaa9b2196e0152cc9771c6ddd0a5f4be70f9d5d083ed7d"
    }
  }
];

export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  return res.status(200).json(LIVE_DATA);
}
