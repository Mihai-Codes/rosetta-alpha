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

      <div className="flex-1 flex flex-col justify-center mt-10 px-8 sm:px-14">
        {/* 2x2 Grid */}
        <div className="grid grid-cols-2 gap-8 sm:gap-12 relative ml-10 sm:ml-12 mb-10 sm:mb-14">
          {/* Axis Labels */}
          <div className="absolute -left-10 sm:-left-12 top-1/2 -translate-y-1/2 -rotate-90 text-[11px] sm:text-[12px] uppercase tracking-[0.4em] text-text-tertiary whitespace-nowrap font-semibold">
            Growth
          </div>
          <div className="absolute -bottom-10 sm:-bottom-12 left-1/2 -translate-x-1/2 text-[11px] sm:text-[12px] uppercase tracking-[0.4em] text-text-tertiary whitespace-nowrap font-semibold">
            Inflation
          </div>

          {QUADRANTS.map((q, i) => (
            <div 
              key={i} 
              className="border border-white/10 bg-[#0A0A0A] p-4 sm:p-6 transition-all hover:bg-[#111111] group rounded-lg min-h-[160px] flex flex-col justify-between shadow-lg"
              style={{ borderTopColor: q.color, borderTopWidth: '3px' }}
            >
              <div className="flex justify-between items-start">
                <span className="text-[12px] sm:text-[14px] font-mono text-text-primary font-bold opacity-100">{q.pct}%</span>
                <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full shadow-none opacity-90 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: q.color }} />
              </div>
              
              <div className="space-y-1 mt-4 mb-5">
                <p className="text-[11px] sm:text-[12px] font-bold uppercase tracking-[0.1em] text-text-primary leading-tight">{q.title}</p>
                <p className="text-[9px] sm:text-[10px] uppercase tracking-[0.15em] text-text-tertiary leading-tight">{q.subtitle}</p>
              </div>

              <div className="space-y-1 border-t border-white/10 pt-3 mt-auto">
                {q.assets.map(a => (
                  <p key={a} className="text-[10px] sm:text-[11px] text-text-secondary font-mono opacity-80">{a}</p>
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
