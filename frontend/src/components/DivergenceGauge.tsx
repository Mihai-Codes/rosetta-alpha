'use client'

import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { HelpCircle } from 'lucide-react'
import { backendApiUrl } from '@/lib/api'

interface DivergenceGaugeProps {
  ticker: string
  desks: {
    desk: string
    direction: string
    confidence: number
  }[]
}

interface DivergenceData {
  ticker: string
  composite_divergence: number
  direction_divergence: number
  confidence_divergence: number
  narrative_divergence: number
}

export function DivergenceGauge({ ticker, desks }: DivergenceGaugeProps) {
  const [data, setData] = useState<DivergenceData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    async function fetchDivergence() {
      try {
        setLoading(true)
        const res = await fetch(backendApiUrl('/api/v1/divergence', { ticker }))
        if (!res.ok) throw new Error('Failed to fetch divergence data')
        const json = await res.json()
        if (active) {
          setData(json)
        }
      } catch (err) {
        console.error(err)
      } finally {
        if (active) setLoading(false)
      }
    }

    if (ticker) {
      fetchDivergence()
    }
    return () => {
      active = false
    }
  }, [ticker])

  const composite = data?.composite_divergence ?? 0

  // Gauge configurations
  const angle = (composite / 100) * 180 - 180 // maps 0-100 to -180 to 0 degrees for needle rotation
  
  // Categorize
  let category = 'Consensus'
  let catColor = 'text-positive'
  let catDesc = 'Agora consensus. Regional desks are fully aligned.'
  if (composite >= 30 && composite < 60) {
    category = 'Healthy Debate'
    catColor = 'text-warning'
    catDesc = 'Active, healthy desk debate. Diverging signals present.'
  } else if (composite >= 60) {
    category = 'Fragmented'
    catColor = 'text-brand-red'
    catDesc = 'Fragmented narrative. High uncertainty across all regions.'
  }

  // Region meta helper
  const getRegionMeta = (deskKey: string) => {
    const key = deskKey.toLowerCase()
    if (key === 'us') return { flag: '🇺🇸', name: 'US', color: '#00FF00' }
    if (key === 'cn') return { flag: '🇨🇳', name: 'CN', color: '#D82B2B' }
    if (key === 'eu') return { flag: '🇪🇺', name: 'EU', color: '#FFFFFF' }
    if (key === 'jp') return { flag: '🇯🇵', name: 'JP', color: '#FFD700' }
    if (key === 'crypto') return { flag: '🪙', name: 'CRYPTO', color: '#00FF00' }
    return { flag: '🌐', name: deskKey.toUpperCase(), color: '#888888' }
  }

  return (
    <div className="solid-panel border border-border bg-bg-secondary p-6 relative flex flex-col justify-between h-full w-full max-w-md mx-auto">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h4 className="font-mono text-[11px] uppercase tracking-[0.2em] text-text-secondary">Cross-Desk Divergence</h4>
            <div className="group relative cursor-pointer">
              <HelpCircle className="w-3.5 h-3.5 text-text-tertiary hover:text-text-primary transition-colors" />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-64 p-3 bg-black border border-white/20 text-[10px] text-text-secondary font-mono leading-relaxed z-50">
                Composite index measuring disagreement among regional desks on directions, convictions, and narrative summaries.
              </div>
            </div>
          </div>
          <span className="font-mono text-[10px] text-brand-red uppercase tracking-wider">{ticker}</span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-8 h-48">
            <div className="w-6 h-6 border-2 border-brand-red/30 border-t-brand-red rounded-full animate-spin mb-2" />
            <span className="font-mono text-[10px] text-text-tertiary">Computing Agora Index...</span>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            {/* Speedometer semi-circle SVG */}
            <div className="relative w-full max-w-[240px] aspect-[2/1] overflow-hidden flex justify-center mt-2">
              <svg className="w-full h-full" viewBox="0 0 100 50">
                {/* consensus arc (0-30): 0 to 54 degrees */}
                <path d="M 10,50 A 40,40 0 0,1 21.72,21.72" fill="none" stroke="var(--color-positive)" strokeWidth="6" />
                {/* debate arc (30-60): 54 to 108 degrees */}
                <path d="M 21.72,21.72 A 40,40 0 0,1 61.26,13.14" fill="none" stroke="var(--color-warning)" strokeWidth="6" />
                {/* fragmented arc (60-100): 108 to 180 degrees */}
                <path d="M 61.26,13.14 A 40,40 0 0,1 90,50" fill="none" stroke="var(--color-negative)" strokeWidth="6" />
                
                {/* needle pivot shadow */}
                <circle cx="50" cy="50" r="4" fill="rgba(0,0,0,0.5)" />
              </svg>

              {/* Needle rotating */}
              <div 
                className="absolute bottom-0 left-1/2 w-[2px] h-[36px] bg-white origin-bottom transition-transform duration-1000 ease-out"
                style={{ transform: `translateX(-50%) rotate(${angle}deg)` }}
              />
              {/* Central hub */}
              <div className="absolute bottom-[-6px] left-[calc(50%-6px)] w-3 h-3 rounded-full bg-white border-2 border-black z-10" />
            </div>

            {/* Metrics Breakdown */}
            <div className="text-center mt-4 w-full">
              <div className="font-display text-2xl font-bold tracking-tight text-white mb-0.5">
                {composite.toFixed(1)} <span className="text-xs text-text-tertiary">/ 100</span>
              </div>
              <div className={`font-mono text-[11px] uppercase tracking-widest ${catColor} font-bold mb-2`}>
                {category}
              </div>
              <p className="text-[11px] text-text-tertiary leading-normal max-w-xs mx-auto mb-6">
                {catDesc}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Desk badges */}
      <div className="border-t border-white/[0.06] pt-4 mt-auto">
        <div className="grid grid-cols-5 gap-1.5">
          {desks.map(d => {
            const m = getRegionMeta(d.desk)
            let dirColor = 'text-text-tertiary border-white/[0.06]'
            if (d.direction.toUpperCase() === 'LONG') dirColor = 'text-positive border-positive/20 bg-positive/5'
            if (d.direction.toUpperCase() === 'SHORT') dirColor = 'text-brand-red border-brand-red/20 bg-brand-red/5'
            return (
              <div key={d.desk} className="flex flex-col items-center p-1 border border-white/[0.04] bg-white/[0.01]">
                <span className="text-xs mb-0.5" title={m.name}>{m.flag}</span>
                <span className={`font-mono text-[9px] uppercase font-semibold border px-1 py-0.5 text-center w-full truncate ${dirColor}`}>
                  {d.direction || 'N/A'}
                </span>
                <span className="font-mono text-[8px] opacity-40 mt-1">{(d.confidence * 100).toFixed(0)}%</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
