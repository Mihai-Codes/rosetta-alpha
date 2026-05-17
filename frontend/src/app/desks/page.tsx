'use client'

import React from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { DesksView } from '@/components/DesksView'
import { Layout } from '@/components/Layout'
import { SEED_DATA, fetchDesks } from '@/lib/data'
import type { DeskProps } from '@/lib/types'

export default function DesksPage() {
  const { data: session } = useSession()
  const router = useRouter()
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

  return (
    <Layout activeTab="desks" onTabChange={(tab) => router.push(`/${tab === 'home' ? '' : tab}`)}>
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 pb-16 pt-12">
        <DesksView desks={data} loading={loading} isAuthenticated={!!session?.user} />
      </div>
    </Layout>
  )
}
