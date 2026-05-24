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
import { useSignTypedData, useAccount, useSendTransaction } from 'wagmi'
import { parseUnits, encodeFunctionData } from 'viem'
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

export type SessionKeyState = {
  /** The active session key, or null if not yet created / revoked */
  sessionKey: SessionKey | null
  /** True if a session key exists and is within budget/time limits */
  isActive: boolean
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
    budgetRemaining: 0,
    expiresAt: null,
    isApproving: false,
    error: null,
  })

  // wagmi hook for EIP-712 typed data signing (Step 2 — authorize session key)
  const { signTypedDataAsync } = useSignTypedData()

  // wagmi hook for sending USDC to fund the session key address (Step 3)
  const { sendTransactionAsync } = useSendTransaction()

  // ── Load persisted session on mount ──
  React.useEffect(() => {
    const key = loadSessionKey()
    if (key) {
      setState({
        sessionKey: key,
        isActive: true,
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
        // Key expired or budget exhausted — update state
        setState(prev => ({
          ...prev,
          sessionKey: null,
          isActive: false,
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
  }, [state.isActive])

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
        budgetRemaining: 0,
        expiresAt: null,
        error: 'Session expired. Please create a new session.',
      }))
    }

    window.addEventListener('x402:payment-success', handlePaymentSuccess)
    window.addEventListener('x402:session-expired', handleSessionExpired)

    return () => {
      window.removeEventListener('x402:payment-success', handlePaymentSuccess)
      window.removeEventListener('x402:session-expired', handleSessionExpired)
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
        const usdcAddress = process.env.NEXT_PUBLIC_USDC_ARC_ADDRESS
        if (!usdcAddress) {
          throw new Error('NEXT_PUBLIC_USDC_ARC_ADDRESS not configured')
        }

        const fundingAmount = parseUnits(String(config.maxAmountUsdc), 6) // USDC = 6 decimals

        // Encode ERC-20 transfer(sessionAddress, fundingAmount)
        const transferData = encodeFunctionData({
          abi: ERC20_TRANSFER_ABI,
          functionName: 'transfer',
          args: [sessionAddress as `0x${string}`, fundingAmount],
        })

        await sendTransactionAsync({
          to: usdcAddress as `0x${string}`,
          data: transferData,
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
    [address, signTypedDataAsync, sendTransactionAsync]
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
