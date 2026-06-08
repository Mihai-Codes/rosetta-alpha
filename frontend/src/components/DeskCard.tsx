'use client'

import React from 'react'
import { TrendingUp, TrendingDown, Minus, ExternalLink, ChevronRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { ReasoningExplorer } from './ReasoningExplorer'
import { RegimeIndicator } from './RegimeIndicator'

export type { ReasoningBlock, DeskProps } from '@/lib/types'
import type { DeskProps, ReasoningBlock } from '@/lib/types'

const REGION_LABEL: Record<string, string> = {
  us: 'United States',
  cn: 'China',
  eu: 'Europe',
  jp: 'Japan',
  crypto: 'Digital Assets',
}

export function DeskCard({ desk, role }: { desk: DeskProps; role?: string }) {
  const [showExplorer, setShowExplorer] = React.useState(false)
  const isLong = desk.direction === 'LONG'
  const isShort = desk.direction === 'SHORT'

  const directionColor = isLong
    ? 'text-positive'
    : isShort
    ? 'text-brand-red'
    : 'text-text-secondary'

  const directionBg = isLong
    ? 'bg-[rgba(34, 197, 94,0.06)] border-[rgba(34, 197, 94,0.18)]'
    : isShort
    ? 'bg-[rgba(216, 43, 43,0.06)] border-[rgba(216, 43, 43,0.18)]'
    : 'bg-[rgba(136, 136, 136,0.06)] border-[rgba(136, 136, 136,0.18)]'

  const barColor = isLong ? 'bg-positive' : isShort ? 'bg-brand-red' : 'bg-muted-foreground/40'

  return (
    <>
      <AnimatePresence>
        {showExplorer && (
          <ReasoningExplorer desk={desk} onClose={() => setShowExplorer(false)} />
        )}
      </AnimatePresence>

      <motion.article
        whileHover={{ y: -3, transition: { duration: 0.18 } }}
        onClick={() => setShowExplorer(true)}
        className="group relative glass-panel border border-border/20 hover:border-brand-red/30 shadow-none hover:shadow-[0_0_20px_rgba(216,43,43,0.25)] transition-all duration-500 cursor-pointer flex flex-col overflow-hidden rounded-none"
        role={role || "article"}
        aria-label={`${desk.ticker} analysis by ${desk.desk} desk`}
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && setShowExplorer(true)}
      >
        {/* Gold left accent on hover */}
        <div className="absolute left-0 top-0 w-px h-full bg-brand-red/0 group-hover:bg-brand-red/50 transition-colors duration-300" />

        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-border/50 flex items-start justify-between gap-4">
          <div>
            <p className="text-[9px] font-medium uppercase tracking-[0.25em] text-muted-foreground/60 mb-1">
              {REGION_LABEL[desk.desk.toLowerCase()] ?? desk.desk} Desk
            </p>
            <h3 className="font-display text-2xl sm:text-3xl font-light tracking-tight text-foreground group-hover:text-brand-red transition-colors duration-200">
              {desk.ticker}
            </h3>
          </div>

          <div className="flex items-center gap-2 shrink-0 mt-1 flex-wrap justify-end">
            {desk.debate_summary && (
              <span
                className="px-2 py-1 border border-warning/30 bg-warning/10 text-warning text-[9px] font-bold uppercase tracking-widest cursor-help"
                title={desk.debate_summary}
              >
                DEBATED
              </span>
            )}
            <RegimeIndicator regime={desk.regime_context} compact />
            <div className={`flex items-center gap-1.5 px-3 py-1.5 border text-[10px] font-medium uppercase tracking-widest ${directionColor} ${directionBg}`}>
              {isLong && <TrendingUp className="w-3 h-3" />}
              {isShort && <TrendingDown className="w-3 h-3" />}
              {!isLong && !isShort && <Minus className="w-3 h-3" />}
              {desk.direction}
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-4 sm:px-6 py-4 sm:py-5 flex-1 space-y-5">
          {/* Confidence bar */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-[9px] font-medium uppercase tracking-[0.2em] text-muted-foreground/60">
                Conviction
              </span>
              <span className={`text-xs font-mono font-medium ${directionColor}`}>
                {(desk.confidence * 100).toFixed(0)}%
              </span>
            </div>
            <div className="h-px bg-border overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${desk.confidence * 100}%` }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
                className={`h-full ${barColor}`}
              />
            </div>
          </div>

          {/* Thesis */}
          {desk.summary && (
            <p className="text-sm text-muted-foreground font-light leading-relaxed border-l border-brand-red/20 pl-4">
              {desk.summary}
            </p>
          )}

          {/* Market question */}
          <div>
            <p className="text-[9px] font-medium uppercase tracking-[0.2em] text-muted-foreground/50 mb-2">
              Prediction Market
            </p>
            <p className="text-sm font-light text-foreground/80 leading-snug">
              {desk.question}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border/50 bg-bg-secondary flex items-center justify-between">
          {desk.ipfs_thesis_cid && desk.ipfs_thesis_cid.length > 20 ? (
            <a
              href={desk.storacha_url || `https://w3s.link/ipfs/${desk.ipfs_thesis_cid}`}
              target="_blank" rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-widest text-text-tertiary hover:text-brand-red transition-colors"
              title="Verify reasoning trace on Filecoin/IPFS (Storacha)"
            >
              <ExternalLink className="w-3 h-3" />
              IPFS: {desk.ipfs_thesis_cid.slice(0,6)}...
            </a>
          ) : <div></div>}
          
          {desk.arc_tx && desk.arc_tx.length > 20 && !desk.arc_tx.startsWith("0xmock") ? (
            <a
              href={`https://testnet.arcscan.app/tx/${desk.arc_tx}`}
              target="_blank" rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-widest text-text-tertiary hover:text-brand-red transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              Arc L1: {desk.arc_tx.slice(0,6)}...
            </a>
          ) : <div></div>}
        </div>
        <div className="hidden">
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/20 group-hover:text-brand-red/50 transition-colors translate-x-1 group-hover:translate-x-0 duration-200" />
        </div>
      </motion.article>
    </>
  )
}
