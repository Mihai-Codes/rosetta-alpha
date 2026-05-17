'use client'

import React from 'react'
import Link from 'next/link'
import { DeskProps } from './DeskCard'
import { RegionSidebar } from './RegionSidebar'
import { ThesisCard } from './ThesisCard'
import { AllWeatherChart } from './AllWeatherChart'
import { ThesisSkeleton } from './SkeletonLoader'

interface DesksViewProps {
  desks: DeskProps[]
  loading: boolean
  isAuthenticated?: boolean
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
    <div className="flex flex-col lg:flex-row items-start gap-8">
      <div className="animate-rain solid-panel rounded-2xl overflow-hidden" style={{ animationDelay: '0ms' }}>
        <RegionSidebar
          desks={desks}
          activeDesk={activeDesk}
          onSelect={setActiveDesk}
        />
      </div>

      <div className="flex-1 min-w-0 animate-rain" style={{ animationDelay: '150ms' }}>
        {loading ? (
          <div className="solid-panel rounded-2xl p-10">
            <ThesisSkeleton />
          </div>
        ) : active ? (
          <div key={active.desk} className="solid-panel rounded-2xl overflow-hidden relative">
            <ThesisCard desk={active} />
            {/* Blur gate for non-authenticated users — hides reasoning depth */}
            {!isAuthenticated && (
              <div className="absolute inset-0 top-[40%] flex flex-col items-center justify-center z-20">
                {/* Gradient blur overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-bg-primary/80 to-bg-primary backdrop-blur-md" />
                {/* CTA */}
                <div className="relative z-30 text-center px-6">
                  <p className="text-text-secondary text-sm mb-4 font-light">
                    Full reasoning trace available to signed-in users
                  </p>
                  <Link
                    href="/signin"
                    className="
                      inline-flex items-center gap-2 px-6 py-3
                      bg-brand-red/10 border border-brand-red/40 rounded-lg
                      text-text-primary text-sm font-medium
                      hover:bg-brand-red/20 hover:border-brand-red/60
                      transition-all duration-300
                      hover:shadow-[0_0_30px_rgba(216,43,43,0.3)]
                    "
                  >
                    Sign in to read full reasoning trace
                  </Link>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="solid-panel p-16 text-center rounded-2xl">
            <p className="font-display text-xl text-text-tertiary">No desks available</p>
          </div>
        )}
      </div>

      <div className="w-full lg:w-[320px] shrink-0 animate-rain solid-panel rounded-2xl overflow-hidden" style={{ animationDelay: '300ms' }}>
        <AllWeatherChart />
      </div>
    </div>
  )
}
