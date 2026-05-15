import React from 'react'
import { DeskProps } from './DeskCard'
import { regionMeta } from '../lib/format'

interface RegionSidebarProps {
  desks: DeskProps[]
  activeDesk: string
  onSelect: (desk: string) => void
}

// Tiny arc indicator for confidence (0..1)
function ConfidenceArc({ value, color }: { value: number; color: string }) {
  const r = 10
  const c = 2 * Math.PI * r
  const offset = c * (1 - value)
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" className="-rotate-90 shrink-0">
      <circle cx="14" cy="14" r={r} fill="none" stroke="#2A2A38" strokeWidth="2" />
      <circle
        cx="14"
        cy="14"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeDasharray={c}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
      />
    </svg>
  )
}

export function RegionSidebar({ desks, activeDesk, onSelect }: RegionSidebarProps) {
  return (
    <aside className="w-full lg:w-[260px] shrink-0">
      <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-text-tertiary mb-4 px-1">
        Regional Desks
      </p>

      <div className="glass-panel border border-border/20 rounded-xl overflow-hidden shadow-none divide-y divide-white/[0.02]">
        {desks.map(d => {
          const meta = regionMeta(d.desk)
          const isActive = activeDesk === d.desk
          return (
            <button
              key={d.desk}
              onClick={() => onSelect(d.desk)}
              className={`
                w-full flex items-center gap-3 px-5 py-4 text-left
                transition-all duration-300
                ${isActive
                  ? 'bg-white/[0.04]'
                  : 'hover:bg-white/[0.02]'
                }
              `}
              style={{
                borderLeft: `2px solid ${isActive ? meta.color : 'transparent'}`,
              }}
            >
              <ConfidenceArc value={d.confidence} color={meta.color} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-base leading-none">{meta.flag}</span>
                  <span
                    className={`text-[11px] font-medium uppercase tracking-[0.18em] ${
                      isActive ? 'text-text-primary' : 'text-text-secondary'
                    }`}
                  >
                    {meta.name}
                  </span>
                </div>
                <p className="font-mono text-xs text-text-tertiary truncate">{d.ticker}</p>
              </div>
              <span
                className="text-[10px] font-mono shrink-0"
                style={{ color: meta.color }}
              >
                {(d.confidence * 100).toFixed(0)}%
              </span>
            </button>
          )
        })}
      </div>
    </aside>
  )
}
