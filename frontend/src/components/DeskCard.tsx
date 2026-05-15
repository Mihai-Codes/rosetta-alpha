import React from 'react'
import { TrendingUp, TrendingDown, Minus, ExternalLink, ChevronRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { ReasoningExplorer } from './ReasoningExplorer'

export interface ReasoningBlock {
  agent_role: string
  input_data_summary: string
  thought_process?: string
  analysis: string
  analysis_en?: string
  conclusion: string
  confidence: number
  language: string
}

export interface DeskProps {
  desk: string
  ticker: string
  direction: 'LONG' | 'SHORT' | 'NEUTRAL'
  confidence: number
  summary: string
  question: string
  price?: string
  ipfs_thesis_cid: string
  arc_tx: string
  reasoning_blocks: ReasoningBlock[]
}

const REGION_LABEL: Record<string, string> = {
  us: 'United States',
  cn: 'China',
  eu: 'Europe',
  jp: 'Japan',
  crypto: 'Digital Assets',
}

export function DeskCard({ desk }: { desk: DeskProps }) {
  const [showExplorer, setShowExplorer] = React.useState(false)
  const isLong = desk.direction === 'LONG'
  const isShort = desk.direction === 'SHORT'

  const directionColor = isLong
    ? 'text-[#52B788]'
    : isShort
    ? 'text-[#C0392B]'
    : 'text-[#7B8FA6]'

  const directionBg = isLong
    ? 'bg-[rgba(82,183,136,0.06)] border-[rgba(82,183,136,0.18)]'
    : isShort
    ? 'bg-[rgba(192,57,43,0.06)] border-[rgba(192,57,43,0.18)]'
    : 'bg-[rgba(123,143,166,0.06)] border-[rgba(123,143,166,0.18)]'

  const barColor = isLong ? 'bg-[#52B788]' : isShort ? 'bg-[#C0392B]' : 'bg-muted-foreground/40'

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
        className="group relative glass-panel border border-border/20 hover:border-brand-red/30 shadow-none hover:shadow-glow-red transition-all duration-500 cursor-pointer flex flex-col overflow-hidden rounded-xl"
      >
        {/* Gold left accent on hover */}
        <div className="absolute left-0 top-0 w-px h-full bg-brand-red/0 group-hover:bg-brand-red/50 transition-colors duration-300" />

        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-border/50 flex items-start justify-between gap-4">
          <div>
            <p className="text-[9px] font-medium uppercase tracking-[0.25em] text-muted-foreground/60 mb-1">
              {REGION_LABEL[desk.desk.toLowerCase()] ?? desk.desk} Desk
            </p>
            <h3 className="font-display text-3xl font-light tracking-tight text-foreground group-hover:text-brand-red transition-colors duration-200">
              {desk.ticker}
            </h3>
          </div>

          <div className={`flex items-center gap-1.5 px-3 py-1.5 border text-[10px] font-medium uppercase tracking-widest shrink-0 mt-1 ${directionColor} ${directionBg}`}>
            {isLong && <TrendingUp className="w-3 h-3" />}
            {isShort && <TrendingDown className="w-3 h-3" />}
            {!isLong && !isShort && <Minus className="w-3 h-3" />}
            {desk.direction}
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 flex-1 space-y-5">
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
        <div className="px-6 py-3 border-t border-border/50 bg-card/50 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {desk.ipfs_thesis_cid && desk.ipfs_thesis_cid.length > 20 && (
              <a
                href={`https://gateway.pinata.cloud/ipfs/${desk.ipfs_thesis_cid}`}
                target="_blank"
                rel="noreferrer"
                onClick={e => e.stopPropagation()}
                className="flex items-center gap-1 text-[9px] font-medium uppercase tracking-widest text-muted-foreground/40 hover:text-brand-red transition-colors"
              >
                <ExternalLink className="w-2.5 h-2.5" />
                IPFS
              </a>
            )}
            {desk.arc_tx && desk.arc_tx.length > 20 && !desk.arc_tx.startsWith('0xmock') && (
              <a
                href={`https://testnet.arcscan.app/tx/${desk.arc_tx}`}
                target="_blank"
                rel="noreferrer"
                onClick={e => e.stopPropagation()}
                className="flex items-center gap-1 text-[9px] font-medium uppercase tracking-widest text-muted-foreground/40 hover:text-brand-red transition-colors"
              >
                <ExternalLink className="w-2.5 h-2.5" />
                Arc
              </a>
            )}
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/20 group-hover:text-brand-red/50 transition-colors translate-x-1 group-hover:translate-x-0 duration-200" />
        </div>
      </motion.article>
    </>
  )
}
