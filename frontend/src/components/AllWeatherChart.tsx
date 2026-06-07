'use client'

import React from 'react'

const QUADRANTS = [
  { 
    title: 'Rising Growth',
    subtitle: 'Falling Inflation',
    assets: ['Equities', 'Corporate Credit'],
    pct: 30,
    color: '#FFFFFFFFFFFF',
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
    color: '#FFD700',
  },
  { 
    title: 'Falling Growth',
    subtitle: 'Rising Inflation',
    assets: ['Crypto / Gold', 'ILBs'],
    pct: 15,
    color: '#888888',
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

      <div className="flex-1 flex flex-col justify-center px-0 sm:px-2 w-full max-w-[320px] mx-auto">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 relative w-full">
          {QUADRANTS.map((q, i) => (
            <div 
              key={i} 
              className="border border-white/5 bg-[#0A0A0A] p-4 sm:p-5 transition-colors hover:bg-white/[0.04] flex flex-col justify-between min-h-[140px] rounded-md shadow-lg"
              style={{ borderTop: `3px solid ${q.color}` }}
            >
              <div className="flex justify-between items-start mb-3">
                <span className="text-[13px] sm:text-[15px] font-mono text-text-primary font-bold">{q.pct}%</span>
              </div>
              
              <div className="space-y-1 mb-3">
                <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-text-primary leading-tight">{q.title}</p>
                <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-text-tertiary leading-tight">{q.subtitle}</p>
              </div>

              <div className="border-t border-white/5 pt-3 mt-auto">
                <p className="text-[9px] sm:text-[10px] text-text-secondary font-mono opacity-80">{q.assets.join(', ')}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="text-center pt-5 sm:pt-6 border-t border-border/50 shrink-0 mt-6 sm:mt-8">
        <p className="text-[9px] text-text-tertiary leading-relaxed max-w-[280px] mx-auto text-center">
          Risk parity balancing exposure across four economic regimes to neutralize environmental risk.
        </p>
      </div>
    </div>
  )
}
