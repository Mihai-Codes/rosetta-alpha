import React from 'react'
import { DeskProps } from './DeskCard'
import { RegionSidebar } from './RegionSidebar'
import { ThesisCard } from './ThesisCard'
import { AllWeatherChart } from './AllWeatherChart'
import { ThesisSkeleton } from './SkeletonLoader'

interface DesksViewProps {
  desks: DeskProps[]
  loading: boolean
}

export function DesksView({ desks, loading }: DesksViewProps) {
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
          <div key={active.desk} className="solid-panel rounded-2xl overflow-hidden">
            <ThesisCard desk={active} />
          </div>
        ) : (
          <div className="solid-panel p-16 text-center rounded-2xl">
            <p className="font-display text-xl text-text-tertiary">No desks available</p>
          </div>
        )}
      </div>

      <div className="w-full lg:w-[400px] shrink-0 animate-rain solid-panel rounded-2xl overflow-hidden" style={{ animationDelay: '300ms' }}>
        <AllWeatherChart />
      </div>
    </div>
  )
}
