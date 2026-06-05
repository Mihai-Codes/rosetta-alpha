'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { backendApiUrl } from '@/lib/api'

interface MobMeterProps {
  ticker: string
  compact?: boolean
}

interface MobMeterData {
  ticker: string
  timestamp: string
  mob_index: number
  consensus_level: number
  confidence_extremity: number
  narrative_intensity: number
  dominant_direction?: 'LONG' | 'SHORT' | 'NEUTRAL' | null
  flags: string[]
  label: string
}

function categoryColor(score: number) {
  if (score < 30) return 'text-[#4A9F6F]'
  if (score < 60) return 'text-[#C9A84C]'
  if (score < 80) return 'text-[#D9822B]'
  return 'text-[#D82B2B]'
}

function categoryDescription(score: number) {
  if (score < 30) return 'Normal disagreement. Healthy market debate remains intact.'
  if (score < 60) return 'Growing consensus. Trend formation is becoming visible.'
  if (score < 80) return 'High consensus. Momentum is strong, but reversal risk is rising.'
  return 'The mob agrees. Be cautious.'
}

export function MobMeter({ ticker, compact = false }: MobMeterProps) {
  const [data, setData] = useState<MobMeterData | null>(null)
  const [loading, setLoading] = useState(Boolean(ticker))

  useEffect(() => {
    let active = true

    async function fetchMobMeter() {
      try {
        setLoading(true)
        const res = await fetch(backendApiUrl('/api/v1/mob-meter', { ticker }))
        if (!res.ok) throw new Error('Failed to fetch mob meter')
        const json = await res.json()
        if (active) setData(json)
      } catch (err) {
        console.error(err)
        if (active) {
          setData({
            ticker,
            timestamp: new Date().toISOString(),
            mob_index: 0,
            consensus_level: 0,
            confidence_extremity: 0,
            narrative_intensity: 0,
            dominant_direction: null,
            flags: [],
            label: 'Normal disagreement',
          })
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    if (ticker) fetchMobMeter()
    return () => {
      active = false
    }
  }, [ticker])

  const score = data?.mob_index ?? 0
  const isMob = score >= 80
  const fillHeight = useMemo(() => `${Math.max(0, Math.min(100, score))}%`, [score])

  return (
    <div className={`border border-white/10 bg-[#0A0A0A] relative overflow-hidden ${compact ? 'p-4' : 'p-6'}`}>
      {isMob && <div className="absolute inset-0 bg-brand-red/5 animate-pulse pointer-events-none" />}

      <div className="relative z-10 flex items-start justify-between gap-4 mb-5">
        <div>
          <h4 className="font-mono text-[11px] uppercase tracking-[0.2em] text-text-secondary">
            Mob Extremity
          </h4>
          <p className="text-[10px] text-text-tertiary mt-1">
            Consensus × confidence × narrative intensity
          </p>
        </div>
        <span className="font-mono text-[10px] text-brand-red uppercase tracking-wider">{ticker}</span>
      </div>

      {loading ? (
        <div className="relative z-10 flex items-center gap-3 py-8">
          <div className="w-5 h-5 border-2 border-brand-red/30 border-t-brand-red rounded-full animate-spin" />
          <span className="font-mono text-[10px] text-text-tertiary">Reading crowd temperature...</span>
        </div>
      ) : (
        <div className={`relative z-10 flex ${compact ? 'gap-4' : 'gap-6'} items-center`}>
          <div className="relative h-44 w-12 shrink-0 border border-white/10 bg-[#050505] rounded-full overflow-hidden">
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#4A9F6F] via-[#C9A84C] to-[#D82B2B] transition-all duration-1000 ease-out" style={{ height: fillHeight }} />
            <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
            {[0, 25, 50, 75, 100].map(mark => (
              <div
                key={mark}
                className="absolute left-0 w-full border-t border-black/50"
                style={{ bottom: `${mark}%` }}
              />
            ))}
          </div>

          <div className="min-w-0 flex-1">
            <div className="font-display text-3xl font-bold tracking-tight text-white">
              {score.toFixed(1)} <span className="text-xs text-text-tertiary">/ 100</span>
            </div>
            <div className={`font-mono text-[11px] uppercase tracking-widest font-bold mt-1 ${categoryColor(score)}`}>
              {data?.label ?? 'Normal disagreement'}
            </div>
            <p className={`text-[11px] leading-relaxed mt-3 ${isMob ? 'text-brand-red' : 'text-text-tertiary'}`}>
              {categoryDescription(score)}
            </p>

            {!compact && (
              <div className="grid grid-cols-3 gap-2 mt-5">
                {[
                  ['Consensus', data?.consensus_level ?? 0],
                  ['Confidence', data?.confidence_extremity ?? 0],
                  ['Narrative', data?.narrative_intensity ?? 0],
                ].map(([label, value]) => (
                  <div key={label as string} className="border border-white/[0.06] bg-white/[0.02] p-2">
                    <p className="font-mono text-[8px] uppercase tracking-[0.16em] text-text-tertiary">{label as string}</p>
                    <p className="font-mono text-[11px] text-text-primary mt-1">{((value as number) * 100).toFixed(0)}%</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
