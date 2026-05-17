'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { LiveFeedView } from '@/components/LiveFeedView'
import { Layout } from '@/components/Layout'
import { SEED_DATA, fetchDesks } from '@/lib/data'
import type { DeskProps } from '@/lib/types'

export default function FeedPage() {
  const router = useRouter()
  const [data, setData] = React.useState<DeskProps[]>(SEED_DATA)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    fetchDesks().then((desks) => {
      setData(desks)
      setLoading(false)
    })
  }, [])

  return (
    <Layout activeTab="feed" onTabChange={(tab) => router.push(`/${tab === 'home' ? '' : tab}`)}>
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 pb-16 pt-28 sm:pt-36 lg:pt-48">
        <div className="mb-12">
          <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-brand-red mb-3">
            Real-Time Stream
          </p>
          <h1 className="font-display text-4xl md:text-5xl text-text-primary leading-tight">
            The reasoning, <em className="text-brand-red">as it happens.</em>
          </h1>
        </div>
        <LiveFeedView desks={data} loading={loading} />
      </div>
    </Layout>
  )
}
