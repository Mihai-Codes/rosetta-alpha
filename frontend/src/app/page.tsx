'use client'

import React from 'react'
import posthog from 'posthog-js'
import { useSession } from 'next-auth/react'
import { HeroSection } from '@/components/HeroSection'
import { DesksView } from '@/components/DesksView'
import { Layout } from '@/components/Layout'
import { SEED_DATA, fetchDesks } from '@/lib/data'
import type { DeskProps } from '@/lib/types'

export default function HomePage() {
  const { data: session } = useSession()
  const [data, setData] = React.useState<DeskProps[]>(SEED_DATA)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    fetchDesks().then((desks) => {
      setData(desks)
      setLoading(false)
    })
    const interval = setInterval(() => fetchDesks().then(setData), 30000)
    return () => clearInterval(interval)
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
        onScrollDown={() => {
          handleCtaClick('enter_terminal')
          const el = document.getElementById('desks-section')
          if (el) {
            const y = el.getBoundingClientRect().top + window.scrollY - 120
            window.scrollTo({ top: y, behavior: 'smooth' })
          }
        }}
      />
      <div id="desks-section" className="w-full max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 pb-16">
        <DesksView desks={data} loading={loading} isAuthenticated={!!session?.user} />
      </div>
    </Layout>
  )
}
