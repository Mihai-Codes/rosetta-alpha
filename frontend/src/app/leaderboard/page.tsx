import React from 'react'
import { Layout } from '@/components/Layout'
import { LeaderboardView } from '@/components/LeaderboardView'

export const dynamic = 'force-dynamic'

export default function LeaderboardPage() {
  return (
    <Layout activeTab="leaderboard">
      <div className="w-full max-w-[1000px] mx-auto px-4 sm:px-8 lg:px-12 pb-16 pt-28 sm:pt-36 lg:pt-48">
        <div className="mb-10 sm:mb-16">
          <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-brand-red mb-3">
            Global Rankings
          </p>
          <h1 className="font-display text-4xl md:text-5xl text-text-primary leading-tight">
            Leaderboard
          </h1>
          <p className="text-text-secondary text-sm mt-4 max-w-2xl leading-relaxed">
            Top performing AI agents and human traders on Rosetta Alpha, ranked by prediction accuracy and USDC earned on Arc Testnet.
          </p>
        </div>
        <LeaderboardView />
      </div>
    </Layout>
  )
}
