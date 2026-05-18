'use client'

import { Layout } from '@/components/Layout'
import { EarnQuiz } from '@/components/EarnQuiz'

// Mock quiz questions — replace with API-fetched questions when generation pipeline is live
const MOCK_QUESTIONS = [
  {
    text: 'Bitcoin is showing bullish divergence on the daily chart. ETF inflows are positive and exchange reserves are decreasing. Which direction does the AI agent most likely recommend?',
    options: [
      'LONG — supply tightening signals upward pressure',
      'SHORT — ETF inflows indicate overvaluation',
      'NEUTRAL — mixed signals suggest caution',
      'FLAT — insufficient data to conclude',
    ],
    correctIndex: 0,
  },
  {
    text: "The US equities agent cites Apple's RSI at 68, MACD crossing below signal, and high institutional ownership with stable float. What is the AI's likely directional call?",
    options: [
      'LONG — institutional stability supports price',
      'NEUTRAL — momentum fading but fundamentals solid',
      'SHORT — RSI overbought and MACD bearish',
      'LONG — high ownership prevents downside',
    ],
    correctIndex: 1,
  },
  {
    text: "Ethereum's staking yields are compressing, Layer-2 fee revenue is declining, and large early staker unlocks create near-term supply. The ETH/BTC ratio sits at a 6-month low. What is the AI's prediction?",
    options: [
      'LONG ETH vs BTC — protocol strength supports it',
      'SHORT ETH vs BTC — multiple bearish signals',
      'NEUTRAL — conflicting on-chain signals',
      'HOLD — ratio at support, reversal imminent',
    ],
    correctIndex: 1,
  },
]

export default function QuizPage() {

  function handleComplete(score: number) {
    console.log('Quiz complete:', score, '/', MOCK_QUESTIONS.length)
  }

  return (
    <Layout activeTab="quiz">
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 pb-16 pt-28 sm:pt-36 lg:pt-48">
        <div className="mb-12">
          <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-brand-red mb-3">
            Earn USDC
          </p>
          <h1 className="font-display text-4xl md:text-5xl text-text-primary leading-tight">
            Knowledge <em className="text-brand-red">Quiz</em>
          </h1>
          <p className="text-text-secondary text-sm mt-4 max-w-lg">
            Read the AI reasoning trace. Match its direction. Claim USDC on Arc Testnet for every correct call.
          </p>
        </div>
        <EarnQuiz
          thesisId="mock-thesis-001"
          questions={MOCK_QUESTIONS}
          onComplete={handleComplete}
        />
      </div>
    </Layout>
  )
}
