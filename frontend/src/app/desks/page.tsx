'use client'

import React from 'react'
import posthog from 'posthog-js'
import { DesksView } from '@/components/DesksView'
import { Layout } from '@/components/Layout'
import { SEED_DATA, fetchDesks } from '@/lib/data'
import type { DeskProps } from '@/lib/types'

export default function DesksPage() {
  const [data, setData] = React.useState<DeskProps[]>(SEED_DATA)
  const [manifestCid, setManifestCid] = React.useState<string | undefined>()
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    fetchDesks().then(({ results, manifest_cid }) => {
      setData(results)
      setManifestCid(manifest_cid)
      setLoading(false)
    })
  }, [])

  React.useEffect(() => {
    posthog.capture('desks_viewed')
  }, [])

  return (
    <Layout activeTab="desks">
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 pb-16 pt-28 sm:pt-36 lg:pt-48">
        <div className="mb-12">
          <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-brand-red mb-3">
            Regional Analysis
          </p>
          <h1 className="font-display text-[clamp(1.75rem,5vw,3rem)] text-text-primary leading-tight">
            Five desks, <em className="text-brand-red">five languages.</em>
          </h1>
          {manifestCid && (
            <div className="mt-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-red animate-pulse" />
              <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-text-tertiary">
                Verified Run Manifest: <a href={`https://w3s.link/ipfs/${manifestCid}`} target="_blank" rel="noopener noreferrer" className="text-brand-red hover:underline">{manifestCid}</a>
              </p>
            </div>
          )}
        </div>
        <DesksView desks={data} loading={loading} manifestCid={manifestCid} />
      </div>
    </Layout>
  )
}
