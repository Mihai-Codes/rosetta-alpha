/**
 * Stripe Crypto Onramp — shared API helpers, constants, and types.
 *
 * DRY: single source of truth for Stripe API base URL, version header,
 * auth helpers, and onramp-specific types.
 */

import { NO_STORE_HEADERS } from './api-utils'

// -------------------------------------------------------------------
// Constants
// -------------------------------------------------------------------

export const STRIPE_API_BASE = 'https://api.stripe.com/v1'
export const STRIPE_VERSION = '2025-10-29.clover;crypto_onramp_beta=v2'

/** Stripe onramp widget appearance — dark theme matching Rosetta design system. */
export const STRIPE_ONRAMP_APPEARANCE = {
  theme: 'dark',
  variables: {
    colorBackground: '#000000',
    colorPrimary: '#D82B2B',
    colorText: '#ffffff',
    colorTextSecondary: '#999999',
  },
} as const

// -------------------------------------------------------------------
// Auth helpers
// -------------------------------------------------------------------

/** Get the Stripe secret key or throw. */
export function getStripeKey(): string {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set')
  return key
}

/** Build standard Stripe API request headers. */
export function stripeHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${getStripeKey()}`,
    'Stripe-Version': STRIPE_VERSION,
  }
}

// -------------------------------------------------------------------
// Types
// -------------------------------------------------------------------

/** Transaction details returned by Stripe onramp sessions. */
export type StripeTransactionDetails = {
  destination_amount?: string
  destination_currency?: string
  destination_network?: string
  source_amount?: string
  source_currency?: string
  fees?: {
    network_fee_monetary?: string
    transaction_fee_monetary?: string
  }
}

/** Full Stripe onramp session response (subset of fields we use). */
export type StripeOnrampSession = {
  id: string
  object: string
  status: string
  client_secret: string
  transaction_details?: StripeTransactionDetails
  metadata?: Record<string, string>
}

// -------------------------------------------------------------------
// API call helpers
// -------------------------------------------------------------------

/**
 * Retrieve a Stripe onramp session by ID.
 * Returns the parsed session or null on error.
 */
export async function getStripeOnrampSession(sessionId: string): Promise<StripeOnrampSession | null> {
  const response = await fetch(`${STRIPE_API_BASE}/crypto/onramp_sessions/${sessionId}`, {
    method: 'GET',
    headers: stripeHeaders(),
    cache: 'no-store',
  })

  if (!response.ok) return null
  return response.json() as Promise<StripeOnrampSession>
}
