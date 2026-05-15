import React from 'react'

// All Weather allocation — Bridgewater's classic 4-quadrant model
// Inspired by their public risk-parity visualizations.
const ALLOCATIONS = [
  { label: 'Equities',    pct: 30, color: '#4A7FBF', regime: 'Rising Growth' },
  { label: 'Long Bonds',  pct: 40, color: '#C9A84C', regime: 'Falling Growth' },
  { label: 'Commodities', pct: 15, color: '#BF4A4A', regime: 'Rising Inflation' },
  { label: 'Crypto / Gold', pct: 15, color: '#7A4ABF', regime: 'Falling Inflation' },
]

export function AllWeatherChart() {
  const total = ALLOCATIONS.reduce((s, a) => s + a.pct, 0)
  const radius = 64
  const circumference = 2 * Math.PI * radius
  let offset = 0

  return (
    <div className="glass-panel border border-border/20 rounded-2xl p-5 sm:p-8 shadow-none h-full">
      <div className="mb-6">
        <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-text-tertiary mb-2">
          All Weather Allocation
        </p>
        <p className="font-display text-lg text-text-primary">Risk Parity Strategy</p>
      </div>

      <div className="flex items-center justify-center mb-6">
        <svg width="180" height="180" viewBox="0 0 180 180" className="transform -rotate-90">
          {/* Track */}
          <circle
            cx="90"
            cy="90"
            r={radius}
            fill="none"
            stroke="#2A2A38"
            strokeWidth="14"
          />
          {/* Allocations */}
          {ALLOCATIONS.map((a, i) => {
            const length = (a.pct / total) * circumference
            const segment = (
              <circle
                key={i}
                cx="90"
                cy="90"
                r={radius}
                fill="none"
                stroke={a.color}
                strokeWidth="14"
                strokeDasharray={`${length} ${circumference}`}
                strokeDashoffset={-offset}
                style={{
                  transition: 'stroke-dashoffset 1s ease-out',
                }}
              />
            )
            offset += length
            return segment
          })}
        </svg>

        {/* Center label */}
        <div className="absolute text-center pointer-events-none">
          <p className="font-display text-3xl text-text-primary leading-none">{total}%</p>
          <p className="text-[9px] uppercase tracking-[0.25em] text-text-tertiary mt-1">Diversified</p>
        </div>
      </div>

      {/* Legend */}
      <div className="space-y-2.5">
        {ALLOCATIONS.map(a => (
          <div key={a.label} className="flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: a.color }} />
              <span className="text-text-secondary font-medium">{a.label}</span>
            </div>
            <span className="font-mono text-text-primary">{a.pct}%</span>
          </div>
        ))}
      </div>

      <div className="text-center mt-6 pt-5 border-t border-border/50 px-2">
        <p className="text-[10px] text-text-tertiary leading-relaxed mx-auto text-center whitespace-nowrap">
          Inspired by Bridgewater's <a href="https://www.bridgewater.com/research-and-insights/the-all-weather-story" target="_blank" rel="noopener noreferrer" className="text-brand-red hover:text-text-primary transition-colors font-medium drop-shadow-[0_0_8px_rgba(216,43,43,0.5)]">All Weather strategy</a><br/>
          balanced exposure across four economic regimes: rising/falling growth and inflation.
        </p>
      </div>
    </div>
  )
}
