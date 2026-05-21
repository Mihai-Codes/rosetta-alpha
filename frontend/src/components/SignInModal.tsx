'use client'

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { signIn } from 'next-auth/react'
import posthog from 'posthog-js'
import { X, Terminal } from 'lucide-react'

// Simple global store for modal state so we can trigger it from anywhere
export const authModalState = {
  listeners: new Set<(isOpen: boolean) => void>(),
  isOpen: false,
  open() {
    this.isOpen = true
    this.listeners.forEach(l => l(true))
  },
  close() {
    this.isOpen = false
    this.listeners.forEach(l => l(false))
  },
  subscribe(listener: (isOpen: boolean) => void) {
    this.listeners.add(listener)
    listener(this.isOpen)
    return () => { this.listeners.delete(listener) }
  }
}

async function handleSignIn(provider: 'google' | 'github') {
  posthog.capture('sign_in_attempt', { provider })
  try {
    await signIn(provider, { callbackUrl: window.location.pathname })
  } catch {
    // signIn throws on hard errors only; redirect-based auth resolves via callback
  }
}

export function SignInModal() {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    // Check if we were redirected here by middleware (auth=login)
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      if (url.searchParams.get('auth') === 'login') {
        authModalState.open()
        // Clean up the URL
        url.searchParams.delete('auth')
        window.history.replaceState({}, '', url.toString())
      }
    }
    
    return authModalState.subscribe(setIsOpen)
  }, [])

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') authModalState.close()
    }
    if (isOpen) window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  // Prevent scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          {/* Backdrop Blur */}
          <motion.div
            initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            animate={{ opacity: 1, backdropFilter: 'blur(8px)' }}
            exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 bg-bg-primary/80"
            onClick={() => authModalState.close()}
          />
          
          {/* Modal Container with Terminal CRT Unroll Animation */}
          <motion.div
            initial={{ opacity: 0, clipPath: 'inset(40% 0 60% 0)' }}
            animate={{ opacity: 1, clipPath: 'inset(0% 0 0% 0)' }}
            exit={{ opacity: 0, clipPath: 'inset(50% 0 50% 0)', scale: 0.98 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-md bg-[#050505] border border-border-strong solid-panel overflow-hidden shadow-glow-red-strong rounded-none"
          >
            {/* Subtle CRT Scanline Overlay */}
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] z-20 opacity-20" />

            {/* Animated Red Scanning Line */}
            <motion.div
              animate={{ top: ['-10%', '110%'] }}
              transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
              className="absolute left-0 right-0 h-[2px] bg-brand-red z-30 opacity-60 shadow-[0_0_15px_rgba(216,43,43,1)]"
            />

            {/* Close Button */}
            <button
              onClick={() => authModalState.close()}
              className="absolute top-4 right-4 text-text-secondary hover:text-brand-red transition-colors z-40 bg-bg-primary/50 p-1 border border-transparent hover:border-brand-red/50"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="relative z-30 p-8 sm:p-10">
              {/* Header / Brand */}
              <div className="mb-8 text-left border-b border-border pb-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-8 h-8 border border-brand-red/40 bg-brand-red/10 flex items-center justify-center box-glow-pulse">
                    <Terminal className="w-4 h-4 text-brand-red" />
                  </div>
                  <p className="font-mono text-brand-red text-[10px] uppercase tracking-[0.3em]">
                    System Login
                  </p>
                </div>
                <h2 className="font-display text-3xl sm:text-4xl text-text-primary mb-3 leading-tight flex items-center gap-2">
                  Terminal <span className="text-brand-red">Access</span>
                  {/* Blinking Cursor */}
                  <motion.span 
                    animate={{ opacity: [1, 1, 0, 0, 1] }} 
                    transition={{ repeat: Infinity, duration: 0.9, times: [0, 0.49, 0.5, 0.99, 1], ease: "linear" }} 
                    className="inline-block w-3 h-7 bg-brand-red translate-y-[2px]"
                  />
                </h2>
                <p className="text-text-secondary text-xs sm:text-sm leading-relaxed font-mono">
                  {'>'} Authenticate to decrypt global macro intelligence_
                </p>
              </div>

              {/* Auth Buttons */}
              <div className="space-y-4">
                <button
                  onClick={() => handleSignIn('google')}
                  className="group relative w-full flex items-center gap-4 px-5 py-4 border border-border-strong bg-[#0A0A0A] hover:bg-[#111111] hover:border-brand-red/60 text-text-primary text-[11px] font-mono uppercase tracking-[0.15em] transition-all duration-300"
                >
                  <div className="absolute inset-0 bg-brand-red/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <svg className="w-4 h-4 shrink-0 relative z-10 grayscale group-hover:grayscale-0 transition-all duration-300" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span className="relative z-10">Initialize via Google</span>
                  <span className="absolute right-5 text-brand-red/0 group-hover:text-brand-red/80 transition-colors font-mono relative z-10 font-bold">→</span>
                </button>

                <button
                  onClick={() => handleSignIn('github')}
                  className="group relative w-full flex items-center gap-4 px-5 py-4 border border-border-strong bg-[#0A0A0A] hover:bg-[#111111] hover:border-brand-red/60 text-text-primary text-[11px] font-mono uppercase tracking-[0.15em] transition-all duration-300"
                >
                  <div className="absolute inset-0 bg-brand-red/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <svg className="w-4 h-4 shrink-0 relative z-10 text-text-secondary group-hover:text-white transition-colors duration-300" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
                  </svg>
                  <span className="relative z-10">Initialize via GitHub</span>
                  <span className="absolute right-5 text-brand-red/0 group-hover:text-brand-red/80 transition-colors font-mono relative z-10 font-bold">→</span>
                </button>
              </div>
              
              <div className="mt-8 pt-6 border-t border-border text-left">
                <p className="text-text-tertiary font-mono text-[9px] uppercase tracking-[0.2em] opacity-80">
                  [SYS_MSG] Authenticating confirms Terms of Service agreement.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
