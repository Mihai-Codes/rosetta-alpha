'use client'

import React, { useState, useEffect } from 'react'
import posthog from 'posthog-js'
import Link from 'next/link'
import { X } from 'lucide-react'
import { Layout } from '@/components/Layout'
import { DashboardView } from '@/components/DashboardView'

const WELCOME_KEY = 'welcome_dismissed'

/**
 * First-run welcome banner for the dashboard page.
 * Shown when localStorage 'welcome_dismissed' is not set.
 * Dismissed via X button (sets localStorage, hides permanently).
 *
 * Note: The spec mentions checking user.createdAt < 5 min ago. next-auth's
 * client session does not expose createdAt, so we use the localStorage guard
 * which naturally covers new users (no key set) while respecting dismissals.
 */
function WelcomeBanner() {
  const [visible, setVisible] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (!localStorage.getItem(WELCOME_KEY)) {
      // Small delay so the slide-down animates on mount rather than flashing
      const timer = setTimeout(() => setVisible(true), 50)
      return () => clearTimeout(timer)
    }
  }, [])

  if (!mounted || !visible) return null

  function handleDismiss() {
    setVisible(false)
    try {
      localStorage.setItem(WELCOME_KEY, '1')
    } catch {
      // localStorage may be unavailable in some contexts
    }
  }

  return (
    <div
      className="animate-slide-down w-full"
      role="alert"
      aria-live="polite"
    >
      <div
        className="flex items-start gap-4 p-4 sm:p-5"
        style={{
          backgroundColor: '#1A1A24',
          borderLeft: '4px solid #C9A84C',
          borderRadius: '8px',
        }}
      >
        {/* Icon + text */}
        <div className="flex-1 min-w-0">
          <p className="text-text-primary text-sm font-display leading-snug">
            Welcome to Rosetta Alpha 👋
          </p>
          <p className="text-text-secondary text-[11px] mt-1.5 leading-relaxed">
            Start here: take a quiz on any desk to earn 0.5 USDC on Arc.
          </p>
        </div>

        {/* CTA */}
        <Link
          href="/quiz"
          onClick={handleDismiss}
          className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-[#C9A84C]/50 text-[#C9A84C] text-[10px] uppercase tracking-[0.2em] font-medium hover:border-[#C9A84C] hover:bg-[#C9A84C]/10 transition-all duration-200 min-h-[44px]"
        >
          Take your first quiz →
        </Link>

        {/* Dismiss */}
        <button
          onClick={handleDismiss}
          aria-label="Dismiss welcome banner"
          className="shrink-0 text-text-tertiary hover:text-text-primary transition-colors mt-0.5 min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

export const dynamic = 'force-dynamic'
export default function DashboardPage() {
  useEffect(() => {
    posthog.capture('dashboard_viewed')
  }, [])

  return (
    <Layout activeTab="dashboard">
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 pb-16 pt-28 sm:pt-36 lg:pt-48">
        {/* Welcome banner — above all other content */}
        <WelcomeBanner />

        <div className="mb-12 mt-6">
          <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-brand-red mb-3">
            Your Portfolio
          </p>
          <h1 className="font-display text-4xl md:text-5xl text-text-primary leading-tight">
            Dashboard
          </h1>
          <p className="text-text-secondary text-sm mt-4 whitespace-nowrap overflow-hidden text-ellipsis w-full">
            Track your prediction accuracy, USDC earnings, and Arc Testnet settlements in one place.
          </p>
        </div>
        <DashboardView />
      </div>
    </Layout>
  )
}
