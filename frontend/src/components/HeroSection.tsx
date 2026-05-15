import React from 'react'
import { ArrowDown } from 'lucide-react'
import { REGION_META, truncateHash } from '../lib/format'

interface HeroSectionProps {
  latestHash?: string
  onScrollDown: () => void
}

const REGIONS = ['us', 'cn', 'eu', 'jp', 'crypto'] as const

export function HeroSection({ latestHash, onScrollDown }: HeroSectionProps) {
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
      className="relative w-full flex flex-col items-center justify-center pt-32 pb-16 border-b border-white/[0.05]"
      aria-label="Rosetta Alpha hero"
    >
      {/* Subtle Apple-style background grid */}
      <div className="absolute inset-0 hero-grid-bg" aria-hidden />
      <div className="absolute inset-0 hero-vignette" aria-hidden />

      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
        <p
          data-reveal-id="eyebrow"
          className={`text-[11px] font-medium uppercase tracking-[0.4em] text-brand-red/80 mb-6 transition-all duration-700 ${
            visible.eyebrow ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
          }`}
        >
          Multi-Language Intelligence · Settled on Arc L1
        </p>

        <h1
          data-reveal-id="headline"
          className={`font-display text-[clamp(4rem,10vw,8rem)] font-normal text-text-primary leading-[0.95] mb-6 transition-all duration-1000 delay-100 ${
            visible.headline ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          Rosetta <em className="text-brand-red not-italic">Alpha</em>
        </h1>

        <p
          data-reveal-id="subtitle"
          className={`text-lg md:text-xl text-text-secondary font-light max-w-2xl mx-auto leading-relaxed mb-10 transition-all duration-1000 delay-200 ${
            visible.subtitle ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          Dalio's All Weather discipline, reimagined for every language.
          Five regional AI analysts. One verifiable thesis.
        </p>

        <div
          data-reveal-id="regions"
          className={`flex flex-wrap items-center justify-center gap-3 mb-12 transition-all duration-1000 delay-300 ${
            visible.regions ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          {REGIONS.map(r => {
            const meta = REGION_META[r]
            return (
              <div
                key={r}
                className="flex items-center gap-2 px-5 py-2.5 glass-panel rounded-full border border-white/[0.05]"
              >
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: meta.color }} />
                <span className="text-sm leading-none text-text-primary">{meta.flag}</span>
                <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-text-secondary">
                  {meta.name}
                </span>
              </div>
            )
          })}
        </div>

        <div 
          data-reveal-id="actions"
          className={`flex flex-col sm:flex-row items-center justify-center gap-6 transition-all duration-1000 delay-500 ${
            visible.actions ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <button
            onClick={onScrollDown}
            className="group inline-flex items-center gap-3 px-8 py-3.5 glass-panel rounded-full border border-brand-red/40 text-brand-red text-[11px] font-medium uppercase tracking-[0.2em] transition-all hover:bg-brand-red hover:text-black hover:shadow-glow-red cursor-pointer"
          >
            Enter Terminal
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </button>

          {latestHash && (
            <div className="flex items-center gap-3 px-5 py-3 glass-panel rounded-full border border-white/[0.05]">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-red red-pulse" />
              <span className="text-[9px] uppercase tracking-[0.25em] text-text-tertiary">
                Latest Trace
              </span>
              <span className="font-mono text-[10px] text-brand-red">{truncateHash(latestHash, 10, 6)}</span>
            </div>
          )}
        </div>

        <div className="mt-12 flex justify-center">
          <button 
            onClick={onScrollDown} 
            className="animate-bounce p-3 rounded-full border border-white/[0.05] text-text-tertiary bg-white/[0.02] hover:text-white transition-colors cursor-pointer"
            aria-label="Scroll down to content"
          >
            <ArrowDown className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  )
}
