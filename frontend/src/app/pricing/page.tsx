'use client'

import { Layout } from '@/components/Layout'
import { motion, AnimatePresence } from 'framer-motion'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseUnits } from 'viem'
import { useState, useEffect, useCallback } from 'react'
import {
  SUBSCRIPTION_CONTRACT,
  SUBSCRIPTION_ABI,
  ARC_USDC,
  Tier,
  TIER_LABELS,
  TIER_PRICES_USD,
} from '@/lib/subscription'
import { CryptoOnrampModal } from '@/components/CryptoOnrampModal'

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
  onPayWithCard: (tier: Tier) => void
  isConnected: boolean
  isPending: boolean
}

function TierCard({ tier, name, price, features, highlighted, onSubscribe, onPayWithCard, isConnected, isPending }: TierCardProps) {
  return (
    <div
      className={`relative flex flex-col rounded-lg border p-6 sm:p-8 transition-all ${
        highlighted
          ? 'border-brand-red bg-bg-secondary shadow-lg shadow-brand-red/10'
          : 'border-border bg-bg-secondary hover:border-text-tertiary'
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
            <span className="mt-0.5 text-warning">✦</span>
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
      {price > 0 && (
        <p className="mt-2 text-center text-[11px] text-text-tertiary">
          {isConnected ? 'Pay on-chain via USDC' : 'Connect wallet first'}
        </p>
      )}
      {price > 0 && (
        <div className="relative mt-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-[11px]">
            <span className="bg-bg-secondary px-2 text-text-tertiary">or pay with card</span>
          </div>
        </div>
      )}
      {price > 0 && (
        <button
          onClick={() => onPayWithCard(tier)}
          disabled={!isConnected}
          className="mt-4 w-full rounded-md border border-border py-3 text-sm font-semibold text-text-primary transition-colors hover:bg-bg-primary disabled:opacity-50"
        >
          {!isConnected ? 'Connect Wallet' : `Buy ${price} USDC with Card`}
        </button>
      )}
      {price > 0 && (
        <p className="mt-2 text-center text-[11px] text-text-tertiary">
          {isConnected ? 'Via Stripe · credit or debit card' : 'Connect wallet first'}
        </p>
      )}
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
  const [onrampTier, setOnrampTier] = useState<Tier | null>(null)
  const [showOnramp, setShowOnramp] = useState(false)
  const [paymentSuccess, setPaymentSuccess] = useState(false)
  const [subStatus, setSubStatus] = useState<string | null>(null)

  const { writeContract: approveUsdc, data: approveHash } = useWriteContract()
  const { writeContract: subscribe, data: subscribeHash } = useWriteContract()

  const { isLoading: isApproving } = useWaitForTransactionReceipt({ hash: approveHash })
  const { isLoading: isSubscribing } = useWaitForTransactionReceipt({ hash: subscribeHash })

  const isPending = isApproving || isSubscribing

  const fetchSubStatus = useCallback(async () => {
    if (!address) return
    try {
      const res = await fetch(`/api/subscription/status?wallet=${address.toLowerCase()}`)
      const data = await res.json()
      setSubStatus(data.active ? `${data.tierName} active` : null)
    } catch {
      // Silent — non-critical
    }
  }, [address])

  useEffect(() => {
    fetchSubStatus()
  }, [fetchSubStatus])

  // Aggressive polling after payment: server-side activation means DB should
  // reflect the new tier within 1-2 seconds of Stripe fulfillment.
  useEffect(() => {
    if (!paymentSuccess || !address) return
    const intervals = [500, 1000, 2000, 4000, 8000, 15000]
    const timers = intervals.map((delay) =>
      setTimeout(() => fetchSubStatus(), delay)
    )
    return () => timers.forEach(clearTimeout)
  }, [paymentSuccess, address, fetchSubStatus])

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
    subscribe({
      address: SUBSCRIPTION_CONTRACT,
      abi: SUBSCRIPTION_ABI,
      functionName: 'subscribe',
      args: [tier],
    })
  }

  function handlePayWithCard(tier: Tier) {
    if (!isConnected || !address) return
    setOnrampTier(tier)
    setShowOnramp(true)
  }

  return (
    <Layout activeTab="pricing">
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} className="w-full max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 pb-16 pt-28 sm:pt-36 lg:pt-48">
        {/* Success Banner */}
        <AnimatePresence>
          {paymentSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="fixed top-20 left-1/2 -translate-x-1/2 z-50 rounded-lg border border-[#4A9F6F]/30 bg-[#4A9F6F]/10 px-6 py-3 text-sm text-[#4A9F6F] backdrop-blur-sm"
            >
              {subStatus
                ? `✓ ${subStatus} — welcome aboard`
                : '✓ Payment received — subscription activating shortly…'}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <div className="mb-12 text-center">
          <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-brand-red mb-3">
            Pricing
          </p>
          <h1 className="font-display text-4xl md:text-5xl text-text-primary leading-tight">
            Intelligence, Priced Fairly
          </h1>
          <p className="mt-4 w-full text-center whitespace-nowrap overflow-visible text-text-secondary text-sm">
            Five AI agents. Five regional desks. All reasoning hashed on-chain. Choose how deep you want to go.
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
            onPayWithCard={handlePayWithCard}
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
            onPayWithCard={handlePayWithCard}
            isConnected={isConnected}
            isPending={isPending}
          />
          <TierCard
            tier={Tier.Pro}
            name={TIER_LABELS[Tier.Pro]}
            price={TIER_PRICES_USD[Tier.Pro]}
            features={TIER_FEATURES[Tier.Pro]}
            onSubscribe={handleSubscribe}
            onPayWithCard={handlePayWithCard}
            isConnected={isConnected}
            isPending={isPending}
          />
        </div>

        {/* x402 Callout */}
        <div className="mt-16 max-w-3xl mx-auto text-center">
          <div className="rounded-lg border border-border bg-bg-secondary p-6 sm:p-8">
            <h3 className="font-display text-lg text-text-primary mb-2">
              Pay-per-Insight with x402
            </h3>
            <p className="text-sm text-text-secondary">
              Not ready to commit? Access individual theses for{' '}
              <span className="font-mono text-warning">0.50 USDC</span> each via our
              x402 nanopayment protocol. No subscription needed — your wallet signs once,
              micropayments flow automatically.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Stripe Crypto Onramp Modal */}
      {showOnramp && onrampTier && address && (
        <CryptoOnrampModal
          isOpen={showOnramp}
          tier={onrampTier}
          walletAddress={address}
          onSuccess={() => {
            setPaymentSuccess(true)
            fetchSubStatus()
          }}
          onClose={() => {
            setShowOnramp(false)
            setOnrampTier(null)
          }}
        />
      )}
    </Layout>
  )
}
