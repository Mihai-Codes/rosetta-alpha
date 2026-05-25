'use client'

/**
 * SessionKeyManager — UI for x402 session key management
 * ========================================================
 *
 * Renders one of three states:
 *   A. No session  → setup card with budget/duration selectors
 *   B. Active      → status bar with progress + countdown + revoke
 *   C. Expired/exhausted → amber warning + renew button
 *
 * Can be used in two modes:
 *   1. Inline in the dashboard sidebar (variant="panel")
 *   2. As a modal triggered by X402SessionRequired (variant="modal")
 *
 * Design tokens: #111118 bg, #C9A84C gold accent, brand-red primary
 */

import React from 'react'
import { Zap, Shield, Clock, CheckCircle2, XCircle, AlertTriangle, Loader2, X } from 'lucide-react'
import { useSessionKey } from '@/hooks/useSessionKey'
import type { SessionKeyConfig } from '@/lib/sessionKey'
import { useAccount } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'

// ─── Types ────────────────────────────────────────────────────────────────────

type SessionKeyManagerProps = {
  /** "panel" = embedded in sidebar; "modal" = overlay with backdrop */
  variant?: 'panel' | 'modal'
  /** Called when user closes the modal (variant="modal" only) */
  onClose?: () => void
}

// ─── Budget options (USDC) ────────────────────────────────────────────────────

const BUDGET_OPTIONS = [
  { label: '1 USDC', value: 1 },
  { label: '5 USDC', value: 5 },
  { label: '10 USDC', value: 10 },
]

// Duration options in seconds
const DURATION_OPTIONS = [
  { label: '1 hour', value: 3600 },
  { label: '24 hours', value: 86400 },
  { label: '7 days', value: 604800 },
]

// ─── Countdown helper ─────────────────────────────────────────────────────────

function useCountdown(expiresAt: Date | null): string {
  const [countdown, setCountdown] = React.useState('')

  React.useEffect(() => {
    if (!expiresAt) { setCountdown(''); return }

    const update = () => {
      const diffMs = expiresAt.getTime() - Date.now()
      if (diffMs <= 0) { setCountdown('Expired'); return }

      const totalSeconds = Math.floor(diffMs / 1000)
      const days = Math.floor(totalSeconds / 86400)
      const hours = Math.floor((totalSeconds % 86400) / 3600)
      const minutes = Math.floor((totalSeconds % 3600) / 60)
      const seconds = totalSeconds % 60

      if (days > 0) {
        setCountdown(`${days}d ${hours}h ${minutes}m`)
      } else if (hours > 0) {
        setCountdown(`${hours}h ${minutes}m ${seconds}s`)
      } else {
        setCountdown(`${minutes}m ${seconds}s`)
      }
    }

    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [expiresAt])

  return countdown
}

// ─── Pill button ─────────────────────────────────────────────────────────────

function PillButton({
  label,
  selected,
  onClick,
  accent = '#C9A84C',
}: {
  label: string
  selected: boolean
  onClick: () => void
  accent?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.15em] border transition-all duration-200"
      style={
        selected
          ? { color: '#0A0A0A', background: accent, borderColor: accent }
          : { color: accent, background: 'transparent', borderColor: accent + '50' }
      }
    >
      {label}
    </button>
  )
}

// ─── State A: No session ──────────────────────────────────────────────────────

function SetupPanel({
  onApprove,
  isApproving,
  error,
}: {
  onApprove: (config: SessionKeyConfig) => Promise<void>
  isApproving: boolean
  error: string | null
}) {
  const [budgetUsdc, setBudgetUsdc] = React.useState(5)
  const [expirySeconds, setExpirySeconds] = React.useState(86400)

  const handleApprove = async () => {
    await onApprove({
      maxAmountUsdc: budgetUsdc,
      expirySeconds,
      allowedContracts: [],
      nonce: '',  // hook generates nonce
    })
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <Zap className="w-3.5 h-3.5" style={{ color: '#C9A84C' }} />
          <p className="text-[10px] font-medium uppercase tracking-[0.25em]" style={{ color: '#C9A84C' }}>
            Enable One-Click Payments
          </p>
        </div>
        <p className="text-text-secondary text-xs leading-relaxed">
          Approve a session to claim quiz rewards and unlock theses without wallet popups.
        </p>
      </div>

      {/* Budget selector */}
      <div>
        <p className="text-[9px] font-medium uppercase tracking-[0.2em] text-text-tertiary mb-2">
          Session Budget
        </p>
        <div className="flex gap-2 flex-wrap">
          {BUDGET_OPTIONS.map(opt => (
            <PillButton
              key={opt.value}
              label={opt.label}
              selected={budgetUsdc === opt.value}
              onClick={() => setBudgetUsdc(opt.value)}
            />
          ))}
        </div>
      </div>

      {/* Duration selector */}
      <div>
        <p className="text-[9px] font-medium uppercase tracking-[0.2em] text-text-tertiary mb-2">
          Duration
        </p>
        <div className="flex gap-2 flex-wrap">
          {DURATION_OPTIONS.map(opt => (
            <PillButton
              key={opt.value}
              label={opt.label}
              selected={expirySeconds === opt.value}
              onClick={() => setExpirySeconds(opt.value)}
            />
          ))}
        </div>
      </div>

      {/* What happens info */}
      <div className="border border-[#C9A84C]/20 bg-[#C9A84C]/5 p-3 text-[10px] text-text-tertiary leading-relaxed space-y-1">
        <p>
          <span className="text-text-secondary">Step 1:</span> Sign EIP-712 authorization (no gas)
        </p>
        <p>
          <span className="text-text-secondary">Step 2:</span> Send {budgetUsdc} USDC to session wallet
        </p>
        <p>
          <span className="text-[#C9A84C]">After that:</span> All payments are instant — no popups
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 border border-red-500/30 bg-red-500/10 p-2.5 text-[10px] text-red-400">
          <XCircle className="w-3 h-3 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Approve button */}
      <button
        type="button"
        onClick={handleApprove}
        disabled={isApproving}
        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-[10px] font-bold uppercase tracking-[0.2em] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
        style={{
          background: isApproving ? '#C9A84C80' : '#C9A84C',
          color: '#0A0A0A',
        }}
      >
        {isApproving ? (
          <>
            <Loader2 className="w-3 h-3 animate-spin" />
            Sign the approval in your wallet…
          </>
        ) : (
          <>
            <Shield className="w-3 h-3" />
            Approve Session
          </>
        )}
      </button>
    </div>
  )
}

// ─── State B: Active session ──────────────────────────────────────────────────

function ActivePanel({
  budgetRemaining,
  maxBudget,
  expiresAt,
  onRevoke,
}: {
  budgetRemaining: number
  maxBudget: number
  expiresAt: Date | null
  onRevoke: () => void
}) {
  const countdown = useCountdown(expiresAt)
  const spentUsdc = maxBudget - budgetRemaining
  const progressPct = maxBudget > 0 ? (spentUsdc / maxBudget) * 100 : 0

  return (
    <div className="flex flex-col gap-4">
      {/* Status indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Green pulse dot */}
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-emerald-400">
            Session Active
          </p>
        </div>
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
      </div>

      {/* Budget progress */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[9px] uppercase tracking-[0.2em] text-text-tertiary">Budget Used</p>
          <p className="font-mono text-[10px] text-text-secondary">
            <span style={{ color: progressPct > 80 ? '#F59E0B' : '#C9A84C' }}>
              {spentUsdc.toFixed(4)}
            </span>
            <span className="text-text-tertiary"> / {maxBudget.toFixed(1)} USDC</span>
          </p>
        </div>
        {/* Progress bar */}
        <div className="h-1 bg-[#1A1A22] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(progressPct, 100)}%`,
              background: progressPct > 80
                ? 'linear-gradient(90deg, #F59E0B, #EF4444)'
                : 'linear-gradient(90deg, #C9A84C, #E8C96A)',
            }}
          />
        </div>
        <p className="text-[9px] text-text-tertiary mt-1 text-right">
          {budgetRemaining.toFixed(4)} USDC remaining
        </p>
      </div>

      {/* Expiry countdown */}
      {expiresAt && (
        <div className="flex items-center gap-2 text-[10px] text-text-tertiary">
          <Clock className="w-3 h-3 shrink-0" />
          <span>Expires in <span className="font-mono text-text-secondary">{countdown}</span></span>
        </div>
      )}

      {/* Revoke button */}
      <button
        type="button"
        onClick={onRevoke}
        className="w-full py-2 px-4 text-[9px] font-medium uppercase tracking-[0.2em] border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors duration-200"
      >
        Revoke Session
      </button>
    </div>
  )
}

// ─── State C: Expired / exhausted ────────────────────────────────────────────

function ExpiredPanel({
  reason,
  onRenew,
  isApproving,
  error,
}: {
  reason: 'expired' | 'exhausted'
  onRenew: () => void
  isApproving: boolean
  error: string | null
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-2.5 border border-amber-500/30 bg-amber-500/10 p-3">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-amber-400 mb-0.5">
            {reason === 'expired' ? 'Session Expired' : 'Budget Exhausted'}
          </p>
          <p className="text-[10px] text-text-tertiary">
            {reason === 'expired'
              ? 'Your session has timed out. Renew to continue one-click payments.'
              : 'Session budget used up. Create a new session to continue.'}
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 border border-red-500/30 bg-red-500/10 p-2.5 text-[10px] text-red-400">
          <XCircle className="w-3 h-3 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <button
        type="button"
        onClick={onRenew}
        disabled={isApproving}
        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-[10px] font-bold uppercase tracking-[0.2em] transition-all duration-200 disabled:opacity-60"
        style={{ background: '#C9A84C', color: '#0A0A0A' }}
      >
        {isApproving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
        Renew Session
      </button>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

/**
 * SessionKeyManager — orchestrates the three states.
 *
 * Usage in dashboard sidebar:
 *   <SessionKeyManager variant="panel" />
 *
 * Usage as modal (triggered by x402:session-expired):
 *   <SessionKeyManager variant="modal" onClose={() => setModalOpen(false)} />
 */
export function SessionKeyManager({ variant = 'panel', onClose }: SessionKeyManagerProps) {
  const {
    isActive,
    sessionKey,
    status,
    budgetRemaining,
    expiresAt,
    isApproving,
    error,
    approveSession,
    revokeSession,
    clearError,
  } = useSessionKey()
  const { isConnected } = useAccount()
  const { openConnectModal } = useConnectModal()

  // Default config for renewal (when expired/exhausted)
  const [renewBudget] = React.useState(5)
  const [renewExpiry] = React.useState(86400)

  function ensureWalletConnected() {
    if (isConnected) return true
    sessionStorage.removeItem('rosetta.wallet.manualDisconnect')
    openConnectModal?.()
    return false
  }

  const approveSessionWithWalletCheck = async (config: SessionKeyConfig) => {
    if (!ensureWalletConnected()) return
    await approveSession(config)
  }

  const handleRenew = async () => {
    if (!ensureWalletConnected()) return
    await approveSession({
      maxAmountUsdc: renewBudget,
      expirySeconds: renewExpiry,
      allowedContracts: [],
      nonce: '',
    })
  }

  // Use explicit status field — no fragile error string matching
  const isExpired = status === 'expired'
  const isExhausted = status === 'exhausted'

  const content = (
    <div
      className="relative"
      style={{ background: '#111118', border: '1px solid rgba(201,168,76,0.15)' }}
    >
      {/* Gold top accent line */}
      <div className="h-[2px] w-full" style={{ background: 'linear-gradient(90deg, #C9A84C, transparent)' }} />

      <div className="p-4 sm:p-5">
        {/* Header label + close button (modal only) */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-[9px] font-medium uppercase tracking-[0.3em] text-text-tertiary">
            Session Key
          </p>
          {variant === 'modal' && onClose && (
            <button
              onClick={() => { clearError(); onClose() }}
              className="text-text-tertiary hover:text-text-primary transition-colors p-1"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* State-based content */}
        {isActive && sessionKey ? (
          <ActivePanel
            budgetRemaining={budgetRemaining}
            maxBudget={sessionKey.config.maxAmountUsdc}
            expiresAt={expiresAt}
            onRevoke={revokeSession}
          />
        ) : isExpired ? (
          <ExpiredPanel
            reason="expired"
            onRenew={handleRenew}
            isApproving={isApproving}
            error={error}
          />
        ) : isExhausted ? (
          <ExpiredPanel
            reason="exhausted"
            onRenew={handleRenew}
            isApproving={isApproving}
            error={error}
          />
        ) : (
          <SetupPanel
            onApprove={approveSessionWithWalletCheck}
            isApproving={isApproving}
            error={error}
          />
        )}
      </div>
    </div>
  )

  if (variant === 'modal') {
    return (
      // Modal backdrop
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}
        onClick={(e) => {
          // Close on backdrop click
          if (e.target === e.currentTarget) { clearError(); onClose?.() }
        }}
      >
        <div className="w-full max-w-sm animate-in zoom-in-95 fade-in duration-200">
          {content}
        </div>
      </div>
    )
  }

  // Panel variant — render inline
  return content
}

// ─── Modal wrapper with global event listener ─────────────────────────────────

/**
 * GlobalSessionKeyModal — mounts once in the app layout and auto-opens
 * whenever the x402 client dispatches 'x402:session-expired'.
 *
 * Usage: Add <GlobalSessionKeyModal /> to your root layout or providers.
 */
export function GlobalSessionKeyModal() {
  const [open, setOpen] = React.useState(false)

  React.useEffect(() => {
    const handler = () => setOpen(true)
    window.addEventListener('x402:session-expired', handler)
    return () => window.removeEventListener('x402:session-expired', handler)
  }, [])

  if (!open) return null

  return (
    <SessionKeyManager
      variant="modal"
      onClose={() => setOpen(false)}
    />
  )
}
