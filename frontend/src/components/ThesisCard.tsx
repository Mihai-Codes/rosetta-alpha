'use client'

import React from 'react'
import { TrendingUp, TrendingDown, Minus, ExternalLink, Copy, Check, ChevronDown, Lock, Unlock, Loader2 } from 'lucide-react'
import { DeskProps } from './DeskCard'
import { regionMeta, copyToClipboard, truncateHash } from '../lib/format'
import { ShareButton } from './ShareButton'
import Link from 'next/link'
import { x402, X402SessionRequired } from '@/lib/x402Client'
import { SessionKeyManager } from '@/components/SessionKeyManager'

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

  return <span>{displayed}</span>
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
        className="md:hidden w-full flex items-center justify-between gap-3 py-3 px-4 min-h-[44px] rounded-none bg-white/[0.02] border border-white/[0.04] mb-1 text-left"
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

  // x402 unlock state
  const [unlocked, setUnlocked] = React.useState(false)
  const [unlocking, setUnlocking] = React.useState(false)
  const [unlockError, setUnlockError] = React.useState<string | null>(null)
  const [showSessionModal, setShowSessionModal] = React.useState(false)

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

  // x402 pay-to-unlock: calls /api/thesis/[id] with automatic session key payment
  const handleUnlock = async () => {
    setUnlocking(true)
    setUnlockError(null)
    try {
      // Use the desk slug as the thesis id (maps to Arc tx or IPFS CID prefix)
      const thesisId = desk.arc_tx || desk.desk
      const res = await x402.fetch(`/api/thesis/${encodeURIComponent(thesisId)}`)
      if (res.ok) {
        setUnlocked(true)
      } else {
        const body = await res.json().catch(() => ({}))
        setUnlockError(body?.error ?? 'Payment failed. Please try again.')
      }
    } catch (err) {
      if (err instanceof X402SessionRequired) {
        // No session key — open the SessionKeyManager modal
        setShowSessionModal(true)
      } else {
        setUnlockError(err instanceof Error ? err.message : 'Unlock failed.')
      }
    } finally {
      setUnlocking(false)
    }
  }

  return (
    <article className="solid-panel rounded-none overflow-hidden h-full flex flex-col">
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
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-text-tertiary">
            Reasoning Chain
          </p>
          {!unlocked && desk.reasoning_blocks.length > 1 && (
            <div className="flex items-center gap-1.5 text-[9px] text-text-tertiary">
              <Lock className="w-2.5 h-2.5" />
              <span>{desk.reasoning_blocks.length - 1} blocks locked</span>
            </div>
          )}
          {unlocked && (
            <div className="flex items-center gap-1.5 text-[9px] text-emerald-500">
              <Unlock className="w-2.5 h-2.5" />
              <span>Full chain unlocked</span>
            </div>
          )}
        </div>

        {desk.reasoning_blocks.length === 0 ? (
          <p className="text-text-tertiary font-light italic text-sm">No reasoning blocks recorded for this thesis.</p>
        ) : (
          <>
            <ol className="space-y-4 sm:space-y-6">
              {/* Always show first block free */}
              <ReasoningBlock key={0} block={desk.reasoning_blocks[0]} index={0} meta={meta} />
              {/* Show rest only when unlocked */}
              {unlocked && desk.reasoning_blocks.slice(1).map((block, i) => (
                <ReasoningBlock key={i + 1} block={block} index={i + 1} meta={meta} />
              ))}
            </ol>

            {/* Unlock gate — shown when locked and there are more blocks */}
            {!unlocked && desk.reasoning_blocks.length > 1 && (
              <div className="mt-6 border border-[#C9A84C]/20 bg-[#C9A84C]/5 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-[0.15em] mb-0.5" style={{ color: '#C9A84C' }}>
                    🔓 Unlock full reasoning — 0.001 USDC
                  </p>
                  <p className="text-[10px] text-text-tertiary">
                    {desk.reasoning_blocks.length - 1} more agent{desk.reasoning_blocks.length > 2 ? 's' : ''} · Instant with session key
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleUnlock}
                  disabled={unlocking}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-2 text-[9px] font-bold uppercase tracking-[0.2em] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{ background: '#C9A84C', color: '#0A0A0A' }}
                >
                  {unlocking
                    ? <><Loader2 className="w-3 h-3 animate-spin" />Paying…</>
                    : <><Unlock className="w-3 h-3" />Unlock</>
                  }
                </button>
              </div>
            )}

            {/* Error state */}
            {unlockError && (
              <p className="mt-3 text-[10px] text-red-400 border border-red-500/20 bg-red-500/5 px-3 py-2">
                {unlockError}
              </p>
            )}
          </>
        )}
      </section>

      {/* SessionKeyManager modal — opens when X402SessionRequired is thrown */}
      {showSessionModal && (
        <SessionKeyManager
          variant="modal"
          onClose={() => setShowSessionModal(false)}
        />
      )}

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
      <footer className="px-4 sm:px-6 py-4 border-t border-border flex flex-col gap-4 mt-auto bg-[#0A0A0A]">
        {/* Top Row: IPFS & Arc */}
        <div className="flex flex-row items-center justify-between w-full">
          {desk.ipfs_thesis_cid && desk.ipfs_thesis_cid !== 'bafkrei...' && (
            <a href={`https://dweb.link/ipfs/${desk.ipfs_thesis_cid}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-text-tertiary hover:text-brand-red transition-colors">
              <ExternalLink className="w-3 h-3" />
              <span>IPFS: <span className="font-mono text-text-secondary">{truncateHash(desk.ipfs_thesis_cid, 6, 4)}</span></span>
            </a>
          )}
          {desk.arc_tx && (
            <div className="flex items-center gap-1.5 shrink-0">
              <a href={`https://testnet.arcscan.app/tx/${desk.arc_tx}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-text-tertiary hover:text-brand-red transition-colors">
                <ExternalLink className="w-3 h-3" />
                <span>Arc L1: <span className="font-mono text-text-secondary">{truncateHash(desk.arc_tx, 6, 4)}</span></span>
              </a>
              <button onClick={handleCopy} aria-label="Copy Arc tx" className="text-text-tertiary hover:text-brand-red transition-colors p-1 relative">
                {copied ? <Check className="w-3 h-3 text-positive" /> : <Copy className="w-3 h-3" />}
                {copied && <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[8px] bg-bg-tertiary px-1.5 py-0.5 rounded text-text-primary">Copied</span>}
              </button>
            </div>
          )}
        </div>

        {/* Bottom Row: Actions */}
        <div className="flex items-center justify-between border-t border-border/40 pt-4">
          <Link href={`/quiz?desk=${desk.desk.toLowerCase()}`} className="inline-flex items-center gap-2 px-4 py-2 bg-brand-red/10 border border-brand-red/30 text-brand-red text-[9px] font-bold uppercase tracking-[0.2em] hover:bg-brand-red hover:text-white transition-colors duration-300">
            Take the Quiz <span className="text-sm leading-none">→</span>
          </Link>
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
