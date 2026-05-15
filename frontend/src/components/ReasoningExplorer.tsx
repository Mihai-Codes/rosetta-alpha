import React from 'react'
import { X, Brain, CheckCircle2, MessageSquare, Shield } from 'lucide-react'
import { DeskProps, ReasoningBlock } from './DeskCard'
import { clsx } from 'clsx'

interface ExplorerProps {
  desk: DeskProps
  onClose: () => void
}

export function ReasoningExplorer({ desk, onClose }: ExplorerProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-bg-primary/90 backdrop-blur-xl">
      <div className="relative glass-panel border border-brand-red/30 w-full max-w-4xl max-h-[90vh] rounded-lg shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300">
        
        {/* Top edge light highlight */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent" />

        <div className="p-6 border-b border-border/60 flex items-center justify-between bg-bg-secondary/40">
          <div className="flex items-center gap-4">
            <div className="p-2 border border-brand-red/20 bg-brand-red/5 rounded flex items-center justify-center shadow-glow-red">
              <span className="font-display text-brand-red leading-none px-1 text-lg">R∆</span>
            </div>
            <div>
              <h2 className="text-xl font-display text-text-primary tracking-tight">Reasoning Trace: {desk.ticker}</h2>
              <p className="text-[10px] font-medium text-brand-red mt-1 uppercase tracking-[0.25em]">
                {desk.desk} Desk • {desk.direction} ({(desk.confidence * 100).toFixed(0)}%)
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-text-tertiary hover:text-brand-red transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-brand-red uppercase tracking-widest flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Multi-Analyst Consensus
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {desk.reasoning_blocks.map((block, i) => (
                <AnalystSummary key={i} block={block} />
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-sm font-bold text-brand-red uppercase tracking-widest flex items-center gap-2 border-t pt-6">
              <MessageSquare className="w-4 h-4" />
              Full Reasoning Chain
            </h3>
            {desk.reasoning_blocks.map((block, i) => (
              <ReasoningStep key={i} block={block} />
            ))}
          </div>
        </div>
        
        <div className="p-4 bg-bg-secondary/60 border-t border-border/60 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-6 py-2 border border-brand-red/50 text-brand-red text-[10px] font-medium uppercase tracking-[0.2em] rounded-sm hover:bg-brand-red hover:text-bg-brand-red hover:shadow-glow-red transition-all duration-200"
          >
            Acknowledge
          </button>
        </div>
      </div>
    </div>
  )
}

function AnalystSummary({ block }: { block: ReasoningBlock }) {
  return (
    <div className="bg-bg-tertiary/20 border border-border/50 rounded-md p-4 space-y-2 hover:border-brand-red/30 transition-colors">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-text-tertiary">{block.agent_role.replace('_', ' ')}</span>
        <span className="text-xs font-mono text-brand-red">{(block.confidence * 100).toFixed(0)}%</span>
      </div>
      <p className="text-xs font-light text-text-secondary leading-relaxed italic line-clamp-2 pl-2 border-l border-brand-red/30">"{block.conclusion}"</p>
    </div>
  )
}

function ReasoningStep({ block }: { block: ReasoningBlock }) {
  const isZh = block.language === 'zh'
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-brand-red red-pulse" />
        <span className="text-[10px] font-medium uppercase tracking-[0.25em] text-brand-red">
          Step: {block.agent_role.replace('_', ' ')}
        </span>
      </div>
      <div className="glass-panel border border-border/40 rounded-md p-6 space-y-5">
        <div className="space-y-1.5">
          <p className="text-[9px] font-medium text-text-tertiary uppercase tracking-[0.25em]">Data Input</p>
          <p className="text-sm font-light text-text-primary leading-relaxed">{block.input_data_summary}</p>
        </div>

        {block.thought_process && (
          <div className="space-y-2">
            <p className="text-[9px] font-medium text-brand-red uppercase tracking-[0.25em] flex items-center gap-1.5">
              Thinking Trace (R1)
            </p>
            <div className="bg-bg-primary/50 border border-brand-red/20 rounded p-4 text-[11px] text-text-secondary leading-relaxed font-mono italic shadow-inner">
              {block.thought_process}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <p className="text-[9px] font-medium text-text-tertiary uppercase tracking-[0.25em]">Analysis</p>
          <div className="space-y-3">
             <p className={clsx("text-sm font-light text-text-primary leading-relaxed", isZh && "font-display text-base")}>
               {block.analysis}
             </p>
             {block.analysis_en && (
               <div className="pl-4 border-l border-border">
                 <p className="text-[9px] font-medium text-text-tertiary uppercase tracking-[0.2em] mb-1">English Translation</p>
                 <p className="text-sm font-light text-text-secondary">{block.analysis_en}</p>
               </div>
             )}
          </div>
        </div>
        <div className="pt-4 border-t border-border/40">
           <p className="text-sm font-medium text-brand-red flex items-baseline gap-2">
             <span className="text-[9px] uppercase tracking-[0.2em] text-text-tertiary font-medium">Conclusion</span>
             {block.conclusion}
           </p>
        </div>
      </div>
    </div>
  )
}
