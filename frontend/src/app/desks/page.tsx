'use client'

import React from 'react'
import posthog from 'posthog-js'
import { DesksView } from '@/components/DesksView'
import { Layout } from '@/components/Layout'
import { SEED_DATA, fetchDesks } from '@/lib/data'
import type { DeskProps } from '@/lib/types'

export default function DesksPage() {
  const [data, setData] = React.useState<DeskProps[]>(SEED_DATA)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    fetchDesks().then((desks) => {
      setData(desks)
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
        </div>
        <DesksView desks={data} loading={loading} />
      </div>
    </Layout>
  )
}
