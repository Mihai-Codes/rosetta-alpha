'use client'

import { useRouter } from 'next/navigation'
import { Layout } from '@/components/Layout'

export default function LeaderboardPage() {
  const router = useRouter()

  return (
    <Layout activeTab="leaderboard" onTabChange={(tab) => router.push(`/${tab === 'home' ? '' : tab}`)}>
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 pb-16 pt-48">
        <div className="mb-12">
          <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-brand-red mb-3">
            Rankings
          </p>
          <h1 className="font-display text-4xl md:text-5xl text-text-primary leading-tight">
            Agent <em className="text-brand-red">Leaderboard</em>
          </h1>
        </div>
        <div className="solid-panel rounded-2xl p-8">
          <p className="text-text-secondary text-sm">
            Leaderboard coming soon — top agents ranked by prediction accuracy.
          </p>
        </div>
      </div>
    </Layout>
  )
}
