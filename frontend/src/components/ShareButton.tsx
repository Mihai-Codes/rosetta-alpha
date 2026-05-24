'use client'

import React from 'react'
import posthog from 'posthog-js'
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
  // Keep excerpt tight — leave room for URL + hashtags
  const excerpt = summary
    ? summary.length > 80
      ? summary.slice(0, 77) + '...'
      : summary
    : ''

  // Hook: user just received a signal from Rosetta Alpha
  let tweet = `🤖 Rosetta Alpha just flagged this:\n\n`
  tweet += `${flagEmoji} ${regionName} • ${direction} $${ticker} — ${pct}% confidence\n`
  if (excerpt) tweet += `"${excerpt}"\n`
  tweet += `\n`
  if (arcHash) {
    tweet += `📊 Verified on Arc Testnet\n\n`
    tweet += `🔗 https://testnet.arcscan.app/tx/${arcHash}\n\n`
  }
  tweet += `Try it → rosetta-alpha.vercel.app`

  // Truncate to prevent X's 280-char cap from eating the permalink
  if (tweet.length > MAX_TWEET_LENGTH) {
    tweet = tweet.slice(0, MAX_TWEET_LENGTH - 3) + '...'
  }

  return tweet
}

/**
 * Generate an example tweet for live thesis data — used by DeepSeek to verify correctness.
 * Example output for US desk, AAPL, LONG, 85%, "Strong earnings momentum...":
 * 🇺🇸 United States: LONG $AAPL — 85%
 * "Strong earnings momentum..."
 * 🔗 https://testnet.arcscan.app/tx/0x9A676e78
 * rosetta-alpha.vercel.app
 */

/**
 * Determine if the modal should render above or below the button.
 * On small viewports (mobile), "above" clips — use "below" with scroll.
 */
function useModalPosition(
  ref: React.RefObject<HTMLDivElement | null>,
  open: boolean
): 'above' | 'below' {
  const [position, setPosition] = React.useState<'above' | 'below'>('above')

  React.useEffect(() => {
    if (!ref.current || !open) return
    // Re-measure on every open — user may have scrolled since last mount
    const rect = ref.current.getBoundingClientRect()
    const spaceAbove = rect.top
    // Only use "above" if there's enough room (> 300px for the modal)
    setPosition(spaceAbove > 300 ? 'above' : 'below')
  }, [open, ref])

  return position
}

export function ShareButton(props: ShareButtonProps) {
  const [open, setOpen] = React.useState(false)
  const [copied, setCopied] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)

  const modalPosition = useModalPosition(ref, open)

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
    posthog.capture('thesis_share_copied', { region: props.region, ticker: props.ticker, direction: props.direction })
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
        onClick={() => {
          const next = !open
          setOpen(next)
          if (next) posthog.capture('thesis_share_opened', { region: props.region, ticker: props.ticker, direction: props.direction })
        }}
        data-testid="share-button"
        aria-label="Share thesis"
        aria-expanded={open}
        className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.25em] text-text-tertiary hover:text-brand-red transition-colors min-h-[44px] sm:min-h-0 px-1"
      >
        <Share2 className="w-3 h-3" />
        <span className="hidden sm:inline">Share</span>
      </button>

      {open && (
        <div
          data-testid="share-modal"
          className={`absolute z-50 w-72 rounded-lg overflow-hidden border border-[#C9A84C]/40 shadow-[0_0_20px_rgba(201,168,76,0.1),_0_8px_32px_rgba(0,0,0,0.8)] animate-in fade-in zoom-in-95 duration-200 max-h-[85vh] overflow-y-auto ${
            modalPosition === 'above'
              ? 'bottom-full right-0 mb-2 origin-bottom-right slide-in-from-bottom-2'
              : 'top-full right-0 mt-2 origin-top-right slide-in-from-top-2'
          }`}
          style={{ background: '#111118' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#C9A84C]/20 bg-[#111118]">
            <span className="text-[9px] uppercase tracking-[0.25em] text-text-tertiary font-medium">
              Share Thesis
            </span>
            <button
              onClick={() => setOpen(false)}
              className="text-text-tertiary hover:text-text-primary transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center -mr-2"
              aria-label="Close share menu"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Tweet preview */}
          <div className="px-4 py-3 border-b border-[#C9A84C]/10 bg-black/20">
            <p data-testid="tweet-preview" className="text-[11px] text-[#F0EDE8]/80 font-mono leading-normal tracking-tight line-clamp-5 whitespace-pre-wrap break-all">
              {tweetText.length > 200 ? tweetText.slice(0, 197) + '…' : tweetText}
            </p>
          </div>

          {/* Actions — min touch targets for mobile */}
          <div className="flex flex-col bg-[#111118]">
            <a
              href={tweetUrl}
              target="_blank" rel="noopener noreferrer"
              
              onClick={() => { setOpen(false); posthog.capture('thesis_share_twitter_clicked', { region: props.region, ticker: props.ticker, direction: props.direction }) }}
              className="flex items-center gap-3 px-4 py-3.5 min-h-[48px] text-[11px] font-medium text-text-secondary hover:text-[#1D9BF0] hover:bg-[#1D9BF0]/10 transition-colors group"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0 text-[#1D9BF0] opacity-80 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4l11.733 16H20L8.267 4z" />
                <path d="M4 20l6.768-6.768M20 4l-6.768 6.768" />
              </svg>
              Share on X
            </a>
            <button
              onClick={handleCopy}
              className="flex items-center gap-3 px-4 py-3.5 min-h-[48px] text-[11px] font-medium text-text-secondary hover:text-[#C9A84C] hover:bg-[#C9A84C]/10 transition-colors border-t border-[#C9A84C]/10"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-positive" />
                  <span className="text-positive">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
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
