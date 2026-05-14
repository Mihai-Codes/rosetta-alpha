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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
      <div className="bg-card border w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Brain className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold leading-none">Reasoning Trace: {desk.ticker}</h2>
              <p className="text-[10px] font-black text-muted-foreground mt-1 uppercase tracking-[0.2em]">
                {desk.desk} Desk • {desk.direction} ({(desk.confidence * 100).toFixed(0)}%)
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-primary uppercase tracking-widest flex items-center gap-2">
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
            <h3 className="text-sm font-bold text-primary uppercase tracking-widest flex items-center gap-2 border-t pt-6">
              <MessageSquare className="w-4 h-4" />
              Full Reasoning Chain
            </h3>
            {desk.reasoning_blocks.map((block, i) => (
              <ReasoningStep key={i} block={block} />
            ))}
          </div>
        </div>
        
        <div className="p-4 bg-muted/10 border-t flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-bold hover:opacity-90 transition-opacity"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

function AnalystSummary({ block }: { block: ReasoningBlock }) {
  return (
    <div className="bg-muted/30 border rounded-xl p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black uppercase text-muted-foreground">{block.agent_role.replace('_', ' ')}</span>
        <span className="text-xs font-bold text-primary">{(block.confidence * 100).toFixed(0)}%</span>
      </div>
      <p className="text-xs font-medium leading-relaxed italic line-clamp-2">"{block.conclusion}"</p>
    </div>
  )
}

function ReasoningStep({ block }: { block: ReasoningBlock }) {
  const isZh = block.language === 'zh'
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="w-4 h-4 text-green-500" />
        <span className="text-xs font-black uppercase tracking-widest text-primary">
          Step: {block.agent_role.replace('_', ' ')}
        </span>
      </div>
      <div className="bg-muted/10 border rounded-xl p-5 space-y-4">
        <div className="space-y-1">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Data Input</p>
          <p className="text-sm font-medium">{block.input_data_summary}</p>
        </div>

        {block.thought_process && (
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-amber-500/80 uppercase tracking-widest flex items-center gap-1.5">
              <Brain className="w-3 h-3" />
              Thinking Trace (R1)
            </p>
            <div className="bg-amber-500/5 border border-amber-500/10 rounded-lg p-4 text-xs text-muted-foreground leading-relaxed font-mono">
              {block.thought_process}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Analysis</p>
          <div className="space-y-3">
             <p className={clsx("text-sm leading-relaxed font-medium", isZh && "font-serif text-base")}>
               {block.analysis}
             </p>
             {block.analysis_en && (
               <div className="pl-4 border-l-2 border-primary/20">
                 <p className="text-[10px] font-bold text-primary/40 uppercase mb-1">English Translation</p>
                 <p className="text-sm text-muted-foreground italic">{block.analysis_en}</p>
               </div>
             )}
          </div>
        </div>
        <div className="pt-3 border-t border-border/50">
           <p className="text-xs font-bold flex gap-2">
             <span className="text-muted-foreground">CONCLUSION:</span>
             <span>{block.conclusion}</span>
           </p>
        </div>
      </div>
    </div>
  )
}
