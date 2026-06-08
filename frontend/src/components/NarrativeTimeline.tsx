'use client'

import { NARRATIVE_COLORS, NARRATIVE_LABELS, type NarrativeType } from '../lib/narrative-constants'

interface NarrativeEvent {
  id: string
  title: string
  type: NarrativeType
  timestamp: string
  intensity: number
  region: string
}

export function NarrativeTimeline({ events, ticker }: { events: NarrativeEvent[], ticker: string }) {
  if (!events.length) {
    return <div className="text-text-tertiary text-sm italic py-4">No narrative data available for {ticker}</div>
  }

  // Sort chronologically (newest first for a feed)
  const sorted = [...events].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6 border-b border-border/50 pb-3">
        <h4 className="font-mono text-[11px] uppercase tracking-[0.2em] text-text-secondary">
          Chronological Feed — {ticker}
        </h4>
      </div>

      <div className="relative border-l-2 border-border ml-2 space-y-6 pb-4">
        {sorted.map((event) => {
          const color = NARRATIVE_COLORS[event.type] || '#888888'
          const d = new Date(event.timestamp)
          
          return (
            <div key={event.id} className="relative pl-6">
              {/* Vertical Feed Node */}
              <div 
                className="absolute left-[-5px] top-1.5 w-2 h-2 rounded-full ring-4 ring-bg-primary"
                style={{ backgroundColor: color }}
              />
              
              <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-4 mb-2">
                <span className="font-mono text-[11px] text-text-tertiary shrink-0">
                  {d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="text-[9px] uppercase tracking-widest px-2 py-0.5 border" style={{ color: color, borderColor: `${color}40`, backgroundColor: `${color}10` }}>
                  {NARRATIVE_LABELS[event.type]}
                </span>
              </div>
              
              <p className="font-display text-[15px] text-text-primary leading-snug mt-1">
                {event.title}
              </p>
              
              <div className="flex items-center gap-3 mt-2 font-mono text-[10px] text-text-tertiary">
                <span>INTENSITY: {(event.intensity * 100).toFixed(0)}%</span>
                <span>•</span>
                <span className="uppercase">{event.region}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
