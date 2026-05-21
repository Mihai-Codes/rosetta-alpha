'use client'

import React from 'react'
import { TrendingUp, TrendingDown, Minus, ExternalLink, Copy, Check, ChevronDown } from 'lucide-react'
import { DeskProps } from './DeskCard'
import { regionMeta, copyToClipboard, truncateHash } from '../lib/format'
import { ShareButton } from './ShareButton'
import Link from 'next/link'

interface ThesisCardProps {
  desk: DeskProps
}

const ROLE_LABEL: Record<string, string> = {
  fundamental_analyst: 'Fundamental Analyst',
  technical_analyst: 'Technical Analyst',
  sentiment_analyst: 'Sentiment Analyst',
  macro_analyst: 'Macro Analyst',
  PortfolioManager: 'Portfolio Manager',
  Portfolio_Manager: 'Portfolio Manager',
}

function TypewriterText({ text }: { text: string }) {
  const [displayed, setDisplayed] = React.useState('')

  React.useEffect(() => {
    setDisplayed('')
    let i = 0
    const interval = setInterval(() => {
      setDisplayed(text.slice(0, i))
      i += 3
      if (i > text.length) {
        setDisplayed(text)
        clearInterval(interval)
      }
    }, 10)
    return () => clearInterval(interval)
  }, [text])

  return <span>{displayed}<span className="inline-block w-1.5 h-3 ml-0.5 bg-brand-red animate-pulse align-middle" /></span>
}

/** Collapsible reasoning chain — accordion on mobile, always open on desktop */
function ReasoningBlock({
  block,
  index,
  meta,
}: {
  block: DeskProps['reasoning_blocks'][number]
  index: number
  meta: ReturnType<typeof regionMeta>
}) {
  const [open, setOpen] = React.useState(false)
  const role = ROLE_LABEL[block.agent_role] ??
    block.agent_role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

  return (
    <li
      className="relative animate-in slide-in-from-left-4 fade-in duration-700 fill-mode-both"
      style={{ animationDelay: `${index * 300}ms` }}
    >
      {/* Mobile: accordion header */}
      <button
        className="md:hidden w-full flex items-center justify-between gap-3 py-3 px-4 min-h-[44px] rounded-lg bg-white/[0.02] border border-white/[0.04] mb-1 text-left"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        <div className="flex items-center gap-3">
          <span
            className="w-6 h-6 flex items-center justify-center font-mono text-[10px] rounded shrink-0"
            style={{ color: meta.color, border: `1px solid ${meta.color}80`, background: 'var(--color-bg-primary)' }}
          >
            {String(index + 1).padStart(2, '0')}
          </span>
          <span className="text-[11px] font-medium uppercase tracking-[0.2em]" style={{ color: meta.color }}>
            {role}
          </span>
        </div>
        <ChevronDown
          className="w-4 h-4 text-text-tertiary shrink-0 transition-transform duration-300"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>

      {/* Mobile: collapsible content */}
      <div className={`md:hidden overflow-hidden transition-all duration-300 ${open ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="px-4 pb-4" style={{ borderLeft: `1px solid ${meta.color}30` }}>
          <BlockContent block={block} meta={meta} />
        </div>
      </div>

      {/* Desktop: always expanded */}
      <div
        className="hidden md:block pl-8 pr-4"
        style={{ borderLeft: `1px solid ${meta.color}30` }}
      >
        <span
          className="absolute -left-[13px] top-0 w-6 h-6 flex items-center justify-center font-mono text-[10px] bg-bg-primary"
          style={{ color: meta.color, border: `1px solid ${meta.color}80` }}
        >
          {String(index + 1).padStart(2, '0')}
        </span>
        <div className="flex items-baseline justify-between gap-4 flex-wrap mb-2">
          <p className="text-[10px] font-medium uppercase tracking-[0.25em]" style={{ color: meta.color }}>
            {role}
          </p>
          {block.language && block.language !== 'en' && (
            <span className="text-[9px] uppercase tracking-[0.25em] text-text-tertiary border border-border px-2 py-0.5">
              {block.language.toUpperCase()}
            </span>
          )}
        </div>
        <BlockContent block={block} meta={meta} />
      </div>
    </li>
  )
}

function BlockContent({
  block,
  meta,
}: {
  block: DeskProps['reasoning_blocks'][number]
  meta: ReturnType<typeof regionMeta>
}) {
  return (
    <>
      {block.input_data_summary && (
        <p className="text-[11px] text-text-tertiary mb-3 font-light italic">
          Input: {block.input_data_summary}
        </p>
      )}
      {block.analysis && (
        <p className="text-sm text-text-primary font-light leading-relaxed mb-2 text-justify">
          <TypewriterText text={block.analysis} />
        </p>
      )}
      {block.analysis_en && block.analysis_en !== block.analysis && (
        <p className="text-sm text-text-secondary font-light leading-relaxed mb-2 pl-4 border-l-2 border-border/50 text-justify">
          <TypewriterText text={block.analysis_en} />
        </p>
      )}
      {block.thought_process && (
        <details className="mt-3 group">
          <summary className="text-[10px] uppercase tracking-[0.25em] text-text-tertiary cursor-pointer hover:text-brand-red transition-colors list-none flex items-center gap-2 min-h-[44px] md:min-h-0">
            <span className="group-open:rotate-90 transition-transform">▸</span>
            Thought Process
          </summary>
          <p className="text-[12px] text-text-tertiary font-light leading-relaxed mt-2 pl-4 italic">
            {block.thought_process}
          </p>
        </details>
      )}
      {block.conclusion && (
        <p className="text-sm font-medium mt-3" style={{ color: meta.color }}>
          → {block.conclusion}
        </p>
      )}
    </>
  )
}

export function ThesisCard({ desk }: ThesisCardProps) {
  const meta = regionMeta(desk.desk)
  const [copied, setCopied] = React.useState(false)

  const isLong = desk.direction === 'LONG'
  const isShort = desk.direction === 'SHORT'
  const directionColor = isLong ? '#4A9F6F' : isShort ? '#9F4A4A' : '#7B8FA6'
  const directionGlow = isLong ? 'shadow-glow-green' : isShort ? 'shadow-glow-red' : ''

  const handleCopy = async () => {
    if (await copyToClipboard(desk.arc_tx)) {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
  }

  return (
    <article className="solid-panel rounded-2xl overflow-hidden h-full flex flex-col">
      {/* Header */}
      <header className="px-4 sm:px-8 py-5 sm:py-7 border-b border-border" style={{ borderLeft: `3px solid ${meta.color}` }}>
        <div className="flex items-start justify-between gap-4 sm:gap-6 flex-wrap">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-text-tertiary mb-2">
              {meta.name} · {desk.desk.toUpperCase()} Desk
            </p>
            <h2 className="font-display text-[clamp(1.75rem,5vw,2.25rem)] text-text-primary leading-tight">
              {desk.ticker}
            </h2>
            {desk.price && (
              <p className="font-mono text-sm text-text-secondary mt-1">{desk.price}</p>
            )}
          </div>

          <div
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 border ${directionGlow}`}
            style={{ color: directionColor, borderColor: directionColor + '60', background: directionColor + '0F' }}
          >
            {isLong && <TrendingUp className="w-4 h-4" />}
            {isShort && <TrendingDown className="w-4 h-4" />}
            {!isLong && !isShort && <Minus className="w-4 h-4" />}
            <span className="text-[11px] font-medium uppercase tracking-[0.2em]">{desk.direction}</span>
            <span className="text-[10px] font-mono opacity-70 ml-2 pl-2 border-l" style={{ borderColor: directionColor + '40' }}>
              {(desk.confidence * 100).toFixed(0)}%
            </span>
          </div>
        </div>

        {desk.summary && (
          <p className="text-sm sm:text-base font-light text-text-secondary leading-relaxed mt-4 sm:mt-6 max-w-3xl pl-3 sm:pl-4 border-l" style={{ borderColor: meta.color + '40' }}>
            {desk.summary}
          </p>
        )}
      </header>

      {/* Reasoning chain */}
      <section className="px-4 sm:px-8 py-5 sm:py-7 bg-[#0A0A0A]">
        <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-text-tertiary mb-4 sm:mb-6">
          Reasoning Chain
        </p>

        {desk.reasoning_blocks.length === 0 ? (
          <p className="text-text-tertiary font-light italic text-sm">No reasoning blocks recorded for this thesis.</p>
        ) : (
          <ol className="space-y-4 sm:space-y-6">
            {desk.reasoning_blocks.map((block, i) => (
              <ReasoningBlock key={i} block={block} index={i} meta={meta} />
            ))}
          </ol>
        )}
      </section>

      {/* Market question */}
      <section className="px-4 sm:px-8 py-5 sm:py-6 border-t border-border bg-[#141414]">
        <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-text-tertiary mb-3">
          Prediction Market Question
        </p>
        <p className="font-display text-[clamp(1rem,2.5vw,1.25rem)] text-text-primary leading-snug">
          {desk.question}
        </p>
      </section>

      {/* Footer: provenance & actions */}
      <footer className="px-4 sm:px-6 py-4 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-auto bg-[#0A0A0A]">
        {/* Left: Provenance */}
        <div className="flex items-center gap-4 sm:gap-6">
          {desk.ipfs_thesis_cid && desk.ipfs_thesis_cid !== 'bafkrei...' && (
            <a href={`https://dweb.link/ipfs/${desk.ipfs_thesis_cid}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-text-tertiary hover:text-brand-red transition-colors">
              <ExternalLink className="w-3 h-3" />
              <span className="hidden sm:inline">IPFS</span>
              <span className="font-mono">{truncateHash(desk.ipfs_thesis_cid, 6, 4)}</span>
            </a>
          )}
          {desk.arc_tx && (
            <div className="flex items-center gap-1.5">
              <a href={`https://testnet.arcscan.app/tx/${desk.arc_tx}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-text-tertiary hover:text-brand-red transition-colors">
                <ExternalLink className="w-3 h-3" />
                <span className="hidden sm:inline">Arc Tx</span>
                <span className="font-mono">{truncateHash(desk.arc_tx, 6, 4)}</span>
              </a>
              <button onClick={handleCopy} aria-label="Copy Arc tx" className="text-text-tertiary hover:text-brand-red transition-colors p-1 relative">
                {copied ? <Check className="w-3 h-3 text-positive" /> : <Copy className="w-3 h-3" />}
                {copied && <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[8px] bg-bg-tertiary px-1.5 py-0.5 rounded text-text-primary">Copied</span>}
              </button>
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-4 border-t border-border/40 sm:border-t-0 pt-3 sm:pt-0">
          <Link href={`/quiz?desk=${desk.desk.toLowerCase()}`} className="text-[10px] uppercase tracking-[0.2em] text-[#C9A84C] hover:text-white transition-colors whitespace-nowrap">
            Take the Quiz →
          </Link>
          <div className="w-px h-3 bg-border hidden sm:block" />
          <ShareButton
            region={desk.desk}
            ticker={desk.ticker}
            direction={desk.direction}
            confidence={desk.confidence}
            summary={desk.summary}
            arcHash={desk.arc_tx}
            flagEmoji={meta.flag}
          />
        </div>
      </footer>
    </article>
  )
}
