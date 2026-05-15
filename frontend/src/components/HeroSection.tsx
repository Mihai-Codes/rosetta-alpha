import React from 'react'
import { REGION_META, truncateHash } from '../lib/format'

interface HeroSectionProps {
  latestHash?: string
  onEnter: () => void
}

const REGIONS = ['us', 'cn', 'eu', 'jp', 'crypto'] as const

export function HeroSection({ latestHash, onEnter }: HeroSectionProps) {
  const heroRef = React.useRef<HTMLElement>(null)
  const [visible, setVisible] = React.useState<Record<string, boolean>>({})

  // Stagger reveal via IntersectionObserver — no library
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
      className="relative h-screen min-h-[640px] w-full overflow-hidden flex items-center justify-center"
      aria-label="Rosetta Alpha hero"
    >
      {/* Layered backgrounds: grid + vignette */}
      <div className="absolute inset-0 hero-grid-bg" aria-hidden />
      <div className="absolute inset-0 hero-vignette" aria-hidden />

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
        <p
          data-reveal-id="eyebrow"
          className={`text-[11px] font-medium uppercase tracking-[0.4em] text-gold/80 mb-8 transition-all duration-700 ${
            visible.eyebrow ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
          }`}
        >
          Multi-Language Intelligence · Settled on Arc L1
        </p>

        <h1
          data-reveal-id="headline"
          className={`font-display text-display font-normal text-text-primary leading-[0.95] mb-6 transition-all duration-1000 ${
            visible.headline ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          Rosetta <em className="text-gold not-italic">Alpha</em>
        </h1>

        <p
          data-reveal-id="subtitle"
          className={`text-lg md:text-xl text-text-secondary font-light max-w-2xl mx-auto leading-relaxed mb-12 transition-all duration-1000 delay-150 ${
            visible.subtitle ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          Dalio's All Weather discipline, reimagined for every language.
          Five regional AI analysts. One verifiable thesis.
        </p>

        {/* Region pills */}
        <div
          data-reveal-id="regions"
          className={`flex flex-wrap items-center justify-center gap-2 md:gap-3 mb-12 transition-all duration-1000 delay-300 ${
            visible.regions ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          {REGIONS.map(r => {
            const meta = REGION_META[r]
            return (
              <div
                key={r}
                className="flex items-center gap-2 px-4 py-2 border border-border/60 hover:border-gold/40 transition-colors duration-200"
                style={{ borderLeftColor: meta.color, borderLeftWidth: 2 }}
              >
                <span className="text-base leading-none">{meta.flag}</span>
                <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-text-secondary">
                  {meta.name}
                </span>
              </div>
            )
          })}
        </div>

        {/* Live trace ticker */}
        {latestHash && (
          <div
            data-reveal-id="ticker"
            className={`inline-flex items-center gap-3 px-5 py-2.5 border border-border/40 mb-16 transition-all duration-1000 delay-500 ${
              visible.ticker ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-gold gold-pulse" />
            <span className="text-[10px] uppercase tracking-[0.25em] text-text-tertiary">
              Latest Trace
            </span>
            <span className="font-mono text-[11px] text-gold">{truncateHash(latestHash, 10, 6)}</span>
          </div>
        )}

        {/* Enter CTA */}
        <button
          data-reveal-id="cta"
          onClick={onEnter}
          className={`
            group inline-flex items-center gap-3 px-8 py-3
            border border-gold text-gold
            text-[12px] font-medium uppercase tracking-[0.25em]
            transition-all duration-300
            hover:bg-gold hover:text-bg-primary hover:shadow-glow-gold hover:-translate-y-0.5
            ${visible.cta ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
            transition-opacity delay-700
          `}
        >
          Enter Terminal
          <span className="transition-transform group-hover:translate-x-1">→</span>
        </button>

        {/* Scroll hint */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-50">
          <span className="text-[9px] uppercase tracking-[0.3em] text-text-tertiary">Scroll</span>
          <div className="w-px h-8 bg-gradient-to-b from-text-tertiary to-transparent" />
        </div>
      </div>
    </section>
  )
}
