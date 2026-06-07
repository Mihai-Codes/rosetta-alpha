'use client'

import React from 'react'
import {
  BarChart3,
  Brain,
  CheckCircle2,
  Coins,
  Database,
  ExternalLink,
  Hash,
  Link2,
  Loader2,
  XCircle,
} from 'lucide-react'
import { formatTime, truncateHash } from '@/lib/format'

type StepStatus = 'completed' | 'in_progress' | 'failed'

interface ProvenanceStep {
  id: string
  label: string
  icon: string
  status: StepStatus
  timestamp: string | null
  link: string | null
  details?: Record<string, unknown>
}

interface ProvenanceResponse {
  trace_cid: string
  steps: ProvenanceStep[]
}

interface ProvenanceChainProps {
  cid: string
  desk?: string
  ticker?: string
  model?: string
  arcTx?: string
  question?: string
  marketUrl?: string
  className?: string
}

const STEP_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  analyze: Brain,
  brain: Brain,
  hash: Hash,
  database: Database,
  coins: Coins,
  link: Link2,
  'bar-chart-3': BarChart3,
}

function statusView(status: StepStatus) {
  if (status === 'completed') {
    return {
      Icon: CheckCircle2,
      className: 'text-positive',
      label: 'Completed',
    }
  }
  if (status === 'failed') {
    return {
      Icon: XCircle,
      className: 'text-brand-red',
      label: 'Failed',
    }
  }
  return {
    Icon: Loader2,
    className: 'text-amber-400 animate-spin',
    label: 'In Progress',
  }
}

function detailLine(step: ProvenanceStep) {
  const details = step.details ?? {}

  if (step.id === 'analyze') {
    const desk = String(details.desk ?? '—').toUpperCase()
    const ticker = String(details.ticker ?? '—')
    const model = String(details.model ?? 'unknown')
    return `${desk} • ${ticker} • ${model}`
  }

  if (step.id === 'hash') {
    const traceCid = String(details.traceCid ?? '')
    return traceCid ? `SHA-256 · ${truncateHash(traceCid, 10, 8)}` : 'SHA-256'
  }

  if (step.id === 'pin') {
    const pinata = (details.pinata ?? {}) as { cid?: string | null }
    const storacha = (details.storacha ?? {}) as { cid?: string | null }
    const same = Boolean(details.cidEqual)
    const pCid = pinata.cid ? truncateHash(pinata.cid, 8, 6) : '—'
    const sCid = storacha.cid ? truncateHash(storacha.cid, 8, 6) : '—'
    return `Pinata ${pCid} · Storacha ${sCid} ${same ? '• match' : ''}`
  }

  if (step.id === 'stake') {
    const amount = String(details.amount ?? '10')
    const token = String(details.token ?? 'ROSETTA')
    const tx = String(details.tx ?? '')
    return `${amount} ${token}${tx ? ` · ${truncateHash(tx, 8, 6)}` : ''}`
  }

  if (step.id === 'record') {
    const tx = String(details.tx ?? '')
    return tx ? `ReasoningRegistry · ${truncateHash(tx, 8, 6)}` : 'ReasoningRegistry'
  }

  if (step.id === 'market') {
    const question = String(details.question ?? '')
    return question || 'Pending market creation'
  }

  return ''
}

export function ProvenanceChain({
  cid,
  desk,
  ticker,
  model,
  arcTx,
  question,
  marketUrl,
  className = '',
}: ProvenanceChainProps) {
  const [data, setData] = React.useState<ProvenanceResponse | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let mounted = true

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams()
        if (desk) params.set('desk', desk)
        if (ticker) params.set('ticker', ticker)
        if (model) params.set('model', model)
        if (arcTx) {
          params.set('stakeTx', arcTx)
          params.set('recordTx', arcTx)
          params.set('arcTx', arcTx)
        }
        if (question) params.set('question', question)
        if (marketUrl) params.set('marketUrl', marketUrl)

        const query = params.toString()
        const res = await fetch(`/api/trace/${cid}/provenance${query ? `?${query}` : ''}`, { cache: 'no-store' })

        if (!res.ok) throw new Error(`Failed to fetch provenance (${res.status})`)
        const json = (await res.json()) as ProvenanceResponse
        if (mounted) setData(json)
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : 'Failed to load provenance')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    if (cid) void load()
    return () => { mounted = false }
  }, [cid, desk, ticker, model, arcTx, question, marketUrl])

  if (loading) {
    return (
      <div className={`solid-panel border border-white/10 p-5 ${className}`}>
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-amber-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading provenance chain
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className={`solid-panel border border-white/10 p-5 ${className}`}>
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-brand-red">
          <XCircle className="w-4 h-4" />
          {error ?? 'Unable to load provenance'}
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] uppercase tracking-[0.22em] text-text-tertiary">Trace CID</span>
        <span className="font-mono text-[11px] text-text-primary">{truncateHash(data.trace_cid, 12, 10)}</span>
        <a
          href={`https://dweb.link/ipfs/${data.trace_cid}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.2em] text-brand-red hover:text-white transition-colors"
        >
          Verify CID <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      <div className="overflow-x-auto md:pb-2">
        <div className="flex flex-col md:flex-row md:items-stretch min-w-0 md:min-w-[1200px]">
          {data.steps.map((step, idx) => {
            const Icon = STEP_ICON[step.icon] ?? Link2
            const status = statusView(step.status)
            const StatusIcon = status.Icon

            return (
              <React.Fragment key={step.id}>
                <article className="w-full md:w-[190px] md:shrink-0 solid-panel border border-white/10 p-3 bg-black">
                  <div className="flex items-center justify-between mb-2">
                    <span className="inline-flex items-center justify-center w-7 h-7 border border-white/20 bg-white/[0.02]">
                      <Icon className="w-4 h-4 text-white" />
                    </span>
                    <span className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.18em] ${status.className}`}>
                      <StatusIcon className="w-3.5 h-3.5" />
                      {status.label}
                    </span>
                  </div>

                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white">{step.label}</p>
                  <p className="mt-2 text-[10px] text-text-secondary leading-relaxed break-words">
                    {detailLine(step)}
                  </p>

                  <div className="mt-3 pt-3 border-t border-white/[0.08] space-y-1">
                    <p className="font-mono text-[10px] text-text-tertiary">
                      {step.timestamp ? formatTime(step.timestamp) : '—'}
                    </p>
                    {step.link ? (
                      <a
                        href={step.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.18em] text-brand-red hover:text-white transition-colors"
                      >
                        Detail <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-[10px] uppercase tracking-[0.18em] text-text-tertiary">No link</span>
                    )}
                  </div>
                </article>

                {idx < data.steps.length - 1 && (
                  <div className="w-full h-6 md:h-auto md:w-12 md:shrink-0 flex items-center justify-center">
                    <div className="w-px h-full md:h-px md:w-full bg-white/20" />
                  </div>
                )}
              </React.Fragment>
            )
          })}
        </div>
      </div>
    </div>
  )
}
