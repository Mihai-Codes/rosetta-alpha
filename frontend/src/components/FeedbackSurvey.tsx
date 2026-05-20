'use client'

import React, { useEffect, useState, useRef } from 'react'
import posthog from 'posthog-js'
import { usePathname } from 'next/navigation'

const STORAGE_KEY = 'feedback_survey_shown'
const DELAY_MS = 60_000
const MAX_CHARS = 280

/**
 * Feedback survey — slides up from the bottom-right corner after 60 seconds.
 * Shown once per browser (localStorage guard).
 *
 * Trigger: user on page >= 60s AND 'feedback_survey_shown' not set.
 * Submit: captures exit_survey_response to PostHog + sets localStorage.
 * Dismiss: "Maybe later" → sets localStorage, closes immediately.
 */
export function FeedbackSurvey() {
  const pathname = usePathname()
  const [visible, setVisible] = useState(false)
  const [text, setText] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY)) return
    timerRef.current = setTimeout(() => setVisible(true), DELAY_MS)
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
    const trimmed = text.trim()
    if (!trimmed) return

    posthog.capture('exit_survey_response', {
      response: trimmed,
      page: window.location.pathname,
    })
    localStorage.setItem(STORAGE_KEY, '1')
    setSubmitted(true)
    setTimeout(() => setVisible(false), 2000)
  }

  if (!visible) return null

  return (
    <div
      className="animate-survey-slide-up fixed bottom-6 right-6 z-[9999] w-[320px] rounded-xl shadow-[var(--shadow-lg)] overflow-hidden"
      style={{ backgroundColor: '#111118', border: '1px solid #2A2A38' }}
      role="dialog"
      aria-modal="false"
      aria-label="Feedback survey"
    >
      {/* ── Header ── */}
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: '1px solid #2A2A38' }}
      >
        <h3
          className="font-[Playfair_Display] text-[16px] leading-snug"
          style={{ color: '#F0EDE8' }}
        >
          What would make Rosetta Alpha more useful to you?
        </h3>
      </div>

      {/* ── Body ── */}
      <div className="px-5 pt-4 pb-5">
        {submitted ? (
          <p
            className="py-2 text-[14px]"
            style={{ color: '#F0EDE8', fontFamily: 'Inter, sans-serif' }}
          >
            Thanks! 🙏
          </p>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            {/* Textarea */}
            <div className="relative">
              <textarea
                value={text}
                onChange={e => setText(e.target.value.slice(0, MAX_CHARS))}
                placeholder="Share your thoughts…"
                rows={4}
                className="w-full resize-none rounded-lg px-3 py-2.5 text-[13px] leading-relaxed placeholder:text-[#A09C94] transition-colors duration-200"
                style={{
                  backgroundColor: '#1A1A24',
                  border: '1px solid #2A2A38',
                  color: '#F0EDE8',
                  fontFamily: 'Inter, sans-serif',
                  outline: 'none',
                }}
                onFocus={e => { e.target.style.borderColor = '#C9A84C' }}
                onBlur={e => { e.target.style.borderColor = '#2A2A38' }}
                aria-label="Feedback response"
              />
              {/* Character counter */}
              <span
                className="absolute bottom-2 right-2.5 text-[10px] tabular-nums select-none"
                style={{
                  color: text.length >= MAX_CHARS ? '#9F4A4A' : '#A09C94',
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                {text.length}/{MAX_CHARS}
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between mt-3">
              <button
                type="button"
                onClick={handleDismiss}
                className="text-[11px] tracking-wide transition-colors duration-200"
                style={{ color: '#A09C94', fontFamily: 'Inter, sans-serif' }}
                onMouseEnter={e => { (e.target as HTMLElement).style.color = '#F0EDE8' }}
                onMouseLeave={e => { (e.target as HTMLElement).style.color = '#A09C94' }}
              >
                Maybe later
              </button>
              <button
                type="submit"
                disabled={!text.trim()}
                className="px-4 py-2 rounded-lg text-[11px] font-medium tracking-wide transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: '#C9A84C',
                  color: '#0A0A0F',
                  fontFamily: 'Inter, sans-serif',
                }}
                onMouseEnter={e => { if (text.trim()) (e.target as HTMLElement).style.backgroundColor = '#D4B456' }}
                onMouseLeave={e => { (e.target as HTMLElement).style.backgroundColor = '#C9A84C' }}
              >
                Send feedback
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
