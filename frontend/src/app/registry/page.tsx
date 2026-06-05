'use client'

import React from 'react'
import posthog from 'posthog-js'
import { X } from 'lucide-react'
import { RegistryTable } from '@/components/RegistryTable'
import { Layout } from '@/components/Layout'
import { CircleInfraPanel } from '@/components/CircleInfraPanel'
import { ProvenanceChain } from '@/components/ProvenanceChain'
import { SEED_DATA, fetchDesks } from '@/lib/data'
import type { DeskProps } from '@/lib/types'

export default function RegistryPage() {
  const [data, setData] = React.useState<DeskProps[]>(SEED_DATA)
  const [loading, setLoading] = React.useState(true)
  const [selectedDesk, setSelectedDesk] = React.useState<DeskProps | null>(null)

  React.useEffect(() => {
    fetchDesks().then(({ results }) => {
      setData(results)
      setLoading(false)
    })
  }, [])

  React.useEffect(() => {
    posthog.capture('registry_viewed')
  }, [])

  const openProvenance = React.useCallback((cid: string) => {
    const match = data.find((entry) => entry.ipfs_thesis_cid === cid) ?? null
    if (!match) return
    setSelectedDesk(match)
    posthog.capture('registry_provenance_opened', {
      cid_prefix: cid.slice(0, 12),
      desk: match.desk,
      ticker: match.ticker,
    })
  }, [data])

  return (
    <Layout activeTab="registry">
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 pb-16 pt-28 sm:pt-36 lg:pt-48">
        <div className="mb-12">
          <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-brand-red mb-3">
            On-Chain Provenance
          </p>
          <h1 className="font-display text-[clamp(1.75rem,5vw,3rem)] text-text-primary leading-tight">
            Every thesis, <em className="text-brand-red">permanently recorded.</em>
          </h1>
        </div>
        <RegistryTable desks={data} onCidClick={openProvenance} />
        {!loading && <CircleInfraPanel />}
      </div>

      {selectedDesk && (
        <div className="fixed inset-0 z-[120]">
          <button
            type="button"
            className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
            onClick={() => setSelectedDesk(null)}
            aria-label="Close provenance panel"
          />
          <aside
            role="dialog"
            aria-modal="true"
            className="absolute right-0 top-0 h-full w-full max-w-[900px] bg-black border-l border-white/10 p-5 sm:p-6 overflow-y-auto"
          >
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <p className="text-[10px] uppercase tracking-[0.24em] text-brand-red">Provenance Chain</p>
                <h2 className="font-display text-2xl text-white mt-1">
                  {selectedDesk.ticker} · {selectedDesk.desk.toUpperCase()}
                </h2>
                <p className="text-[11px] text-text-tertiary mt-2">
                  Analyze → Hash → Pin → Stake → Record → Market
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDesk(null)}
                className="p-2 border border-white/15 text-text-secondary hover:text-white hover:border-brand-red transition-colors"
                aria-label="Close provenance panel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <ProvenanceChain
              cid={selectedDesk.ipfs_thesis_cid}
              desk={selectedDesk.desk}
              ticker={selectedDesk.ticker}
              model="multi-agent"
              arcTx={selectedDesk.arc_tx}
              question={selectedDesk.question}
            />
          </aside>
        </div>
      )}
    </Layout>
  )
}
