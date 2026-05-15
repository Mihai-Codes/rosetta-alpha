import React from 'react'
import { TrendingUp, TrendingDown, Minus, ExternalLink, Copy, Check } from 'lucide-react'
import { DeskProps } from './DeskCard'
import { regionMeta, copyToClipboard, truncateHash } from '../lib/format'

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

export function ThesisCard({ desk }: ThesisCardProps) {
  const meta = regionMeta(desk.desk)
  const [copied, setCopied] = React.useState(false)

  const isLong = desk.direction === 'LONG'
  const isShort = desk.direction === 'SHORT'

  const directionColor = isLong ? '#4A9F6F' : isShort ? '#9F4A4A' : '#7B8FA6'
  const directionGlow = isLong
    ? 'shadow-glow-green'
    : isShort
    ? 'shadow-glow-red'
    : ''

  const handleCopy = async () => {
    if (await copyToClipboard(desk.arc_tx)) {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
  }

  return (
    <article className="glass-panel border border-border/20 rounded-2xl overflow-hidden shadow-none">
      {/* Header */}
      <header
        className="px-8 py-7 border-b border-border"
        style={{ borderLeft: `3px solid ${meta.color}` }}
      >
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-text-tertiary mb-2">
              {meta.name} · {desk.desk.toUpperCase()} Desk
            </p>
            <h2 className="font-display text-4xl text-text-primary leading-tight">
              {desk.ticker}
            </h2>
            {desk.price && (
              <p className="font-mono text-sm text-text-secondary mt-2">{desk.price}</p>
            )}
          </div>

          <div
            className={`flex items-center gap-2 px-4 py-2 border ${directionGlow}`}
            style={{
              color: directionColor,
              borderColor: directionColor + '60',
              background: directionColor + '0F',
            }}
          >
            {isLong && <TrendingUp className="w-4 h-4" />}
            {isShort && <TrendingDown className="w-4 h-4" />}
            {!isLong && !isShort && <Minus className="w-4 h-4" />}
            <span className="text-[11px] font-medium uppercase tracking-[0.2em]">
              {desk.direction}
            </span>
            <span className="text-[10px] font-mono opacity-70 ml-2 pl-2 border-l" style={{ borderColor: directionColor + '40' }}>
              {(desk.confidence * 100).toFixed(0)}%
            </span>
          </div>
        </div>

        {desk.summary && (
          <p
            className="text-base font-light text-text-secondary leading-relaxed mt-6 max-w-3xl pl-4 border-l"
            style={{ borderColor: meta.color + '40' }}
          >
            {desk.summary}
          </p>
        )}
      </header>

      {/* Reasoning chain */}
      <section className="px-8 py-7">
        <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-text-tertiary mb-6">
          Reasoning Chain
        </p>

        {desk.reasoning_blocks.length === 0 ? (
          <p className="text-text-tertiary font-light italic text-sm">
            No reasoning blocks recorded for this thesis.
          </p>
        ) : (
          <ol className="space-y-6">
            {desk.reasoning_blocks.map((block, i) => {
              const role = ROLE_LABEL[block.agent_role] ??
                block.agent_role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
              return (
                <li
                  key={i}
                  className="relative pl-8"
                  style={{ borderLeft: `1px solid ${meta.color}30` }}
                >
                  {/* Step number */}
                  <span
                    className="absolute -left-[13px] top-0 w-6 h-6 flex items-center justify-center font-mono text-[10px] bg-bg-primary"
                    style={{
                      color: meta.color,
                      border: `1px solid ${meta.color}80`,
                    }}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>

                  <div className="flex items-baseline justify-between gap-4 flex-wrap mb-2">
                    <p
                      className="text-[10px] font-medium uppercase tracking-[0.25em]"
                      style={{ color: meta.color }}
                    >
                      {role}
                    </p>
                    {block.language && block.language !== 'en' && (
                      <span className="text-[9px] uppercase tracking-[0.25em] text-text-tertiary border border-border px-2 py-0.5">
                        {block.language.toUpperCase()}
                      </span>
                    )}
                  </div>

                  {block.input_data_summary && (
                    <p className="text-[11px] text-text-tertiary mb-3 font-light italic">
                      Input: {block.input_data_summary}
                    </p>
                  )}

                  {/* Native-language analysis */}
                  {block.analysis && (
                    <p className="text-sm text-text-primary font-light leading-relaxed mb-2">
                      {block.analysis}
                    </p>
                  )}

                  {/* English translation if non-English */}
                  {block.analysis_en && block.analysis_en !== block.analysis && (
                    <p className="text-sm text-text-secondary font-light leading-relaxed mb-2 pl-3 border-l border-border">
                      {block.analysis_en}
                    </p>
                  )}

                  {block.thought_process && (
                    <details className="mt-3 group">
                      <summary className="text-[10px] uppercase tracking-[0.25em] text-text-tertiary cursor-pointer hover:text-gold transition-colors list-none flex items-center gap-2">
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
                </li>
              )
            })}
          </ol>
        )}
      </section>

      {/* Market question */}
      <section className="px-8 py-6 border-t border-border bg-bg-tertiary/30">
        <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-text-tertiary mb-3">
          Prediction Market Question
        </p>
        <p className="font-display text-xl text-text-primary leading-snug">
          {desk.question}
        </p>
      </section>

      {/* Footer: provenance */}
      <footer className="px-8 py-5 border-t border-border flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-6 flex-wrap">
          {desk.ipfs_thesis_cid && desk.ipfs_thesis_cid !== 'bafkrei...' && (
            <a
              href={`https://gateway.pinata.cloud/ipfs/${desk.ipfs_thesis_cid}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-[11px] text-text-secondary hover:text-gold transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              <span className="uppercase tracking-[0.2em]">IPFS</span>
              <span className="font-mono">{truncateHash(desk.ipfs_thesis_cid, 8, 6)}</span>
            </a>
          )}

          {desk.arc_tx && (
            <div className="relative flex items-center gap-2">
              <a
                href={`https://testnet.arcscan.app/tx/${desk.arc_tx}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-[11px] text-text-secondary hover:text-gold transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                <span className="uppercase tracking-[0.2em]">Arc Tx</span>
                <span className="font-mono">{truncateHash(desk.arc_tx, 8, 6)}</span>
              </a>
              <button
                onClick={handleCopy}
                aria-label="Copy Arc transaction hash"
                className="text-text-tertiary hover:text-gold transition-colors p-1"
              >
                {copied ? <Check className="w-3 h-3 text-positive" /> : <Copy className="w-3 h-3" />}
                {copied && <span className="copy-toast">Copied</span>}
              </button>
            </div>
          )}
        </div>

        {desk.arc_tx ? (
          <a
            href={`https://testnet.arcscan.app/tx/${desk.arc_tx}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.25em] text-text-tertiary hover:text-gold transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            Verified on Arc L1
          </a>
        ) : (
          <span className="text-[10px] uppercase tracking-[0.25em] text-text-tertiary">
            Verified on Arc L1
          </span>
        )}
      </footer>
    </article>
  )
}
