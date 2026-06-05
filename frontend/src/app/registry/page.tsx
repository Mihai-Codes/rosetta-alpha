'use client'

import React from 'react'
import posthog from 'posthog-js'
import { RegistryTable } from '@/components/RegistryTable'
import { Layout } from '@/components/Layout'
import { CircleInfraPanel } from '@/components/CircleInfraPanel'
import { ProvenanceChain } from '@/components/ProvenanceChain'
import { SidePanel } from '@/components/SidePanel'
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
        <SidePanel
          isOpen={Boolean(selectedDesk)}
          onClose={() => setSelectedDesk(null)}
          title={`${selectedDesk.ticker} · ${selectedDesk.desk.toUpperCase()}`}
          subtitle="Analyze → Hash → Pin → Stake → Record → Market"
        >
          <ProvenanceChain
            cid={selectedDesk.ipfs_thesis_cid}
            desk={selectedDesk.desk}
            ticker={selectedDesk.ticker}
            model="multi-agent"
            arcTx={selectedDesk.arc_tx}
            question={selectedDesk.question}
          />
        </SidePanel>
      )}
    </Layout>
  )
}
