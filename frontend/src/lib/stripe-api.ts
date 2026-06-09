/**
 * Stripe Crypto Onramp — shared API helpers, constants, and types.
 *
 * DRY: single source of truth for Stripe API base URL, version header,
 * auth helpers, onramp-specific types, and retry logic.
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
    colorTextSecondary: '#888888',
  },
} as const

/** Human-readable Stripe error codes we handle specifically. */
export const STRIPE_ERROR_LABELS: Record<string, string> = {
  crypto_onramp_disabled: 'Stripe onramp is temporarily disabled (incident)',
  crypto_onramp_unsupportable_customer: 'Onramp unavailable in your region',
  crypto_onramp_unsupported_country: 'Onramp unavailable in your country',
  crypto_onramp_merchant_not_properly_setup: 'Merchant account not configured — business_name and business_url required in Dashboard → Settings → Public',
  crypto_onramp_invalid_source_destination_pair: 'Cannot set both source_amount and destination_amount',
  crypto_onramp_incomplete_destination_currency_and_network_pair: 'Must set both destination_currency and destination_network',
  crypto_onramp_missing_source_currency: 'source_currency required when source_amount is set',
  crypto_onramp_invalid_source_amount: 'source_amount must be a positive number',
  crypto_onramp_missing_destination_currency: 'destination_currency required when destination_amount is set',
  crypto_onramp_invalid_destination_amount: 'destination_amount must be a positive number',
  crypto_onramp_conflicting_destination_currency: 'destination_currency must be in destination_currencies array',
  crypto_onramp_conflicting_destination_network: 'destination_network must be in destination_networks array',
}

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

/** Stripe API error shape. */
type StripeApiError = {
  type?: string
  code?: string
  message?: string
}

// -------------------------------------------------------------------
// Retry + fetch helpers
// -------------------------------------------------------------------

const MAX_RETRIES = 2
const BASE_DELAY_MS = 300

/**
 * Fetch with exponential backoff. Retries on 5xx and network errors only.
 * Returns { ok, status, data } — never throws.
 */
async function stripeFetchWithRetry(
  url: string,
  options: RequestInit,
  retries = MAX_RETRIES,
): Promise<{ ok: boolean; status: number; data: Record<string, unknown> | null }> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { ...options, cache: 'no-store' })
      const data = await res.json().catch(() => null) as Record<string, unknown> | null

      // Don't retry client errors (4xx) — they're deterministic
      if (res.ok || (res.status >= 400 && res.status < 500)) {
        return { ok: res.ok, status: res.status, data }
      }

      // Retry on 5xx
      if (attempt < retries) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt)
        await new Promise((r) => setTimeout(r, delay))
        continue
      }

      return { ok: false, status: res.status, data }
    } catch (err) {
      // Network error — retry
      if (attempt < retries) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt)
        await new Promise((r) => setTimeout(r, delay))
        continue
      }
      return { ok: false, status: 0, data: null }
    }
  }

  return { ok: false, status: 0, data: null }
}

// -------------------------------------------------------------------
// API call helpers
// -------------------------------------------------------------------

/**
 * Create a Stripe onramp session with retry logic.
 * Returns the parsed session or a structured error.
 */
export async function createStripeOnrampSession(
  params: URLSearchParams,
): Promise<{ session: StripeOnrampSession | null; error: string; code: string }> {
  const { ok, status, data } = await stripeFetchWithRetry(
    `${STRIPE_API_BASE}/crypto/onramp_sessions`,
    {
      method: 'POST',
      headers: {
        ...stripeHeaders(),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    },
  )

  if (ok && data?.id && data?.client_secret) {
    return { session: data as unknown as StripeOnrampSession, error: '', code: '' }
  }

  const stripeError = data?.error as StripeApiError | undefined
  const code = stripeError?.code ?? 'stripe_error'
  const error = STRIPE_ERROR_LABELS[code] ?? stripeError?.message ?? `Stripe API error (HTTP ${status})`

  return { session: null, error, code }
}

/**
 * Retrieve a Stripe onramp session by ID.
 * Returns the parsed session or null on error.
 */
export async function getStripeOnrampSession(sessionId: string): Promise<StripeOnrampSession | null> {
  const { ok, data } = await stripeFetchWithRetry(
    `${STRIPE_API_BASE}/crypto/onramp_sessions/${sessionId}`,
    {
      method: 'GET',
      headers: stripeHeaders(),
    },
  )

  if (!ok || !data?.id) return null
  return data as unknown as StripeOnrampSession
}
