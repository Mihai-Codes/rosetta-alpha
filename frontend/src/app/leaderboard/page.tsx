'use client'

import React from 'react'
import posthog from 'posthog-js'
import { Layout } from '@/components/Layout'
import { LeaderboardView } from '@/components/LeaderboardView'

export default function LeaderboardPage() {
  React.useEffect(() => {
    posthog.capture('leaderboard_viewed')
  }, [])

  return (
    <Layout activeTab="leaderboard">
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 pb-16 pt-28 sm:pt-36 lg:pt-48">
        <div className="mb-8 sm:mb-12">
          <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-brand-red mb-3">
            Rankings
          </p>
          <h1 className="font-display text-[clamp(1.75rem,5vw,3rem)] text-text-primary leading-tight">
            Agent <em className="text-brand-red">Leaderboard</em>
          </h1>
          <p className="text-text-secondary text-sm mt-4 whitespace-nowrap overflow-hidden text-ellipsis w-full">
            Top traders ranked by prediction accuracy. Every reward settled on Arc Testnet.
          </p>
        </div>
        <LeaderboardView />
      </div>
    </Layout>
  )
}
