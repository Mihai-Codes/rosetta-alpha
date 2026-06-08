'use client'

import { Layout } from '@/components/Layout'
import { motion } from 'framer-motion'
import { useAccount } from 'wagmi'
import { useState, useEffect, useCallback } from 'react'
import { Check, Wallet, CreditCard } from 'lucide-react'
import { SubscribeModal } from '@/components/SubscribeModal'
import { Tier, TIER_LABELS, TIER_PRICES_USD } from '@/lib/subscription'

interface TierCardProps {
  tier: Tier
  name: string
  price: number
  features: string[]
  highlighted?: boolean
  onSubscribe: (tier: Tier) => void
}

function TierCard({ tier, name, price, features, highlighted, onSubscribe }: TierCardProps) {
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
        <div className="mt-2 flex items-center gap-2">
          <span className="text-[10px] text-text-tertiary font-mono">or {price} USDC on Arc</span>
        </div>
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
        disabled={tier === Tier.None}
        className={`mt-8 w-full rounded-md py-3 text-sm font-semibold transition-colors ${
          tier === Tier.None
            ? 'cursor-default border border-border text-text-tertiary'
            : highlighted
              ? 'bg-brand-red text-white hover:bg-brand-red/90'
              : 'border border-brand-red text-brand-red hover:bg-brand-red/10'
        }`}
      >
        {tier === Tier.None ? 'Current Plan' : 'Subscribe'}
      </button>

      {price > 0 && (
        <div className="mt-3 flex items-center justify-center gap-3 text-[10px] text-text-tertiary">
          <span className="flex items-center gap-1">
            <Wallet className="w-3 h-3" />
            Wallet
          </span>
          <span>or</span>
          <span className="flex items-center gap-1">
            <CreditCard className="w-3 h-3" />
            Card
          </span>
        </div>
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

const COMPARISON_FEATURES = [
  { name: 'Real-time thesis access', free: false, premium: true, pro: true },
  { name: 'Provenance chain visibility', free: 'Partial', premium: true, pro: true },
  { name: 'Knowledge graph search', free: false, premium: true, pro: true },
  { name: 'API access', free: false, premium: false, pro: true },
  { name: 'Builder code integration', free: false, premium: false, pro: true },
  { name: 'Custom alert thresholds', free: false, premium: false, pro: true },
  { name: 'Quiz-to-earn rewards', free: false, premium: true, pro: true },
  { name: 'x402 micropayment bypass', free: false, premium: true, pro: true },
  { name: 'Email alerts', free: false, premium: true, pro: true },
  { name: 'Priority support', free: false, premium: false, pro: true },
]

function ComparisonCell({ value }: { value: boolean | string }) {
  if (value === true) {
    return <span className="text-brand-red"><Check className="w-4 h-4" /></span>
  }
  if (value === false) {
    return <span className="text-text-tertiary">—</span>
  }
  return <span className="text-text-secondary text-xs">{value}</span>
}

export default function PricingPage() {
  const { address, isConnected } = useAccount()
  const [selectedTier, setSelectedTier] = useState<Tier | null>(null)
  const [subStatus, setSubStatus] = useState<string | null>(null)

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

  const handleSubscribe = (tier: Tier) => {
    if (tier === Tier.None) return
    setSelectedTier(tier)
  }

  const handleModalClose = () => {
    setSelectedTier(null)
  }

  const handleModalSuccess = () => {
    setSelectedTier(null)
    fetchSubStatus()
  }

  return (
    <Layout activeTab="pricing">
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} className="w-full max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 pb-16 pt-28 sm:pt-36 lg:pt-48">
        {subStatus && (
          <div className="mb-8 max-w-md mx-auto rounded-lg border border-[#4A9F6F]/30 bg-[#4A9F6F]/10 px-4 py-2 text-center text-xs text-[#4A9F6F]">
            {subStatus} — <button onClick={() => setSelectedTier(Tier.Premium)} className="underline">Upgrade</button>
          </div>
        )}

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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto">
          <TierCard
            tier={Tier.None}
            name={TIER_LABELS[Tier.None]}
            price={TIER_PRICES_USD[Tier.None]}
            features={TIER_FEATURES[Tier.None]}
            onSubscribe={handleSubscribe}
          />
          <TierCard
            tier={Tier.Premium}
            name={TIER_LABELS[Tier.Premium]}
            price={TIER_PRICES_USD[Tier.Premium]}
            features={TIER_FEATURES[Tier.Premium]}
            highlighted
            onSubscribe={handleSubscribe}
          />
          <TierCard
            tier={Tier.Pro}
            name={TIER_LABELS[Tier.Pro]}
            price={TIER_PRICES_USD[Tier.Pro]}
            features={TIER_FEATURES[Tier.Pro]}
            onSubscribe={handleSubscribe}
          />
        </div>

        <div className="mt-8 max-w-3xl mx-auto text-center">
          <p className="text-xs text-text-secondary">
            Pay with your crypto wallet (USDC on Arc) or credit/debit card (via Stripe).
            {' '}
            <span className="text-text-tertiary">Card payments are converted to USDC and delivered to your wallet.</span>
          </p>
        </div>

        <div className="mt-16 max-w-4xl mx-auto">
          <h2 className="font-display text-2xl text-text-primary text-center mb-8">
            Feature Comparison
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-text-secondary font-medium">Feature</th>
                  <th className="text-center py-3 px-4 text-text-secondary font-medium">Free</th>
                  <th className="text-center py-3 px-4 text-brand-red font-medium">Premium</th>
                  <th className="text-center py-3 px-4 text-text-secondary font-medium">Pro</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_FEATURES.map((feature) => (
                  <tr key={feature.name} className="border-b border-border/50">
                    <td className="py-3 px-4 text-text-primary">{feature.name}</td>
                    <td className="text-center py-3 px-4"><ComparisonCell value={feature.free} /></td>
                    <td className="text-center py-3 px-4"><ComparisonCell value={feature.premium} /></td>
                    <td className="text-center py-3 px-4"><ComparisonCell value={feature.pro} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

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

      {selectedTier && (
        <SubscribeModal
          tier={selectedTier}
          isOpen={!!selectedTier}
          onClose={handleModalClose}
          onSuccess={handleModalSuccess}
        />
      )}
    </Layout>
  )
}