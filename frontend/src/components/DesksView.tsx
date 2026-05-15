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
    <div className="flex flex-col lg:flex-row gap-8">
      <RegionSidebar
        desks={desks}
        activeDesk={activeDesk}
        onSelect={setActiveDesk}
      />

      <div className="flex-1 min-w-0">
        {loading ? (
          <div className="bg-bg-secondary border border-border p-8">
            <ThesisSkeleton />
          </div>
        ) : active ? (
          <div key={active.desk} className="fade-up">
            <ThesisCard desk={active} />
          </div>
        ) : (
          <div className="border border-border bg-bg-secondary p-16 text-center">
            <p className="font-display text-xl text-text-tertiary">No desks available</p>
          </div>
        )}
      </div>

      <div className="w-full lg:w-[280px] shrink-0">
        <AllWeatherChart />
      </div>
    </div>
  )
}
