'use client'

import React from 'react'
import { Share2, Copy, Check, X } from 'lucide-react'

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

/** Max tweet text length — leave 20 chars for the permalink + whitespace */
const MAX_TWEET_LENGTH = 260

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
      ? summary.slice(0, 97) + '...'
      : summary
    : ''
  const hashRef = arcHash && arcHash.length > 8
    ? arcHash.slice(0, 8)
    : arcHash || ''

  let tweet = `${flagEmoji} ${regionName}: ${direction} $${ticker} — ${pct}%\n`
  if (excerpt) tweet += `"${excerpt}"\n`
  if (arcHash && hashRef) {
    tweet += `🔗 https://testnet.arcscan.app/tx/${arcHash}\n`
  }
  tweet += 'rosetta-alpha.vercel.app'

  // Truncate to prevent X's 280-char cap from eating the permalink
  if (tweet.length > MAX_TWEET_LENGTH) {
    tweet = tweet.slice(0, MAX_TWEET_LENGTH - 3) + '...'
  }

  return tweet
}

/**
 * Determine if the modal should render above or below the button.
 * On small viewports (mobile), "above" clips — use "below" with scroll.
 */
function useModalPosition(ref: React.RefObject<HTMLDivElement | null>): 'above' | 'below' {
  const [position, setPosition] = React.useState<'above' | 'below'>('above')

  React.useEffect(() => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const spaceAbove = rect.top
    const spaceBelow = window.innerHeight - rect.bottom
    // Only use "above" if there's enough room (> 300px for the modal)
    setPosition(spaceAbove > 300 ? 'above' : 'below')
  }, [ref])

  return position
}

export function ShareButton(props: ShareButtonProps) {
  const [open, setOpen] = React.useState(false)
  const [copied, setCopied] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)
  const modalPosition = useModalPosition(ref)

  // Close on outside click
  React.useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    // Delay adding listener to avoid catching the click that opened it
    const timer = setTimeout(() => document.addEventListener('mousedown', handler), 0)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handler)
    }
  }, [open])

  const tweetText = buildTweetText(props)
  const tweetUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(tweetText)}`

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(tweetText)
      setCopied(true)
      setTimeout(() => { setCopied(false); setOpen(false) }, 1500)
    } catch {
      // fallback for non-HTTPS contexts
      const el = document.createElement('textarea')
      el.value = tweetText
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => { setCopied(false); setOpen(false) }, 1500)
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
          className={`absolute z-50 w-56 rounded-lg overflow-hidden shadow-xl animate-in fade-in duration-150 max-h-[90vh] overflow-y-auto ${
            modalPosition === 'above'
              ? 'bottom-full right-0 mb-2 slide-in-from-bottom-2'
              : 'top-full right-0 mt-2 slide-in-from-top-2'
          }`}
          style={{ background: '#111118', border: '1px solid #C9A84C' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-[#C9A84C]/20">
            <span className="text-[9px] uppercase tracking-[0.25em] text-text-tertiary">
              Share Thesis
            </span>
            <button
              onClick={() => setOpen(false)}
              className="text-text-tertiary hover:text-text-primary transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
              aria-label="Close share menu"
            >
              <X className="w-3 h-3" />
            </button>
          </div>

          {/* Tweet preview */}
          <div className="px-3 py-2 border-b border-[#C9A84C]/10" style={{ background: '#111118' }}>
            <p className="text-[10px] text-text-tertiary font-mono leading-relaxed line-clamp-4 whitespace-pre-wrap break-all">
              {tweetText.length > 200 ? tweetText.slice(0, 197) + '…' : tweetText}
            </p>
          </div>

          {/* Actions — min touch targets for mobile */}
          <div className="flex flex-col">
            <a
              href={tweetUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-3 min-h-[44px] text-[11px] text-text-secondary hover:text-text-primary hover:bg-white/[0.03] transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 shrink-0" fill="none" stroke="#1D9BF0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4l11.733 16H20L8.267 4z" />
                <path d="M4 20l6.768-6.768M20 4l-6.768 6.768" />
              </svg>
              Share on X
            </a>
            <button
              onClick={handleCopy}
              className="flex items-center gap-2.5 px-3 py-3 min-h-[44px] text-[11px] text-text-secondary hover:text-text-primary hover:bg-white/[0.03] transition-colors border-t border-[#C9A84C]/10"
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
