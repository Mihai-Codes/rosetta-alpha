'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ChevronDown } from 'lucide-react'
import { backendApiUrl } from '@/lib/api'

interface CorrelationCell {
  origin_ticker: string
  affected_ticker: string
  affected_desk: string
  correlation_score: number
}

interface ContagionAlertData {
  alert_id: string
  origin_desk: string
  origin_ticker: string
  signal_type: 'REGIME_CHANGE' | 'EXTREME_CONSENSUS' | 'NARRATIVE_SHIFT'
  affected_desks: string[]
  affected_tickers: string[]
  correlation_score: number
  recommended_action: string
  created_at: string
  message: string
  correlation_matrix: CorrelationCell[]
}

interface ContagionAlertResponse {
  alerts: ContagionAlertData[]
  count: number
}

function signalLabel(signalType: ContagionAlertData['signal_type']) {
  return signalType.replaceAll('_', ' ')
}

function heatColor(score: number) {
  if (score >= 0.85) return 'bg-brand-red/40 border-brand-red/60 text-brand-red'
  if (score >= 0.75) return 'bg-[#FFD700]/30 border-[#FFD700]/50 text-[#FFD700]'
  return 'bg-[#FFD700]/20 border-[#FFD700]/40 text-[#FFD700]'
}

export function ContagionAlert() {
  const [alerts, setAlerts] = useState<ContagionAlertData[]>([])
  const [expanded, setExpanded] = useState(false)
  const [dismissedId, setDismissedId] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function fetchAlerts() {
      try {
        const res = await fetch(backendApiUrl('/api/v1/contagion-alerts', { limit: '5', hours: '72' }))
        if (!res.ok) throw new Error('Failed to fetch contagion alerts')
        const json = await res.json() as ContagionAlertResponse
        if (active) setAlerts(json.alerts ?? [])
      } catch (err) {
        console.error('Failed to fetch contagion alerts:', err)
        if (active) setAlerts([])
      }
    }

    fetchAlerts()
    const timer = window.setInterval(fetchAlerts, 30_000)

    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [])

  const visibleAlerts = useMemo(
    () => alerts.filter(alert => alert.alert_id !== dismissedId),
    [alerts, dismissedId]
  )
  const alert = visibleAlerts[0]

  if (!alert) return null

  return (
    <div className="border border-[#FFD700]/50 bg-[#0A0A0A] shadow-[0_0_40px_rgba(216,43,43,0.08)]">
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
        <button
          type="button"
          onClick={() => setExpanded(prev => !prev)}
          className="flex min-h-[44px] flex-1 items-start gap-3 text-left"
          aria-expanded={expanded}
        >
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center border border-[#FFD700]/50 bg-[#FFD700]/10 text-[#FFD700]">
            <AlertTriangle className="h-4 w-4" />
          </span>

          <span className="min-w-0 flex-1">
            <span className="block font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-[#FFD700]">
              Cross-Desk Contagion Alert
            </span>
            <span className="mt-1 block font-display text-base leading-snug text-text-primary sm:text-lg">
              {alert.message}
            </span>
            <span className="mt-2 flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-text-tertiary">
              <span>{signalLabel(alert.signal_type)}</span>
              <span>·</span>
              <span>{alert.origin_desk} → {alert.affected_desks.join(' / ')}</span>
              <span>·</span>
              <span className="text-[#FFD700]">ρ {alert.correlation_score.toFixed(2)}</span>
            </span>
          </span>

          <ChevronDown
            className={`mt-2 h-4 w-4 shrink-0 text-text-tertiary transition-transform ${expanded ? 'rotate-180' : ''}`}
          />
        </button>

        <button
          type="button"
          onClick={() => setDismissedId(alert.alert_id)}
          className="min-h-[44px] shrink-0 border border-white/10 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-text-tertiary transition-colors hover:border-white/20 hover:text-text-primary"
        >
          Dismiss
        </button>
      </div>

      {expanded && (
        <div className="border-t border-[#FFD700]/20 p-4 pt-3">
          <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-tertiary">
                Recommended action
              </p>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                {alert.recommended_action}
              </p>
            </div>

            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-tertiary">
                Correlation matrix
              </p>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {alert.correlation_matrix.map(cell => (
                  <div
                    key={`${cell.origin_ticker}-${cell.affected_desk}-${cell.affected_ticker}`}
                    className={`border px-3 py-2 ${heatColor(cell.correlation_score)}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[10px] uppercase tracking-[0.14em]">
                        {cell.origin_ticker} → {cell.affected_ticker}
                      </span>
                      <span className="font-mono text-[11px] font-bold">
                        {cell.correlation_score.toFixed(2)}
                      </span>
                    </div>
                    <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.14em] opacity-70">
                      Watch desk: {cell.affected_desk}
                    </p>
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
