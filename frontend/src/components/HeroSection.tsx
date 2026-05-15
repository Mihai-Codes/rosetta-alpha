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
      className="relative w-full overflow-hidden flex flex-col items-center justify-center pt-32 pb-16 border-b border-white/[0.05]"
      aria-label="Rosetta Alpha hero"
    >
      <div className="absolute inset-0 hero-vignette" aria-hidden />

      <div className="relative z-10 w-full max-w-[1200px] mx-auto px-4 sm:px-8 lg:px-12 text-center">
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
          className={`font-display text-[clamp(2.75rem,8vw,8rem)] font-normal text-text-primary leading-[0.95] mb-6 transition-all duration-1000 delay-100 ${
            visible.headline ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          Rosetta <em className="text-brand-red not-italic">Alpha</em>
        </h1>

        <p
          data-reveal-id="subtitle"
          className={`text-lg md:text-xl text-text-secondary font-light max-w-full w-full mx-auto px-4 whitespace-nowrap overflow-hidden text-ellipsis mb-12 transition-all duration-1000 delay-150 ${
            visible.subtitle ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          Dalio's All Weather discipline, reimagined for every language. Five regional AI analysts. One verifiable thesis.
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
                className="group flex items-center gap-2 px-5 py-2.5 glass-panel rounded-full border border-white/[0.05] hover:border-brand-red hover:shadow-[0_0_20px_rgba(216,43,43,0.6)] transition-all duration-300 cursor-default"
              >
                <div className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-80" style={{ backgroundColor: meta.color, boxShadow: `0 0 12px ${meta.color}` }} />
                  <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: meta.color }} />
                </div>
                <span className="text-sm leading-none text-text-primary group-hover:scale-110 transition-transform">{meta.flag}</span>
                <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-text-secondary group-hover:text-text-primary transition-colors">
                  {meta.name}
                </span>
              </div>
            )
          })}
        </div>

        <div 
          data-reveal-id="actions"
          className={`flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 transition-all duration-1000 delay-500 ${
            visible.actions ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <button
            onClick={onScrollDown}
            className="group relative overflow-hidden inline-flex items-center gap-3 px-10 py-4 glass-panel rounded-full border border-brand-red/60 text-brand-red text-[12px] font-medium uppercase tracking-[0.25em] transition-all duration-500 hover:border-brand-red hover:shadow-[0_0_32px_rgba(216,43,43,1)] cursor-pointer"
          >
            <div className="absolute inset-0 bg-brand-red translate-y-[100%] group-hover:translate-y-0 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]" />
            <span className="relative z-10 transition-colors duration-500 group-hover:text-[#000000]">Enter Terminal</span>
            <span className="relative z-10 transition-all duration-500 group-hover:translate-x-1 group-hover:text-[#000000]">→</span>
          </button>

          {latestHash && (
            <div className="flex items-center gap-3 px-4 sm:px-6 py-3 sm:py-4 glass-panel rounded-full border border-brand-red shadow-[0_0_24px_rgba(216,43,43,0.6)]">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-red red-pulse" />
              <span className="text-[9px] uppercase tracking-[0.25em] text-text-tertiary">
                Latest Trace
              </span>
              <span key={latestHash} className="font-mono text-[11px] text-brand-red animate-in fade-in zoom-in-95 duration-1000">
                {truncateHash(latestHash, 10, 6)}
              </span>
            </div>
          )}
        </div>

        <div className="mt-12 flex justify-center">
          <button 
            onClick={onScrollDown} 
            className="animate-bounce p-3 rounded-full border border-white/[0.05] text-text-tertiary bg-white/[0.02] hover:text-white hover:border-white/[0.2] transition-colors cursor-pointer"
            aria-label="Scroll down to content"
          >
            <ArrowDown className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  )
}
