'use client'

import { useRouter } from 'next/navigation'
import { AboutView } from '@/components/AboutView'
import { Layout } from '@/components/Layout'

export default function AboutPage() {
  const router = useRouter()

  return (
    <Layout activeTab="about" onTabChange={(tab) => router.push(`/${tab === 'home' ? '' : tab}`)}>
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 pb-16 pt-48">
        <div className="mb-12">
          <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-brand-red mb-3">
            About
          </p>
          <h1 className="font-display text-4xl md:text-5xl text-text-primary leading-tight">
            About Rosetta Alpha
          </h1>
        </div>
        <AboutView />
      </div>
    </Layout>
  )
}
