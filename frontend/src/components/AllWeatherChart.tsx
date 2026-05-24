'use client'

import React from 'react'

const QUADRANTS = [
  { 
    title: 'Rising Growth',
    subtitle: 'Falling Inflation',
    assets: ['Equities', 'Corporate Credit'],
    pct: 30,
    color: '#F0EDE8',
  },
  { 
    title: 'Rising Growth',
    subtitle: 'Rising Inflation',
    assets: ['Commodities', 'EM Credit'],
    pct: 15,
    color: '#D82B2B',
  },
  { 
    title: 'Falling Growth',
    subtitle: 'Falling Inflation',
    assets: ['Long Bonds', 'Nominal Bonds'],
    pct: 40,
    color: '#C9A84C',
  },
  { 
    title: 'Falling Growth',
    subtitle: 'Rising Inflation',
    assets: ['Crypto / Gold', 'ILBs'],
    pct: 15,
    color: '#7B8FA6',
  },
]

export function AllWeatherChart() {
  return (
    <div className="glass-panel border border-border/20 rounded-none p-5 sm:p-8 shadow-none h-full flex flex-col">
      <div className="mb-6 sm:mb-8 shrink-0">
        <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-text-tertiary mb-2">
          Bridgewater Framework
        </p>
        <p className="font-display text-lg text-text-primary">All Weather Matrix</p>
      </div>

      <div className="flex-1 flex flex-col justify-center mb-6 px-4 sm:px-6">
        {/* 2x2 Grid */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3 relative ml-4 sm:ml-6 mb-4 sm:mb-6">
          {/* Axis Labels */}
          <div className="absolute -left-6 sm:-left-8 top-1/2 -translate-y-1/2 -rotate-90 text-[8px] sm:text-[9px] uppercase tracking-[0.2em] text-text-tertiary whitespace-nowrap">
            Growth
          </div>
          <div className="absolute -bottom-6 sm:-bottom-8 left-1/2 -translate-x-1/2 text-[8px] sm:text-[9px] uppercase tracking-[0.2em] text-text-tertiary whitespace-nowrap">
            Inflation
          </div>

          {QUADRANTS.map((q, i) => (
            <div 
              key={i} 
              className="border border-white/5 bg-white/[0.015] p-3 sm:p-4 transition-all hover:bg-white/[0.03] group"
              style={{ borderTopColor: q.color + '80', borderTopWidth: '2px' }}
            >
              <div className="flex justify-between items-start mb-3 sm:mb-4">
                <span className="text-[10px] sm:text-[11px] font-mono text-text-secondary">{q.pct}%</span>
                <div className="w-1.5 h-1.5 rounded-full  opacity-80 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: q.color }} />
              </div>
              <div className="space-y-0.5 mb-3 sm:mb-4">
                <p className="text-[9px] sm:text-[10px] font-medium uppercase tracking-wider text-text-primary leading-tight">{q.title}</p>
                <p className="text-[8px] sm:text-[9px] uppercase tracking-wider text-text-tertiary leading-tight">{q.subtitle}</p>
              </div>
              <div className="space-y-1">
                {q.assets.map(a => (
                  <p key={a} className="text-[9px] sm:text-[10px] text-text-secondary font-mono opacity-80">{a}</p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="text-center pt-5 sm:pt-6 border-t border-border/50 px-2 shrink-0 mt-4 sm:mt-6">
        <p className="text-[9px] text-text-tertiary leading-relaxed max-w-[260px] mx-auto text-center">
          Risk parity implementation balancing exposure across four economic regimes to neutralize environmental risk.
        </p>
      </div>
    </div>
  )
}
