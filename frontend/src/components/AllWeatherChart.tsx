'use client'

import React from 'react'

const QUADRANTS = [
  { title: 'Rising Growth', subtitle: 'Falling Inflation', assets: ['Equities', 'Corporate Credit'], pct: 30, color: 'var(--color-text-primary)' },
  { title: 'Rising Growth', subtitle: 'Rising Inflation', assets: ['Commodities', 'EM Credit'], pct: 15, color: 'var(--color-brand-red)' },
  { title: 'Falling Growth', subtitle: 'Falling Inflation', assets: ['Long Bonds', 'Nominal Bonds'], pct: 40, color: 'var(--color-warning)' },
  { title: 'Falling Growth', subtitle: 'Rising Inflation', assets: ['Crypto / Gold', 'ILBs'], pct: 15, color: 'var(--color-text-secondary)' },
]

export function AllWeatherChart() {
  return (
    <div className="solid-panel border border-border bg-bg-secondary p-5 sm:p-6 shadow-none h-full flex flex-col justify-between">
      <div className="mb-4 shrink-0 w-full text-left border-b border-border/50 pb-4">
        <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-text-tertiary mb-1">
          Bridgewater Framework
        </p>
        <p className="font-display text-lg text-text-primary">Matrix View (Risk Parity)</p>
      </div>

      <div className="flex-1 flex flex-col justify-center px-0 w-full max-w-[360px] mx-auto py-2">
        <div className="grid grid-cols-2 gap-2 sm:gap-3 relative w-full">
          {QUADRANTS.map((q, i) => (
            <div 
              key={i} 
              className="border border-white/5 bg-bg-primary p-4 sm:p-5 transition-colors hover:bg-white/[0.04] flex flex-col justify-between min-h-[130px] relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-[2px]" style={{ backgroundColor: q.color }} />
              <div className="flex justify-between items-start mb-2">
                <span className="text-[12px] sm:text-[14px] font-mono text-text-primary font-bold">{q.pct}%</span>
              </div>
              
              <div className="space-y-1 mb-3">
                <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-text-primary leading-tight">{q.title}</p>
                <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-text-tertiary leading-tight">{q.subtitle}</p>
              </div>

              <div className="border-t border-white/5 pt-2 mt-auto">
                <p className="text-[9px] sm:text-[10px] text-text-secondary font-mono opacity-80 truncate">{q.assets.join(', ')}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="text-center pt-4 border-t border-border/50 shrink-0 mt-4">
        <p className="text-[10px] text-text-tertiary whitespace-nowrap overflow-visible w-full text-center">
          Risk parity balances exposure across four distinct economic environments.
        </p>
      </div>
    </div>
  )
}
