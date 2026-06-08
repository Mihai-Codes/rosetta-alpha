'use client'

import React from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { authModalState } from './SignInModal'
import { useSession } from 'next-auth/react'
import { Lock } from 'lucide-react'
import { DeskProps } from './DeskCard'
import { RegionSidebar } from './RegionSidebar'
import { ThesisCard } from './ThesisCard'
import { AllWeatherChart } from './AllWeatherChart'
import { NarrativeInsights } from './NarrativeInsights'
import { ThesisSkeleton, EmptyState } from './SkeletonLoader'
import { regionMeta } from '../lib/format'
import { DivergenceGauge } from './DivergenceGauge'
import { MobMeter } from './MobMeter'
import { ContagionAlert } from './ContagionAlert'
import { EllipseView } from './EllipseView'

interface DesksViewProps {
  desks: DeskProps[]
  loading: boolean
  error?: string | null
  onRetry?: () => void
  isAuthenticated?: boolean
  manifestCid?: string
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
            data-testid={`region-tab-${d.desk.toUpperCase()}`}
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

export function DesksView({ desks, loading, isAuthenticated = false }: DesksViewProps) {
  const [activeDesk, setActiveDesk] = React.useState<string>(desks[0]?.desk ?? '')
  const [chartView, setChartView] = React.useState<'matrix' | 'ellipse'>('matrix')

  React.useEffect(() => {
    if (!desks.find(d => d.desk === activeDesk) && desks.length > 0) {
      setActiveDesk(desks[0].desk)
    }
  }, [desks, activeDesk])

  const active = desks.find(d => d.desk === activeDesk) ?? desks[0]
  const { data: session } = useSession()
  const isAuthed = isAuthenticated || !!session?.user



  return (
    <div className="flex flex-col gap-8">
      <ContagionAlert />

      {/* ── Mobile (< md): pill bar + stacked content ── */}
      <div className="md:hidden" data-testid="region-tabs-mobile">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }} className="mb-6">
          <RegionPillBar desks={desks} activeDesk={activeDesk} onSelect={setActiveDesk} />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }} className="">
          {loading ? (
            <div className="solid-panel rounded-none border-x-0 border-y p-8">
              <ThesisSkeleton />
            </div>
          ) : active ? (
            <div key={active.desk} className="solid-panel rounded-none border-x-0 border-y overflow-hidden relative">
              <ThesisCard desk={active} />
            </div>
          ) : (
            <div className="solid-panel p-16 text-center border-x-0 border-y">
              <EmptyState
                title="No desks available"
                subtitle="Run your first analysis to see regional AI theses."
              />
            </div>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.8, delay: 0.5, ease: [0.16, 1, 0.3, 1] }} className="mt-8">
          <div className="flex justify-end mb-2 gap-2">
            <button onClick={() => setChartView('matrix')} className={`px-3 py-1 text-[10px] uppercase tracking-wider border ${chartView === 'matrix' ? 'border-brand-red text-brand-red bg-brand-red/10' : 'border-border text-text-tertiary hover:text-text-primary'}`}>Circle View</button>
            <button onClick={() => setChartView('ellipse')} className={`px-3 py-1 text-[10px] uppercase tracking-wider border ${chartView === 'ellipse' ? 'border-brand-red text-brand-red bg-brand-red/10' : 'border-border text-text-tertiary hover:text-text-primary'}`}>Ellipse View</button>
          </div>
          {chartView === 'matrix' ? <AllWeatherChart /> : <EllipseView />}
        </motion.div>
      </div>

      {/* ── Tablet & Desktop (≥ md): two/three-column layout ── */}
      <div className="hidden md:flex flex-row items-start gap-6 lg:gap-8">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }} className="w-[220px] lg:w-[260px] shrink-0  solid-panel rounded-none border overflow-hidden">
          <RegionSidebar desks={desks} activeDesk={activeDesk} onSelect={setActiveDesk} />
        </motion.div>

        <div className="flex-1 min-w-0 flex flex-col gap-6 lg:gap-8">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }} className="w-full">
            {loading ? (
              <div className="solid-panel rounded-none border p-10">
                <ThesisSkeleton />
              </div>
            ) : active ? (
              <div key={active.desk} className="solid-panel rounded-none border overflow-hidden relative">
                <ThesisCard desk={active} />
              </div>
            ) : (
              <div className="solid-panel p-16 text-center border">
                <EmptyState
                  title="No desks available"
                  subtitle="Run your first analysis to see regional AI theses."
                />
              </div>
            )}
          </motion.div>
        </div>

        {/* Hide chart on tablet to give thesis card room, show on desktop */}
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.8, delay: 0.5, ease: [0.16, 1, 0.3, 1] }} className="hidden lg:flex flex-col w-[340px] xl:w-[380px] shrink-0 solid-panel rounded-none border overflow-hidden">
          <div className="flex p-2 border-b border-border/20 gap-2 bg-bg-secondary">
            <button onClick={() => setChartView('matrix')} className={`flex-1 px-2 py-1.5 text-[9px] uppercase tracking-wider border ${chartView === 'matrix' ? 'border-brand-red text-brand-red bg-brand-red/10' : 'border-border text-text-tertiary hover:text-text-primary'}`}>Circle View</button>
            <button onClick={() => setChartView('ellipse')} className={`flex-1 px-2 py-1.5 text-[9px] uppercase tracking-wider border ${chartView === 'ellipse' ? 'border-brand-red text-brand-red bg-brand-red/10' : 'border-border text-text-tertiary hover:text-text-primary'}`}>Ellipse View</button>
          </div>
          <div className="flex-1 overflow-hidden flex flex-col">
            {chartView === 'matrix' ? <AllWeatherChart /> : <div className="h-full overflow-hidden [&_svg]:h-auto [&_svg]:w-full [&_svg]:min-w-0"><EllipseView /></div>}
          </div>
        </motion.div>
      </div>
      
      {/* Chart below on tablet (md to lg) */}
      <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.8, delay: 0.5, ease: [0.16, 1, 0.3, 1] }} className="hidden md:block lg:hidden w-full solid-panel rounded-none border overflow-hidden mt-2">
        <div className="flex p-2 border-b border-border/20 gap-2 bg-bg-secondary">
          <button onClick={() => setChartView('matrix')} className={`px-4 py-1.5 text-[10px] uppercase tracking-wider border ${chartView === 'matrix' ? 'border-brand-red text-brand-red bg-brand-red/10' : 'border-border text-text-tertiary hover:text-text-primary'}`}>Circle View</button>
          <button onClick={() => setChartView('ellipse')} className={`px-4 py-1.5 text-[10px] uppercase tracking-wider border ${chartView === 'ellipse' ? 'border-brand-red text-brand-red bg-brand-red/10' : 'border-border text-text-tertiary hover:text-text-primary'}`}>Ellipse View</button>
        </div>
        {chartView === 'matrix' ? <AllWeatherChart /> : <EllipseView />}
      </motion.div>

      {/* ── Advanced Telemetry (Hidden for unsigned) ── */}
      {active && isAuthed && (
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.8, delay: 0.6, ease: [0.16, 1, 0.3, 1] }} className="w-full relative mt-4">
          <div className="flex flex-col gap-6 lg:gap-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 items-start">
              <MobMeter ticker={active.ticker} />
              <DivergenceGauge ticker={active.ticker} desks={desks} />
            </div>
            <NarrativeInsights ticker={active?.desk ?? 'Portfolio'} />
          </div>
        </motion.div>
      )}
    </div>
  )
}
