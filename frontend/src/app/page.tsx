'use client'

import React from 'react'
import posthog from 'posthog-js'
import { useSession } from 'next-auth/react'
import { HeroSection } from '@/components/HeroSection'
import { DesksView } from '@/components/DesksView'
import { StatsBar } from '@/components/StatsBar'
import { Layout } from '@/components/Layout'
import { SEED_DATA, fetchDesks } from '@/lib/data'
import type { DeskProps } from '@/lib/types'
import { DEFAULT_STATS } from '@/components/StatsBar'

export const dynamic = 'force-dynamic'
export default function HomePage() {
  const { data: session } = useSession()
  const [data, setData] = React.useState<DeskProps[]>(SEED_DATA)
  const [loading, setLoading] = React.useState(true)
  const [stats, setStats] = React.useState(DEFAULT_STATS)

  React.useEffect(() => {
    fetchDesks().then((desks) => {
      setData(desks)
      setLoading(false)
    })
    const interval = setInterval(() => fetchDesks().then(setData), 30000)
    return () => clearInterval(interval)
  }, [])

  // Fetch live stats
  React.useEffect(() => {
    fetch('/api/stats')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) {
          setStats([
            { label: 'theses published', target: data.theses_published },
            { label: 'Arc L1 transactions', target: data.arc_tx_count },
            { label: 'IPFS pins', target: data.ipfs_pins_count },
            { label: 'quiz attempts', target: data.quiz_attempts },
            { label: 'avg cost per trace', target: data.avg_cost_per_trace, prefix: '~$' },
          ])
        }
      })
      .catch(() => { /* keep defaults */ })
  }, [])

  // Track hero view on mount
  React.useEffect(() => {
    posthog.capture('hero_viewed')
  }, [])

  function handleCtaClick(which: 'enter_terminal' | 'try_quiz' | 'view_desks') {
    posthog.capture('cta_clicked', { button: which })
  }

  return (
    <Layout activeTab="desks">
      <HeroSection
        latestHash="0x46d3f229..."
        isAuthenticated={!!session?.user}
        onScrollDown={(e: React.MouseEvent) => {
          e?.preventDefault()
          handleCtaClick('enter_terminal')
          const el = document.getElementById('desks-section'); if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
        }}
      />
      
      <StatsBar stats={stats} />

      <div id="desks-section" className="w-full max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 pb-0 pt-10 sm:pt-12" style={{ scrollMarginTop: '80px' }}>
        <DesksView desks={data} loading={loading} isAuthenticated={!!session?.user} />
      </div>
    </Layout>
  )
}
