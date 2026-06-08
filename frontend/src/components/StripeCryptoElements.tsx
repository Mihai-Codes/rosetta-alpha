'use client'

/**
 * StripeCryptoElements — Thin wrapper around @stripe/crypto's OnrampElement
 * ===========================================================================
 *
 * Provides:
 * - CryptoElements provider (resolves stripeOnramp promise, provides context)
 * - useStripeOnramp() hook
 * - OnrampElement component (mounts the Stripe onramp widget)
 *
 * Follows the @stripe/crypto embedded onramp pattern:
 * 1. Load stripeOnramp via loadStripeOnramp(publishableKey)
 * 2. Create session with createSession({ clientSecret })
 * 3. Mount to a DOM node
 * 4. Listen to 'onramp_session_updated' events
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'

// -------------------------------------------------------------------
// Types
// -------------------------------------------------------------------

type StripeOnrampInstance = {
  createSession: (params: { clientSecret: string; appearance?: Record<string, unknown> }) => OnrampSession
}

type OnrampSession = {
  mount: (selector: string) => void
  unmount: () => void
  addEventListener: (event: string, handler: (event: { payload: { session: OnrampSessionData } }) => void) => OnrampSession
}

type OnrampSessionData = {
  id: string
  status: string
  client_secret: string
  transaction_details?: {
    destination_amount?: string
    destination_currency?: string
    destination_network?: string
    source_amount?: string
    source_currency?: string
  }
}

type CryptoElementsContextValue = {
  stripeOnramp: StripeOnrampInstance | null
  loading: boolean
  error: Error | null
}

// -------------------------------------------------------------------
// Context
// -------------------------------------------------------------------

const CryptoElementsContext = createContext<CryptoElementsContextValue>({
  stripeOnramp: null,
  loading: true,
  error: null,
})

// -------------------------------------------------------------------
// Provider
// -------------------------------------------------------------------

interface CryptoElementsProps {
  children: ReactNode
}

export function CryptoElements({ children }: CryptoElementsProps) {
  const [value, setValue] = useState<CryptoElementsContextValue>({
    stripeOnramp: null,
    loading: true,
    error: null,
  })

  useEffect(() => {
    let cancelled = false

    async function loadOnramp() {
      try {
        // Dynamic import — @stripe/crypto must only load client-side
        const { loadStripeOnramp } = await import('@stripe/crypto')
        const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
        if (!publishableKey) throw new Error('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set')

        const onramp = await loadStripeOnramp(publishableKey)
        if (!onramp) throw new Error('loadStripeOnramp returned null — check your publishable key')
        if (!cancelled) {
          setValue({ stripeOnramp: onramp as unknown as StripeOnrampInstance, loading: false, error: null })
        }
      } catch (err) {
        if (!cancelled) {
          setValue({ stripeOnramp: null, loading: false, error: err as Error })
        }
      }
    }

    loadOnramp()
    return () => { cancelled = true }
  }, [])

  return (
    <CryptoElementsContext.Provider value={value}>
      {children}
    </CryptoElementsContext.Provider>
  )
}

// -------------------------------------------------------------------
// Hooks
// -------------------------------------------------------------------

export function useStripeOnramp() {
  return useContext(CryptoElementsContext)
}

// -------------------------------------------------------------------
// OnrampElement — mounts the Stripe onramp widget into a container
// -------------------------------------------------------------------

interface OnrampElementProps {
  clientSecret: string
  appearance?: Record<string, unknown>
  onReady?: () => void
  onChange?: (status: string, session: OnrampSessionData) => void
}

export function OnrampElement({ clientSecret, appearance, onReady, onChange }: OnrampElementProps) {
  const { stripeOnramp, loading, error } = useStripeOnramp()
  const containerRef = useRef<HTMLDivElement>(null)
  const sessionRef = useRef<OnrampSession | null>(null)

  useEffect(() => {
    if (!stripeOnramp || !containerRef.current || !clientSecret) return

    let cancelled = false

    // Unmount any previous session
    sessionRef.current?.unmount()

    const session = stripeOnramp.createSession({ clientSecret, appearance })
    sessionRef.current = session

    session.addEventListener('onramp_ui_loaded', () => {
      if (!cancelled) onReady?.()
    })

    session.addEventListener('onramp_session_updated', (event) => {
      if (!cancelled) onChange?.(event.payload.session.status, event.payload.session)
    })

    // Mount uses a CSS selector — assign an ID to the container
    if (containerRef.current) {
      containerRef.current.id = `onramp-mount-${Date.now()}`
      session.mount(`#${containerRef.current.id}`)
    }

    return () => {
      cancelled = true
      session.unmount()
      sessionRef.current = null
    }
  }, [stripeOnramp, clientSecret, appearance, onReady, onChange])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 bg-bg-primary rounded-lg border border-border">
        <div className="flex items-center gap-3 text-text-secondary">
          <div className="w-4 h-4 border-2 border-brand-red border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Loading payment form…</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 bg-bg-primary rounded-lg border border-negative/30">
        <p className="text-sm text-negative">
          Failed to load payment form. Please try again or use wallet payment.
        </p>
      </div>
    )
  }

  return <div ref={containerRef} className="onramp-element" />
}
