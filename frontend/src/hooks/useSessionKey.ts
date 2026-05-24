'use client'

/**
 * useSessionKey — React hook for x402 session key lifecycle
 * ===========================================================
 *
 * Manages the full lifecycle of an ephemeral session key:
 * generate → EIP-712 authorize → pre-fund USDC → persist → use → revoke
 *
 * The hook bridges the session key library functions (sessionStorage-based)
 * with React state and wagmi's wallet signing.
 *
 * Session key flow reminder:
 * 1. Generate ephemeral keypair (no wallet interaction)
 * 2. User's wallet signs EIP-712 authorization (1 popup — confirms intent)
 * 3. User sends USDC to session key address (1 popup — funds the key)
 * 4. Session key auto-signs all subsequent x402 payments (no more popups)
 */

import React from 'react'
import { useSignTypedData, useAccount, useWriteContract } from 'wagmi'
import { parseUnits } from 'viem'
import { arcTestnet } from '@/lib/chains'
import {
  generateSessionKey,
  buildSessionAuthMessage,
  saveSessionKey,
  loadSessionKey,
  revokeSessionKey,
  generateNonce,
  type SessionKey,
  type SessionKeyConfig,
} from '@/lib/sessionKey'

// ─── State Shape ─────────────────────────────────────────────────────────────

/** Lifecycle status of the session key */
export type SessionKeyStatus = 'none' | 'active' | 'expired' | 'exhausted'

export type SessionKeyState = {
  /** The active session key, or null if not yet created / revoked */
  sessionKey: SessionKey | null
  /** True if a session key exists and is within budget/time limits */
  isActive: boolean
  /** Detailed lifecycle status — used by SessionKeyManager to show correct state */
  status: SessionKeyStatus
  /** How much USDC budget remains (maxAmountUsdc - spentUsdc) */
  budgetRemaining: number
  /** When this session key expires (null if no active session) */
  expiresAt: Date | null
  /** True while waiting for wallet signature(s) */
  isApproving: boolean
  /** Last error message, if any */
  error: string | null
}

// ─── ERC-20 Transfer ABI (minimal — for funding the session key) ─────────────

/** Minimal USDC transfer ABI — used to fund the session key address */
const ERC20_TRANSFER_ABI = [
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
] as const

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Manages x402 session key state in React.
 *
 * Usage:
 *   const { isActive, budgetRemaining, approveSession, revokeSession } = useSessionKey()
 *
 *   // To create a session:
 *   await approveSession({ maxAmountUsdc: 5, expirySeconds: 86400, allowedContracts: [] })
 */
export function useSessionKey() {
  const { address } = useAccount()

  // ── Internal state ──
  const [state, setState] = React.useState<SessionKeyState>({
    sessionKey: null,
    isActive: false,
    status: 'none',
    budgetRemaining: 0,
    expiresAt: null,
    isApproving: false,
    error: null,
  })

  // wagmi hook for EIP-712 typed data signing (Step 2 — authorize session key)
  const { signTypedDataAsync } = useSignTypedData()

  // wagmi hook for writing to USDC contract (ERC-20 transfer) to fund session key
  // useWriteContract is the correct wagmi v2 API for contract calls —
  // it also enforces chainId so the tx goes to Arc Testnet, not mainnet
  const { writeContractAsync } = useWriteContract()

  // ── Load persisted session on mount ──
  React.useEffect(() => {
    const key = loadSessionKey()
    if (key) {
      setState({
        sessionKey: key,
        isActive: true,
        status: 'active',
        budgetRemaining: key.config.maxAmountUsdc - key.spentUsdc,
        expiresAt: new Date(key.createdAt + key.config.expirySeconds * 1000),
        isApproving: false,
        error: null,
      })
    }
  }, [])

  // ── Poll session validity every 30 seconds (expiry + budget tracking) ──
  React.useEffect(() => {
    if (!state.isActive) return

    const interval = setInterval(() => {
      const key = loadSessionKey()
      if (!key) {
        // Determine WHY the key is gone: expired vs budget exhausted
        // Check by re-reading raw sessionStorage before loadSessionKey cleaned it
        // loadSessionKey already removed it, so we infer from previous state
        const wasExpired = state.expiresAt && Date.now() >= state.expiresAt.getTime()
        setState(prev => ({
          ...prev,
          sessionKey: null,
          isActive: false,
          status: wasExpired ? 'expired' : 'exhausted',
          budgetRemaining: 0,
          expiresAt: null,
        }))
      } else {
        // Refresh budget remaining (may have changed from payments)
        setState(prev => ({
          ...prev,
          sessionKey: key,
          budgetRemaining: key.config.maxAmountUsdc - key.spentUsdc,
        }))
      }
    }, 30_000)

    return () => clearInterval(interval)
  // Include expiresAt so the expiry-vs-exhausted check uses current value
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.isActive, state.expiresAt])

  // ── Listen for x402 payment events dispatched by x402Client ──
  React.useEffect(() => {
    const handlePaymentSuccess = () => {
      // Reload from sessionStorage to get updated spentUsdc
      const key = loadSessionKey()
      if (key) {
        setState(prev => ({
          ...prev,
          sessionKey: key,
          budgetRemaining: key.config.maxAmountUsdc - key.spentUsdc,
        }))
      }
    }

    const handleSessionExpired = () => {
      setState(prev => ({
        ...prev,
        sessionKey: null,
        isActive: false,
        status: 'expired' as const,
        budgetRemaining: 0,
        expiresAt: null,
        error: 'Session expired. Please create a new session.',
      }))
    }

    const handleInsufficientBudget = () => {
      // Budget exhausted mid-session — mark as exhausted
      setState(prev => ({
        ...prev,
        sessionKey: null,
        isActive: false,
        status: 'exhausted' as const,
        budgetRemaining: 0,
      }))
    }

    window.addEventListener('x402:payment-success', handlePaymentSuccess)
    window.addEventListener('x402:session-expired', handleSessionExpired)
    window.addEventListener('x402:insufficient-budget', handleInsufficientBudget)

    return () => {
      window.removeEventListener('x402:payment-success', handlePaymentSuccess)
      window.removeEventListener('x402:session-expired', handleSessionExpired)
      window.removeEventListener('x402:insufficient-budget', handleInsufficientBudget)
    }
  }, [])

  // ── approveSession ────────────────────────────────────────────────────────

  /**
   * Create and authorize a new session key.
   *
   * Steps:
   * 1. Generate ephemeral keypair
   * 2. User signs EIP-712 authorization message (wallet popup #1)
   * 3. User sends USDC to session key address to pre-fund it (wallet popup #2)
   * 4. Persist session key to sessionStorage
   * 5. Update React state
   *
   * @param config - Budget, expiry, and contract restrictions for this session
   */
  const approveSession = React.useCallback(
    async (config: SessionKeyConfig): Promise<void> => {
      if (!address) {
        setState(prev => ({ ...prev, error: 'Wallet not connected. Please connect your wallet first.' }))
        return
      }

      setState(prev => ({ ...prev, isApproving: true, error: null }))

      try {
        // ── Step 1: Generate ephemeral keypair ──
        const { privateKey, address: sessionAddress } = generateSessionKey()

        // Ensure nonce is set in config
        const configWithNonce: SessionKeyConfig = {
          ...config,
          nonce: config.nonce || generateNonce(),
        }

        // ── Step 2: User signs EIP-712 authorization ──
        // This is wallet popup #1 — authorizes the session key's spending limits
        const typedData = buildSessionAuthMessage(address, sessionAddress, configWithNonce)
        // wagmi's signTypedDataAsync has strict generic inference on `message`.
        // We cast the whole argument as `never` to bypass the inferred constraint —
        // the runtime values are correct (built by buildSessionAuthMessage).
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const authorizationSig = await signTypedDataAsync(typedData as any)

        // ── Step 3: Fund the session key address with USDC ──
        // EIP-3009 requires signer == from, so the session key's address must
        // hold the USDC. We transfer maxAmountUsdc from the user's wallet.
        // This is wallet popup #2 — the last popup until session is exhausted.
        // Defaulting to Arc Testnet USDC contract if env var is missing
        const usdcAddress = process.env.NEXT_PUBLIC_USDC_ARC_ADDRESS || '0x3600000000000000000000000000000000000000'

        const fundingAmount = parseUnits(String(config.maxAmountUsdc), 6) // USDC = 6 decimals

        // useWriteContract enforces chainId (Arc Testnet 5042002) via the chain param,
        // preventing the tx from landing on mainnet if the wallet is on the wrong network.
        await writeContractAsync({
          address: usdcAddress as `0x${string}`,
          abi: ERC20_TRANSFER_ABI,
          functionName: 'transfer',
          args: [sessionAddress as `0x${string}`, fundingAmount],
          chainId: arcTestnet.id, // enforce Arc Testnet — prevents mainnet misfire
        })

        // ── Step 4: Build and persist the session key ──
        const sessionKey: SessionKey = {
          privateKey,
          address: sessionAddress,
          config: configWithNonce,
          userAddress: address,
          authorizationSig,
          spentUsdc: 0,
          createdAt: Date.now(),
        }

        saveSessionKey(sessionKey)

        // ── Step 5: Update React state ──
        setState({
          sessionKey,
          isActive: true,
          status: 'active',
          budgetRemaining: config.maxAmountUsdc,
          expiresAt: new Date(Date.now() + config.expirySeconds * 1000),
          isApproving: false,
          error: null,
        })
      } catch (err) {
        const message =
          err instanceof Error
            ? // Detect user rejection specifically for better UX
              err.message.includes('User rejected') || err.message.includes('user rejected')
              ? 'Wallet approval cancelled.'
              : err.message
            : 'Failed to create session key.'

        setState(prev => ({ ...prev, isApproving: false, error: message }))
        throw err // Re-throw so callers can handle
      }
    },
    [address, signTypedDataAsync, writeContractAsync]
  )

  // ── revokeSession ────────────────────────────────────────────────────────

  /**
   * Revoke the active session key and clear all state.
   * Call this when the user wants to stop automatic payments.
   */
  const revokeSession = React.useCallback(() => {
    revokeSessionKey()
    setState({
      sessionKey: null,
      isActive: false,
      status: 'none',
      budgetRemaining: 0,
      expiresAt: null,
      isApproving: false,
      error: null,
    })
  }, [])

  // ── clearError ──────────────────────────────────────────────────────────

  const clearError = React.useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  return {
    ...state,
    approveSession,
    revokeSession,
    clearError,
  }
}
