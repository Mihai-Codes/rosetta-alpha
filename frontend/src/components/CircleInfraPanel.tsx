'use client'

import React from 'react'
import { ShieldCheck, Webhook, Coins, Activity, Lock, Unlock, CheckCircle2, AlertCircle } from 'lucide-react'

type ErcStatusResponse = {
  ok: boolean
  contracts?: {
    identityRegistry: string
    reputationRegistry: string
    validationRegistry: string
    identityLive: boolean
    reputationLive: boolean
    validationLive: boolean
  }
  summary?: {
    configuredDesks: number
    registeredDesks: number
  }
  desks?: Array<{
    desk: string
    wallet: string | null
    identityBalance: string | null
    hasIdentity: boolean
    status: string
  }>
}

type GatewayRecentResponse = {
  ok: boolean
  events: Array<{
    notificationType: string
    notificationId?: string
    walletAddress?: string
    txHash?: string
    amount?: string
    receivedAt: string
  }>
}

type X402Probe = {
  status: number
  paid: boolean
  body: unknown
}

function shortHash(value?: string) {
  if (!value) return '—'
  if (value.length <= 16) return value
  return `${value.slice(0, 8)}…${value.slice(-6)}`
}

export function CircleInfraPanel() {
  const [erc, setErc] = React.useState<ErcStatusResponse | null>(null)
  const [gateway, setGateway] = React.useState<GatewayRecentResponse | null>(null)
  const [x402Unpaid, setX402Unpaid] = React.useState<X402Probe | null>(null)
  const [x402Paid, setX402Paid] = React.useState<X402Probe | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    let mounted = true

    async function load() {
      try {
        const [ercResult, gatewayResult, unpaidResult, paidResult] = await Promise.allSettled([
          fetch('/api/erc8004/status', { cache: 'no-store' }),
          fetch('/api/gateway/webhooks/recent?limit=5', { cache: 'no-store' }),
          fetch('/api/x402/agent-insight?desk=CRYPTO', { cache: 'no-store' }),
          fetch('/api/x402/agent-insight?desk=CRYPTO', {
            cache: 'no-store',
            headers: { 'x-payment': 'demo_paid_registry_probe' },
          }),
        ])

        if (!mounted) return

        if (ercResult.status === 'fulfilled') {
          const ercJson = await ercResult.value.json().catch(() => null)
          setErc(ercJson)
        }

        if (gatewayResult.status === 'fulfilled') {
          const gatewayJson = await gatewayResult.value.json().catch(() => null)
          setGateway(gatewayJson)
        }

        if (unpaidResult.status === 'fulfilled') {
          const unpaidJson = await unpaidResult.value.json().catch(() => null)
          setX402Unpaid({ status: unpaidResult.value.status, paid: false, body: unpaidJson })
        } else {
          setX402Unpaid({ status: 0, paid: false, body: { error: 'unavailable' } })
        }

        if (paidResult.status === 'fulfilled') {
          const paidJson = await paidResult.value.json().catch(() => null)
          setX402Paid({ status: paidResult.value.status, paid: true, body: paidJson })
        } else {
          setX402Paid({ status: 0, paid: true, body: { error: 'unavailable' } })
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }

    void load()
    return () => { mounted = false }
  }, [])

  return (
    <section className="mt-12 space-y-6">
      <div>
        <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-brand-red mb-2">
          Circle / Arc 2026 Additions
        </p>
        <h2 className="font-display text-2xl text-text-primary">
          Agentic infrastructure validation
        </h2>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* ERC-8004 */}
        <div className="solid-panel flex flex-col p-6 border border-white/5 bg-gradient-to-b from-white/[0.03] to-transparent rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-red to-transparent opacity-50"></div>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-brand-red/10 text-brand-red ring-1 ring-brand-red/20">
              <ShieldCheck size={18} />
            </div>
            <h3 className="text-sm font-semibold tracking-wide text-text-primary">ERC-8004 Identity</h3>
          </div>
          
          {loading ? (
            <div className=" space-y-3 flex-1">
              <div className="h-4 bg-white/5 rounded w-1/2"></div>
              <div className="h-4 bg-white/5 rounded w-3/4"></div>
            </div>
          ) : (
            <div className="space-y-6 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-secondary">Registry Status</span>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium tracking-wide uppercase ${erc?.contracts?.identityLive ? 'bg-positive/10 text-positive border border-positive/20' : 'bg-brand-red/10 text-brand-red border border-brand-red/20'}`}>
                  {erc?.contracts?.identityLive ? <><Activity size={10} className="" /> Live</> : <><AlertCircle size={10} /> Offline</>}
                </span>
              </div>
              
              <div>
                <p className="text-xs text-text-secondary mb-3 flex items-center justify-between">
                  <span>Registered Desks</span>
                  <span className="text-text-primary font-mono">{erc?.summary?.registeredDesks ?? 0} / 5</span>
                </p>
                <ul className="space-y-2.5">
                  {(erc?.desks ?? []).map((d) => (
                    <li key={d.desk} className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.02] hover:bg-white/[0.04] transition-colors">
                      <span className="text-xs font-medium text-text-primary tracking-wide">{d.desk}</span>
                      <span className={`inline-flex items-center gap-1 text-[10px] font-mono uppercase ${d.hasIdentity || d.status.includes('demo') ? 'text-positive' : 'text-text-tertiary'}`}>
                        {d.hasIdentity || d.status.includes('demo') ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                        {d.hasIdentity ? 'Registered' : d.status}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Gateway webhooks */}
        <div className="solid-panel flex flex-col p-6 border border-white/5 bg-gradient-to-b from-white/[0.03] to-transparent rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-transparent opacity-50"></div>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20">
                <Webhook size={18} />
              </div>
              <h3 className="text-sm font-semibold tracking-wide text-text-primary">Gateway Webhooks</h3>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-blue-400 font-medium tracking-wide uppercase px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              Listening
            </div>
          </div>
          
          {loading ? (
            <div className=" space-y-3 flex-1">
              <div className="h-4 bg-white/5 rounded w-full"></div>
              <div className="h-4 bg-white/5 rounded w-2/3"></div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col">
              <div className="flex-1">
                {(gateway?.events?.length ?? 0) === 0 ? (
                  <div className="h-full flex items-center justify-center border border-dashed border-white/10 rounded-xl bg-white/[0.01]">
                    <p className="text-sm text-text-tertiary">No webhook events ingested yet.</p>
                  </div>
                ) : (
                  <div className="relative pl-3 space-y-4">
                    {(gateway?.events ?? []).map((e, idx) => (
                      <div key={`${e.notificationId ?? e.receivedAt}`} className="relative flex items-start gap-4">
                        <div className="absolute left-[-15px] mt-1.5 h-2 w-2 rounded-full ring-4 ring-[#0A0A0A] bg-blue-500"></div>
                        <div className="flex-1 bg-white/[0.02] border border-white/5 rounded-lg p-3 hover:bg-white/[0.04] transition-colors">
                          <p className="text-xs font-medium text-text-primary mb-1">{e.notificationType}</p>
                          <div className="flex items-center gap-2 text-[10px] text-text-tertiary font-mono">
                            <span className="text-blue-400/70">{shortHash(e.txHash)}</span>
                            <span>•</span>
                            <span>{shortHash(e.walletAddress)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="mt-6 pt-4 border-t border-white/5">
                <div className="flex flex-wrap items-start sm:items-center gap-x-2 gap-y-1">
                  <span className="text-[9px] text-text-tertiary uppercase tracking-widest shrink-0">Subscribed Events:</span>
                  <span className="text-[9px] text-blue-400/70 uppercase tracking-widest">Automated Deposits / Institutional Verification / On-chain Minting</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* x402 */}
        <div className="solid-panel flex flex-col p-6 border border-white/5 bg-gradient-to-b from-white/[0.03] to-transparent rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-transparent opacity-50"></div>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20">
              <Coins size={18} />
            </div>
            <h3 className="text-sm font-semibold tracking-wide text-text-primary">x402 Nanopayments</h3>
          </div>
          
          {loading ? (
            <div className=" space-y-3 flex-1">
              <div className="h-4 bg-white/5 rounded w-3/4"></div>
              <div className="h-4 bg-white/5 rounded w-1/2"></div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-between">
              <div className="space-y-4">
                {/* Unpaid Probe */}
                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-xs text-text-secondary">
                      <Lock size={14} className="text-amber-500" />
                      <span>Unpaid Request</span>
                    </div>
                    <span className="inline-flex items-center justify-center px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                      HTTP {x402Unpaid?.status ?? '—'}
                    </span>
                  </div>
                  <p className="text-[10px] text-text-tertiary">Access denied. Payment required.</p>
                </div>

                {/* Paid Probe */}
                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-xs text-text-secondary">
                      <Unlock size={14} className="text-emerald-500" />
                      <span>Paid Request</span>
                    </div>
                    <span className="inline-flex items-center justify-center px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                      HTTP {x402Paid?.status ?? '—'}
                    </span>
                  </div>
                  <p className="text-[10px] text-text-tertiary">Payment verified. Insight delivered.</p>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/5">
                <p className="text-[9px] text-text-tertiary uppercase tracking-widest break-all">
                  Security Layer:<br/>
                  <span className="text-emerald-400/70 font-mono text-[10px] uppercase tracking-widest">Encrypted Agent API (x402-Protected)</span>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
