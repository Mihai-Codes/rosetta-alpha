'use client'

import { NARRATIVE_COLORS, type NarrativeType } from '../lib/narrative-constants'

interface NarrativeBubble {
  id: string
  title: string
  type: NarrativeType
  intensity: number
  mentionsPerDay: number
  acceleration: number
  regionsPresent: string[]
  isDominant: boolean
}

export function NarrativeCloud({ narratives, ticker }: { narratives: NarrativeBubble[], ticker: string }) {
  if (!narratives.length) {
    return <div className="text-text-tertiary text-sm italic py-4">No active narratives for {ticker}</div>
  }

  // Sort by intensity descending for a structured heatmap
  const sorted = [...narratives].sort((a, b) => b.intensity - a.intensity)

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4 border-b border-border/50 pb-3">
        <h4 className="font-mono text-[11px] uppercase tracking-[0.2em] text-text-secondary">
          Narrative Heatmap — {ticker}
        </h4>
        <span className="text-[10px] text-text-tertiary font-mono">
          {narratives.length} Active Signals
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {sorted.map((narrative) => {
          const color = NARRATIVE_COLORS[narrative.type] || 'var(--color-border-strong)'
          
          return (
            <div
              key={narrative.id}
              className={`solid-panel bg-bg-secondary border p-5 flex flex-col justify-between transition-colors hover:bg-white/[0.03] ${narrative.isDominant ? 'border-warning shadow-[0_0_15px_rgba(245, 158, 11,0.1)]' : 'border-border'}`}
            >
              <div className="flex items-start justify-between gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                  <span className="font-mono text-[9px] uppercase tracking-widest" style={{ color }}>
                    {narrative.type.replace('_', ' ')}
                  </span>
                </div>
                {narrative.isDominant && (
                  <span className="text-[9px] font-bold uppercase tracking-widest text-warning bg-warning/10 px-2 py-0.5 border border-warning/20 rounded-sm">
                    Dominant
                  </span>
                )}
              </div>
              
              <p className="font-display text-[15px] text-text-primary leading-snug mb-5">
                {narrative.title}
              </p>

              <div className="grid grid-cols-3 gap-3 mt-auto border-t border-white/5 pt-4">
                <div>
                  <p className="text-[9px] uppercase tracking-[0.15em] text-text-tertiary mb-1">Intensity</p>
                  <p className="font-mono text-xs text-text-primary font-semibold">{(narrative.intensity * 100).toFixed(0)}%</p>
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-[0.15em] text-text-tertiary mb-1">Velocity</p>
                  <p className="font-mono text-xs text-text-primary font-semibold">{narrative.mentionsPerDay.toFixed(1)}/d</p>
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-[0.15em] text-text-tertiary mb-1">Accel</p>
                  <p className={`font-mono text-xs font-semibold ${narrative.acceleration > 0 ? 'text-positive' : 'text-negative'}`}>
                    {narrative.acceleration > 0 ? '+' : ''}{narrative.acceleration.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
