'use client'

import React, { useEffect, useState } from 'react'
import { backendApiUrl } from '@/lib/api'

interface MobMeterProps { ticker: string; compact?: boolean }
interface MobMeterData { mob_index: number; consensus_level: number; confidence_extremity: number; narrative_intensity: number; label: string }

function categoryColor(score: number) {
  if (score < 30) return 'text-positive'
  if (score < 60) return 'text-warning'
  if (score < 80) return 'text-warning'
  return 'text-brand-red'
}

export function MobMeter({ ticker, compact = false }: MobMeterProps) {
  const [data, setData] = useState<MobMeterData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    async function fetchMobMeter() {
      try {
        const res = await fetch(backendApiUrl('/api/v1/mob-meter', { ticker }))
        if (!res.ok) throw new Error()
        const json = await res.json()
        if (active) setData(json)
      } catch {
        if (active) setData({ mob_index: 0, consensus_level: 0, confidence_extremity: 0, narrative_intensity: 0, label: 'Normal disagreement' })
      } finally {
        if (active) setLoading(false)
      }
    }
    if (ticker) fetchMobMeter()
    return () => { active = false }
  }, [ticker])

  const score = data?.mob_index ?? 0
  const isMob = score >= 80

  return (
    <div className={`solid-panel border border-border bg-bg-secondary flex flex-col justify-between h-full w-full ${compact ? 'p-4' : 'p-6'}`}>
      <div className="flex justify-between items-start mb-6 border-b border-border/50 pb-3">
        <div>
          <h4 className="font-mono text-[11px] uppercase tracking-[0.2em] text-text-primary">Mob Extremity</h4>
          <p className="text-[9px] text-text-tertiary mt-1">Consensus × Confidence × Narrative</p>
        </div>
        <span className="font-mono text-[10px] text-brand-red uppercase tracking-wider px-2 py-1 bg-brand-red/10 border border-brand-red/20">{ticker}</span>
      </div>

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center py-6">
          <div className="w-5 h-5 border-2 border-brand-red/30 border-t-brand-red rounded-full animate-spin mb-2" />
          <span className="font-mono text-[9px] text-text-tertiary">Reading crowd temperature...</span>
        </div>
      ) : (
        <div className="flex-1 flex flex-col justify-center">
          <div className="flex items-end justify-between mb-3">
            <div className="font-display text-4xl text-text-primary leading-none">
              {score.toFixed(1)}<span className="text-sm text-text-tertiary font-sans font-normal ml-1">/ 100</span>
            </div>
            <div className={`font-mono text-[10px] uppercase tracking-widest font-bold ${categoryColor(score)} text-right max-w-[140px] leading-tight`}>
              {data?.label ?? 'Normal disagreement'}
            </div>
          </div>

          <div className="w-full mt-2 mb-6">
            <div className="relative h-2 w-full shrink-0 border border-white/10 bg-bg-primary rounded-full overflow-hidden">
              <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-positive via-warning to-brand-red transition-all duration-1000 ease-out" style={{ width: `${Math.max(0, Math.min(100, score))}%` }} />
            </div>
          </div>

          {!compact && (
            <div className="grid grid-cols-3 gap-3 mt-auto border-t border-border/50 pt-4">
              {[
                ['Consensus', data?.consensus_level ?? 0],
                ['Confidence', data?.confidence_extremity ?? 0],
                ['Narrative', data?.narrative_intensity ?? 0],
              ].map(([label, value]) => (
                <div key={label as string} className="flex flex-col items-center text-center bg-bg-primary/50 py-2 border border-white/5 rounded-md">
                  <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-text-tertiary mb-1">{label as string}</p>
                  <p className="font-mono text-[11px] text-text-primary font-bold">{((value as number) * 100).toFixed(0)}%</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
