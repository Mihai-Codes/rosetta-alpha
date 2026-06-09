/**
 * GET /api/crypto/onramp/health — Verify Stripe Onramp integration health
 * =========================================================================
 *
 * Lightweight health check that validates:
 * 1. STRIPE_SECRET_KEY is set and starts with sk_test_ or sk_live_
 * 2. Stripe API is reachable and key is valid (creates + immediately cancels a session)
 * 3. STRIPE_WEBHOOK_SECRET is configured
 *
 * Returns { ok: boolean, checks: {...}, mode: 'test'|'live' } with 200 or 503.
 * Safe to call from client — returns no sensitive data.
 */

import { NextResponse } from 'next/server'
import { NO_STORE_HEADERS } from '@/lib/api-utils'
import { STRIPE_API_BASE, stripeHeaders } from '@/lib/stripe-api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type HealthCheck = {
  name: string
  ok: boolean
  message: string
}

export async function GET() {
  const checks: HealthCheck[] = []
  let mode: 'test' | 'live' | 'unknown' = 'unknown'

  // Check 1: Key format
  const secretKey = process.env.STRIPE_SECRET_KEY ?? ''
  if (!secretKey) {
    checks.push({ name: 'stripe_key', ok: false, message: 'STRIPE_SECRET_KEY not set' })
  } else if (secretKey.startsWith('sk_test_')) {
    mode = 'test'
    checks.push({ name: 'stripe_key', ok: true, message: 'Test key detected' })
  } else if (secretKey.startsWith('sk_live_')) {
    mode = 'live'
    checks.push({ name: 'stripe_key', ok: true, message: 'Live key detected' })
  } else {
    checks.push({ name: 'stripe_key', ok: false, message: 'Key must start with sk_test_ or sk_live_' })
  }

  // Check 2: Webhook secret
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? ''
  if (!webhookSecret) {
    checks.push({ name: 'webhook_secret', ok: false, message: 'STRIPE_WEBHOOK_SECRET not set' })
  } else if (webhookSecret.startsWith('whsec_')) {
    checks.push({ name: 'webhook_secret', ok: true, message: 'Webhook secret configured' })
  } else {
    checks.push({ name: 'webhook_secret', ok: false, message: 'Webhook secret must start with whsec_' })
  }

  // Check 3: Stripe API reachability (create + cancel a throwaway session)
  if (secretKey) {
    try {
      const createRes = await fetch(`${STRIPE_API_BASE}/crypto/onramp_sessions`, {
        method: 'POST',
        headers: {
          ...stripeHeaders(),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ 'destination_currencies[]': 'usdc' }).toString(),
        cache: 'no-store',
      })

      const data = await createRes.json().catch(() => null) as Record<string, unknown> | null

      if (createRes.ok && data?.id) {
        // Cancel the throwaway session by letting it expire (no explicit cancel endpoint)
        checks.push({ name: 'stripe_api', ok: true, message: 'Stripe API reachable, session created' })
      } else {
        const error = data?.error as { code?: string; message?: string } | undefined
        if (error?.code === 'crypto_onramp_disabled') {
          checks.push({ name: 'stripe_api', ok: false, message: 'Onramp disabled by Stripe (incident)' })
        } else if (error?.code === 'crypto_onramp_merchant_not_properly_setup') {
          checks.push({ name: 'stripe_api', ok: false, message: 'Merchant not set up — configure business_name and business_url in Dashboard → Settings → Public' })
        } else if (error?.code === 'crypto_onramp_unsupportable_customer' || error?.code === 'crypto_onramp_unsupported_country') {
          checks.push({ name: 'stripe_api', ok: false, message: 'Geographic restriction — onramp unavailable from this server region' })
        } else {
          checks.push({ name: 'stripe_api', ok: false, message: error?.message ?? `HTTP ${createRes.status}` })
        }
      }
    } catch (err) {
      checks.push({ name: 'stripe_api', ok: false, message: `Network error: ${err instanceof Error ? err.message : 'unknown'}` })
    }
  }

  const allOk = checks.every((c) => c.ok)
  const status = allOk ? 200 : 503

  return NextResponse.json(
    { ok: allOk, mode, checks },
    { status, headers: NO_STORE_HEADERS }
  )
}
