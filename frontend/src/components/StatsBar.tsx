'use client'

import React, { useEffect, useRef, useState } from 'react'

interface StatItem {
  label: string
  target: number
  suffix?: string
  prefix?: string
  isDecimal?: boolean
  decimals?: number
}

interface StatsBarProps {
  stats: StatItem[]
}

/**
 * Counts from 0 → target over ~2s using requestAnimationFrame.
 * Starts only when the element scrolls into view (IntersectionObserver).
 */
function CountUpNumber({ target, suffix, prefix, isDecimal = false, decimals = 2 }: {
  target: number
  suffix?: string
  prefix?: string
  isDecimal?: boolean
  decimals?: number
}) {
  const [display, setDisplay] = useState<string>('0')
  const ref = useRef<HTMLSpanElement>(null)
  const hasStarted = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasStarted.current) {
          hasStarted.current = true
          const duration = 2000

          if (target === 0) {
            setDisplay(isDecimal ? (0).toFixed(decimals) : '0')
            observer.disconnect()
            return
          }

          const start = performance.now()

          function animate(now: number) {
            const elapsed = now - start
            const progress = Math.min(elapsed / duration, 1)
            // Ease-out cubic for a smooth deceleration
            const eased = 1 - Math.pow(1 - progress, 3)
            
            const currentVal = eased * target
            
            if (isDecimal) {
              setDisplay(currentVal.toFixed(decimals))
            } else {
              setDisplay(Math.round(currentVal).toLocaleString())
            }

            if (progress < 1) requestAnimationFrame(animate)
          }

          requestAnimationFrame(animate)
          observer.disconnect()
        }
      },
      { threshold: 0.1 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [target, isDecimal, decimals])

  return (
    <span ref={ref} className="tabular-nums">
      {prefix}{display}{suffix}
    </span>
  )
}

export function StatsBar({ stats }: StatsBarProps) {
  return (
    <div className="w-full border-y border-white/[0.05] bg-bg-secondary py-12 sm:py-16">
      <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-8 lg:px-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-y-10 gap-x-4">
          {stats.map((stat, i) => (
            <div key={i} className="flex flex-col items-center text-center">
              <span
                className="text-2xl sm:text-3xl font-bold leading-none mb-3"
                style={{ fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace", color: '#C9A84C' }}
              >
                <CountUpNumber
                  target={stat.target}
                  prefix={stat.prefix}
                  suffix={stat.suffix}
                  isDecimal={stat.target > 0 && stat.target < 1}
                  decimals={2}
                />
              </span>
              <span
                className="text-[10px] sm:text-[11px] uppercase tracking-[0.2em] text-text-secondary opacity-80"
              >
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/** Default stats — fallback when live API data isn't available yet */
export const DEFAULT_STATS: StatItem[] = [
  { label: 'theses published', target: 5 },
  { label: 'Arc L1 transactions', target: 5 },
  { label: 'IPFS pins', target: 5 },
  { label: 'quiz attempts', target: 0 },
  { label: 'avg cost per trace', target: 0.01, prefix: '~$' },
]
