'use client'

import { Layout } from '@/components/Layout'
import { motion, AnimatePresence } from 'framer-motion'
import { useAccount } from 'wagmi'
import { useState, useEffect, useCallback } from 'react'
import { Check, Wallet, CreditCard, Clock, ChevronDown } from 'lucide-react'
import { SubscribeModal } from '@/components/SubscribeModal'
import {
  Tier,
  TIER_LABELS,
  TIER_PRICES_USD,
  TIER_PRICES_ANNUAL,
  TIER_FEATURES,
  COMPARISON_FEATURES,
  PRICING_FAQS,
} from '@/lib/subscription'

// -------------------------------------------------------------------
// Tier Card
// -------------------------------------------------------------------

interface TierCardProps {
  tier: Tier
  name: string
  price: number
  annualPrice: number
  isAnnual: boolean
  features: { label: string; implemented: boolean }[]
  highlighted?: boolean
  onSubscribe: (tier: Tier) => void
}

function TierCard({ tier, name, price, annualPrice, isAnnual, features, highlighted, onSubscribe }: TierCardProps) {
  const displayPrice = isAnnual ? annualPrice : price

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
        {displayPrice === 0 ? (
          <span className="font-display text-3xl sm:text-4xl text-text-primary">Free</span>
        ) : (
          <>
            <span className="font-display text-3xl sm:text-4xl text-text-primary">${displayPrice}</span>
            <span className="text-sm text-text-secondary">/month{isAnnual ? ', billed annually' : ''}</span>
          </>
        )}
      </div>

      {displayPrice > 0 && (
        <div className="mt-1 flex items-center gap-2">
          <span className="text-[10px] text-text-tertiary font-mono">or {displayPrice} USDC on Arc</span>
          {isAnnual && (
            <span className="text-[10px] text-positive font-medium">
              Save ${Math.round((price - annualPrice) * 12)}/year
            </span>
          )}
        </div>
      )}

      <ul className="mt-6 flex-1 space-y-3">
        {features.map((feature) => (
          <li key={feature.label} className="flex items-start gap-2 text-sm">
            {feature.implemented ? (
              <span className="mt-0.5 text-warning shrink-0">✦</span>
            ) : (
              <Clock className="mt-0.5 w-3 h-3 text-text-tertiary shrink-0" />
            )}
            <span className={feature.implemented ? 'text-text-secondary' : 'text-text-tertiary'}>
              {feature.label}
              {!feature.implemented && (
                <span className="ml-1.5 text-[10px] text-text-tertiary italic">coming soon</span>
              )}
            </span>
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

      {displayPrice > 0 && (
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

// -------------------------------------------------------------------
// Comparison Table
// -------------------------------------------------------------------

function ComparisonCell({ value }: { value: boolean | string }) {
  if (value === true) {
    return <span className="text-brand-red"><Check className="w-4 h-4" /></span>
  }
  if (value === false) {
    return <span className="text-text-tertiary">—</span>
  }
  if (value === 'Coming soon') {
    return <span className="text-text-tertiary text-xs italic">coming soon</span>
  }
  return <span className="text-text-secondary text-xs">{value}</span>
}

// -------------------------------------------------------------------
// FAQ Accordion
// -------------------------------------------------------------------

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="border-b border-border">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full py-4 px-4 text-left"
      >
        <span className="text-sm text-text-primary font-medium">{question}</span>
        <ChevronDown
          className={`w-4 h-4 text-text-tertiary transition-transform shrink-0 ml-4 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <p className="pb-4 px-4 text-sm text-text-secondary leading-relaxed">{answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// -------------------------------------------------------------------
// Page
// -------------------------------------------------------------------

export default function PricingPage() {
  const { address } = useAccount()
  const [selectedTier, setSelectedTier] = useState<Tier | null>(null)
  const [subStatus, setSubStatus] = useState<string | null>(null)
  const [isAnnual, setIsAnnual] = useState(false)

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

  const handleModalClose = () => setSelectedTier(null)
  const handleModalSuccess = () => { setSelectedTier(null); fetchSubStatus() }

  return (
    <Layout activeTab="pricing">
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} className="w-full max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 pb-16 pt-28 sm:pt-36 lg:pt-48">
        {/* Active subscription banner */}
        {subStatus && (
          <div className="mb-8 max-w-md mx-auto rounded-lg border border-[#4A9F6F]/30 bg-[#4A9F6F]/10 px-4 py-2 text-center text-xs text-[#4A9F6F]">
            {subStatus} — <button onClick={() => setSelectedTier(Tier.Premium)} className="underline">Upgrade</button>
          </div>
        )}

        {/* Header */}
        <div className="mb-12 text-center">
          <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-brand-red mb-3">
            Pricing
          </p>
          <h1 className="font-display text-4xl md:text-5xl text-text-primary leading-tight">
            Intelligence, Priced Fairly
          </h1>
          <p className="mt-4 text-text-secondary text-sm">
            Five AI agents. Five regional desks. All reasoning hashed on-chain. Choose how deep you want to go.
          </p>
        </div>

        {/* Annual/Monthly toggle */}
        <div className="mb-10 flex items-center justify-center gap-3">
          <span className={`text-sm ${!isAnnual ? 'text-text-primary font-medium' : 'text-text-tertiary'}`}>Monthly</span>
          <button
            onClick={() => setIsAnnual(!isAnnual)}
            className={`relative w-11 h-6 rounded-full transition-colors ${isAnnual ? 'bg-brand-red' : 'bg-border'}`}
            aria-label="Toggle annual billing"
          >
            <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${isAnnual ? 'translate-x-5' : ''}`} />
          </button>
          <span className={`text-sm ${isAnnual ? 'text-text-primary font-medium' : 'text-text-tertiary'}`}>
            Annual
            <span className="ml-1.5 text-[10px] text-positive font-medium">Save 20%</span>
          </span>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto">
          <TierCard
            tier={Tier.None}
            name={TIER_LABELS[Tier.None]}
            price={TIER_PRICES_USD[Tier.None]}
            annualPrice={TIER_PRICES_ANNUAL[Tier.None]}
            isAnnual={isAnnual}
            features={TIER_FEATURES[Tier.None]}
            onSubscribe={handleSubscribe}
          />
          <TierCard
            tier={Tier.Premium}
            name={TIER_LABELS[Tier.Premium]}
            price={TIER_PRICES_USD[Tier.Premium]}
            annualPrice={TIER_PRICES_ANNUAL[Tier.Premium]}
            isAnnual={isAnnual}
            features={TIER_FEATURES[Tier.Premium]}
            highlighted
            onSubscribe={handleSubscribe}
          />
          <TierCard
            tier={Tier.Pro}
            name={TIER_LABELS[Tier.Pro]}
            price={TIER_PRICES_USD[Tier.Pro]}
            annualPrice={TIER_PRICES_ANNUAL[Tier.Pro]}
            isAnnual={isAnnual}
            features={TIER_FEATURES[Tier.Pro]}
            onSubscribe={handleSubscribe}
          />
        </div>

        {/* Payment methods note */}
        <div className="mt-8 mx-auto text-center">
          <p className="text-xs text-text-secondary">
            Pay with your crypto wallet (USDC on Arc) or credit/debit card (via Stripe).{' '}
            <span className="text-text-tertiary">Card payments are converted to USDC and delivered to your wallet.</span>
          </p>
        </div>

        {/* Feature Comparison Table */}
        <div className="mt-16 max-w-4xl mx-auto">
          <h2 className="font-display text-2xl text-text-primary text-center mb-2">
            Feature Comparison
          </h2>
          <p className="text-center text-xs text-text-tertiary mb-8">
            What&apos;s included now vs what&apos;s on our roadmap
          </p>
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

        {/* FAQ */}
        <div className="mt-16 max-w-2xl mx-auto">
          <h2 className="font-display text-2xl text-text-primary text-center mb-8">
            Frequently Asked Questions
          </h2>
          <div className="rounded-lg border border-border bg-bg-secondary divide-y divide-border">
            {PRICING_FAQS.map((faq) => (
              <FAQItem key={faq.question} question={faq.question} answer={faq.answer} />
            ))}
          </div>
        </div>
      </motion.div>

      {/* Subscribe Modal */}
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
