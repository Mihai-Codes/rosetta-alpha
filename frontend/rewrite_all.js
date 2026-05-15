const fs = require('fs');

const hero = `import React from 'react'
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
          className={\`text-[11px] font-medium uppercase tracking-[0.4em] text-brand-red/80 mb-6 transition-all duration-700 \${
            visible.eyebrow ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
          }\`}
        >
          Multi-Language Intelligence · Settled on Arc L1
        </p>

        <h1
          data-reveal-id="headline"
          className={\`font-display text-[clamp(2.75rem,8vw,8rem)] font-normal text-text-primary leading-[0.95] mb-6 transition-all duration-1000 delay-100 \${
            visible.headline ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }\`}
        >
          Rosetta <em className="text-brand-red not-italic">Alpha</em>
        </h1>

        <p
          data-reveal-id="subtitle"
          className={\`text-[clamp(11px,1.5vw,1.125rem)] text-text-secondary font-light w-full mx-auto px-4 whitespace-nowrap overflow-hidden text-ellipsis mb-12 transition-all duration-1000 delay-150 \${
            visible.subtitle ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }\`}
        >
          Dalio's All Weather discipline, reimagined for every language. Five regional AI analysts. One verifiable thesis.
        </p>

        <div
          data-reveal-id="regions"
          className={\`flex flex-wrap items-center justify-center gap-3 mb-12 transition-all duration-1000 delay-300 \${
            visible.regions ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }\`}
        >
          {REGIONS.map(r => {
            const meta = REGION_META[r]
            return (
              <div
                key={r}
                className="group flex items-center gap-2 px-5 py-2.5 glass-panel rounded-full border border-white/[0.05] hover:border-brand-red hover:shadow-[0_0_32px_rgba(216,43,43,0.8)] transition-all duration-300 cursor-default"
              >
                <div className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-80 shadow-[0_0_12px_rgba(216,43,43,1)]" style={{ backgroundColor: meta.color }} />
                  <span className="relative inline-flex rounded-full h-2 w-2 shadow-[