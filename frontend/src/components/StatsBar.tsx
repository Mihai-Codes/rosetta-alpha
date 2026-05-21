'use client'

import { motion } from "framer-motion"
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
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 1, delay: 0.7 }}
      className="w-full border-y border-white/[0.05] bg-[#0A0A0A] py-4 sm:py-5 overflow-hidden"
    >
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 flex flex-wrap items-center justify-center gap-x-6 sm:gap-x-12 gap-y-4">
        {stats.map((stat, i) => (
          <div key={i} className="flex items-center gap-2 sm:gap-3">
            <span
              className="text-lg sm:text-xl font-bold leading-none"
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
              className="text-[9px] sm:text-[10px] uppercase tracking-[0.1em] text-text-secondary opacity-70"
            >
              {stat.label}
            </span>
            {/* Dot separator for desktop */}
            {i < stats.length - 1 && (
              <div className="hidden lg:block w-1 h-1 rounded-full bg-white/[0.15] ml-6 sm:ml-12" />
            )}
          </div>
        ))}
      </div>
    </motion.div>
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
