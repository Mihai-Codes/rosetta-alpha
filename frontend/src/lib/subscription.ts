/**
 * Subscription tier helpers for Rosetta Alpha.
 *
 * DRY: Single source of truth for contract address, ABI fragment, and tier logic.
 * Used by: API middleware, frontend components, pricing page, webhook handlers.
 */

import { createPublicClient, http, type Address } from 'viem'
import { prisma } from './prisma'
import { arcTestnet } from './chains'

// -----------------------------------------------------------------------
// Contract constants
// -----------------------------------------------------------------------

/** RosettaSubscription contract address on Arc testnet. */
export const SUBSCRIPTION_CONTRACT: Address =
  (process.env.NEXT_PUBLIC_SUBSCRIPTION_CONTRACT as Address) ||
  '0x136eBC6430267C29917B917d283FC8fa2E372C7D' // Deployed on Arc testnet 2026-06-07

/** USDC on Arc testnet (6 decimals ERC-20 interface). */
export const ARC_USDC: Address = '0x3600000000000000000000000000000000000000'

/** Subscription duration in days — used by onramp webhook activation. */
export const SUBSCRIPTION_DURATION_DAYS = 30

/** Minimal ABI for ERC-20 approve — used by SubscribeModal and pricing page. */
export const ERC20_APPROVE_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const

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

/** Annual billing discount (20% off). */
export const ANNUAL_DISCOUNT = 0.8

export const TIER_PRICES_ANNUAL: Record<Tier, number> = {
  [Tier.None]: 0,
  [Tier.Premium]: Math.round(TIER_PRICES_USD[Tier.Premium] * ANNUAL_DISCOUNT),
  [Tier.Pro]: Math.round(TIER_PRICES_USD[Tier.Pro] * ANNUAL_DISCOUNT),
}

/** Check if a value is a valid paid tier (Premium or Pro). */
export function isValidTier(tier: unknown): tier is Tier {
  return tier === Tier.Premium || tier === Tier.Pro
}

// -----------------------------------------------------------------------
// Feature definitions (single source of truth for pricing page)
// -----------------------------------------------------------------------

export interface TierFeature {
  label: string
  implemented: boolean
}

export const TIER_FEATURES: Record<Tier, TierFeature[]> = {
  [Tier.None]: [
    { label: 'US desk thesis preview (24h delayed)', implemented: true },
    { label: 'Mob Meter sentiment gauge', implemented: true },
    { label: 'Community leaderboard (top 3)', implemented: true },
    { label: 'Basic knowledge graph view', implemented: true },
  ],
  [Tier.Premium]: [
    { label: 'All 5 regional desks (real-time)', implemented: true },
    { label: 'Full provenance chain visibility', implemented: true },
    { label: 'Knowledge graph (full search + contradictions)', implemented: true },
    { label: 'x402 micropayment bypass', implemented: true },
    { label: 'Quiz-to-earn (0.5 USDC rewards)', implemented: false },
    { label: 'Email alerts: regime changes + divergence', implemented: false },
  ],
  [Tier.Pro]: [
    { label: 'Everything in Premium', implemented: true },
    { label: 'API access (programmatic thesis feed)', implemented: false },
    { label: 'Early adversarial debate theses', implemented: false },
    { label: 'Custom alert thresholds', implemented: false },
    { label: 'Builder code integration (earn on copies)', implemented: false },
    { label: 'Priority support', implemented: false },
  ],
}

export interface ComparisonRow {
  name: string
  free: boolean | string
  premium: boolean | string
  pro: boolean | string
}

export const COMPARISON_FEATURES: ComparisonRow[] = [
  { name: 'Regional desks', free: 'US only', premium: 'All 5', pro: 'All 5' },
  { name: 'Thesis delivery', free: '24h delayed', premium: 'Real-time', pro: 'Real-time' },
  { name: 'Provenance chain', free: 'Partial', premium: true, pro: true },
  { name: 'Knowledge graph', free: 'Basic', premium: true, pro: true },
  { name: 'x402 micropayments', free: false, premium: true, pro: true },
  { name: 'Quiz-to-earn', free: false, premium: 'Coming soon', pro: 'Coming soon' },
  { name: 'Email alerts', free: false, premium: 'Coming soon', pro: 'Coming soon' },
  { name: 'API access', free: false, premium: false, pro: 'Coming soon' },
  { name: 'Custom alerts', free: false, premium: false, pro: 'Coming soon' },
  { name: 'Priority support', free: false, premium: false, pro: 'Coming soon' },
]

export interface PricingFAQ {
  question: string
  answer: string
}

export const PRICING_FAQS: PricingFAQ[] = [
  {
    question: 'Can I cancel anytime?',
    answer: 'Yes. Your subscription lasts 30 days and does not auto-renew. Simply don\'t renew when your period ends.',
  },
  {
    question: 'What happens when my subscription expires?',
    answer: 'You revert to the Free tier. Your historical data and preferences are preserved — just renew to regain access.',
  },
  {
    question: 'How does crypto payment work?',
    answer: 'Pay with USDC on Arc Testnet directly from your wallet. Approve the spend, confirm the transaction, and your subscription activates on-chain within seconds.',
  },
  {
    question: 'Can I pay with a credit card?',
    answer: 'Yes. We use Stripe to accept Visa, Mastercard, and other major cards. Your card payment is converted to USDC and delivered to your Arc wallet automatically.',
  },
  {
    question: 'Can I switch between payment methods?',
    answer: 'Absolutely. Each time you subscribe or renew, choose whichever method is most convenient — wallet or card.',
  },
  {
    question: 'Do you offer refunds?',
    answer: 'Due to the on-chain nature of subscriptions, refunds are not available. However, you can cancel and your access continues until the end of your billing period.',
  },
]

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

// -----------------------------------------------------------------------
// Write helpers (server-side only — called by webhook handlers)
// -----------------------------------------------------------------------

/**
 * Activate a subscription after successful Stripe onramp payment.
 * Upserts into the Subscription table with 30-day expiry.
 *
 * DRY: This is the write-side counterpart to getSubscriptionStatus.
 */
export async function activateSubscription(
  walletAddress: string,
  tier: Tier,
  stripeSessionId: string
): Promise<void> {
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + SUBSCRIPTION_DURATION_DAYS)

  await prisma.subscription.upsert({
    where: { userWallet: walletAddress.toLowerCase() },
    update: {
      tier: tier as number,
      expiresAt,
      stripeSessionId,
    },
    create: {
      userWallet: walletAddress.toLowerCase(),
      tier: tier as number,
      expiresAt,
      stripeSessionId,
    },
  })
}
