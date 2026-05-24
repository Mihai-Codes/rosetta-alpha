'use client'

import React from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { REGION_META, truncateHash } from '../lib/format'

interface HeroSectionProps {
  latestHash?: string
  onScrollDown: (e: React.MouseEvent) => void
  isAuthenticated?: boolean
}

const REGIONS = ['us', 'cn', 'eu', 'jp', 'crypto'] as const

export function HeroSection({ latestHash, onScrollDown, isAuthenticated }: HeroSectionProps) {
  const heroRef = React.useRef<HTMLElement>(null)
  const [visible, setVisible] = React.useState<Record<string, boolean>>({})

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const id = (entry.target as HTMLElement).dataset.revealId
            if (id) setVisible(prev => ({ ...prev, [id]: true }))
          }
        })
      },
      { threshold: 0.1 }
    )
    heroRef.current?.querySelectorAll('[data-reveal-id]').forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return (
    <section
      ref={heroRef}
      className="relative w-full overflow-hidden flex flex-col items-center justify-center pt-28 sm:pt-40 pb-2"
      aria-label="Rosetta Alpha hero"
    >
      <div className="absolute inset-0 hero-vignette" aria-hidden />

      <div className="relative z-10 w-full max-w-[1200px] mx-auto px-4 sm:px-8 lg:px-12 text-center">
        <p
          data-reveal-id="eyebrow"
          className={`text-[10px] sm:text-[11px] font-medium uppercase tracking-[0.3em] sm:tracking-[0.4em] text-brand-red mb-6 sm:mb-8 transition-all duration-700 ${
            visible.eyebrow ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
          }`}
        >
          Multi-Language Intelligence · Settled on Arc L1
        </p>

        <h1
          data-reveal-id="headline"
          className={`font-display text-[clamp(2.5rem,9vw,7.5rem)] font-normal text-text-primary leading-[0.95] mb-6 sm:mb-8 transition-all duration-1000 delay-100 ${
            visible.headline ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          Rosetta <em className="text-brand-red not-italic">Alpha</em>
        </h1>

        <div className="overflow-hidden mb-8 sm:mb-12 px-2">
          <p
            data-reveal-id="subtitle"
            className={`text-[clamp(0.8rem,2.5vw,1.125rem)] text-text-secondary font-light transition-all duration-1000 delay-200 ${
              visible.subtitle ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            Dalio's All Weather discipline, reimagined for every language.{' '}
            <br className="hidden sm:block" />
            Five regional AI analysts. One verifiable thesis.
          </p>
        </div>

        {/* Region pills — horizontal scroll on mobile */}
        <div className="relative mb-12 sm:mb-16">
          <div
            data-reveal-id="regions"
            className={`flex items-center justify-start sm:justify-center gap-2 sm:gap-3 overflow-x-auto pb-2 sm:pb-0 scrollbar-hide snap-x snap-mandatory transition-all duration-1000 delay-300 ${
              visible.regions ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
          {REGIONS.map(r => {
            const meta = REGION_META[r]
            return (
              <div
                key={r}
                className="group flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-3 solid-panel rounded-full hover:border-brand-red transition-all duration-300 cursor-default hover:shadow-[0_0_20px_rgba(216,43,43,0.4)] shrink-0 snap-start min-h-[44px]"
              >
                <div className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: meta.color }} />
                  <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: meta.color }} />
                </div>
                <span className="text-sm leading-none text-text-primary">{meta.flag}</span>
                <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-text-secondary">
                  {meta.name}
                </span>
              </div>
            )
          })}
          </div>
          <div className="pointer-events-none absolute right-0 top-0 h-full w-12 bg-gradient-to-l from-bg-primary to-transparent sm:hidden" />
        </div>

        <div
          data-reveal-id="actions"
          className={`flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 transition-all duration-1000 delay-500 ${
            visible.actions ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <button
            data-testid="enter-terminal-btn"
            onClick={onScrollDown}
            className="flex items-center gap-2 px-8 py-4 bg-brand-red text-bg-primary text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-white hover:text-bg-primary transition-colors duration-300 min-h-[52px] cursor-pointer"
          >
            Enter Terminal →
          </button>
          <Link
            href="/quiz"
            data-testid="try-quiz-cta"
            className="flex items-center gap-2 px-8 py-4 border border-white/20 text-text-secondary text-[11px] font-medium uppercase tracking-[0.2em] hover:border-accent-gold/60 hover:text-accent-gold transition-all duration-300 min-h-[52px]"
          >
            Try Quiz
          </Link>
        </div>
      </div>
    </section>
  )
}
