'use client'

import React from 'react'
import { Share2, ExternalLink, Copy, Check, X } from 'lucide-react'

interface ShareButtonProps {
  region: string       // e.g. 'us', 'cn', 'eu', 'jp', 'crypto'
  ticker: string       // e.g. 'AAPL'
  direction: string    // 'LONG' | 'SHORT' | 'NEUTRAL'
  confidence: number    // 0.0–1.0
  summary?: string     // thesis_summary_en, first ~100 chars used
  arcHash?: string     // full Arc transaction hash
  flagEmoji: string    // e.g. '🇺🇸', '🇨🇳', '🇪🇺'
}

const REGION_LABEL: Record<string, string> = {
  us: 'United States',
  cn: 'China',
  eu: 'Europe',
  jp: 'Japan',
  crypto: 'Digital Assets',
}

function buildTweetText({
  region,
  ticker,
  direction,
  confidence,
  summary,
  arcHash,
  flagEmoji,
}: ShareButtonProps): string {
  const pct = (confidence * 100).toFixed(0)
  const regionName = REGION_LABEL[region.toLowerCase()] ?? region
  const excerpt = summary
    ? summary.length > 100
      ? summary.slice(0, 100)
      : summary
    : ''
  const hashRef = arcHash
    ? arcHash.length > 8
      ? arcHash.slice(0, 8)
      : arcHash
    : ''

  let tweet = `${flagEmoji} Rosetta Alpha's ${regionName} agent: `
  tweet += `${direction} ${ticker} — ${pct}% confidence\n`
  tweet += `'${excerpt}...'\n`
  if (arcHash && hashRef) {
    tweet += `Verified on Arc: ${hashRef}\n`
  }
  tweet += 'Full reasoning → rosetta-alpha.vercel.app'
  return tweet
}

export function ShareButton(props: ShareButtonProps) {
  const [open, setOpen] = React.useState(false)
  const [copied, setCopied] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)

  // Close on outside click
  React.useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const tweetText = buildTweetText(props)
  const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(tweetText)
      setCopied(true)
      setTimeout(() => {
        setCopied(false)
        setOpen(false)
      }, 1500)
    } catch {
      // fallback for non-HTTPS contexts
      const el = document.createElement('textarea')
      el.value = tweetText
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => {
        setCopied(false)
        setOpen(false)
      }, 1500)
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Share thesis"
        aria-expanded={open}
        className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.25em] text-text-tertiary hover:text-brand-red transition-colors min-h-[44px] sm:min-h-0 px-1"
      >
        <Share2 className="w-3 h-3" />
        <span className="hidden sm:inline">Share</span>
      </button>

      {open && (
        <div
          className="absolute bottom-full right-0 mb-2 z-50 w-56 rounded-lg overflow-hidden shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-150"
          style={{ background: '#111118', border: '1px solid #C9A84C' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-[#C9A84C]/20">
            <span className="text-[9px] uppercase tracking-[0.25em] text-text-tertiary">
              Share Thesis
            </span>
            <button
              onClick={() => setOpen(false)}
              className="text-text-tertiary hover:text-text-primary transition-colors"
              aria-label="Close share menu"
            >
              <X className="w-3 h-3" />
            </button>
          </div>

          {/* Tweet preview */}
          <div className="px-3 py-2 border-b border-[#C9A84C]/10" style={{ background: '#111118' }}>
            <p className="text-[10px] text-text-tertiary font-mono leading-relaxed line-clamp-4 whitespace-pre-wrap">
              {tweetText.length > 160 ? tweetText.slice(0, 157) + '…' : tweetText}
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col">
            <a
              href={tweetUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-3 text-[11px] text-text-secondary hover:text-text-primary hover:bg-white/[0.03] transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#1D9BF0]" />
              Share on X
            </a>
            <button
              onClick={handleCopy}
              className="flex items-center gap-2.5 px-3 py-3 text-[11px] text-text-secondary hover:text-text-primary hover:bg-white/[0.03] transition-colors border-t border-[#C9A84C]/10"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-positive" />
                  <span className="text-positive">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copy to clipboard
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
