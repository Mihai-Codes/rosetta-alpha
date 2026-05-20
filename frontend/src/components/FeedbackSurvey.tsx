'use client'

import React, { useEffect, useState, useRef } from 'react'
import posthog from 'posthog-js'
import { usePathname } from 'next/navigation'
import { X } from 'lucide-react'

const STORAGE_KEY = 'feedback_shown'
const DELAY_MS = 60_000
const MAX_CHARS = 280

/**
 * Exit survey that slides up from the bottom-right corner after 60 seconds.
 * Only shown once per browser (localStorage guard). Captures response via PostHog.
 *
 * Design: #111118 background, #C9A84C (accent-gold) border, Playfair Display title.
 */
export function FeedbackSurvey() {
  const pathname = usePathname()
  const [visible, setVisible] = useState(false)
  const [text, setText] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // Only show if not shown before
    if (typeof window === 'undefined') return
    if (localStorage.getItem(STORAGE_KEY)) return

    timerRef.current = setTimeout(() => {
      setVisible(true)
    }, DELAY_MS)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  function handleDismiss() {
    setVisible(false)
    localStorage.setItem(STORAGE_KEY, '1')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return

    posthog.capture('exit_survey_submitted', {
      response: text.trim(),
      page: pathname,
    })

    localStorage.setItem(STORAGE_KEY, '1')
    setSubmitted(true)
    setTimeout(() => setVisible(false), 2000)
  }

  if (!visible) return null

  return (
    <div
      className={`
        fixed bottom-6 right-6 z-[9999]
        w-[min(340px,calc(100vw-3rem))]
        border border-[#C9A84C]/60
        rounded-none shadow-2xl
        transition-all duration-500 ease-out
        ${visible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}
      `}
      style={{ backgroundColor: '#111118' }}
      role="dialog"
      aria-label="Feedback survey"
    >
      {/* Header */}
      <div className="flex items-start justify-between px-5 pt-5 pb-3 border-b border-[#C9A84C]/20">
        <h3 className="font-display text-[15px] text-text-primary leading-snug pr-4">
          Quick question
        </h3>
        <button
          onClick={handleDismiss}
          aria-label="Close survey"
          className="shrink-0 text-text-tertiary hover:text-text-primary transition-colors mt-0.5"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <div className="px-5 py-4">
        {submitted ? (
          <p className="text-positive text-[12px] font-medium tracking-wide py-2">
            ✓ Thank you — your feedback helps us improve Rosetta Alpha.
          </p>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <p className="text-text-secondary text-[11px] leading-relaxed mb-3">
              What would make Rosetta Alpha more useful to you?
            </p>
            <div className="relative">
              <textarea
                value={text}
                onChange={e => setText(e.target.value.slice(0, MAX_CHARS))}
                placeholder="Share your thoughts…"
                rows={4}
                className="
                  w-full resize-none
                  bg-white/[0.04] border border-border
                  focus:border-[#C9A84C]/60 focus:outline-none
                  text-text-primary text-[12px] leading-relaxed
                  px-3 py-2.5
                  placeholder:text-text-tertiary
                  transition-colors duration-200
                "
                aria-label="Feedback text"
              />
              <span
                className={`absolute bottom-2 right-2.5 text-[10px] tabular-nums ${
                  text.length >= MAX_CHARS ? 'text-brand-red' : 'text-text-tertiary'
                }`}
              >
                {text.length}/{MAX_CHARS}
              </span>
            </div>
            <div className="flex items-center justify-between mt-3">
              <button
                type="button"
                onClick={handleDismiss}
                className="text-[10px] uppercase tracking-[0.12em] text-text-tertiary hover:text-text-secondary transition-colors"
              >
                Skip
              </button>
              <button
                type="submit"
                disabled={!text.trim()}
                className="
                  px-4 py-2
                  text-[10px] uppercase tracking-[0.15em] font-medium
                  border border-[#C9A84C]/50
                  text-[#C9A84C]
                  hover:bg-[#C9A84C]/10
                  disabled:opacity-40 disabled:cursor-not-allowed
                  transition-all duration-200
                "
              >
                Send
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
