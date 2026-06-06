'use client'

import { Layout } from '@/components/Layout'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseUnits } from 'viem'
import { useState } from 'react'
import {
  SUBSCRIPTION_CONTRACT,
  SUBSCRIPTION_ABI,
  ARC_USDC,
  Tier,
  TIER_LABELS,
  TIER_PRICES_USD,
} from '@/lib/subscription'

// ERC-20 approve ABI fragment
const ERC20_APPROVE_ABI = [
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

interface TierCardProps {
  tier: Tier
  name: string
  price: number
  features: string[]
  highlighted?: boolean
  onSubscribe: (tier: Tier) => void
  isConnected: boolean
  isPending: boolean
}

function TierCard({ tier, name, price, features, highlighted, onSubscribe, isConnected, isPending }: TierCardProps) {
  return (
    <div
      className={`relative flex flex-col rounded-lg border p-6 sm:p-8 transition-all ${
        highlighted
          ? 'border-brand-red bg-brand-red/5 shadow-lg shadow-brand-red/10'
          : 'border-border bg-surface-card hover:border-text-tertiary'
      }`}
    >
      {highlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-red px-3 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
          Most Popular
        </div>
      )}

      <h3 className="font-display text-xl sm:text-2xl text-text-primary">{name}</h3>

      <div className="mt-4 flex items-baseline gap-1">
        {price === 0 ? (
          <span className="font-display text-3xl sm:text-4xl text-text-primary">Free</span>
        ) : (
          <>
            <span className="font-display text-3xl sm:text-4xl text-text-primary">${price}</span>
            <span className="text-sm text-text-secondary">/month</span>
          </>
        )}
      </div>

      {price > 0 && (
        <p className="mt-1 text-xs text-text-tertiary font-mono">
          or {price} USDC on Arc
        </p>
      )}

      <ul className="mt-6 flex-1 space-y-3">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-sm text-text-secondary">
            <span className="mt-0.5 text-brand-gold">✦</span>
            {feature}
          </li>
        ))}
      </ul>

      <button
        onClick={() => onSubscribe(tier)}
        disabled={tier === Tier.None || !isConnected || isPending}
        className={`mt-8 w-full rounded-md py-3 text-sm font-semibold transition-colors ${
          tier === Tier.None
            ? 'cursor-default border border-border text-text-tertiary'
            : highlighted
              ? 'bg-brand-red text-white hover:bg-brand-red/90 disabled:opacity-50'
              : 'border border-brand-red text-brand-red hover:bg-brand-red/10 disabled:opacity-50'
        }`}
      >
        {tier === Tier.None
          ? 'Current Plan'
          : !isConnected
            ? 'Connect Wallet'
            : isPending
              ? 'Processing…'
              : `Subscribe · ${price} USDC`}
      </button>
    </div>
  )
}

const TIER_FEATURES: Record<Tier, string[]> = {
  [Tier.None]: [
    'Delayed thesis summaries (24h)',
    'Basic desk view (5 regions)',
    'Mob Meter sentiment gauge',
    'Community leaderboard (top 3)',
  ],
  [Tier.Premium]: [
    'Real-time thesis access (all 5 desks)',
    'Full provenance chain visibility',
    'Email alerts: regime changes + divergence',
    'Historical knowledge graph search',
    'Quiz-to-earn (0.5 USDC rewards)',
    'x402 micropayment bypass',
  ],
  [Tier.Pro]: [
    'Everything in Premium',
    'API access (programmatic thesis feed)',
    'Builder code integration (earn on copies)',
    'Priority access to new desks/regions',
    'Custom alert thresholds',
    'Early adversarial debate theses',
    'Dedicated support channel',
  ],
}

export default function PricingPage() {
  const { address, isConnected } = useAccount()
  const [pendingTier, setPendingTier] = useState<Tier | null>(null)

  const { writeContract: approveUsdc, data: approveHash } = useWriteContract()
  const { writeContract: subscribe, data: subscribeHash } = useWriteContract()

  const { isLoading: isApproving } = useWaitForTransactionReceipt({ hash: approveHash })
  const { isLoading: isSubscribing } = useWaitForTransactionReceipt({ hash: subscribeHash })

  const isPending = isApproving || isSubscribing

  async function handleSubscribe(tier: Tier) {
    if (!isConnected || !address || tier === Tier.None) return
    setPendingTier(tier)

    const price = parseUnits(TIER_PRICES_USD[tier].toString(), 6)

    // Step 1: Approve USDC spend
    approveUsdc({
      address: ARC_USDC,
      abi: ERC20_APPROVE_ABI,
      functionName: 'approve',
      args: [SUBSCRIPTION_CONTRACT, price],
    })

    // Step 2: Subscribe (user triggers after approve confirms)
    // In production, use useEffect on approveHash confirmation.
    // For hackathon: sequential UX via wallet popups.
    subscribe({
      address: SUBSCRIPTION_CONTRACT,
      abi: SUBSCRIPTION_ABI,
      functionName: 'subscribe',
      args: [tier],
    })
  }

  return (
    <Layout activeTab="pricing">
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 pb-16 pt-28 sm:pt-36 lg:pt-48">
        {/* Header */}
        <div className="mb-12 text-center">
          <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-brand-red mb-3">
            Pricing
          </p>
          <h1 className="font-display text-4xl md:text-5xl text-text-primary leading-tight">
            Intelligence, Priced Fairly
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-text-secondary">
            Five AI agents. Five regional desks. All reasoning hashed on-chain.
            Choose how deep you want to go.
          </p>
        </div>

        {/* Pricing Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto">
          <TierCard
            tier={Tier.None}
            name={TIER_LABELS[Tier.None]}
            price={TIER_PRICES_USD[Tier.None]}
            features={TIER_FEATURES[Tier.None]}
            onSubscribe={handleSubscribe}
            isConnected={isConnected}
            isPending={isPending}
          />
          <TierCard
            tier={Tier.Premium}
            name={TIER_LABELS[Tier.Premium]}
            price={TIER_PRICES_USD[Tier.Premium]}
            features={TIER_FEATURES[Tier.Premium]}
            highlighted
            onSubscribe={handleSubscribe}
            isConnected={isConnected}
            isPending={isPending}
          />
          <TierCard
            tier={Tier.Pro}
            name={TIER_LABELS[Tier.Pro]}
            price={TIER_PRICES_USD[Tier.Pro]}
            features={TIER_FEATURES[Tier.Pro]}
            onSubscribe={handleSubscribe}
            isConnected={isConnected}
            isPending={isPending}
          />
        </div>

        {/* x402 Callout */}
        <div className="mt-16 max-w-3xl mx-auto text-center">
          <div className="rounded-lg border border-border bg-surface-card p-6 sm:p-8">
            <h3 className="font-display text-lg text-text-primary mb-2">
              Pay-per-Insight with x402
            </h3>
            <p className="text-sm text-text-secondary">
              Not ready to commit? Access individual theses for{' '}
              <span className="font-mono text-brand-gold">0.50 USDC</span> each via our
              x402 nanopayment protocol. No subscription needed — your wallet signs once,
              micropayments flow automatically.
            </p>
          </div>
        </div>

        {/* Grant Narrative */}
        <div className="mt-12 max-w-3xl mx-auto">
          <div className="rounded-lg border border-brand-gold/30 bg-brand-gold/5 p-6 sm:p-8">
            <h3 className="font-display text-lg text-brand-gold mb-3">
              Built on Circle
            </h3>
            <ul className="space-y-2 text-sm text-text-secondary">
              <li className="flex items-start gap-2">
                <span className="text-brand-gold">●</span>
                USDC settlement on Arc — subscriptions + micropayments
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-gold">●</span>
                x402 protocol for AI-native pay-per-use access
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-gold">●</span>
                On-chain subscription state — portable, verifiable, composable
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-gold">●</span>
                Sustainable model: free tier → adoption, paid tiers → development funding
              </li>
            </ul>
          </div>
        </div>
      </div>
    </Layout>
  )
}
