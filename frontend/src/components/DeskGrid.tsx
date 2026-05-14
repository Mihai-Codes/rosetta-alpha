import React from 'react'
import { DeskCard, DeskProps } from './DeskCard'

export const MOCK_DATA: DeskProps[] = [
  {
    desk: 'US',
    ticker: 'AAPL',
    direction: 'NEUTRAL',
    confidence: 0.70,
    summary: 'Apple Inc is a prominent player in the technology sector with a strong market presence, but faces mixed sentiment and regulatory headwind.',
    question: "Will Apple Inc's stock price be between $268.59 and $327.83 at the close of trading on 2026-08-12?",
    price: '$298.21',
    ipfs_thesis_cid: 'bafkreiczizrctmcsktor7lpojdkvgjgiqz6py7cyvsewefvi2vvojdhsxy',
    arc_tx: '0x46d3f229dde7949d000000000000000000000000000000000000000000000000',
    reasoning_blocks: [
      {
        agent_role: 'fundamental_analyst',
        input_data_summary: 'Q1-2026 10-Q filing, revenue segments, and debt-to-equity ratios.',
        thought_process: 'Checking cash reserves vs debt... $160B cash is a massive moat. Decelerating services growth is the main concern. Comparing China sales with last quarter... slight improvement but not a breakout. Conclusion: AAPL is a safe haven but growth is currently capped.',
        analysis: 'Balance sheet remains exceptionally strong with $160B cash. However, Services growth is decelerating slightly to 12% YoY from 14%. iPhone demand in China shows signs of stabilization but no aggressive growth.',
        conclusion: 'Stable fundamentals with low near-term catalysts.',
        confidence: 0.85,
        language: 'en'
      },
      {
        agent_role: 'sentiment_analyst',
        input_data_summary: 'News sentiment from Reuters, Bloomberg, and retail social volume.',
        analysis: 'Public sentiment is polarized. Institutional investors are cautious regarding upcoming antitrust rulings in the EU. Retail social volume is at a 6-month low, indicating a lack of retail FOMO.',
        conclusion: 'Neutral sentiment with downside regulatory risks.',
        confidence: 0.65,
        language: 'en'
      }
    ]
  },
  {
    desk: 'CRYPTO',
    ticker: 'BTC',
    direction: 'LONG',
    confidence: 0.65,
    summary: "Bitcoin's widespread adoption, high liquidity, and positive sentiment driven by a strong development ecosystem suggest long-term growth.",
    question: 'Will the price of Bitcoin (BTC) be above $81,161.37 on 2026-08-12?',
    price: '$81,161.37',
    ipfs_thesis_cid: 'bafkreih4hdaywmd6fzx5fqmzs2dahwsh4crm6ygjb7u5x6epw7dbnhcfly',
    arc_tx: '0xde9742adb8b2d674000000000000000000000000000000000000000000000000',
    reasoning_blocks: [
      {
        agent_role: 'fundamental_analyst',
        input_data_summary: 'On-chain HODL waves, exchange reserves, and hash rate.',
        analysis: 'Exchange reserves have reached a 4-year low, indicating a supply squeeze. Institutional inflows via Spot ETFs have averaged $200M/day over the last week. Network security is at an all-time high.',
        conclusion: 'Strong supply-side constraints favor price appreciation.',
        confidence: 0.75,
        language: 'en'
      }
    ]
  },
  {
    desk: 'CN',
    ticker: '600519.SH',
    direction: 'LONG',
    confidence: 0.80,
    summary: "Guizhou Moutai's recent net profit and revenue growth indicate a positive market sentiment, with strong brand equity in the A-share market.",
    question: 'Will the closing price of 600519.SH be above 1,342.17 on 2026-08-12?',
    price: '¥1,342.17',
    ipfs_thesis_cid: 'bafkreidfpqunecfgywwmoiwmifwx3naxlkrawaftb2dslebogwld4lk7ly',
    arc_tx: '0x68cd29919058b01f000000000000000000000000000000000000000000000000',
    reasoning_blocks: [
      {
        agent_role: 'fundamental_analyst',
        input_data_summary: '2025年度报告, 净利润增长率, 现金流分析',
        analysis: '贵州茅台展现了极强的定价权和品牌壁垒。净利润同比增长19%，现金流状况极佳。在当前消费环境下，高端白酒的抗风险能力尤为突出。',
        analysis_en: 'Moutai shows extreme pricing power and brand moats. Net profit grew 19% YoY with excellent cash flow. In current macro, high-end spirits show strong resilience.',
        conclusion: '核心基本面极其稳固，具备估值修复空间。',
        confidence: 0.90,
        language: 'zh'
      }
    ]
  },
  {
    desk: 'EU',
    ticker: 'MC.PA',
    direction: 'LONG',
    confidence: 0.85,
    summary: "LVMH demonstrates robust fundamental quality with high ROE and resilient operating margins, acting as a defensive luxury compounder.",
    question: 'Will the stock price of LVMH (MC.PA) be above 460.85 at the close of trading on 2026-08-12?',
    price: '€460.85',
    ipfs_thesis_cid: 'bafkreihn6r7uxwed7cxdpfap5ercfujciphxecdjj2gqmwkwymysugdrrq',
    arc_tx: '0xe88da05c35d8a5b5000000000000000000000000000000000000000000000000',
    reasoning_blocks: [
      {
        agent_role: 'fundamental_analyst',
        input_data_summary: 'FY2025 revenue by division (Fashion & Leather vs Wines).',
        analysis: 'LVMH margins remain above 25% despite global headwinds. Leather goods division continues to outperform. Geographic diversification provides a natural hedge.',
        conclusion: 'Top-tier luxury asset with high margin defense.',
        confidence: 0.88,
        language: 'en'
      }
    ]
  },
  {
    desk: 'JP',
    ticker: '7203.T',
    direction: 'LONG',
    confidence: 0.85,
    summary: "Toyota Motor exhibits strong fundamental support with a P/E ratio under 10x and a stable dividend yield amid global EV transition.",
    question: 'Will the closing price of Toyota Motor (7203.T) on the Tokyo Stock Exchange be above 3,000 JPY on 2026-08-12?',
    price: '¥3,008.00',
    ipfs_thesis_cid: 'bafkreicercv2sath63vewn2ihcafrr3cjnhby3x6owt5mxryio6z5u6osu',
    arc_tx: '0x2ec25a82fea300f9000000000000000000000000000000000000000000000000',
    reasoning_blocks: [
      {
        agent_role: 'macro_analyst',
        input_data_summary: '日銀（BoJ）金利政策, 円相场動向',
        analysis: '円安倾向はトヨタの輸出利益を押し上げている。一方で、原材料コストの上昇も無視できないが、ハイブリッド車（HEV）の需要が世界的に再燃していることは強力な追い风である。',
        analysis_en: 'Yen weakness boosts export margins. Global resurgence in HEV demand is a strong tailwind despite rising material costs.',
        conclusion: 'マクロ環境はトヨタの多角的なパワートレイン戦略に有利に働いている。',
        confidence: 0.80,
        language: 'ja'
      }
    ]
  }
]

export function DeskGrid({ data }: { data: DeskProps[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
      {data.map((desk) => (
        <DeskCard key={desk.ticker} desk={desk} />
      ))}
    </div>
  )
}
