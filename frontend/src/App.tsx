import React from 'react'
import { Layout, type Tab } from './components/Layout'
import { HeroSection } from './components/HeroSection'
import { DesksView } from './components/DesksView'
import { LiveFeedView } from './components/LiveFeedView'
import { RegistryTable } from './components/RegistryTable'
import { AboutView } from './components/AboutView'
import { DeskProps } from './components/DeskCard'

// Normalize raw API payload → DeskProps
function normalizeDesk(raw: Record<string, unknown>): DeskProps {
  const thesis = (raw.thesis as Record<string, unknown>) ?? {}
  const metadata = (raw.metadata as Record<string, unknown>) ?? {}
  return {
    desk: String(raw.desk ?? '').toLowerCase(),
    ticker: String(raw.ticker ?? ''),
    direction: (raw.direction ?? 'NEUTRAL') as DeskProps['direction'],
    confidence: Number(raw.confidence ?? 0),
    summary: String(
      raw.summary ?? thesis.thesis_summary_en ?? thesis.thesis_summary ?? ''
    ),
    question: String(raw.question ?? ''),
    price: raw.price ? String(raw.price) : undefined,
    ipfs_thesis_cid: String(metadata.ipfs_cid ?? raw.ipfs_thesis_cid ?? ''),
    arc_tx: String(metadata.arc_tx ?? raw.arc_tx ?? ''),
    reasoning_blocks:
      (raw.reasoning_blocks as DeskProps['reasoning_blocks']) ??
      ((thesis.reasoning as unknown[]) ?? []).map((r: unknown) => {
        const rb = r as Record<string, unknown>
        return {
          agent_role: String(rb.role ?? rb.agent_role ?? 'Analyst'),
          input_data_summary: String(rb.input_data_summary ?? ''),
          thought_process: String(rb.thought_process ?? ''),
          analysis: String(rb.content ?? rb.analysis ?? ''),
          analysis_en: String(rb.analysis_en ?? (rb.language === 'en' ? (rb.content ?? rb.analysis) : '') ?? ''),
          conclusion: String(rb.conclusion ?? ''),
          confidence: Number(rb.confidence ?? 0),
          language: String(rb.language ?? 'en'),
        }
      }),
  }
}

// Rich seed data — five desks across regions and languages
const SEED_DATA: DeskProps[] = [
  {
    desk: 'us', ticker: 'AAPL', direction: 'NEUTRAL', confidence: 0.70,
    summary: 'Apple Inc maintains exceptional balance sheet strength with $160B in cash, but Services growth is decelerating and EU regulatory headwinds cap upside in the near term.',
    question: "Will Apple's stock price stay between $268.59 and $327.83 at the close of trading on August 12, 2026?",
    price: '$298.21',
    ipfs_thesis_cid: 'bafkreiczizrctmcsktor7lpojdkvgjgiqz6py7cyvsewefvi2vvojdhsxy',
    arc_tx: '0x46d3f229dde7949d8f3a91c2b5d4e7f8a1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6',
    reasoning_blocks: [
      {
        agent_role: 'fundamental_analyst',
        input_data_summary: 'Q1-2026 10-Q, revenue segments, debt-to-equity ratios.',
        thought_process: 'Cash position vs debt: $160B is a massive moat. Services growth deceleration to 12% YoY (from 14%) is the main concern. China sales show stabilization but no breakout.',
        analysis: 'Balance sheet exceptionally strong with $160B cash. Services growth decelerating slightly to 12% YoY. iPhone demand in China stabilizing but not aggressively growing.',
        analysis_en: 'Balance sheet exceptionally strong with $160B cash. Services growth decelerating slightly to 12% YoY. iPhone demand in China stabilizing but not aggressively growing.',
        conclusion: 'Stable fundamentals, low near-term catalysts.',
        confidence: 0.85, language: 'en',
      },
      {
        agent_role: 'sentiment_analyst',
        input_data_summary: 'News sentiment Reuters/Bloomberg, retail social volume.',
        analysis: 'Sentiment polarized. Institutional caution on EU antitrust rulings. Retail social volume at 6-month low — no FOMO.',
        analysis_en: 'Sentiment polarized. Institutional caution on EU antitrust rulings. Retail social volume at 6-month low — no FOMO.',
        conclusion: 'Neutral with regulatory downside.',
        confidence: 0.65, language: 'en',
      },
    ],
  },
  {
    desk: 'crypto', ticker: 'BTC', direction: 'LONG', confidence: 0.73,
    summary: 'Bitcoin shows bullish divergence on the daily chart. ETF inflows averaging $200M/day, exchange reserves at 4-year low — supply tightening clearly visible on-chain.',
    question: 'Will the price of Bitcoin (BTC) be above $81,161.37 on August 12, 2026?',
    price: '$81,161.37',
    ipfs_thesis_cid: 'bafkreih4hdaywmd6fzx5fqmzs2dahwsh4crm6ygjb7u5x6epw7dbnhcfly',
    arc_tx: '0xde9742adb8b2d6748a9b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f',
    reasoning_blocks: [
      {
        agent_role: 'fundamental_analyst',
        input_data_summary: 'On-chain HODL waves, exchange reserves, hash rate.',
        analysis: 'Exchange reserves at 4-year low — supply squeeze. Spot ETF inflows averaging $200M/day. Network security at all-time high.',
        analysis_en: 'Exchange reserves at 4-year low — supply squeeze. Spot ETF inflows averaging $200M/day. Network security at all-time high.',
        conclusion: 'Strong supply-side constraints favor appreciation.',
        confidence: 0.75, language: 'en',
      },
    ],
  },
  {
    desk: 'cn', ticker: '600519.SH', direction: 'LONG', confidence: 0.80,
    summary: "Guizhou Moutai's net profit growth of 19% YoY and exceptional brand equity in the A-share market signal high resilience even in soft consumer environments.",
    question: 'Will the closing price of 600519.SH be above ¥1,342.17 on August 12, 2026?',
    price: '¥1,342.17',
    ipfs_thesis_cid: 'bafkreidfpqunecfgywwmoiwmifwx3naxlkrawaftb2dslebogwld4lk7ly',
    arc_tx: '0x68cd29919058b01f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f',
    reasoning_blocks: [
      {
        agent_role: 'fundamental_analyst',
        input_data_summary: '2025年度报告, 净利润增长率, 现金流分析',
        analysis: '贵州茅台展现了极强的定价权和品牌壁垒。净利润同比增长19%，现金流状况极佳。在当前消费环境下，高端白酒的抗风险能力尤为突出。',
        analysis_en: 'Moutai exhibits exceptional pricing power and brand moats. Net profit grew 19% YoY with excellent cash flow. In the current consumer environment, high-end spirits show notable resilience.',
        conclusion: '核心基本面极其稳固，具备估值修复空间。',
        confidence: 0.90, language: 'zh',
      },
    ],
  },
  {
    desk: 'eu', ticker: 'MC.PA', direction: 'LONG', confidence: 0.85,
    summary: 'LVMH demonstrates robust fundamental quality with high ROE and resilient operating margins above 25%, acting as a defensive luxury compounder.',
    question: 'Will LVMH (MC.PA) close above €460.85 on August 12, 2026?',
    price: '€460.85',
    ipfs_thesis_cid: 'bafkreihn6r7uxwed7cxdpfap5ercfujciphxecdjj2gqmwkwymysugdrrq',
    arc_tx: '0xe88da05c35d8a5b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9',
    reasoning_blocks: [
      {
        agent_role: 'fundamental_analyst',
        input_data_summary: 'FY2025 revenue by division (Fashion & Leather vs Wines).',
        analysis: 'Margins above 25% despite global headwinds. Leather goods division continues to outperform. Geographic diversification provides natural hedge.',
        analysis_en: 'Margins above 25% despite global headwinds. Leather goods division continues to outperform. Geographic diversification provides natural hedge.',
        conclusion: 'Top-tier luxury asset with high margin defense.',
        confidence: 0.88, language: 'en',
      },
    ],
  },
  {
    desk: 'jp', ticker: '7203.T', direction: 'LONG', confidence: 0.85,
    summary: "Toyota Motor exhibits strong fundamental support with P/E under 10x and stable dividend yield amid global EV transition. Yen weakness is structurally supportive of export earnings.",
    question: 'Will Toyota Motor (7203.T) close above ¥3,000 on the Tokyo Stock Exchange on August 12, 2026?',
    price: '¥3,008.00',
    ipfs_thesis_cid: 'bafkreicercv2sath63vewn2ihcafrr3cjnhby3x6owt5mxryio6z5u6osu',
    arc_tx: '0x2ec25a82fea300f9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3',
    reasoning_blocks: [
      {
        agent_role: 'macro_analyst',
        input_data_summary: '日銀（BoJ）金利政策, 円相場動向',
        analysis: '円安傾向はトヨタの輸出利益を押し上げている。一方で、原材料コストの上昇も無視できないが、ハイブリッド車（HEV）の需要が世界的に再燃していることは強力な追い風である。',
        analysis_en: 'Yen weakness boosts export margins. Global resurgence in HEV demand is a strong tailwind despite rising material costs.',
        conclusion: 'マクロ環境はトヨタの多角的なパワートレイン戦略に有利に働いている。',
        confidence: 0.80, language: 'ja',
      },
    ],
  },
]

function App() {
  const [activeTab, setActiveTab] = React.useState<Tab>('desks')
  const [data, setData] = React.useState<DeskProps[]>(SEED_DATA)
  const [loading, setLoading] = React.useState(true)
  const mainRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/results')
        const json = await res.json()
        if (Array.isArray(json) && json.length > 0) {
          const merged = json.map(normalizeDesk)
          // Merge fetched with seed: prefer fetched, but keep seed entries for missing desks
          const fetchedDesks = new Set(merged.map(d => d.desk))
          const final = [
            ...merged,
            ...SEED_DATA.filter(s => !fetchedDesks.has(s.desk)),
          ]
          setData(final)
        }
      } catch {
        // Silently keep seed data
      } finally {
        setLoading(false)
      }
    }
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleScrollDown = () => {
    if (mainRef.current) {
      // Scroll to the content, offsetting for the fixed header
      const y = mainRef.current.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  }

  const handleTabChange = (tab: Tab | 'home') => {
    setActiveTab(tab === 'home' ? 'desks' : tab)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const latestHash = data[0]?.arc_tx

  return (
    <Layout activeTab={activeTab} onTabChange={handleTabChange}>
      {activeTab === 'desks' && <HeroSection latestHash={latestHash} onScrollDown={handleScrollDown} />}

      <div ref={mainRef} className="w-full max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 pt-12 pb-16">
        {/* Section header */}
        {activeTab !== 'desks' && (
          <div className="mb-10">
            <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-brand-red mb-3">
              {activeTab === 'feed' && 'Real-Time Stream'}
              {activeTab === 'registry' && 'On-Chain Provenance'}
              {activeTab === 'about' && 'About'}
            </p>
            <h1 className="font-display text-4xl md:text-5xl text-text-primary leading-tight">
              {activeTab === 'feed' && (<>The reasoning, <em className="text-brand-red">as it happens.</em></>)}
              {activeTab === 'registry' && (<>Every thesis, <em className="text-brand-red">permanently recorded.</em></>)}
              {activeTab === 'about' && 'About Rosetta Alpha'}
            </h1>
          </div>
        )}

        <div key={activeTab} className="fade-up">
          {activeTab === 'desks' && <DesksView desks={data} loading={loading} />}
          {activeTab === 'feed' && <LiveFeedView desks={data} loading={loading} />}
          {activeTab === 'registry' && <RegistryTable desks={data} />}
          {activeTab === 'about' && <AboutView />}
        </div>
      </div>
    </Layout>
  )
}

export default App
