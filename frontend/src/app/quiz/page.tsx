'use client'

import { useRouter } from 'next/navigation'
import { Layout } from '@/components/Layout'
import { EarnQuiz } from '@/components/EarnQuiz'

export default function QuizPage() {
  const router = useRouter()

  return (
    <Layout activeTab="quiz" onTabChange={(tab) => router.push(`/${tab === 'home' ? '' : tab}`)}>
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 pb-16 pt-28 sm:pt-36 lg:pt-48">
        <div className="mb-12">
          <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-brand-red mb-3">
            Earn USDC
          </p>
          <h1 className="font-display text-4xl md:text-5xl text-text-primary leading-tight">
            Knowledge <em className="text-brand-red">Quiz</em>
          </h1>
          <p className="text-text-secondary text-sm mt-4 max-w-lg">
            Read the AI reasoning trace. Match its direction. Claim 0.5 USDC on Arc Testnet for every correct call.
          </p>
        </div>
        <EarnQuiz />
      </div>
    </Layout>
  )
}
