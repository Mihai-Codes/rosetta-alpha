'use client'

import React, { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import posthog from 'posthog-js'
import { MessageSquareDashed, X } from 'lucide-react'

const STORAGE_KEY = 'feedback_survey_v9'
const DELAY_MS = 10_000 // 10 seconds
const MAX_CHARS = 280

/**
 * Feedback survey — slides up from the bottom-right corner after 60 seconds.
 * Shown once per browser (localStorage guard).
 *
 * Data destination: This sends an 'exit_survey_response' event to your PostHog instance.
 * You can view the feedback by logging into PostHog -> Events -> filtering for 'exit_survey_response'
 * and looking at the 'response' property on those events.
 */
export function FeedbackSurvey() {
  const [visible, setVisible] = useState(false)
  const [text, setText] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY)) return
    timerRef.current = setTimeout(() => setVisible(true), DELAY_MS)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  function handleDismiss() {
    setVisible(false)
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, '1')
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed) return

    // Sends the feedback to your PostHog dashboard
    posthog.capture('exit_survey_response', {
      response: trimmed,
      page: window.location.pathname,
    })
    
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, '1')
    }
    setSubmitted(true)
    setTimeout(() => setVisible(false), 2000)
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-6 right-6 z-[9999] w-[460px] max-w-[calc(100vw-3rem)] bg-[#0A0A0A] border border-border-strong solid-panel overflow-hidden shadow-glow-red"
          role="dialog"
          aria-modal="false"
          aria-label="Feedback survey"
        >
          {/* Header */}
          <div className="flex items-start justify-between px-5 py-4 border-b border-border bg-[#050505]">
            <div className="flex items-start sm:items-center gap-3 pr-2">
              <MessageSquareDashed className="w-4 h-4 text-brand-red shrink-0 mt-0.5 sm:mt-0" />
              <h3 className="font-mono text-[8.5px] sm:text-[10px] uppercase tracking-normal text-text-primary whitespace-nowrap">
                What would make Rosetta Alpha more useful?
              </h3>
            </div>
            <button
              onClick={handleDismiss}
              className="text-text-tertiary hover:text-brand-red transition-colors shrink-0 ml-2"
              aria-label="Dismiss survey"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5">
            {submitted ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2 text-[11px] font-mono text-positive py-4 uppercase tracking-wide"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-positive animate-pulse" />
                Feedback transmitted_
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} noValidate>
                {/* Textarea */}
                <div className="relative group">
                  <div className="absolute inset-0 bg-brand-red/5 opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none" />
                  <textarea
                    value={text}
                    onChange={e => setText(e.target.value.slice(0, MAX_CHARS))}
                    placeholder="> Share your thoughts_"
                    rows={3}
                    className="w-full resize-none bg-[#111111] border border-border px-3 py-3 text-[11px] font-mono text-text-primary placeholder:text-text-tertiary focus:border-brand-red/60 focus:outline-none transition-colors duration-200 scrollbar-hide"
                    aria-label="Feedback response"
                  />
                  {/* Character counter */}
                  <div className="flex justify-between items-center mt-3">
                    <span
                      className={`text-[9px] font-mono uppercase tracking-widest ${text.length >= MAX_CHARS ? 'text-brand-red' : 'text-text-tertiary'}`}
                    >
                      [{text.length}/{MAX_CHARS}]
                    </span>
                    
                    {/* Actions */}
                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        onClick={handleDismiss}
                        className="text-[9.5px] font-mono uppercase tracking-[0.1em] text-text-secondary hover:text-text-primary transition-colors whitespace-nowrap"
                      >
                        [ Maybe Later ]
                      </button>
                      <button
                        type="submit"
                        disabled={!text.trim()}
                        className="px-4 py-2 border border-brand-red/50 bg-brand-red/10 text-brand-red text-[9.5px] font-mono uppercase tracking-[0.1em] hover:bg-brand-red hover:text-bg-primary transition-all duration-300 disabled:opacity-30 disabled:hover:bg-brand-red/10 disabled:hover:text-brand-red disabled:cursor-not-allowed whitespace-nowrap"
                      >
                        Send Feedback
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
