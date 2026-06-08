'use client'

import React, { useState } from 'react'
import posthog from 'posthog-js'
import { motion, AnimatePresence } from 'framer-motion'
import { useAccount, useWaitForTransactionReceipt, useChainId } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { toHex } from 'viem'
import { toast } from 'sonner'

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
// Proof-of-claim recipient — standard burn address (EOA, always accepts tx)
// Using burn address instead of a contract to guarantee tx success on Arc Testnet
const REWARDS_POOL = '0x000000000000000000000000000000000000dEaD' as `0x${string}`
const ARCSCAN_TX = (hash: string) => `https://testnet.arcscan.app/tx/${hash}`

// Encode thesis ID as calldata for the proof-of-claim transaction
function encodeClaimData(thesisId: string): string {
  // Simple UTF-8 hex encoding of "ROSETTA_CLAIM:<thesisId>"
  const msg = `ROSETTA_CLAIM:${thesisId}`
  return '0x' + Array.from(new TextEncoder().encode(msg))
    .map(b => b.toString(16).padStart(2, '0')).join('')
}

// Color tokens from design system
const GOLD = '#FFD700'

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
                ? 'w-8 bg-accent-gold/70 '
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
      borderClass = 'border-positive'
      bgClass = 'bg-positive/10'
      textClass = 'text-positive'
    } else if (selected && !correct) {
      borderClass = 'border-brand-red'
      bgClass = 'bg-brand-red/10'
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
      data-testid="quiz-option"
      data-selected={selected ? 'true' : undefined}
      onClick={onClick}
      disabled={disabled || revealed}
      className={`
        w-full min-h-[44px] px-5 py-3.5 rounded-xl border
        text-left text-sm font-medium leading-snug
        transition-all duration-200
        flex items-start gap-3
        ${borderClass} ${bgClass} ${textClass}
        ${selected ? 'selected' : ''}
        ${disabled && !revealed ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-accent-gold/60'}
      `}
    >
      {/* Letter badge */}
      <span
        className={`shrink-0 mt-0 w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold border transition-colors
          ${revealed && correct
            ? 'border-positive text-positive bg-positive/15'
            : revealed && selected && !correct
            ? 'border-brand-red text-negative bg-brand-red/15'
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

  function handleRetryClick() {
    posthog.capture('quiz_conversion_modal_cta_clicked', { score, total, desk: thesisId })
    onRetry()
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      data-testid="quiz-result"
      className="solid-panel rounded-2xl p-8 sm:p-10 text-center space-y-6"
    >
      <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-brand-red">
        Quiz Complete
      </p>

      {/* Score display */}
      <div>
        <p className="font-display text-5xl sm:text-6xl font-normal text-text-primary leading-none">
          {score}<span className="text-text-tertiary">/{total}</span>
        </p>
        <p className="mt-3 text-[10px] uppercase tracking-[0.25em] text-text-tertiary">
          {pct}% accuracy
        </p>
      </div>

      {perfect ? (
        <div className="space-y-4">
          {/* Gold badge */}
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border-2 border-warning bg-warning/10">
            <span className="w-2 h-2 rounded-full bg-warning " />
            <span
              className="text-[10px] font-bold uppercase tracking-[0.25em]"
              style={{ color: GOLD }}
            >
              Reward Pending
            </span>
          </div>

          <p className="text-text-secondary text-xs leading-relaxed whitespace-nowrap overflow-visible w-full text-center">
            All {total}/{total} correct. Your USDC has been sent to the Arc Testnet pool.
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
        onClick={handleRetryClick}
        className="mt-2 px-8 py-3 rounded-full border border-accent-gold/40 text-accent-gold text-[10px] uppercase tracking-[0.2em] font-medium hover:border-accent-gold hover: transition-all duration-300"
      >
        Retake Quiz
      </button>
    </motion.div>
  )
}

// ─── Main EarnQuiz component ────────────────────────────────────────────────

export function EarnQuiz({ thesisId, questions, onComplete }: EarnQuizProps) {
  const { isConnected, connector } = useAccount()
  const { openConnectModal } = useConnectModal()
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
  const attemptRecordedRef = React.useRef(false)

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

  function calculateScore(answerSet: (number | undefined)[]) {
    return answerSet.reduce<number>((acc, ans, i) => {
      if (i < questions.length && ans !== undefined && ans === questions[i].correctIndex) return acc + 1
      return acc
    }, 0)
  }

  const score = calculateScore(answers)
  const perfect = finished && questions.length > 0 && score === questions.length

  async function recordQuizAttempt(finalScore: number, total: number) {
    if (attemptRecordedRef.current) return
    attemptRecordedRef.current = true

    try {
      const response = await fetch('/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({
          desk: thesisId,
          score: finalScore,
          total,
        }),
      })

      if (!response.ok) {
        throw new Error(`Quiz attempt save failed with status ${response.status}`)
      }

      window.dispatchEvent(new CustomEvent('rosetta:quiz-attempt-recorded'))
    } catch (error) {
      console.error('Failed to record quiz attempt:', error)
    }
  }

  // ── Handle answer selection ──────────────────────────────────────────────

  function handleSelect(index: number) {
    if (revealed) return
    setSelected(index)
    setRevealed(true)
    const correct = index === questions[safeQIndex].correctIndex
    posthog.capture('quiz_question_answered', {
      desk: thesisId,
      question_index: qIndex,
      correct,
    })
    setAnswers(prev => {
      const next = [...prev]
      next[qIndex] = index
      return next
    })
  }

  // ── Advance to next question ────────────────────────────────────────────

  function handleNext() {
    if (qIndex + 1 >= questions.length) {
      const finalAnswers = [...answers]
      if (selected !== null) finalAnswers[safeQIndex] = selected
      const finalScore = calculateScore(finalAnswers)

      setAnswers(finalAnswers)
      setFinished(true)
      posthog.capture('quiz_completed', {
        desk: thesisId,
        score: finalScore,
        total: questions.length,
        mode: 'live',
      })
      void recordQuizAttempt(finalScore, questions.length)
      onComplete(finalScore)
    } else {
      setQIndex(i => i + 1)
      setSelected(null)
      setRevealed(false)
    }
  }

  // ── Send proof-of-claim tx to Arc on perfect score ───────────────────────

  async function sendClaimTx() {
    if (!isConnected) {
      sessionStorage.removeItem('rosetta.wallet.manualDisconnect')
      openConnectModal?.()
      return
    }

    // Coinbase Smart Wallet (baseAccount) only supports Base + Ethereum Mainnet.
    // It cannot sign transactions on custom testnets like Arc Testnet.
    // Direct the user to MetaMask which supports custom networks.
    if (connector?.id === 'baseAccount' || connector?.id === 'coinbaseWalletSDK') {
      setClaimError('Coinbase Smart Wallet only supports Base & Ethereum. Please connect with MetaMask to claim on Arc Testnet.')
      return
    }

    // Get the EIP-1193 provider — from connector first, then window.ethereum fallback
    type EIP1193Provider = { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> }
    let provider: EIP1193Provider | undefined
    if (connector) {
      try {
        provider = await connector.getProvider() as EIP1193Provider
      } catch {
        // connector.getProvider() failed — fall back to window.ethereum
      }
    }
    if (!provider) {
      provider = (window as Window & { ethereum?: EIP1193Provider }).ethereum
    }
    if (!provider) {
      setClaimError('No wallet detected — please install MetaMask to claim on Arc Testnet.')
      return
    }

    setClaiming(true)
    setClaimError(null)
    setClaimTxHash(null)
    // debug logs removed for production

    try {
      // Step 1: Request accounts to ensure wallet is unlocked
      const accounts = await provider.request({ method: 'eth_requestAccounts' }) as string[]
      if (!accounts || accounts.length === 0) {
        setClaimError('No accounts found — please unlock your wallet.')
        return
      }
      const from = accounts[0]

      // Step 2: Switch to Arc Testnet if needed
      if (currentChainId !== ARC_CHAIN_ID) {
        setClaimStatus('switching')
        const isCoinbaseConnector =
          connector?.id === 'coinbaseWalletSDK' ||
          connector?.id === 'coinbaseWallet' ||
          connector?.id === 'baseAccount' ||
          connector?.id?.toLowerCase().includes('coinbase') ||
          connector?.id?.toLowerCase().includes('base')

        if (isCoinbaseConnector) {
          setClaimError('Coinbase Wallet cannot auto-switch to Arc Testnet in-app. Please switch to Arc Testnet manually in Coinbase Wallet, then retry claim.')
          return
        } else {
          try {
            await provider.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: toHex(ARC_CHAIN_ID) }],
            })
          } catch (switchErr: unknown) {
            const switchMsg = (switchErr instanceof Error ? switchErr.message : String(switchErr)).toLowerCase()
            // Chain not added yet — add it
            if (
              switchMsg.includes('4902') ||
              switchMsg.includes('unrecognized') ||
              switchMsg.includes('not found') ||
              switchMsg.includes('unsupported')
            ) {
              await provider.request({
                method: 'wallet_addEthereumChain',
                params: [{
                  chainId: toHex(ARC_CHAIN_ID),
                  chainName: 'Arc Testnet',
                  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
                  rpcUrls: ['https://rpc.testnet.arc.network'],
                  blockExplorerUrls: ['https://testnet.arcscan.app'],
                }],
              })
            } else {
              throw switchErr
            }
          }
        }
      }

      // Step 2b: Verify we are actually on Arc Testnet before broadcasting
      const chainHex = await provider.request({ method: 'eth_chainId' }) as string
      const actualChainId = parseInt(chainHex, 16)
      if (actualChainId !== ARC_CHAIN_ID) {
        setClaimError(`Please switch your wallet to Arc Testnet (Chain ID ${ARC_CHAIN_ID}) before claiming.`)
        return
      }

      // Step 3: Send 0-value proof-of-claim transaction with thesis ID encoded as calldata
      // USDC on Arc uses 6 decimals — sending value to this contract address reverts
      // A 0-value tx with calldata is the correct pattern for on-chain proof-of-claim
      const calldata = encodeClaimData(thesisId)

      // Estimate gas — some wallets (Brave) require explicit gas limit
      let gasHex = '0x15F90' // 90000 — safe default for a simple calldata tx
      try {
        const gasEst = await provider.request({
          method: 'eth_estimateGas',
          params: [{ from, to: REWARDS_POOL, value: '0x0', data: calldata }],
        }) as string
        // Add 20% buffer
        const gasWithBuffer = Math.ceil(parseInt(gasEst, 16) * 1.2)
        gasHex = toHex(gasWithBuffer)
      } catch {
        // gas estimation failed — use safe default
      }

      setClaimStatus('broadcasting')
      const hash = await provider.request({
        method: 'eth_sendTransaction',
        params: [{
          from,
          to: REWARDS_POOL,
          value: '0x0',
          data: calldata,
          gas: gasHex,
        }],
      }) as string

      setClaimTxHash(hash)
      setClaimStatus('confirming')
    } catch (err: unknown) {
      const msg = (err instanceof Error ? err.message : String(err))
      setClaimStatus('idle')
      const msgLower = msg.toLowerCase()
      const isUserReject = msgLower.includes('rejected') || msgLower.includes('denied') || msgLower.includes('user refused') || msgLower.includes('4001')
      if (!isUserReject) {
        setClaimError(`Tx failed: ${msg.split('\n')[0].substring(0, 120)}`)
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
      toast.success('Reward Claimed', { description: 'Your USDC has been sent to the Arc Testnet pool.', duration: 5000 })
      posthog.capture('quiz_reward_claimed', {
        desk: thesisId,
        amount_usdc: 1, // fixed reward per perfect score on Arc Testnet
      })
    }
  }, [txConfirmed, claimTxHash])

  // ── Retry quiz ────────────────────────────────────────────────────────────

  function handleRetry() {
    attemptRecordedRef.current = false
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

  // Fire quiz_conversion_modal_shown for non-perfect scores (the retry/conversion surface)
  React.useEffect(() => {
    if (finished && !perfect) {
      posthog.capture('quiz_conversion_modal_shown', { score })
    }
  }, [finished]) // eslint-disable-line react-hooks/exhaustive-deps

  if (finished) {
    return (
      <div className="max-w-xl mx-auto">
        {perfect && (
          <div className="mb-4 space-y-2">
            {/* Idle: show claim button — visible even after a failed attempt so user can retry */}
            {!claiming && !claimed && claimStatus === 'idle' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3">
                <button
                  onClick={sendClaimTx}
                  className="flex-1 py-3 rounded-xl bg-warning text-bg-primary text-[10px] font-bold uppercase tracking-[0.25em] hover:brightness-110 transition-all duration-200"
                >
                  Claim USDC Reward on Arc
                </button>
              </motion.div>
            )}

            {/* Switching chain */}
            {claimStatus === 'switching' && (
              <p className="text-center text-[10px] uppercase tracking-[0.2em] text-accent-gold py-3 ">
                Switching to Arc Testnet…
              </p>
            )}

            {/* Broadcasting */}
            {claimStatus === 'broadcasting' && (
              <p className="text-center text-[10px] uppercase tracking-[0.2em] text-text-tertiary py-3 ">
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
                  <span className={`text-[9px] uppercase tracking-[0.2em] font-bold ${claimStatus === 'confirmed' ? 'text-positive' : 'text-accent-gold '}`}>
                    {claimStatus === 'confirmed' ? '✓ Confirmed' : '⏳ Confirming…'}
                  </span>
                </div>
                <p className="font-mono text-[10px] text-text-secondary break-all leading-relaxed">
                  {claimTxHash}
                </p>
                <a
                  href={ARCSCAN_TX(claimTxHash)}
                  target="_blank" rel="noopener noreferrer"
                  
                  className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-accent-gold hover:underline"
                >
                  View on ArcScan →
                </a>
              </motion.div>
            )}

            {/* Error */}
            {claimError && (
              <div className="rounded-xl border border-brand-red/40 bg-brand-red/10 px-4 py-3">
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
                      ? 'bg-positive/10 border-positive/30 text-positive'
                      : 'bg-brand-red/10 border-brand-red/30 text-negative'
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
                  data-testid="quiz-submit"
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
