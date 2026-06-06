'use client'

/**
 * useSubscriberAuth — React hook for subscriber bypass authentication
 * ====================================================================
 *
 * Signs a timestamped message with the user's wallet to prove subscription
 * ownership. Headers are attached to API requests so subscribers bypass
 * x402 micropayments.
 *
 * Protocol:
 *   1. User connects wallet (RainbowKit)
 *   2. Hook checks on-chain tier via getSubscriptionStatus()
 *   3. If subscriber: signs message "rosetta-subscribe:{address}:{timestamp}"
 *   4. Returns headers: x-subscriber-address, x-subscriber-sig, x-subscriber-ts
 *   5. Headers cached for 4 minutes (replay window is 5 min server-side)
 *
 * DRY: Uses shared subscription.ts for contract reads.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useAccount, useSignMessage } from 'wagmi'
import { getSubscriptionStatus, Tier, type SubscriptionStatus } from '@/lib/subscription'

// Cache signature for 4 minutes (server allows 5-min replay window)
const SIG_CACHE_TTL = 4 * 60 * 1000

export interface SubscriberAuthHeaders {
  'x-subscriber-address': string
  'x-subscriber-sig': string
  'x-subscriber-ts': string
}

export interface UseSubscriberAuthReturn {
  /** Current subscription status (null while loading) */
  status: SubscriptionStatus | null
  /** Whether user has an active Premium+ subscription */
  isSubscriber: boolean
  /** Get auth headers for API requests (signs if needed). Returns null if not subscribed. */
  getHeaders: () => Promise<SubscriberAuthHeaders | null>
  /** Force refresh subscription status from chain */
  refresh: () => Promise<void>
  /** Loading state */
  isLoading: boolean
}

export function useSubscriberAuth(): UseSubscriberAuthReturn {
  const { address, isConnected } = useAccount()
  const { signMessageAsync } = useSignMessage()

  const [status, setStatus] = useState<SubscriptionStatus | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Cache: { signature, timestamp, expiresAt }
  const cacheRef = useRef<{
    sig: string
    ts: string
    expiresAt: number
    address: string
  } | null>(null)

  // Fetch subscription status when address changes
  const fetchStatus = useCallback(async () => {
    if (!address || !isConnected) {
      setStatus(null)
      cacheRef.current = null
      return
    }

    setIsLoading(true)
    try {
      const sub = await getSubscriptionStatus(address)
      setStatus(sub)
      // Invalidate cache if tier changed
      if (!sub.active || sub.tier < Tier.Premium) {
        cacheRef.current = null
      }
    } catch {
      setStatus({ tier: Tier.None, expiresAt: 0, active: false })
    } finally {
      setIsLoading(false)
    }
  }, [address, isConnected])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  const isSubscriber = status !== null && status.active && status.tier >= Tier.Premium

  const getHeaders = useCallback(async (): Promise<SubscriberAuthHeaders | null> => {
    if (!address || !isSubscriber) return null

    // Return cached headers if still fresh
    const now = Date.now()
    if (
      cacheRef.current &&
      cacheRef.current.address === address &&
      cacheRef.current.expiresAt > now
    ) {
      return {
        'x-subscriber-address': address,
        'x-subscriber-sig': cacheRef.current.sig,
        'x-subscriber-ts': cacheRef.current.ts,
      }
    }

    // Sign fresh message
    const timestamp = Math.floor(now / 1000).toString()
    const message = `rosetta-subscribe:${address.toLowerCase()}:${timestamp}`

    try {
      const signature = await signMessageAsync({ message })

      // Cache the signature
      cacheRef.current = {
        sig: signature,
        ts: timestamp,
        expiresAt: now + SIG_CACHE_TTL,
        address,
      }

      return {
        'x-subscriber-address': address,
        'x-subscriber-sig': signature,
        'x-subscriber-ts': timestamp,
      }
    } catch {
      // User rejected or wallet error — fall back to no bypass
      return null
    }
  }, [address, isSubscriber, signMessageAsync])

  return {
    status,
    isSubscriber,
    getHeaders,
    refresh: fetchStatus,
    isLoading,
  }
}
