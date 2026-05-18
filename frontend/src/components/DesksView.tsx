'use client'

import React from 'react'
import Link from 'next/link'
import { Lock } from 'lucide-react'
import { DeskProps } from './DeskCard'
import { RegionSidebar } from './RegionSidebar'
import { ThesisCard } from './ThesisCard'
import { AllWeatherChart } from './AllWeatherChart'
import { ThesisSkeleton } from './SkeletonLoader'
import { regionMeta } from '../lib/format'

interface DesksViewProps {
  desks: DeskProps[]
  loading: boolean
  isAuthenticated?: boolean
}

function RegionPillBar({
  desks,
  activeDesk,
  onSelect,
}: {
  desks: DeskProps[]
  activeDesk: string
  onSelect: (desk: string) => void
}) {
  return (
    <div
      className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory"
      role="tablist"
      aria-label="Regional desks"
    >
      {desks.map(d => {
        const meta = regionMeta(d.desk)
        const isActive = activeDesk === d.desk
        return (
          <button
            key={d.desk}
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelect(d.desk)}
            className={`flex items-center gap-2 px-5 py-3 rounded-none shrink-0 snap-start min-h-[44px] border text-[11px] font-medium uppercase tracking-[0.15em] transition-all duration-300 ${
              isActive
                ? 'bg-white/[0.08] border-white/20 text-text-primary'
                : 'border-white/[0.06] text-text-secondary hover:border-white/[0.15] hover:text-text-primary bg-white/[0.02]'
            }`}
            style={{ borderColor: isActive ? meta.color + '60' : undefined }}
          >
            <span className="text-sm leading-none">{meta.flag}</span>
            <span style={{ color: isActive ? meta.color : undefined }}>{meta.name}</span>
            <span className="font-mono text-[10px] opacity-60" style={{ color: meta.color }}>
              {(d.confidence * 100).toFixed(0)}%
            </span>
          </button>
        )
      })}
    </div>
  )
}

function PremiumPaywall() {
  return (
    <div className="absolute inset-0 z-20 flex flex-col justify-end pt-32 bg-gradient-to-t from-bg-primary via-bg-primary/95 to-transparent">
      {/* Brutalist Redaction Overlay */}
      <div className="relative z-30 w-full max-w-md mx-auto mb-12 sm:mb-20 text-center border-t border-b sm:border border-white/10 bg-[#0A0A0A]/90 backdrop-blur-md p-8 sm:shadow-2xl">
        <div className="flex justify-center mb-5">
          <div className="w-12 h-12 border border-brand-red/30 bg-brand-red/5 flex items-center justify-center red-pulse rounded-none">
            <Lock className="w-5 h-5 text-brand-red" />
          </div>
        </div>
        <p className="font-mono text-brand-red text-[11px] uppercase tracking-[0.3em] mb-2">
          Encrypted Trace
        </p>
        <p className="font-display text-text-primary text-xl mb-3">
          Institutional Access Required
        </p>
        <p className="text-text-secondary text-xs font-light mb-8 leading-relaxed max-w-[280px] mx-auto">
          Authenticate to decrypt the full multi-agent reasoning chain and verify provenance on Arc L1.
        </p>
        <Link
          href="/signin"
          className="w-full flex items-center justify-center gap-2 py-4 bg-brand-red text-bg-primary text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-white hover:text-bg-primary transition-colors duration-300 min-h-[44px]"
        >
          Authenticate Session →
        </Link>
      </div>
      
      {/* Decorative scanning line at the bottom */}
      <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-brand-red to-transparent opacity-50" />
    </div>
  )
}

export function DesksView({ desks, loading, isAuthenticated = false }: DesksViewProps) {
  const [activeDesk, setActiveDesk] = React.useState<string>(desks[0]?.desk ?? '')

  React.useEffect(() => {
    if (!desks.find(d => d.desk === activeDesk) && desks.length > 0) {
      setActiveDesk(desks[0].desk)
    }
  }, [desks, activeDesk])

  const active = desks.find(d => d.desk === activeDesk) ?? desks[0]

  return (
    <div className="flex flex-col gap-8">
      {/* ── Mobile (< md): pill bar + stacked content ── */}
      <div className="md:hidden">
        <div className="animate-rain mb-6" style={{ animationDelay: '0ms' }}>
          <RegionPillBar desks={desks} activeDesk={activeDesk} onSelect={setActiveDesk} />
        </div>

        <div className="animate-rain" style={{ animationDelay: '150ms' }}>
          {loading ? (
            <div className="solid-panel rounded-none border-x-0 border-y p-8">
              <ThesisSkeleton />
            </div>
          ) : active ? (
            <div key={active.desk} className="solid-panel rounded-none border-x-0 border-y overflow-hidden relative">
              <ThesisCard desk={active} />
              {!isAuthenticated && <PremiumPaywall />}
            </div>
          ) : (
            <div className="solid-panel p-16 text-center border-x-0 border-y">
              <p className="font-display text-xl text-text-tertiary">No desks available</p>
            </div>
          )}
        </div>

        <div className="animate-rain mt-8" style={{ animationDelay: '300ms' }}>
          <AllWeatherChart />
        </div>
      </div>

      {/* ── Tablet & Desktop (≥ md): two/three-column layout ── */}
      <div className="hidden md:flex flex-row items-start gap-6 lg:gap-8">
        <div className="w-[220px] lg:w-[260px] shrink-0 animate-rain solid-panel rounded-none border overflow-hidden" style={{ animationDelay: '0ms' }}>
          <RegionSidebar desks={desks} activeDesk={activeDesk} onSelect={setActiveDesk} />
        </div>

        <div className="flex-1 min-w-0 animate-rain" style={{ animationDelay: '150ms' }}>
          {loading ? (
            <div className="solid-panel rounded-none border p-10">
              <ThesisSkeleton />
            </div>
          ) : active ? (
            <div key={active.desk} className="solid-panel rounded-none border overflow-hidden relative">
              <ThesisCard desk={active} />
              {!isAuthenticated && <PremiumPaywall />}
            </div>
          ) : (
            <div className="solid-panel p-16 text-center border">
              <p className="font-display text-xl text-text-tertiary">No desks available</p>
            </div>
          )}
        </div>

        {/* Hide chart on tablet to give thesis card room, show on desktop */}
        <div className="hidden lg:block w-[300px] xl:w-[320px] shrink-0 animate-rain solid-panel rounded-none border overflow-hidden" style={{ animationDelay: '300ms' }}>
          <AllWeatherChart />
        </div>
      </div>
      
      {/* Chart below on tablet (md to lg) */}
      <div className="hidden md:block lg:hidden w-full animate-rain solid-panel rounded-none border overflow-hidden mt-2" style={{ animationDelay: '300ms' }}>
        <AllWeatherChart />
      </div>

    </div>
  )
}
