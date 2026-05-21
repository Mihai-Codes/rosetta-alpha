'use client'

import React, { useEffect, useRef, useState } from 'react'

interface StatItem {
  label: string
  target: number
  suffix?: string
  prefix?: string
  /** For small targets (<1), multiply during animation and format with decimals */
  isDecimal?: boolean
}

interface StatsBarProps {
  stats: StatItem[]
}

/**
 * Counts from 0 → target over ~2s using requestAnimationFrame.
 * Starts only when the element scrolls into view (IntersectionObserver).
 *
 * Handles two modes:
 * - Normal (isDecimal=false): animates integers via Math.floor
 * - Decimal (isDecimal=true): animates scaled value, divides back for display
 *
 * Edge cases handled:
 * - SSR safe: IntersectionObserver only called client-side
 * - Multiple mounts: hasStarted ref prevents double-animation
 * - Zero target: immediately renders 0
 * - Small decimal targets (e.g. 0.01): scales by 100 for smooth animation
 * - Cleanup: observer.disconnect on unmount or re-anchor
 */
function CountUpNumber({ target, suffix, prefix, isDecimal = false }: {
  target: number
  suffix?: string
  prefix?: string
  isDecimal?: boolean
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
            setDisplay(isDecimal ? '0.00' : '0')
            observer.disconnect()
            return
          }

          if (isDecimal) {
            // Scale to cents for integer animation (0.01 → 1¢)
            const scale = target < 0.01 ? 10000 : 100
            const scaledTarget = Math.round(target * scale)
            const start = performance.now()

            function animate(now: number) {
              const elapsed = now - start
              const progress = Math.min(elapsed / duration, 1)
              const eased = 1 - Math.pow(1 - progress, 3)
              const current = Math.floor(eased * scaledTarget)
              const displayVal = (current / scale).toFixed(scale === 10000 ? 4 : 2)
              setDisplay(displayVal)
              if (progress < 1) requestAnimationFrame(animate)
            }

            requestAnimationFrame(animate)
          } else {
            const start = performance.now()

            function animate(now: number) {
              const elapsed = now - start
              const progress = Math.min(elapsed / duration, 1)
              const eased = 1 - Math.pow(1 - progress, 3)
              setDisplay(Math.floor(eased * target).toLocaleString())
              if (progress < 1) requestAnimationFrame(animate)
            }

            requestAnimationFrame(animate)
          }

          observer.disconnect()
        }
      },
      { threshold: 0.3 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [target, isDecimal])

  return (
    <span ref={ref} className="tabular-nums">
      {prefix}{display}{suffix}
    </span>
  )
}

export function StatsBar({ stats }: StatsBarProps) {
  return (
    <div className="w-full border-y border-[#2A2A38] bg-[#111118]">
      <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-8 lg:px-12 py-6 sm:py-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-y-6 gap-x-4 md:gap-x-6 lg:gap-x-8 xl:gap-x-12">
          {stats.map((stat, i) => (
            <div key={i} className="flex flex-col items-center text-center min-w-0">
              <span
                className="text-[clamp(1.125rem,3vw,1.75rem)] font-bold leading-tight"
                style={{ fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace", color: '#C9A84C' }}
              >
                <CountUpNumber
                  target={stat.target}
                  prefix={stat.prefix}
                  suffix={stat.suffix}
                  isDecimal={stat.target < 1 && stat.target > 0}
                />
              </span>
              <span
                className="text-[clamp(0.625rem,1.5vw,0.8125rem)] mt-1 leading-snug"
                style={{ fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif", color: '#A09C94' }}
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
