'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAccount, useSendTransaction, useWaitForTransactionReceipt, useSwitchChain, useChainId } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { parseEther } from 'viem'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface QuizQuestion {
  text: string
  options: string[]   // exactly 4 items
  correctIndex: number
}

export interface EarnQuizProps {
  thesisId: string
  questions: QuizQuestion[]
  onComplete: (score: number) => void
}

// Arc Testnet constants
const ARC_CHAIN_ID = 5042002
// PaymentRouter on Arc Testnet — deployed & verified on arcscan.app
const REWARDS_POOL = '0x9A676e781A523b5d0C0e43731313A708CB607508' as `0x${string}`
const CLAIM_PROOF_VALUE = parseEther('0.001')
const ARCSCAN_TX = (hash: string) => `https://testnet.arcscan.app/tx/${hash}`

// Color tokens from design system
const GOLD = '#C9A84C'

// ─── Progress dots ──────────────────────────────────────────────────────────

function ProgressDots({
  current,
  total,
  answered,
}: {
  current: number
  total: number
  answered: (number | undefined)[]
}) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {Array.from({ length: total }).map((_, i) => {
        const isDone = answered[i] !== undefined
        const isCurrent = i === current
        return (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-500 ${
              isDone
                ? 'w-8 bg-positive'
                : isCurrent
                ? 'w-8 bg-accent-gold/70 animate-pulse'
                : 'w-4 bg-border-strong'
            }`}
          />
        )
      })}
      <span className="ml-2 font-mono text-[10px] text-text-tertiary tracking-widest">
        {String(current + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
      </span>
    </div>
  )
}

// ─── Option button ──────────────────────────────────────────────────────────

function OptionButton({
  label,
  index,
  selected,
  correct,
  revealed,
  disabled,
  onClick,
}: {
  label: string
  index: number
  selected: boolean
  correct: boolean
  revealed: boolean
  disabled: boolean
  onClick: () => void
}) {
  // Determine visual state
  let borderClass = 'border-border hover:border-border-strong'
  let bgClass = 'bg-bg-primary'
  let textClass = 'text-text-secondary hover:text-text-primary'

  if (revealed) {
    if (correct) {
      borderClass = 'border-[#4A9F6F]'
      bgClass = 'bg-[#4A9F6F]/10'
      textClass = 'text-positive'
    } else if (selected && !correct) {
      borderClass = 'border-[#9F4A4A]'
      bgClass = 'bg-[#9F4A4A]/10'
      textClass = 'text-negative'
    } else {
      borderClass = 'border-border opacity-40'
      textClass = 'text-text-tertiary'
    }
  } else if (selected) {
    borderClass = 'border-accent-gold'
    bgClass = 'bg-accent-gold/10'
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled || revealed}
      className={`
        w-full min-h-[44px] px-5 py-3.5 rounded-xl border
        text-left text-sm font-medium leading-snug
        transition-all duration-200
        flex items-start gap-3
        ${borderClass} ${bgClass} ${textClass}
        ${disabled && !revealed ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-accent-gold/60'}
      `}
    >
      {/* Letter badge */}
      <span
        className={`shrink-0 mt-0 w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold border transition-colors
          ${revealed && correct
            ? 'border-[#4A9F6F] text-positive bg-[#4A9F6F]/15'
            : revealed && selected && !correct
            ? 'border-[#9F4A4A] text-negative bg-[#9F4A4A]/15'
            : selected
            ? 'border-accent-gold text-accent-gold bg-accent-gold/15'
            : 'border-border-strong text-text-tertiary'
          }`}
      >
        {String.fromCharCode(65 + index)}
      </span>

      <span className="flex-1">{label}</span>

      {/* Reveal icons */}
      {revealed && correct && (
        <span className="shrink-0 mt-0.5 text-positive text-sm">✓</span>
      )}
      {revealed && selected && !correct && (
        <span className="shrink-0 mt-0.5 text-negative text-sm">✗</span>
      )}
    </button>
  )
}

// ─── Score results screen ───────────────────────────────────────────────────

function ResultsScreen({
  score,
  total,
  thesisId,
  onRetry,
}: {
  score: number
  total: number
  thesisId: string
  onRetry: () => void
}) {
  const perfect = score === total
  const pct = total > 0 ? Math.round((score / total) * 100) : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="solid-panel rounded-2xl p-8 sm:p-10 text-center space-y-6"
    >
      <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-brand-red">
        Quiz Complete
      </p>

      {/* Score display */}
      <div>
        <p className="font-display text-6xl sm:text-7xl font-light text-text-primary leading-none">
          {score}
          <span className="text-3xl text-text-tertiary">/{total}</span>
        </p>
        <p className="mt-3 text-[10px] uppercase tracking-[0.25em] text-text-tertiary">
          {pct}% accuracy
        </p>
      </div>

      {perfect ? (
        <div className="space-y-4">
          {/* Gold badge */}
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border-2 border-[#C9A84C] bg-[#C9A84C]/10">
            <span className="w-2 h-2 rounded-full bg-[#C9A84C] animate-pulse" />
            <span
              className="text-[10px] font-bold uppercase tracking-[0.25em]"
              style={{ color: GOLD }}
            >
              Reward Pending
            </span>
          </div>

          <p className="text-text-secondary text-xs leading-relaxed max-w-xs mx-auto">
            All {total}/{total} correct. Your USDC reward is being processed — a claim
            transaction has been sent to the rewards pool on Arc Testnet.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-[10px] uppercase tracking-[0.25em] text-text-tertiary">
            {total - score} question{total - score !== 1 ? 's' : ''} incorrect
          </p>
          <p className="inline-block text-[10px] uppercase tracking-[0.2em] px-3 py-1.5 rounded border border-border text-text-tertiary">
            Try again tomorrow
          </p>
        </div>
      )}

      <button
        onClick={onRetry}
        className="mt-2 px-8 py-3 rounded-full border border-accent-gold/40 text-accent-gold text-[10px] uppercase tracking-[0.2em] font-medium hover:border-accent-gold hover:shadow-[0_0_30px_rgba(201,168,76,0.25)] transition-all duration-300"
      >
        Retake Quiz
      </button>
    </motion.div>
  )
}

// ─── Main EarnQuiz component ────────────────────────────────────────────────

export function EarnQuiz({ thesisId, questions, onComplete }: EarnQuizProps) {
  const { sendTransactionAsync } = useSendTransaction()
  const { isConnected } = useAccount()
  const { openConnectModal } = useConnectModal()
  const { switchChainAsync } = useSwitchChain()
  const currentChainId = useChainId()

  const [qIndex, setQIndex] = useState(0)
  const [answers, setAnswers] = useState<(number | undefined)[]>(
    new Array(questions.length).fill(undefined)
  )
  const [revealed, setRevealed] = useState(false)
  const [selected, setSelected] = useState<number | null>(null)
  const [finished, setFinished] = useState(false)
  const [claiming, setClaiming] = useState(false)
  const [claimed, setClaimed] = useState(false)
  const [claimError, setClaimError] = useState<string | null>(null)
  const [claimTxHash, setClaimTxHash] = useState<string | null>(null)
  const [claimStatus, setClaimStatus] = useState<'idle' | 'switching' | 'broadcasting' | 'confirming' | 'confirmed'>('idle')

  // Watch confirmation once we have a hash
  const { isSuccess: txConfirmed } = useWaitForTransactionReceipt({
    hash: claimTxHash as `0x${string}` | undefined,
    chainId: ARC_CHAIN_ID,
    query: { enabled: !!claimTxHash },
  })

  // ── Guards ───────────────────────────────────────────────────────────────

  if (questions.length === 0) {
    return (
      <div className="solid-panel rounded-2xl p-8 text-center">
        <p className="text-text-tertiary text-sm">No quiz questions available for this thesis.</p>
      </div>
    )
  }

  // Bounds check
  const safeQIndex = Math.min(qIndex, questions.length - 1)
  const currentQ = questions[safeQIndex]

  // Validate correctIndex is in bounds
  const validQ = currentQ.options.length > currentQ.correctIndex ? currentQ : {
    ...currentQ,
    correctIndex: 0,
  }

  const score = answers.reduce<number>((acc, ans, i) => {
    if (i < questions.length && ans !== undefined && ans === questions[i].correctIndex) return acc + 1
    return acc
  }, 0)
  const perfect = finished && questions.length > 0 && score === questions.length

  // ── Handle answer selection ──────────────────────────────────────────────

  function handleSelect(index: number) {
    if (revealed) return
    setSelected(index)
    setRevealed(true)
    setAnswers(prev => {
      const next = [...prev]
      next[qIndex] = index
      return next
    })
  }

  // ── Advance to next question ────────────────────────────────────────────

  function handleNext() {
    if (qIndex + 1 >= questions.length) {
      setFinished(true)
      onComplete(score)
    } else {
      setQIndex(i => i + 1)
      setSelected(null)
      setRevealed(false)
    }
  }

  // ── Send proof-of-claim tx to Arc on perfect score ───────────────────────

  async function sendClaimTx() {
    if (!isConnected) {
      openConnectModal?.()
      return
    }
    setClaiming(true)
    setClaimError(null)
    setClaimTxHash(null)
    try {
      // Step 1: Switch to Arc Testnet if needed
      if (currentChainId !== ARC_CHAIN_ID) {
        setClaimStatus('switching')
        await switchChainAsync({ chainId: ARC_CHAIN_ID })
      }
      // Step 2: Broadcast the proof-of-claim transaction
      setClaimStatus('broadcasting')
      const hash = await sendTransactionAsync({
        to: REWARDS_POOL,
        value: CLAIM_PROOF_VALUE,
        chainId: ARC_CHAIN_ID,
      })
      setClaimTxHash(hash)
      setClaimStatus('confirming')
      // Step 3: useWaitForTransactionReceipt watches `hash` and sets txConfirmed
    } catch (err: unknown) {
      const msg = (err instanceof Error ? err.message : String(err)).toLowerCase()
      setClaimStatus('idle')
      // Silently ignore user rejections and unsupported chain-switch errors
      const isUserReject = msg.includes('rejected') || msg.includes('denied') || msg.includes('user refused')
      const isUnsupportedSwitch = msg.includes('unsupported') || msg.includes('does not support') || msg.includes('chain') || msg.includes('switch')
      if (!isUserReject && !isUnsupportedSwitch) {
        console.error("TX ERROR:", err)
        setClaimError(`Tx failed: ${msg.split('\n')[0].substring(0, 100)}`)
      } else if (isUnsupportedSwitch && !isUserReject) {
        // Wallet doesn't support chain switching (e.g. some smart wallets) — try sending anyway
        try {
          setClaimStatus('broadcasting')
          const hash = await sendTransactionAsync({
            to: REWARDS_POOL,
            value: CLAIM_PROOF_VALUE,
            chainId: ARC_CHAIN_ID,
          })
          setClaimTxHash(hash)
          setClaimStatus('confirming')
        } catch (innerErr: unknown) {
          console.error("TX INNER ERROR:", innerErr)
          const innerMsg = (innerErr instanceof Error ? innerErr.message : String(innerErr)).toLowerCase()
          if (!innerMsg.includes('rejected') && !innerMsg.includes('denied')) {
            setClaimError(`Tx failed: ${innerMsg.split('\n')[0].substring(0, 100)}`)
          }
        }
      }
    } finally {
      setClaiming(false)
    }
  }

  // Update claimStatus and claimed when receipt arrives
  React.useEffect(() => {
    if (txConfirmed && claimTxHash) {
      setClaimStatus('confirmed')
      setClaimed(true)
    }
  }, [txConfirmed, claimTxHash])

  // ── Retry quiz ────────────────────────────────────────────────────────────

  function handleRetry() {
    setQIndex(0)
    setSelected(null)
    setRevealed(false)
    setAnswers(new Array(questions.length).fill(undefined))
    setFinished(false)
    setClaimed(false)
    setClaimError(null)
    setClaimTxHash(null)
    setClaimStatus('idle')
  }

  // ── Results screen ────────────────────────────────────────────────────────

  if (finished) {
    return (
      <div className="max-w-xl mx-auto">
        {perfect && (
          <div className="mb-4 space-y-2">
            {/* Idle: show claim button */}
            {!claiming && !claimed && !claimError && claimStatus === 'idle' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3">
                <button
                  onClick={sendClaimTx}
                  className="flex-1 py-3 rounded-xl bg-[#C9A84C] text-bg-primary text-[10px] font-bold uppercase tracking-[0.25em] hover:brightness-110 transition-all duration-200"
                >
                  Claim USDC Reward on Arc
                </button>
              </motion.div>
            )}

            {/* Switching chain */}
            {claimStatus === 'switching' && (
              <p className="text-center text-[10px] uppercase tracking-[0.2em] text-accent-gold py-3 animate-pulse">
                Switching to Arc Testnet…
              </p>
            )}

            {/* Broadcasting */}
            {claimStatus === 'broadcasting' && (
              <p className="text-center text-[10px] uppercase tracking-[0.2em] text-text-tertiary py-3 animate-pulse">
                Broadcasting to Arc Testnet…
              </p>
            )}

            {/* Confirming — show hash immediately */}
            {(claimStatus === 'confirming' || claimStatus === 'confirmed') && claimTxHash && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-border bg-bg-secondary p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[9px] uppercase tracking-[0.25em] text-text-tertiary">
                    Arc Testnet
                  </span>
                  <span className={`text-[9px] uppercase tracking-[0.2em] font-bold ${claimStatus === 'confirmed' ? 'text-positive' : 'text-accent-gold animate-pulse'}`}>
                    {claimStatus === 'confirmed' ? '✓ Confirmed' : '⏳ Confirming…'}
                  </span>
                </div>
                <p className="font-mono text-[10px] text-text-secondary break-all leading-relaxed">
                  {claimTxHash}
                </p>
                <a
                  href={ARCSCAN_TX(claimTxHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-accent-gold hover:underline"
                >
                  View on ArcScan →
                </a>
              </motion.div>
            )}

            {/* Error */}
            {claimError && (
              <div className="rounded-xl border border-[#9F4A4A]/40 bg-[#9F4A4A]/10 px-4 py-3">
                <p className="text-[10px] text-negative">{claimError}</p>
                <button
                  onClick={sendClaimTx}
                  className="mt-2 text-[9px] uppercase tracking-[0.2em] text-accent-gold hover:underline"
                >
                  Retry →
                </button>
              </div>
            )}
          </div>
        )}
        <ResultsScreen
          score={score}
          total={questions.length}
          thesisId={thesisId}
          onRetry={handleRetry}
        />
      </div>
    )
  }

  // ── Question screen ──────────────────────────────────────────────────────

  return (
    <div className="max-w-xl mx-auto">
      <ProgressDots
        current={qIndex}
        total={questions.length}
        answered={answers}
      />

      <AnimatePresence mode="wait">
        <motion.div
          key={qIndex}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.25 }}
          className="solid-panel rounded-2xl overflow-hidden"
        >
          {/* Card header */}
          <div className="px-6 pt-6 pb-5 border-b border-border">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-medium uppercase tracking-[0.3em] text-text-tertiary">
                Quiz
              </span>
              <span
                className="font-mono text-[10px] text-text-tertiary"
                aria-label={`Question ${qIndex + 1} of ${questions.length}`}
              >
                Q{qIndex + 1}
              </span>
            </div>
          </div>

          {/* Question text */}
          <div className="px-6 pt-5 pb-6">
            <p className="text-text-primary text-[13px] leading-relaxed font-medium">
              {currentQ.text}
            </p>
          </div>

          {/* Options */}
          <div
            className="px-6 pb-6 space-y-3"
            role="group"
            aria-label={`Question ${qIndex + 1} options`}
            onKeyDown={(e: React.KeyboardEvent) => {
              if (revealed) return
              const opts = currentQ.options
              if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
                e.preventDefault()
                setSelected(i => i === null ? 0 : Math.min(i + 1, opts.length - 1))
              } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
                e.preventDefault()
                setSelected(i => i === null ? opts.length - 1 : Math.max(i - 1, 0))
              } else if (e.key === 'Enter' || e.key === ' ') {
                if (selected !== null) handleSelect(selected)
              }
            }}
          >
            {currentQ.options.map((option, i) => (
              <OptionButton
                key={i}
                label={option}
                index={i}
                selected={selected === i}
                correct={i === validQ.correctIndex}
                revealed={revealed}
                disabled={false}
                onClick={() => handleSelect(i)}
              />
            ))}
          </div>

          {/* Feedback banner */}
          <AnimatePresence>
            {revealed && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div
                  className={`mx-6 mb-4 px-4 py-3 rounded-xl text-[10px] uppercase tracking-[0.15em] font-medium border ${
                    selected === validQ.correctIndex
                      ? 'bg-[#4A9F6F]/10 border-[#4A9F6F]/30 text-positive'
                      : 'bg-[#9F4A4A]/10 border-[#9F4A4A]/30 text-negative'
                  }`}
                >
                  {selected === validQ.correctIndex
                    ? `✓ Correct — ${currentQ.options[validQ.correctIndex]}`
                    : `✗ Incorrect — the answer was ${currentQ.options[validQ.correctIndex]}`}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Next button */}
          <AnimatePresence>
            {revealed && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.25, delay: 0.1 }}
                className="px-6 pb-6"
              >
                <button
                  onClick={handleNext}
                  className="w-full py-3 rounded-xl border border-border-strong text-text-primary text-[10px] font-medium uppercase tracking-[0.2em] hover:border-accent-gold/50 hover:text-accent-gold transition-all duration-200"
                >
                  {qIndex + 1 >= questions.length ? 'See Results →' : 'Next Question →'}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </AnimatePresence>

      {/* Bottom hint */}
      {selected === null && (
        <p className="text-center text-[9px] uppercase tracking-[0.2em] text-text-tertiary mt-4">
          Select an answer to reveal the correct response
        </p>
      )}
    </div>
  )
}
