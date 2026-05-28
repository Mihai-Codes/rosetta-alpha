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
import { authModalState } from '@/components/SignInModal'

export const dynamic = "force-dynamic"
export default function HomePage() {
  const { data: session } = useSession()
  const [data, setData] = React.useState<DeskProps[]>(SEED_DATA)
  const [loading, setLoading] = React.useState(true)
  const [stats, setStats] = React.useState(DEFAULT_STATS)

  React.useEffect(() => {
    fetchDesks().then(({ results }) => {
      setData(results)
      setLoading(false)
    })
    const interval = setInterval(() => fetchDesks().then(({ results }) => setData(results)), 30000)
    return () => clearInterval(interval)
  }, [])

  // Fetch live stats and refresh immediately after an in-page quiz attempt is recorded.
  React.useEffect(() => {
    let cancelled = false

    const fetchStats = () => {
      fetch('/api/stats', { cache: 'no-store' })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (!cancelled && data) {
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
    }

    const refreshStats = () => fetchStats()

    fetchStats()
    window.addEventListener('rosetta:quiz-attempt-recorded', refreshStats)
    window.addEventListener('focus', refreshStats)
    window.addEventListener('pageshow', refreshStats)

    return () => {
      cancelled = true
      window.removeEventListener('rosetta:quiz-attempt-recorded', refreshStats)
      window.removeEventListener('focus', refreshStats)
      window.removeEventListener('pageshow', refreshStats)
    }
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
          const el = document.getElementById('desks-section');
          if (el) {
            const target = el.getBoundingClientRect().top + window.scrollY - 80;
            const start = window.scrollY;
            const diff = target - start;
            let startTimestamp: number | null = null;
            const step = (timestamp: number) => {
              if (!startTimestamp) startTimestamp = timestamp;
              const progress = Math.min((timestamp - startTimestamp) / 600, 1);
              const easeInOut = progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;
              window.scrollTo(0, start + diff * easeInOut);
              if (progress < 1) window.requestAnimationFrame(step);
            };
            window.requestAnimationFrame(step);
          }
        }}
      />
      
      <StatsBar stats={stats} />

      <div id="desks-section" className="w-full max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 pb-16 pt-10 sm:pt-12" style={{ scrollMarginTop: '80px' }}>
        <DesksView desks={data} loading={loading} isAuthenticated={!!session?.user} />
      </div>
    </Layout>
  )
}
