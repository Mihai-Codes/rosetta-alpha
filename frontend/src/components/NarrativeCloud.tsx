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

  // Sort by intensity descending
  const sorted = [...narratives].sort((a, b) => b.intensity - a.intensity)

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4 border-b border-border/50 pb-2">
        <h4 className="font-mono text-[11px] uppercase tracking-[0.2em] text-text-secondary">
          Narrative Heatmap — {ticker}
        </h4>
        <span className="text-[10px] text-text-tertiary font-mono">
          {narratives.length} Active Signals
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {sorted.map((narrative) => {
          const color = NARRATIVE_COLORS[narrative.type] || 'var(--color-border-strong)'
          
          return (
            <div
              key={narrative.id}
              className={`solid-panel bg-bg-secondary border p-4 flex flex-col justify-between transition-colors hover:bg-white/[0.02] ${narrative.isDominant ? 'border-warning shadow-[0_0_15px_rgba(255,215,0,0.1)]' : 'border-border'}`}
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                  <span className="font-mono text-[9px] uppercase tracking-widest" style={{ color }}>
                    {narrative.type.replace('_', ' ')}
                  </span>
                </div>
                {narrative.isDominant && (
                  <span className="text-[8px] font-bold uppercase tracking-widest text-warning bg-warning/10 px-1.5 py-0.5 border border-warning/20">
                    Dominant
                  </span>
                )}
              </div>
              
              <p className="font-display text-base text-text-primary leading-snug mb-4">
                {narrative.title}
              </p>

              <div className="grid grid-cols-3 gap-2 mt-auto border-t border-white/5 pt-3">
                <div>
                  <p className="text-[8px] uppercase tracking-[0.15em] text-text-tertiary mb-0.5">Intensity</p>
                  <p className="font-mono text-[11px] text-text-primary font-semibold">{(narrative.intensity * 100).toFixed(0)}%</p>
                </div>
                <div>
                  <p className="text-[8px] uppercase tracking-[0.15em] text-text-tertiary mb-0.5">Velocity</p>
                  <p className="font-mono text-[11px] text-text-primary font-semibold">{narrative.mentionsPerDay.toFixed(1)}/d</p>
                </div>
                <div>
                  <p className="text-[8px] uppercase tracking-[0.15em] text-text-tertiary mb-0.5">Accel</p>
                  <p className={`font-mono text-[11px] font-semibold ${narrative.acceleration > 0 ? 'text-positive' : 'text-negative'}`}>
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
