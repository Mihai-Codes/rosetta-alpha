/**
 * Subscription tier helpers for Rosetta Alpha.
 *
 * DRY: Single source of truth for contract address, ABI fragment, and tier logic.
 * Used by: API middleware, frontend components, pricing page.
 */

import { createPublicClient, http, type Address } from 'viem'
import { defineChain } from 'viem'

// Arc Testnet chain definition (reuse from wagmi config if available).
export const arcTestnet = defineChain({
  id: 5_042_002,
  name: 'Arc Testnet',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.NEXT_PUBLIC_ARC_RPC_URL || 'https://rpc-testnet.arc.gel.network'] },
  },
  blockExplorers: {
    default: { name: 'ArcScan', url: 'https://testnet.arcscan.app' },
  },
})

// -----------------------------------------------------------------------
// Contract constants
// -----------------------------------------------------------------------

/** RosettaSubscription contract address on Arc testnet. */
export const SUBSCRIPTION_CONTRACT: Address =
  (process.env.NEXT_PUBLIC_SUBSCRIPTION_CONTRACT as Address) ||
  '0x136eBC6430267C29917B917d283FC8fa2E372C7D' // Deployed on Arc testnet 2026-06-07

/** USDC on Arc testnet (6 decimals ERC-20 interface). */
export const ARC_USDC: Address = '0x3600000000000000000000000000000000000000'

/** Minimal ABI for read operations — keeps bundle small. */
export const SUBSCRIPTION_ABI = [
  {
    name: 'getTier',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'subscriber', type: 'address' }],
    outputs: [{ name: '', type: 'uint8' }],
  },
  {
    name: 'getSubscription',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'subscriber', type: 'address' }],
    outputs: [
      { name: 'tier', type: 'uint8' },
      { name: 'expiresAt', type: 'uint256' },
      { name: 'active', type: 'bool' },
    ],
  },
  {
    name: 'isSubscriber',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'subscriber', type: 'address' },
      { name: 'requiredTier', type: 'uint8' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'subscribe',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'tier', type: 'uint8' }],
    outputs: [],
  },
  {
    name: 'unsubscribe',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
  {
    name: 'tierPrice',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tier', type: 'uint8' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const

// -----------------------------------------------------------------------
// Tier enum (mirrors contract)
// -----------------------------------------------------------------------

export enum Tier {
  None = 0,
  Premium = 1,
  Pro = 2,
}

export const TIER_LABELS: Record<Tier, string> = {
  [Tier.None]: 'Free',
  [Tier.Premium]: 'Premium',
  [Tier.Pro]: 'Pro Trader',
}

export const TIER_PRICES_USD: Record<Tier, number> = {
  [Tier.None]: 0,
  [Tier.Premium]: 29,
  [Tier.Pro]: 99,
}

// -----------------------------------------------------------------------
// Read helpers (server-side or client-side)
// -----------------------------------------------------------------------

/** Create a public client for Arc testnet reads. */
function getClient() {
  return createPublicClient({
    chain: arcTestnet,
    transport: http(),
  })
}

export interface SubscriptionStatus {
  tier: Tier
  expiresAt: number
  active: boolean
}

/**
 * Read subscription status for an address directly from the contract.
 * DRY: This is THE function both API routes and components call.
 */
export async function getSubscriptionStatus(address: Address): Promise<SubscriptionStatus> {
  if (SUBSCRIPTION_CONTRACT === '0x0000000000000000000000000000000000000000') {
    // Contract not yet deployed — return free tier (no false positives).
    return { tier: Tier.None, expiresAt: 0, active: false }
  }

  const client = getClient()

  const [tier, expiresAt, active] = await client.readContract({
    address: SUBSCRIPTION_CONTRACT,
    abi: SUBSCRIPTION_ABI,
    functionName: 'getSubscription',
    args: [address],
  }) as [number, bigint, boolean]

  return {
    tier: tier as Tier,
    expiresAt: Number(expiresAt),
    active,
  }
}

/**
 * Gate check: does address have at least the required tier?
 * Returns true for subscribers, false for free/expired.
 */
export async function hasRequiredTier(address: Address, requiredTier: Tier): Promise<boolean> {
  const status = await getSubscriptionStatus(address)
  return status.active && status.tier >= requiredTier
}

/**
 * Format remaining subscription time for display.
 */
export function formatTimeRemaining(expiresAt: number): string {
  const now = Math.floor(Date.now() / 1000)
  const remaining = expiresAt - now
  if (remaining <= 0) return 'Expired'

  const days = Math.floor(remaining / 86400)
  const hours = Math.floor((remaining % 86400) / 3600)
  if (days > 0) return `${days}d ${hours}h remaining`
  return `${hours}h remaining`
}
