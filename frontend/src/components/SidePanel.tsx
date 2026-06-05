'use client'

import React from 'react'
import { X } from 'lucide-react'

interface SidePanelProps {
  isOpen: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: React.ReactNode
}

function getFocusable(container: HTMLElement): HTMLElement[] {
  const selectors = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(',')
  return Array.from(container.querySelectorAll<HTMLElement>(selectors)).filter(
    (el) => !el.hasAttribute('disabled') && !el.getAttribute('aria-hidden')
  )
}

export function SidePanel({ isOpen, onClose, title, subtitle, children }: SidePanelProps) {
  const panelRef = React.useRef<HTMLDivElement | null>(null)
  const lastActiveRef = React.useRef<HTMLElement | null>(null)

  React.useEffect(() => {
    if (!isOpen) return

    lastActiveRef.current = document.activeElement as HTMLElement | null
    const panel = panelRef.current
    if (panel) {
      const focusables = getFocusable(panel)
      ;(focusables[0] ?? panel).focus()
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }

      if (event.key !== 'Tab') return
      const activePanel = panelRef.current
      if (!activePanel) return

      const focusables = getFocusable(activePanel)
      if (focusables.length === 0) {
        event.preventDefault()
        activePanel.focus()
        return
      }

      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const current = document.activeElement as HTMLElement | null

      if (event.shiftKey && current === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && current === last) {
        event.preventDefault()
        first.focus()
      }
    }

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = prevOverflow
      lastActiveRef.current?.focus?.()
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[120]">
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="Close panel overlay"
      />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="absolute right-0 top-0 h-full w-full max-w-[900px] bg-black border-l border-white/10 p-5 sm:p-6 overflow-y-auto"
      >
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <p className="text-[10px] uppercase tracking-[0.24em] text-brand-red">Provenance Chain</p>
            <h2 className="font-display text-2xl text-white mt-1">{title}</h2>
            {subtitle && <p className="text-[11px] text-text-tertiary mt-2">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 border border-white/15 text-text-secondary hover:text-white hover:border-brand-red transition-colors"
            aria-label="Close panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {children}
      </aside>
    </div>
  )
}
