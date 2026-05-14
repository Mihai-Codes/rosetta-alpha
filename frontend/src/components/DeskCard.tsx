import React from 'react'
import { TrendingUp, TrendingDown, Minus, ExternalLink, HelpCircle, ShieldCheck, ChevronRight } from 'lucide-react'
import { clsx } from 'clsx'
import { motion, AnimatePresence } from 'framer-motion'

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

import { ReasoningExplorer } from './ReasoningExplorer'

export function DeskCard({ desk }: { desk: DeskProps }) {
  const [showExplorer, setShowExplorer] = React.useState(false)
  const isLong = desk.direction === 'LONG'
  const isShort = desk.direction === 'SHORT'
  
  return (
    <>
    <AnimatePresence>
      {showExplorer && (
        <ReasoningExplorer 
          desk={desk} 
          onClose={() => setShowExplorer(false)} 
        />
      )}
    </AnimatePresence>

    <motion.div 
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.98 }}
      onClick={() => setShowExplorer(true)}
      className="bg-card border border-primary/10 rounded-2xl overflow-hidden flex flex-col shadow-[0_4px_20px_-10px_rgba(0,0,0,0.5)] hover:shadow-[0_8px_30px_-10px_rgba(59,130,246,0.2)] transition-all duration-300 cursor-pointer group relative"
    >
      <div className="absolute top-0 left-0 w-1 h-full transition-colors duration-300 group-hover:bg-primary/40 bg-transparent" />
      
      <div className="p-6 border-b border-primary/5 bg-muted/5 group-hover:bg-muted/20 transition-colors flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-3xl filter saturate-[0.8] group-hover:saturate-100 transition-all">
            {getRegionEmoji(desk.desk)}
          </div>
          <div>
            <h3 className="text-xl font-black tracking-tight group-hover:text-primary transition-colors leading-none">
              {desk.ticker}
            </h3>
            <p className="text-[9px] font-black text-muted-foreground/60 uppercase mt-1.5 tracking-[0.2em]">
              {desk.desk} Terminal
            </p>
          </div>
        </div>
        <div className={clsx(
          "px-3 py-1.5 rounded-lg text-[10px] font-black tracking-widest flex items-center gap-2 border transition-all duration-300",
          isLong && "bg-green-500/5 text-green-500 border-green-500/20 shadow-[0_0_10px_rgba(34,197,94,0.1)]",
          isShort && "bg-red-500/5 text-red-500 border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.1)]",
          !isLong && !isShort && "bg-slate-500/5 text-slate-500 border-slate-500/20"
        )}>
          {isLong && <TrendingUp className="w-3.5 h-3.5" />}
          {isShort && <TrendingDown className="w-3.5 h-3.5" />}
          {!isLong && !isShort && <Minus className="w-3.5 h-3.5" />}
          {desk.direction}
        </div>
      </div>
      
      <div className="p-6 flex-1 space-y-6 text-left">
        <div className="space-y-2">
          <div className="flex justify-between items-end mb-1">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Confidence Index</span>
            <span className="text-sm font-black text-primary font-mono tracking-tighter">
              {(desk.confidence * 100).toFixed(0)}%
            </span>
          </div>
          <div className="w-full bg-primary/5 h-1.5 rounded-full overflow-hidden p-[1px] border border-primary/10">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${desk.confidence * 100}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className={clsx(
                "h-full rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(0,0,0,0.2)]",
                isLong ? "bg-green-500" : isShort ? "bg-red-500" : "bg-primary"
              )}
            />
          </div>
        </div>

        <div className="relative">
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 font-medium italic pl-4 border-l-2 border-primary/10">
            "{desk.summary}"
          </p>
        </div>

        {desk.price && (
          <div className="flex items-center justify-between p-3 bg-primary/5 rounded-xl border border-primary/10 group/price transition-colors hover:bg-primary/10">
            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Oracle Price</span>
            <span className="text-xs font-mono font-black text-primary tracking-tighter group-hover/price:scale-105 transition-transform origin-right">
              {desk.price}
            </span>
          </div>
        )}

        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2 text-[9px] font-black text-primary/60 uppercase tracking-[0.3em]">
            <HelpCircle className="w-3 h-3" />
            Market Incentive question
          </div>
          <div className="bg-muted/20 p-4 rounded-xl border border-border/50 group-hover:border-primary/20 transition-colors">
            <p className="text-sm font-bold leading-snug group-hover:text-foreground transition-colors">
              {desk.question}
            </p>
          </div>
        </div>
      </div>

      <div className="px-6 py-4 bg-muted/5 border-t border-primary/5 flex items-center justify-between">
         <div className="flex gap-4">
            <a 
              href={`https://gateway.pinata.cloud/ipfs/${desk.ipfs_thesis_cid}`} 
              target="_blank" 
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50 hover:text-primary transition-colors flex items-center gap-1.5"
            >
              <ExternalLink className="w-3 h-3" />
              Trace
            </a>
            <a 
              href={`https://testnet.arcscan.app/tx/${desk.arc_tx}`} 
              target="_blank" 
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50 hover:text-primary transition-colors flex items-center gap-1.5"
            >
              <ShieldCheck className="w-3 h-3" />
              Arc
            </a>
         </div>
         <div className="text-primary/0 group-hover:text-primary/60 transition-all translate-x-2 group-hover:translate-x-0">
            <ChevronRight className="w-4 h-4" />
         </div>
      </div>
    </motion.div>
    </>
  )
}

function getRegionEmoji(region: string) {
  switch (region.toLowerCase()) {
    case 'us': return '🇺🇸'
    case 'cn': return '🇨🇳'
    case 'crypto': return '₿'
    case 'eu': return '🇪🇺'
    case 'jp': return '🇯🇵'
    default: return '🌐'
  }
}
