'use client'

import React from 'react'

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

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* ERC-8004 */}
        <div className="solid-panel p-5 space-y-3">
          <p className="text-[10px] uppercase tracking-[0.25em] text-text-tertiary">ERC-8004 Identity</p>
          {loading ? (
            <p className="text-sm text-text-tertiary">Loading…</p>
          ) : (
            <>
              <p className="text-sm text-text-secondary">
                Registry live: <span className="text-text-primary">{erc?.contracts?.identityLive ? 'yes' : 'no'}</span>
              </p>
              <p className="text-sm text-text-secondary">
                Registered desks: <span className="text-text-primary">{erc?.summary?.registeredDesks ?? 0}</span>
              </p>
              <ul className="space-y-1 text-xs text-text-tertiary">
                {(erc?.desks ?? []).map((d) => (
                  <li key={d.desk} className="flex items-center justify-between gap-2">
                    <span>{d.desk}</span>
                    <span className={d.hasIdentity ? 'text-positive' : 'text-text-tertiary'}>
                      {d.hasIdentity ? 'registered' : d.status}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        {/* Gateway webhooks */}
        <div className="solid-panel p-5 space-y-3">
          <p className="text-[10px] uppercase tracking-[0.25em] text-text-tertiary">Gateway Webhooks</p>
          {loading ? (
            <p className="text-sm text-text-tertiary">Loading…</p>
          ) : (gateway?.events?.length ?? 0) === 0 ? (
            <p className="text-sm text-text-secondary">No webhook events ingested yet.</p>
          ) : (
            <ul className="space-y-2">
              {(gateway?.events ?? []).map((e) => (
                <li key={`${e.notificationId ?? e.receivedAt}`} className="text-xs">
                  <p className="text-text-primary">{e.notificationType}</p>
                  <p className="text-text-tertiary font-mono">{shortHash(e.txHash)} · {shortHash(e.walletAddress)}</p>
                </li>
              ))}
            </ul>
          )}
          <p className="text-[10px] text-text-tertiary uppercase tracking-[0.18em]">
            Listening for gateway.deposit.finalized / mint.finalized / mint.forwarded
          </p>
        </div>

        {/* x402 */}
        <div className="solid-panel p-5 space-y-3">
          <p className="text-[10px] uppercase tracking-[0.25em] text-text-tertiary">x402 Nanopayments</p>
          {loading ? (
            <p className="text-sm text-text-tertiary">Loading…</p>
          ) : (
            <>
              <div className="text-xs text-text-secondary space-y-1">
                <p>Unpaid probe status: <span className="text-text-primary">{x402Unpaid?.status ?? '—'}</span></p>
                <p>Paid probe status: <span className="text-text-primary">{x402Paid?.status ?? '—'}</span></p>
              </div>
              <p className="text-[10px] text-text-tertiary uppercase tracking-[0.18em]">
                Endpoint: /api/x402/agent-insight (returns HTTP 402 when unpaid)
              </p>
            </>
          )}
        </div>
      </div>
    </section>
  )
}
