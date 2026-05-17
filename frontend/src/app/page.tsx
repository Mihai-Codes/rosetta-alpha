'use client'

import { HeroSection } from '@/components/HeroSection'
import { Layout } from '@/components/Layout'

export default function HomePage() {
  return (
    <Layout activeTab="desks" onTabChange={() => {}}>
      <HeroSection latestHash="0x46d3f229..." onScrollDown={() => {
        window.scrollTo({ top: window.innerHeight - 80, behavior: 'smooth' })
      }} />
    </Layout>
  )
}
