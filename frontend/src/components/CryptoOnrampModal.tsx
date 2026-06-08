'use client'

/**
 * CryptoOnrampModal — Stripe Crypto Onramp modal for "Pay with Card"
 * ====================================================================
 *
 * Opens when user clicks "Pay with Card (Stripe Crypto)" on the pricing page.
 * Fetches a Stripe onramp session, mounts the widget, and handles completion.
 *
 * Flow:
 * 1. POST /api/crypto/onramp/session with { amount_usd, tier, wallet_address }
 * 2. Mount OnrampElement with returned clientSecret
 * 3. Poll session status via GET /api/crypto/onramp/session/[sessionId]
 * 4. On fulfillment_complete → show confirmation, auto-close, call onSuccess
 * 5. On rejected → show error with retry
 *
 * Completion is detected via polling (primary) and widget onChange (secondary).
 * A single useEffect watches `status` and triggers all side effects — no duplicates.
 *
 * NOTE: A webhook endpoint exists at /api/crypto/onramp/webhook for when Stripe
 * enables crypto.onramp_session.updated in the Dashboard. Until then, polling is
 * the only server-side confirmation path.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { CryptoElements, OnrampElement } from './StripeCryptoElements'
import { Tier, TIER_PRICES_USD, TIER_LABELS } from '@/lib/subscription'
import { STRIPE_ONRAMP_APPEARANCE } from '@/lib/stripe-api'

// -------------------------------------------------------------------
// Constants
// -------------------------------------------------------------------

const POLL_INTERVAL_MS = 3000
const AUTO_CLOSE_DELAY_MS = 3000
const MAX_POLL_DURATION_MS = 10 * 60 * 1000 // 10 minutes — after this, stop polling

const STATUS_MESSAGES: Record<string, string> = {
  loading: 'Loading payment form…',
  initialized: 'Initializing payment…',
  ready: 'Complete the payment below',
  requires_payment: 'Waiting for payment details…',
  fulfillment_processing: 'Processing payment… Verifying identity…',
  fulfillment_complete: 'USDC delivered to your wallet!',
  rejected: 'Payment was not completed.',
}

// -------------------------------------------------------------------
// Modal props
// -------------------------------------------------------------------

interface CryptoOnrampModalProps {
  isOpen: boolean
  tier: Tier
  walletAddress: string
  onSuccess: () => void
  onClose: () => void
}

// -------------------------------------------------------------------
// Inner content (no fixed wrapper) — shared by modal and widget exports
// -------------------------------------------------------------------

function CryptoOnrampContent({ tier, walletAddress, onSuccess, onClose }: Omit<CryptoOnrampModalProps, 'isOpen'>) {
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [status, setStatus] = useState<string>('loading')
  const [error, setError] = useState<string | null>(null)
  const [isRetrying, setIsRetrying] = useState(false)
  const onSuccessRef = useRef(onSuccess)
  onSuccessRef.current = onSuccess
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  const amountUsd = TIER_PRICES_USD[tier]

  // Create onramp session
  const createSession = useCallback(async () => {
    setStatus('loading')
    setError(null)

    try {
      const res = await fetch('/api/crypto/onramp/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount_usd: amountUsd,
          tier,
          wallet_address: walletAddress,
        }),
      })

      const data = await res.json() as { success: boolean; clientSecret?: string; sessionId?: string; error?: string }

      if (!data.success || !data.clientSecret) {
        throw new Error(data.error ?? 'Failed to create payment session')
      }

      setClientSecret(data.clientSecret)
      setSessionId(data.sessionId ?? null)
      setStatus('initialized')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      setStatus('error')
    }
  }, [amountUsd, tier, walletAddress])

  useEffect(() => {
    createSession()
  }, [createSession])

  // Reset isRetrying once session creation succeeds (status leaves 'loading')
  useEffect(() => {
    if (status !== 'loading' && isRetrying) {
      setIsRetrying(false)
    }
  }, [status, isRetrying])

  // -----------------------------------------------------------------
  // Completion handler — single source of truth for all side effects.
  // Uses refs for callbacks to avoid re-running on prop changes.
  // -----------------------------------------------------------------

  useEffect(() => {
    if (status !== 'fulfillment_complete') return

    onSuccessRef.current()
    const timer = setTimeout(() => onCloseRef.current(), AUTO_CLOSE_DELAY_MS)
    return () => clearTimeout(timer)
  }, [status])

  // -----------------------------------------------------------------
  // Poll session status (primary detection path)
  // -----------------------------------------------------------------

  useEffect(() => {
    if (!sessionId || status === 'fulfillment_complete' || status === 'rejected' || status === 'error') return

    const startedAt = Date.now()

    const interval = setInterval(async () => {
      // Stop polling after MAX_POLL_DURATION_MS
      if (Date.now() - startedAt > MAX_POLL_DURATION_MS) {
        clearInterval(interval)
        setStatus('error')
        setError('Payment timed out. Please try again or use wallet payment.')
        return
      }

      try {
        const res = await fetch(`/api/crypto/onramp/session/${sessionId}`)
        const data = await res.json() as { success: boolean; status?: string }

        if (data.success && data.status) {
          setStatus(data.status)
        }
      } catch {
        // Ignore poll errors — will retry on next interval
      }
    }, POLL_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [sessionId, status])

  // -----------------------------------------------------------------
  // Widget callbacks — update status, completion handled by effect above
  // -----------------------------------------------------------------

  const handleStatusChange = useCallback((_newStatus: string, session: { status: string }) => {
    setStatus(session.status)
  }, [])

  const isComplete = status === 'fulfillment_complete'
  const isProcessing = status === 'fulfillment_processing'

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-border">
        <div>
          <h2 className="font-display text-lg text-text-primary">
            Pay with Card
          </h2>
          <p className="text-xs text-text-tertiary mt-1">
            {TIER_LABELS[tier]} — ${amountUsd}/month · USDC on Arc
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-bg-secondary transition-colors text-text-tertiary hover:text-text-primary"
          aria-label="Close"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Body */}
      <div className="p-5">
        {/* Success state */}
        {isComplete && (
          <div className="flex flex-col items-center py-12 gap-4">
            <div className="w-16 h-16 rounded-full bg-positive/10 flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <path d="M8 16L14 22L24 10" stroke="#22C55E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="font-display text-xl text-text-primary">Payment Complete</p>
            <p className="text-sm text-text-secondary text-center">
              ${amountUsd} USDC has been sent to your Arc wallet.
              <br />
              Your {TIER_LABELS[tier]} subscription is now active.
            </p>
          </div>
        )}

        {/* Error state */}
        {(status === 'error' || status === 'rejected') && (
          <div className="flex flex-col items-center py-12 gap-4">
            <div className="w-16 h-16 rounded-full bg-negative/10 flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <path d="M10 10L22 22M22 10L10 22" stroke="#EF4444" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </div>
            <p className="font-display text-xl text-text-primary">
              {status === 'rejected' ? 'Payment Not Completed' : 'Something Went Wrong'}
            </p>
            <p className="text-sm text-text-secondary text-center max-w-xs">
              {error ?? 'The payment could not be processed. You can retry or use wallet payment instead.'}
            </p>
            <button
              onClick={() => {
                setIsRetrying(true)
                createSession()
              }}
              disabled={isRetrying}
              className="mt-2 px-6 py-2.5 rounded-md bg-brand-red text-white text-sm font-semibold hover:bg-brand-red/90 transition-colors disabled:opacity-50"
            >
              {isRetrying ? 'Retrying…' : 'Try Again'}
            </button>
          </div>
        )}

        {/* Loading state (shimmer skeleton) */}
        {(status === 'loading' && !clientSecret) && (
          <div className="space-y-4 py-4">
            <div className="h-4 bg-bg-secondary rounded animate-pulse w-3/4" />
            <div className="h-4 bg-bg-secondary rounded animate-pulse w-1/2" />
            <div className="h-64 bg-bg-secondary rounded animate-pulse" />
          </div>
        )}

        {/* Processing status banner */}
        {isProcessing && (
          <div className="mb-4 flex items-center gap-2 px-3 py-2 rounded-md bg-warning/5 border border-warning/20">
            <div className="w-3 h-3 border-2 border-warning border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-warning">{STATUS_MESSAGES[status]}</span>
          </div>
        )}

        {/* Stripe Onramp Widget */}
        {clientSecret && !isComplete && status !== 'error' && status !== 'rejected' && (
          <div className="onramp-widget-container">
            <OnrampElement
              clientSecret={clientSecret}
              appearance={STRIPE_ONRAMP_APPEARANCE}
              onChange={handleStatusChange}
            />
          </div>
        )}

        {/* Wallet address display */}
        {clientSecret && !isComplete && status !== 'error' && status !== 'rejected' && (
          <div className="mt-4 flex items-center gap-2 px-3 py-2 rounded-md bg-bg-secondary border border-border">
            <span className="text-[10px] uppercase tracking-wider text-text-tertiary">Delivering to</span>
            <span className="text-xs font-mono text-text-secondary truncate">
              {walletAddress.slice(0, 6)}…{walletAddress.slice(-4)}
            </span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-border bg-bg-secondary/50">
        <p className="text-[10px] text-text-tertiary text-center">
          Powered by Stripe · USDC delivered on Ethereum to Arc Testnet
        </p>
      </div>
    </>
  )
}

// -------------------------------------------------------------------
// Exported wrapper (includes CryptoElements provider + fixed modal)
// -------------------------------------------------------------------

export function CryptoOnrampModal({ isOpen, tier, walletAddress, onSuccess, onClose }: CryptoOnrampModalProps) {
  if (!isOpen) return null

  return (
    <CryptoElements>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

        {/* Modal */}
        <div className="relative w-full max-w-lg mx-4 bg-bg-primary border border-border rounded-xl overflow-hidden shadow-2xl">
          <CryptoOnrampContent
            tier={tier}
            walletAddress={walletAddress}
            onSuccess={onSuccess}
            onClose={onClose}
          />
        </div>
      </div>
    </CryptoElements>
  )
}

// -------------------------------------------------------------------
// Content-only export (no modal wrapper) — for use inside other modals
// -------------------------------------------------------------------

export function CryptoOnrampWidget({ tier, walletAddress, onSuccess, onClose }: Omit<CryptoOnrampModalProps, 'isOpen'>) {
  return (
    <CryptoElements>
      <CryptoOnrampContent
        tier={tier}
        walletAddress={walletAddress}
        onSuccess={onSuccess}
        onClose={onClose}
      />
    </CryptoElements>
  )
}
