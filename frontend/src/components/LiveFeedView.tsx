'use client'

import React from 'react'
import posthog from 'posthog-js'
import { TrendingUp, TrendingDown, Minus, ChevronDown, ExternalLink, Database, Link2 } from 'lucide-react'
import { DeskProps } from './DeskCard'
import { regionMeta, formatRelative, truncateHash } from '../lib/format'
import { FeedItemSkeleton } from './SkeletonLoader'
import { ProvenanceChain } from './ProvenanceChain'
import { SidePanel } from './SidePanel'
import { MobMeter } from './MobMeter'
import { ContagionAlert } from './ContagionAlert'
import { backendApiUrl } from '@/lib/api'

type Direction = 'ALL' | 'LONG' | 'SHORT' | 'NEUTRAL'

interface FeedEntry extends DeskProps {
  timestamp: number
}

interface LiveFeedViewProps {
  desks: DeskProps[]
  loading: boolean
}

export function LiveFeedView({ desks, loading }: LiveFeedViewProps) {
  const [regionFilter, setRegionFilter] = React.useState<string>('ALL')
  const [directionFilter, setDirectionFilter] = React.useState<Direction>('ALL')
  const [highDivergenceOnly, setHighDivergenceOnly] = React.useState<boolean>(false)
  const [divergenceScores, setDivergenceScores] = React.useState<Record<string, number>>({})
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set())
  const [selectedProvenance, setSelectedProvenance] = React.useState<DeskProps | null>(null)

  const [now, setNow] = React.useState<number | null>(null)
  React.useEffect(() => { setNow(Date.now()) }, [])

  React.useEffect(() => {
    // Fetch divergence scores for all unique tickers in background
    const tickers = Array.from(new Set(desks.map(d => d.ticker))).filter(Boolean)
    tickers.forEach(async (ticker) => {
      try {
        const res = await fetch(backendApiUrl('/api/v1/divergence', { ticker }))
        if (res.ok) {
          const json = await res.json()
          if (typeof json.composite_divergence === 'number') {
            setDivergenceScores(prev => ({
              ...prev,
              [ticker.toUpperCase()]: json.composite_divergence
            }))
          }
        }
      } catch (err) {
        console.error("Failed to fetch divergence score for ticker:", ticker, err)
      }
    })
  }, [desks])

  const entries: FeedEntry[] = React.useMemo(
    () =>
      desks
        .map((d, i) => ({ ...d, timestamp: (now ?? 1716508800000) - i * 90_000 })) // fallback to static time for SSR
        .filter(e => regionFilter === 'ALL' || e.desk.toLowerCase() === regionFilter)
        .filter(e => directionFilter === 'ALL' || e.direction === directionFilter)
        .filter(e => {
          if (!highDivergenceOnly) return true
          const tickerKey = (e.ticker || '').toUpperCase().trim()
          const score = divergenceScores[tickerKey] ?? 0
          return score >= 40
        }),
    [desks, regionFilter, directionFilter, highDivergenceOnly, divergenceScores, now]
  )

  const regions = ['ALL', ...Array.from(new Set(desks.map(d => d.desk.toLowerCase())))]
  const primaryTicker = entries[0]?.ticker || desks[0]?.ticker

  const toggleExpand = (key: string, desk?: string, ticker?: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      const opening = !next.has(key)
      opening ? next.add(key) : next.delete(key)
      if (opening && desk && ticker) {
        posthog.capture('feed_trace_expanded', { region: desk, ticker })
      }
      return next
    })
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <ContagionAlert />

      {/* ── Filters ── */}
      <div className="flex flex-col gap-3 pb-4 border-b border-border">
        {/* Region — horizontal scroll pill bar on mobile */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-[0.25em] text-text-tertiary shrink-0">
            Region
          </span>
          <div className="relative flex-1">
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide snap-x pb-1">
              {regions.map(r => {
                const isActive = regionFilter === r
                const meta = r === 'ALL' ? null : regionMeta(r)
                return (
                  <button
                    key={r}
                    onClick={() => setRegionFilter(r)}
                    className={`shrink-0 snap-start px-3 py-2 min-h-[44px] text-[10px] font-medium uppercase tracking-[0.18em] border transition-all ${
                      isActive
                        ? 'border-brand-red text-brand-red'
                        : 'border-border text-text-secondary hover:text-text-primary hover:border-border-strong'
                    }`}
                    style={isActive && meta ? { borderColor: meta.color, color: meta.color } : undefined}
                  >
                    {r === 'ALL' ? 'All' : (meta?.flag ? `${meta.flag} ` : '') + (meta?.name ?? r)}
                  </button>
                )
              })}
            </div>
            <div className="pointer-events-none absolute right-0 top-0 h-full w-10 bg-gradient-to-l from-bg-primary to-transparent sm:hidden" />
          </div>
        </div>

        {/* Direction — horizontal scroll pill bar on mobile */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
          <div className="flex items-center gap-2 flex-1">
            <span className="text-[10px] uppercase tracking-[0.25em] text-text-tertiary shrink-0">
              Signal
            </span>
            <div className="relative flex-1">
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide snap-x pb-1">
                {(['ALL', 'LONG', 'SHORT', 'NEUTRAL'] as Direction[]).map(d => (
                  <button
                    key={d}
                    onClick={() => setDirectionFilter(d)}
                    className={`shrink-0 snap-start px-3 py-2 min-h-[44px] text-[10px] font-medium uppercase tracking-[0.18em] border transition-all ${
                      directionFilter === d
                        ? 'border-brand-red text-brand-red'
                        : 'border-border text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {d === 'ALL' ? 'All' : d}
                  </button>
                ))}
              </div>
              <div className="pointer-events-none absolute right-0 top-0 h-full w-10 bg-gradient-to-l from-bg-primary to-transparent sm:hidden" />
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setHighDivergenceOnly(!highDivergenceOnly)}
              className={`px-3 py-2 min-h-[44px] text-[10px] font-medium uppercase tracking-[0.18em] border transition-all ${
                highDivergenceOnly
                  ? 'bg-brand-red/10 border-brand-red text-brand-red'
                  : 'border-border text-text-secondary hover:text-text-primary hover:border-border-strong'
              }`}
            >
              HIGH DIVERGENCE (≥40)
            </button>
          </div>
        </div>
      </div>

      {primaryTicker && (
        <MobMeter ticker={primaryTicker} compact />
      )}

      {/* ── Feed ── */}
      <div className="solid-panel overflow-hidden">
        {loading ? (
          <>
            <FeedItemSkeleton />
            <FeedItemSkeleton />
            <FeedItemSkeleton />
          </>
        ) : entries.length === 0 ? (
          <div className="p-12 sm:p-16 text-center">
            <p className="font-display text-xl text-text-tertiary">No traces match filters</p>
            <p className="text-[11px] uppercase tracking-[0.25em] text-text-tertiary/60 mt-2">
              Try widening your selection
            </p>
          </div>
        ) : (
          entries.map((e, i) => {
            const meta = regionMeta(e.desk)
            const key = `${e.desk}-${e.ticker}-${i}`
            const isOpen = expanded.has(key)
            const isLong = e.direction === 'LONG'
            const isShort = e.direction === 'SHORT'
            const dirColor = isLong ? '#22C55E' : isShort ? '#D82B2B' : '#888888'

            return (
              <div
                key={key}
                className={`relative border-b border-border last:border-b-0 transition-colors duration-200 group hover:bg-white/[0.03] cursor-pointer ${i === 0 ? 'bg-white/[0.01]' : ''}`}
                onClick={() => toggleExpand(key, e.desk, e.ticker)}
              >
                <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ backgroundColor: meta.color }} />
                <div className="w-full flex flex-col relative h-full pl-[3px]">
                  <div className="w-full flex items-start gap-3 sm:gap-4 p-4 sm:p-5 pb-2 text-left min-h-[44px]">
                  {/* Timestamp + region — hidden on mobile, shown as col on sm+ */}
                  <div className="hidden sm:block w-28 lg:w-32 shrink-0 space-y-1">
                    <p className="font-mono text-[10px] text-text-tertiary">
                      {formatRelative(e.timestamp)}
                    </p>
                    <p
                      className="text-[10px] font-medium uppercase tracking-[0.18em]"
                      style={{ color: meta.color }}
                    >
                      {meta.flag} {meta.name}
                    </p>
                  </div>

                  {/* Asset + thesis */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    {/* Mobile: region + time inline */}
                    <div className="flex items-center gap-2 sm:hidden">
                      <span
                        className="text-[10px] font-medium uppercase tracking-[0.18em]"
                        style={{ color: meta.color }}
                      >
                        {meta.flag} {meta.name}
                      </span>
                      <span className="text-text-tertiary">·</span>
                      <span className="font-mono text-[10px] text-text-tertiary">
                        {formatRelative(e.timestamp)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                      <span className="font-display text-base sm:text-lg text-text-primary">{e.ticker}</span>
                      <span
                        className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-[0.2em]"
                        style={{ color: dirColor }}
                      >
                        {isLong && <TrendingUp className="w-3 h-3" />}
                        {isShort && <TrendingDown className="w-3 h-3" />}
                        {!isLong && !isShort && <Minus className="w-3 h-3" />}
                        {e.direction}
                      </span>
                      <span className="font-mono text-[10px] text-text-tertiary">
                        {(e.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                    <p className="text-sm text-text-secondary font-light line-clamp-2 leading-relaxed">
                      {e.summary}
                    </p>

                    {/* Conviction Meter */}
                    <div className="mt-4 pt-2">
                      <div className="flex justify-between items-end mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">Model Conviction</span>
                      </div>
                      <div className="w-full bg-bg-secondary h-2 rounded-full overflow-hidden border border-text-secondary shadow-inner">
                        <div className="bg-gradient-to-r from-[#D82B2B] to-[#D82B2B] h-full transition-all duration-1000 ease-out" style={{ width: `${(e.confidence * 100).toFixed(0)}%` }} />
                      </div>
                    </div>
                  </div>

                  {/* Arc Tx — desktop only */}
                  {e.arc_tx && e.arc_tx.length > 20 && !e.arc_tx.startsWith("0xmock") && (
                    <div className="hidden lg:flex flex-col items-end gap-1 shrink-0">
                      <p className="text-[9px] uppercase tracking-[0.25em] text-text-tertiary">Arc L1 Tx</p>
                      <a
                        href={`https://arcscan.app/tx/${e.arc_tx}`}
                        target="_blank" rel="noopener noreferrer"
                        
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium text-[#CCCCCC] bg-bg-secondary border border-text-secondary rounded hover:bg-bg-secondary transition-colors font-mono"
                        onClick={(event) => event.stopPropagation()}
                      >
                        Arc L1 <ExternalLink size={10} />
                      </a>
                    </div>
                  )}

                  {e.ipfs_thesis_cid && e.ipfs_thesis_cid.length > 20 && (
                    <div className="hidden lg:flex flex-col items-end gap-1 shrink-0 ml-4">
                       <p className="text-[9px] uppercase tracking-[0.25em] text-text-tertiary">IPFS</p>
                       <a
                        href={`https://gateway.pinata.cloud/ipfs/${e.ipfs_thesis_cid}`}
                        target="_blank" rel="noopener noreferrer"
                        
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium text-[#CCCCCC] bg-bg-secondary border border-text-secondary rounded hover:bg-bg-secondary transition-colors font-mono"
                        onClick={(event) => event.stopPropagation()}
                       >
                         <Database size={10} /> IPFS
                       </a>
                    </div>
                  )}

                  <ChevronDown
                    className={`w-4 h-4 text-text-tertiary shrink-0 mt-0.5 transition-transform duration-300 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </div>

                <div className="px-4 sm:px-5 flex justify-end relative z-10 mt-2">
                  <button
                    type="button"
                    
                    onClick={(ev) => {
                      ev.stopPropagation();
                      if (!e.ipfs_thesis_cid) return
                      setSelectedProvenance(e)
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-brand-red/40 text-brand-red hover:bg-brand-red hover:text-white transition-colors text-[10px] uppercase tracking-[0.2em]"
                  >
                    <Link2 className="w-3 h-3" />
                    View Chain
                  </button>
                </div>

                {/* Expanded reasoning — pl-4 on mobile, pl-[10rem] on sm+ */}
                {isOpen && (
                  <div className="px-4 sm:px-5 pb-4 sm:pb-5 pl-4 sm:pl-[10rem] space-y-3">
                    {e.reasoning_blocks.map((b, j) => (
                      <div
                        key={j}
                        className="border-l pl-4 py-1"
                        style={{ borderColor: meta.color + '40' }}
                      >
                        <p
                          className="text-[10px] font-medium uppercase tracking-[0.2em] mb-1"
                          style={{ color: meta.color }}
                        >
                          {b.agent_role.replace(/_/g, ' ')}
                        </p>
                        <p className="text-sm text-text-secondary font-light leading-relaxed">
                          {b.analysis_en || b.analysis}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {selectedProvenance && (
        <SidePanel
          isOpen={Boolean(selectedProvenance)}
          onClose={() => setSelectedProvenance(null)}
          title={`${selectedProvenance.ticker} · ${selectedProvenance.desk.toUpperCase()}`}
          subtitle="Analyze → Hash → Pin → Stake → Record → Market"
        >
          <ProvenanceChain
            cid={selectedProvenance.ipfs_thesis_cid}
            desk={selectedProvenance.desk}
            ticker={selectedProvenance.ticker}
            model="multi-agent"
            arcTx={selectedProvenance.arc_tx}
            question={selectedProvenance.question}
          />
        </SidePanel>
      )}
    </div>
  )
}
