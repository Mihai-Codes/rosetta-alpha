'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { NarrativeTimeline } from './NarrativeTimeline'
import { NarrativeCloud } from './NarrativeCloud'

// ---------------------------------------------------------------------------
// Mock data — replace with API call to /api/narratives/:ticker when backend ready
// ---------------------------------------------------------------------------

const MOCK_TIMELINE_EVENTS = [
  { id: '1', title: 'AI Bubble Fears', type: 'fear' as const, timestamp: '2026-05-28T10:00:00Z', intensity: 0.8, region: 'US' },
  { id: '2', title: 'Fed Pivot Incoming', type: 'greed' as const, timestamp: '2026-05-30T14:00:00Z', intensity: 0.65, region: 'US' },
  { id: '3', title: 'China Tech Crackdown 2.0', type: 'regulatory' as const, timestamp: '2026-06-01T08:00:00Z', intensity: 0.7, region: 'CN' },
  { id: '4', title: 'Quantum Computing Breakout', type: 'innovation' as const, timestamp: '2026-06-02T16:00:00Z', intensity: 0.55, region: 'US' },
  { id: '5', title: 'OPEC Supply Shock', type: 'geopolitical' as const, timestamp: '2026-06-03T09:00:00Z', intensity: 0.9, region: 'EU' },
  { id: '6', title: 'Japan Yield Curve Control End', type: 'macro_shift' as const, timestamp: '2026-06-04T06:00:00Z', intensity: 0.75, region: 'JP' },
]

const MOCK_CLOUD_NARRATIVES = [
  { id: '1', title: 'AI Bubble Fears', type: 'fear' as const, intensity: 0.8, mentionsPerDay: 4.2, acceleration: 1.3, regionsPresent: ['US', 'CN', 'EU'], isDominant: true },
  { id: '2', title: 'Fed Pivot Incoming', type: 'greed' as const, intensity: 0.65, mentionsPerDay: 2.8, acceleration: 0.5, regionsPresent: ['US'], isDominant: false },
  { id: '3', title: 'China Tech Crackdown', type: 'regulatory' as const, intensity: 0.7, mentionsPerDay: 1.9, acceleration: -0.2, regionsPresent: ['CN', 'JP'], isDominant: false },
  { id: '4', title: 'Quantum Breakout', type: 'innovation' as const, intensity: 0.55, mentionsPerDay: 1.1, acceleration: 0.8, regionsPresent: ['US'], isDominant: false },
  { id: '5', title: 'OPEC Supply Shock', type: 'geopolitical' as const, intensity: 0.9, mentionsPerDay: 3.5, acceleration: 2.1, regionsPresent: ['EU', 'US'], isDominant: false },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface NarrativeInsightsProps {
  ticker?: string
}

export function NarrativeInsights({ ticker = 'Portfolio' }: NarrativeInsightsProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="w-full border border-border bg-bg-secondary">
      {/* Collapsible header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-white/[0.02] transition-colors cursor-pointer min-h-[44px]"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono text-brand-red uppercase tracking-[0.2em]">
            Narrative Engine
          </span>
          <span className="text-xs text-text-secondary">
            {MOCK_CLOUD_NARRATIVES.length} active narratives · {MOCK_CLOUD_NARRATIVES.filter(n => n.regionsPresent.length > 1).length} cross-desk
          </span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-text-tertiary transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Expandable content */}
      {isExpanded && (
        <div className="px-6 pb-6 border-t border-border pt-5">
          {/* Horizontal layout - all components side by side */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 min-h-[300px]">
            {/* Narrative Heatmap */}
            <div className="border border-border p-4">
              <h4 className="font-mono text-xs text-text-secondary uppercase tracking-wider mb-3">
                Narrative Heatmap
              </h4>
              <NarrativeCloud narratives={MOCK_CLOUD_NARRATIVES} ticker={ticker} />
            </div>

            {/* Chronological Feed */}
            <div className="border border-border p-4">
              <h4 className="font-mono text-xs text-text-secondary uppercase tracking-wider mb-3">
                Chronological Feed
              </h4>
              <NarrativeTimeline events={MOCK_TIMELINE_EVENTS} ticker={ticker} />
            </div>

            {/* Cross-Desk Contagion */}
            <div className="border border-border p-4">
              <h4 className="font-mono text-xs text-text-secondary uppercase tracking-wider mb-3">
                Cross-Desk Contagion
              </h4>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {MOCK_CLOUD_NARRATIVES
                  .filter(n => n.regionsPresent.length > 1)
                  .map(n => (
                    <div key={n.id} className="flex items-center gap-3 text-xs">
                      <span className="text-brand-red font-mono">⚡</span>
                      <span className="text-text-primary font-medium">{n.title}</span>
                      <span className="text-text-tertiary">→</span>
                      <span className="text-text-secondary font-mono">
                        {n.regionsPresent.join(' · ')}
                      </span>
                      <span className="ml-auto text-text-tertiary font-mono text-[10px]">
                        {n.mentionsPerDay.toFixed(1)}/day
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
