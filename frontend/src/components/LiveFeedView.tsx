import React from 'react'
import { TrendingUp, TrendingDown, Minus, ChevronDown } from 'lucide-react'
import { DeskProps } from './DeskCard'
import { regionMeta, formatRelative, truncateHash } from '../lib/format'
import { FeedItemSkeleton } from './SkeletonLoader'

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
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set())

  // Derive synthetic timestamps for the demo (newest first)
  const entries: FeedEntry[] = React.useMemo(
    () =>
      desks
        .map((d, i) => ({ ...d, timestamp: Date.now() - i * 90_000 }))
        .filter(e => regionFilter === 'ALL' || e.desk.toLowerCase() === regionFilter)
        .filter(e => directionFilter === 'ALL' || e.direction === directionFilter),
    [desks, regionFilter, directionFilter]
  )

  const regions = ['ALL', ...Array.from(new Set(desks.map(d => d.desk.toLowerCase())))]

  const toggleExpand = (key: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex items-center justify-between gap-4 flex-wrap pb-4 border-b border-border">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] uppercase tracking-[0.25em] text-text-tertiary mr-2">
            Region
          </span>
          {regions.map(r => {
            const isActive = regionFilter === r
            const meta = r === 'ALL' ? null : regionMeta(r)
            return (
              <button
                key={r}
                onClick={() => setRegionFilter(r)}
                className={`px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] border transition-all ${
                  isActive
                    ? 'border-brand-red text-brand-red'
                    : 'border-border text-text-secondary hover:text-text-primary hover:border-border-strong'
                }`}
                style={isActive && meta ? { borderColor: meta.color, color: meta.color } : undefined}
              >
                {r === 'ALL' ? 'All' : meta?.name ?? r}
              </button>
            )
          })}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-[0.25em] text-text-tertiary mr-2">
            Direction
          </span>
          {(['ALL', 'LONG', 'SHORT', 'NEUTRAL'] as Direction[]).map(d => (
            <button
              key={d}
              onClick={() => setDirectionFilter(d)}
              className={`px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] border transition-all ${
                directionFilter === d
                  ? 'border-brand-red text-brand-red'
                  : 'border-border text-text-secondary hover:text-text-primary'
              }`}
            >
              {d === 'ALL' ? 'All' : d}
            </button>
          ))}
        </div>
      </div>

      {/* Feed */}
      <div className="glass-panel border border-border/20 rounded-2xl overflow-hidden shadow-none">
        {loading ? (
          <>
            <FeedItemSkeleton />
            <FeedItemSkeleton />
            <FeedItemSkeleton />
          </>
        ) : entries.length === 0 ? (
          <div className="p-16 text-center">
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
            const dirColor = isLong ? '#4A9F6F' : isShort ? '#9F4A4A' : '#7B8FA6'

            return (
              <div
                key={key}
                className="border-b border-white/[0.02] last:border-b-0 hover:bg-white/[0.03] transition-all duration-300"
              >
                <button
                  onClick={() => toggleExpand(key)}
                  className="w-full flex items-start gap-4 p-5 text-left"
                  style={{ borderLeft: `2px solid ${meta.color}` }}
                >
                  {/* Timestamp + region */}
                  <div className="w-32 shrink-0 space-y-1">
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
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-display text-lg text-text-primary">{e.ticker}</span>
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
                  </div>

                  {/* Trace hash */}
                  <div className="hidden lg:flex flex-col items-end gap-1 shrink-0">
                    <p className="text-[9px] uppercase tracking-[0.25em] text-text-tertiary">
                      Arc Tx
                    </p>
                    <p className="font-mono text-[10px] text-brand-red">
                      {truncateHash(e.arc_tx, 6, 4)}
                    </p>
                  </div>

                  <ChevronDown
                    className={`w-4 h-4 text-text-tertiary shrink-0 mt-1 transition-transform ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {/* Expanded reasoning */}
                {isOpen && (
                  <div
                    className="px-5 pb-5 pl-[10rem] space-y-3 fade-up"
                    style={{ animationDuration: '0.3s' }}
                  >
                    {e.reasoning_blocks.map((b, j) => (
                      <div
                        key={j}
                        className="border-l border-border pl-4 py-1"
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
            )
          })
        )}
      </div>
    </div>
  )
}
