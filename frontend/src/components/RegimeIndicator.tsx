'use client'

import React from 'react'
import { motion } from 'framer-motion'

/**
 * Market regime types matching the backend's MarketRegime enum.
 */
export type MarketRegimeType = 'TRENDING' | 'MEAN_REVERTING' | 'CRISIS' | 'UNCERTAIN'

export interface RegimeContext {
  current_regime: MarketRegimeType
  regime_confidence: number
  regime_duration_days: number
  transition_probabilities: Record<string, number>
  method: string
}

interface RegimeIndicatorProps {
  regime: RegimeContext | null | undefined
  /** Compact mode for inline use in cards */
  compact?: boolean
}

// Bridgewater palette: green=trending, amber=mean_reverting, crimson=crisis
const REGIME_CONFIG: Record<MarketRegimeType, {
  label: string
  color: string
  dotColor: string
  bgColor: string
  borderColor: string
  description: string
}> = {
  TRENDING: {
    label: 'Trending',
    color: 'text-[#2D6A4F]',
    dotColor: '#2D6A4F',
    bgColor: 'bg-[rgba(45,106,79,0.08)]',
    borderColor: 'border-[rgba(45,106,79,0.25)]',
    description: 'Sustained directional momentum',
  },
  MEAN_REVERTING: {
    label: 'Mean Reverting',
    color: 'text-[#B8860B]',
    dotColor: '#B8860B',
    bgColor: 'bg-[rgba(184,134,11,0.08)]',
    borderColor: 'border-[rgba(184,134,11,0.25)]',
    description: 'Range-bound oscillation',
  },
  CRISIS: {
    label: 'Crisis',
    color: 'text-[#DC143C]',
    dotColor: '#DC143C',
    bgColor: 'bg-[rgba(220,20,60,0.08)]',
    borderColor: 'border-[rgba(220,20,60,0.25)]',
    description: 'High volatility regime',
  },
  UNCERTAIN: {
    label: 'Uncertain',
    color: 'text-[#7B8FA6]',
    dotColor: '#7B8FA6',
    bgColor: 'bg-[rgba(123,143,166,0.06)]',
    borderColor: 'border-[rgba(123,143,166,0.20)]',
    description: 'Low confidence detection',
  },
}

/**
 * RegimeIndicator — Color-coded badge showing current market regime.
 *
 * Displays regime type, confidence, and duration with Bridgewater-inspired
 * color palette (green=trending, amber=mean_reverting, crimson=crisis).
 *
 * Usage:
 *   <RegimeIndicator regime={desk.regime_context} />
 *   <RegimeIndicator regime={desk.regime_context} compact />
 */
export function RegimeIndicator({ regime, compact = false }: RegimeIndicatorProps) {
  if (!regime) return null

  const config = REGIME_CONFIG[regime.current_regime] ?? REGIME_CONFIG.UNCERTAIN
  const confidencePct = Math.round(regime.regime_confidence * 100)

  if (compact) {
    return (
      <motion.span
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[9px] font-medium uppercase tracking-widest border ${config.color} ${config.bgColor} ${config.borderColor}`}
        title={`${config.description} — ${confidencePct}% confidence, ${regime.regime_duration_days}d duration (${regime.method})`}
      >
        <span
          className="w-1.5 h-1.5 rounded-full animate-pulse"
          style={{ backgroundColor: config.dotColor }}
        />
        {config.label}
      </motion.span>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex items-center gap-3 px-3 py-2 border ${config.bgColor} ${config.borderColor}`}
    >
      {/* Regime dot */}
      <span
        className="w-2 h-2 rounded-full shrink-0"
        style={{
          backgroundColor: config.dotColor,
          boxShadow: regime.current_regime === 'CRISIS'
            ? '0 0 6px rgba(220,20,60,0.4)'
            : 'none',
        }}
      />

      {/* Label + confidence */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className={`text-[10px] font-medium uppercase tracking-[0.15em] ${config.color}`}>
            {config.label}
          </span>
          <span className="text-[9px] font-mono text-muted-foreground/60">
            {confidencePct}%
          </span>
        </div>

        {/* Confidence bar */}
        <div className="h-px bg-border/50 mt-1.5 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${confidencePct}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="h-full"
            style={{ backgroundColor: config.dotColor }}
          />
        </div>
      </div>

      {/* Duration */}
      <span className="text-[9px] font-mono text-muted-foreground/40 shrink-0" title="Days in current regime">
        {regime.regime_duration_days}d
      </span>
    </motion.div>
  )
}
