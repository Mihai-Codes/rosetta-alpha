'use client'

import { useState } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NarrativeEvent {
  id: string
  title: string
  type: 'fear' | 'greed' | 'regulatory' | 'innovation' | 'risk' | 'macro_shift' | 'geopolitical'
  timestamp: string
  intensity: number
  region: string
}

interface NarrativeTimelineProps {
  events: NarrativeEvent[]
  ticker: string
}

// ---------------------------------------------------------------------------
// Constants (DRY — shared color map for narrative types)
// ---------------------------------------------------------------------------

const NARRATIVE_COLORS: Record<string, string> = {
  fear: '#9F4A4A',
  greed: '#4A9F6F',
  regulatory: '#7B8FA6',
  innovation: '#C9A84C',
  risk: '#D82B2B',
  macro_shift: '#8B5CF6',
  geopolitical: '#F59E0B',
}

const NARRATIVE_LABELS: Record<string, string> = {
  fear: 'Fear',
  greed: 'Greed',
  regulatory: 'Regulatory',
  innovation: 'Innovation',
  risk: 'Risk',
  macro_shift: 'Macro Shift',
  geopolitical: 'Geopolitical',
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function NarrativeTimeline({ events, ticker }: NarrativeTimelineProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  if (!events.length) {
    return (
      <div className="text-text-tertiary text-sm italic py-4">
        No narrative data available for {ticker}
      </div>
    )
  }

  // Sort chronologically
  const sorted = [...events].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )

  const timeRange = {
    start: new Date(sorted[0].timestamp).getTime(),
    end: new Date(sorted[sorted.length - 1].timestamp).getTime(),
  }
  const duration = Math.max(timeRange.end - timeRange.start, 1)

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-mono text-xs text-text-secondary uppercase tracking-wider">
          Narrative Timeline — {ticker}
        </h4>
        <div className="flex gap-2 flex-wrap">
          {Object.entries(NARRATIVE_LABELS).map(([key, label]) => (
            <span
              key={key}
              className="flex items-center gap-1 text-[10px] text-text-tertiary"
            >
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ backgroundColor: NARRATIVE_COLORS[key] }}
              />
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* Timeline track */}
      <div className="relative h-16 bg-surface-secondary/30 rounded-lg border border-border overflow-hidden">
        {/* Time axis */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-border" />

        {/* Events as positioned dots */}
        {sorted.map((event) => {
          const position = ((new Date(event.timestamp).getTime() - timeRange.start) / duration) * 100
          const color = NARRATIVE_COLORS[event.type] || '#666'
          const size = 8 + event.intensity * 16 // 8px to 24px based on intensity
          const isHovered = hoveredId === event.id

          return (
            <div
              key={event.id}
              className="absolute top-1/2 -translate-y-1/2 transition-transform duration-150"
              style={{
                left: `${Math.min(Math.max(position, 2), 98)}%`,
                transform: `translate(-50%, -50%) scale(${isHovered ? 1.4 : 1})`,
                zIndex: isHovered ? 10 : 1,
              }}
              onMouseEnter={() => setHoveredId(event.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              {/* Dot */}
              <div
                className="rounded-full border border-black/20 cursor-pointer"
                style={{
                  width: `${size}px`,
                  height: `${size}px`,
                  backgroundColor: color,
                  opacity: 0.6 + event.intensity * 0.4,
                  boxShadow: isHovered ? `0 0 12px ${color}80` : 'none',
                }}
              />

              {/* Tooltip */}
              {isHovered && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-surface-primary border border-border rounded-md shadow-lg whitespace-nowrap z-20">
                  <p className="text-xs font-medium text-text-primary">{event.title}</p>
                  <p className="text-[10px] text-text-tertiary mt-0.5">
                    {NARRATIVE_LABELS[event.type]} · {(event.intensity * 100).toFixed(0)}% intensity
                  </p>
                  <p className="text-[10px] text-text-tertiary">
                    {new Date(event.timestamp).toLocaleDateString()} · {event.region}
                  </p>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Time labels */}
      <div className="flex justify-between mt-1 text-[10px] text-text-tertiary font-mono">
        <span>{new Date(sorted[0].timestamp).toLocaleDateString()}</span>
        <span>{new Date(sorted[sorted.length - 1].timestamp).toLocaleDateString()}</span>
      </div>
    </div>
  )
}
