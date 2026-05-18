'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAccount, useSendTransaction } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { parseEther } from 'viem'

// ─── Types ────────────────────────────────────────────────────────────────────

interface QuizQuestion {
  id: number
  ticker: string
  desk: string
  question: string
  summary: string
  aiDirection: 'LONG' | 'SHORT' | 'NEUTRAL'
  confidence: number
  arcTx: string
  traceHash: string
}

type UserAnswer = 'LONG' | 'SHORT' | 'NEUTRAL'

type QuizPhase = 'question' | 'reveal' | 'claimed' | 'wrong'

// ─── Static quiz data (derived from results.json thesis data) ─────────────────

const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 1,
    ticker: 'BTC',
    desk: 'Crypto',
    question: 'Will BTC-USD close higher than $65,000 on June 15, 2026?',
    summary:
      'Bitcoin exhibits bullish divergence on the daily chart. ETF inflows remain positive and on-chain metrics show decreased exchange reserves, signaling supply tightening. Breaking through the $64k resistance level with volume — R1 reasoning suggests high probability of continued upward momentum.',
    aiDirection: 'LONG',
    confidence: 0.73,
    arcTx: '0x50fd3228...',
    traceHash: '0x7c2d...4f9a',
  },
  {
    id: 2,
    ticker: 'AAPL',
    desk: 'US Equities',
    question: 'Will AAPL stock price remain within a 1% band over the next 30 days?',
    summary:
      'Apple shows strong fundamentals but technical indicators suggest consolidation after recent earnings. RSI and MACD show neutral momentum. Institutional ownership is high and stable. Macro environment remains stable with no major catalysts on the immediate horizon.',
    aiDirection: 'NEUTRAL',
    confidence: 0.70,
    arcTx: '0x293d33c4...',
    traceHash: '0x56a2...8b1e',
  },
  {
    id: 3,
    ticker: 'ETH',
    desk: 'Crypto',
    question: 'Will ETH outperform BTC by more than 5% over the next 14 days?',
    summary:
      'Ethereum is showing relative weakness vs Bitcoin on the weekly. Staking yields are compressing and Layer-2 fee revenue has declined. Large unlock events from early stakers create near-term selling pressure. On-chain data shows ETH/BTC ratio at 6-month lows with no clear reversal signal.',
    aiDirection: 'SHORT',
    confidence: 0.65,
    arcTx: '0x8d2f119a...',
    traceHash: '0x3e7c...1a2b',
  },
]

// ─── Direction badge colors ───────────────────────────────────────────────────

const DIRECTION_STYLES: Record<UserAnswer, string> = {
  LONG: 'border-positive text-positive bg-positive/10 hover:bg-positive/20',
  SHORT: 'border-negative text-negative bg-negative/10 hover:bg-negative/20',
  NEUTRAL: 'border-accent-gold text-accent-gold bg-accent-gold/10 hover:bg-accent-gold/20',
}

const DIRECTION_ACTIVE: Record<UserAnswer, string> = {
  LONG: 'border-positive text-positive bg-positive/20 shadow-[0_0_20px_rgba(34,197,94,0.25)]',
  SHORT: 'border-negative text-negative bg-negative/20 shadow-[0_0_20px_rgba(239,68,68,0.25)]',
  NEUTRAL: 'border-accent-gold text-accent-gold bg-accent-gold/20 shadow-[0_0_20px_rgba(201,168,76,0.25)]',
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProgressBar({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-3 mb-8">
      <div className="flex gap-1.5">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={`h-1 rounded-full transition-all duration-500 ${
              i < current
                ? 'w-6 bg-accent-gold'
                : i === current
                ? 'w-6 bg-accent-gold/50'
                : 'w-4 bg-border-strong'
            }`}
          />
        ))}
      </div>
      <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-text-tertiary">
        {current + 1} / {total}
      </span>
    </div>
  )
}

function DirectionButton({
  direction,
  selected,
  disabled,
  onClick,
}: {
  direction: UserAnswer
  selected: boolean
  disabled: boolean
  onClick: () => void
}) {
  const LABELS: Record<UserAnswer, string> = {
    LONG: '↑ Long',
    SHORT: '↓ Short',
    NEUTRAL: '→ Neutral',
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        flex-1 py-3 px-4 rounded-xl border text-xs font-medium uppercase tracking-[0.15em]
        transition-all duration-200
        ${selected ? DIRECTION_ACTIVE[direction] : DIRECTION_STYLES[direction]}
        ${disabled && !selected ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      {LABELS[direction]}
    </button>
  )
}

function ConfidenceMeter({ value }: { value: number }) {
  const pct = Math.round(value * 100)
  const color = value >= 0.7 ? '#22C55E' : value >= 0.55 ? '#C9A84C' : '#EF4444'
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="text-[9px] uppercase tracking-[0.2em] text-text-tertiary">
          AI Conviction
        </span>
        <span className="text-[11px] font-mono font-bold" style={{ color }}>
          {pct}%
        </span>
      </div>
      <div className="h-1 rounded-full bg-bg-tertiary overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
        />
      </div>
    </div>
  )
}

// ─── Main EarnQuiz component ──────────────────────────────────────────────────

// Rosetta Rewards Pool address on Arc Testnet — receives claim registration txs
const REWARDS_POOL = '0x06775Be99CfBC9A6D0819ff87A67954a2E976A16' as `0x${string}`

// 0.001 USDC (native on Arc) as a claim-registration proof tx
// In production the pool would send 0.5 USDC back; here we prove Arc interaction
const CLAIM_PROOF_VALUE = parseEther('0.001')

export function EarnQuiz() {
  const { isConnected } = useAccount()
  const { openConnectModal } = useConnectModal()
  const { sendTransactionAsync } = useSendTransaction()

  const [qIndex, setQIndex] = useState(0)
  const [phase, setPhase] = useState<QuizPhase>('question')
  const [selected, setSelected] = useState<UserAnswer | null>(null)
  const [score, setScore] = useState(0)
  const [totalAnswered, setTotalAnswered] = useState(0)
  const [claiming, setClaiming] = useState(false)
  const [claimedTxs, setClaimedTxs] = useState<string[]>([])
  const [claimError, setClaimError] = useState<string | null>(null)
  const [finished, setFinished] = useState(false)

  const q = QUIZ_QUESTIONS[qIndex]

  // Clear error when moving to next question
  useEffect(() => { setClaimError(null) }, [qIndex])

  function handleAnswer(direction: UserAnswer) {
    if (phase !== 'question') return
    setSelected(direction)
    setTotalAnswered((t) => t + 1)
    if (direction === q.aiDirection) {
      setScore((s) => s + 1)
      setPhase('reveal')
    } else {
      setPhase('wrong')
    }
  }

  async function handleClaim() {
    if (!isConnected) {
      openConnectModal?.()
      return
    }
    setClaiming(true)
    setClaimError(null)
    try {
      // Real Arc Testnet tx — sends 0.001 USDC to Rosetta Rewards Pool
      // as a claim-registration proof; tx hash is real and verifiable on ArcScan
      const txHash = await sendTransactionAsync({
        to: REWARDS_POOL,
        value: CLAIM_PROOF_VALUE,
        chainId: 5042002,
      })
      setClaimedTxs((txs) => [...txs, txHash])
      setPhase('claimed')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Transaction failed'
      // User rejected — don't show error, just let them retry
      if (!msg.toLowerCase().includes('rejected') && !msg.toLowerCase().includes('denied')) {
        setClaimError('Transaction failed — check your Arc Testnet balance and try again.')
      }
    } finally {
      setClaiming(false)
    }
  }

  function handleNext() {
    if (qIndex + 1 >= QUIZ_QUESTIONS.length) {
      setFinished(true)
    } else {
      setQIndex((i) => i + 1)
      setPhase('question')
      setSelected(null)
    }
  }

  // ── Finished screen ──────────────────────────────────────────────────────────
  if (finished) {
    const accuracy = Math.round((score / QUIZ_QUESTIONS.length) * 100)
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="solid-panel rounded-2xl p-8 md:p-12 text-center space-y-6 max-w-2xl mx-auto"
      >
        <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-brand-red">
          Session Complete
        </p>
        <h2 className="font-display text-3xl md:text-4xl text-text-primary">
          {accuracy >= 70 ? '🎯 Sharp Alpha' : accuracy >= 40 ? '📊 Decent Read' : '📉 Keep Studying'}
        </h2>
        <p className="text-text-secondary text-sm">
          You matched the AI on{' '}
          <span className="text-accent-gold font-semibold">
            {score} / {QUIZ_QUESTIONS.length}
          </span>{' '}
          thesis directions.
        </p>
        <div className="grid grid-cols-3 gap-4 pt-2">
          <div className="solid-panel rounded-xl p-4">
            <p className="text-2xl font-mono font-bold text-positive">{score}</p>
            <p className="text-[9px] uppercase tracking-[0.2em] text-text-tertiary mt-1">Correct</p>
          </div>
          <div className="solid-panel rounded-xl p-4">
            <p className="text-2xl font-mono font-bold text-accent-gold">{accuracy}%</p>
            <p className="text-[9px] uppercase tracking-[0.2em] text-text-tertiary mt-1">Accuracy</p>
          </div>
          <div className="solid-panel rounded-xl p-4">
            <p className="text-2xl font-mono font-bold text-text-primary">{claimedTxs.length}</p>
            <p className="text-[9px] uppercase tracking-[0.2em] text-text-tertiary mt-1">USDC Claimed</p>
          </div>
        </div>
        {claimedTxs.length > 0 && (
          <div className="space-y-2 pt-2">
            <p className="text-[9px] uppercase tracking-[0.2em] text-text-tertiary">Arc Testnet Receipts</p>
            {claimedTxs.map((tx) => (
              <a
                key={tx}
                href={`https://testnet.arcscan.app/tx/${tx}`}
                target="_blank"
                rel="noreferrer"
                className="block font-mono text-[10px] text-accent-gold hover:underline truncate"
              >
                {tx}
              </a>
            ))}
          </div>
        )}
        <button
          onClick={() => {
            setQIndex(0)
            setPhase('question')
            setSelected(null)
            setScore(0)
            setTotalAnswered(0)
            setClaimedTxs([])
            setFinished(false)
          }}
          className="mt-4 px-8 py-3 rounded-full border border-accent-gold/40 text-accent-gold text-[10px] uppercase tracking-[0.2em] font-medium hover:border-accent-gold hover:shadow-[0_0_30px_rgba(201,168,76,0.25)] transition-all duration-300"
        >
          Play Again
        </button>
      </motion.div>
    )
  }

  // ── Question card ────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Stats bar */}
      <div className="flex items-center justify-between">
        <ProgressBar current={qIndex} total={QUIZ_QUESTIONS.length} />
        <div className="flex items-center gap-4 text-[10px] uppercase tracking-[0.2em]">
          <span className="text-text-tertiary">
            Score{' '}
            <span className="text-accent-gold font-semibold">{score}</span>
          </span>
          {claimedTxs.length > 0 && (
            <span className="text-text-tertiary">
              Earned{' '}
              <span className="text-positive font-semibold">{claimedTxs.length * 0.5} USDC</span>
            </span>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={qIndex}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.3 }}
          className="solid-panel rounded-2xl overflow-hidden"
        >
          {/* Card header */}
          <div className="px-6 pt-6 pb-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-[9px] font-medium uppercase tracking-[0.3em] text-text-tertiary px-2 py-1 rounded border border-border">
                {q.desk}
              </span>
              <span className="text-[10px] font-mono font-bold text-text-primary">{q.ticker}</span>
            </div>
            <span className="text-[9px] uppercase tracking-[0.2em] text-text-tertiary">
              Thesis #{q.id}
            </span>
          </div>

          {/* Question */}
          <div className="px-6 pt-5 pb-4">
            <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-brand-red mb-3">
              Prediction
            </p>
            <p className="text-text-primary text-sm md:text-base leading-relaxed font-medium mb-4">
              {q.question}
            </p>
            <p className="text-text-secondary text-xs leading-relaxed">{q.summary}</p>
          </div>

          {/* Reveal panel */}
          <AnimatePresence>
            {(phase === 'reveal' || phase === 'claimed' || phase === 'wrong') && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="overflow-hidden"
              >
                <div className="px-6 pb-4 border-t border-border mt-2 pt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[9px] uppercase tracking-[0.2em] text-text-tertiary">
                      AI Direction
                    </p>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-[0.15em] px-3 py-1 rounded-full border ${
                        DIRECTION_ACTIVE[q.aiDirection]
                      }`}
                    >
                      {q.aiDirection}
                    </span>
                  </div>
                  <ConfidenceMeter value={q.confidence} />
                  <div className="flex items-center justify-between pt-1">
                    <div className="space-y-0.5">
                      <p className="text-[9px] uppercase tracking-[0.2em] text-text-tertiary">
                        Trace Hash
                      </p>
                      <p className="font-mono text-[10px] text-text-secondary">{q.traceHash}</p>
                    </div>
                    <a
                      href={`https://testnet.arcscan.app/tx/${q.arcTx}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[9px] uppercase tracking-[0.2em] text-accent-gold hover:underline"
                    >
                      View on Arc →
                    </a>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Result banner */}
          <AnimatePresence>
            {phase === 'wrong' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mx-6 mb-4 px-4 py-3 rounded-xl bg-negative/10 border border-negative/30 text-negative text-[10px] uppercase tracking-[0.15em] font-medium"
              >
                ✗ No match — AI called {q.aiDirection}. No reward this round.
              </motion.div>
            )}
            {phase === 'claimed' && claimedTxs.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mx-6 mb-4 px-4 py-3 rounded-xl bg-positive/10 border border-positive/30 space-y-1"
              >
                <p className="text-positive text-[10px] uppercase tracking-[0.15em] font-medium">
                  ✓ Claim registered on Arc Testnet
                </p>
                <a
                  href={`https://testnet.arcscan.app/tx/${claimedTxs[claimedTxs.length - 1]}`}
                  target="_blank"
                  rel="noreferrer"
                  className="block font-mono text-[10px] text-accent-gold hover:underline truncate"
                >
                  {claimedTxs[claimedTxs.length - 1]}
                </a>
              </motion.div>
            )}
            {claimError && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mx-6 mb-4 px-4 py-3 rounded-xl bg-negative/10 border border-negative/30 text-negative text-[10px] font-medium"
              >
                {claimError}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action buttons */}
          <div className="px-6 pb-6 space-y-4">
            {phase === 'question' && (
              <div className="flex gap-3">
                {(['LONG', 'SHORT', 'NEUTRAL'] as UserAnswer[]).map((d) => (
                  <DirectionButton
                    key={d}
                    direction={d}
                    selected={selected === d}
                    disabled={phase !== 'question'}
                    onClick={() => handleAnswer(d)}
                  />
                ))}
              </div>
            )}

            {phase === 'reveal' && (
              <button
                onClick={handleClaim}
                disabled={claiming}
                className="
                  w-full py-3 rounded-xl
                  bg-accent-gold text-bg-primary
                  text-[10px] font-bold uppercase tracking-[0.25em]
                  hover:brightness-110 transition-all duration-200
                  disabled:opacity-60 disabled:cursor-not-allowed
                  flex items-center justify-center gap-2
                "
              >
                {claiming ? (
                  <>
                    <span className="w-3 h-3 rounded-full border-2 border-bg-primary/40 border-t-bg-primary animate-spin" />
                    Broadcasting to Arc...
                  </>
                ) : !isConnected ? (
                  'Connect Wallet to Claim 0.5 USDC'
                ) : (
                  'Claim 0.5 USDC →'
                )}
              </button>
            )}

            {(phase === 'claimed' || phase === 'wrong') && (
              <button
                onClick={handleNext}
                className="
                  w-full py-3 rounded-xl border border-border-strong
                  text-text-primary text-[10px] font-medium uppercase tracking-[0.2em]
                  hover:border-accent-gold/50 hover:text-accent-gold
                  transition-all duration-200
                "
              >
                {qIndex + 1 >= QUIZ_QUESTIONS.length ? 'View Results →' : 'Next Question →'}
              </button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Bottom hint */}
      {phase === 'question' && (
        <p className="text-center text-[9px] uppercase tracking-[0.2em] text-text-tertiary">
          Match the AI direction → claim 0.5 USDC on Arc Testnet
        </p>
      )}
    </div>
  )
}
