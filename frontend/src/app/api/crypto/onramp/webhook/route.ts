/**
 * POST /api/crypto/onramp/webhook — Stripe Crypto Onramp webhook handler
 * =======================================================================
 *
 * Listens for: crypto.onramp_session.updated
 * On fulfillment_complete: persists the purchase and activates subscription.
 *
 * IMPORTANT: Stripe requires the raw body for signature verification.
 * We disable Next.js body parsing and read req.text() instead.
 *
 * STATUS: Dormant — Stripe has not yet added crypto.onramp_session.updated
 * to the Dashboard webhook event picker (beta event). This code is correct
 * and ready. When Stripe enables it:
 *   1. Go to Developers → Webhooks → Add destination
 *   2. URL: https://rosetta-alpha.vercel.app/api/crypto/onramp/webhook
 *   3. Event: crypto.onramp_session.updated
 *
 * Until then, the frontend relies on client-side polling as the primary
 * completion detection path (see CryptoOnrampModal).
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Tier, activateSubscription, isValidTier } from '@/lib/subscription'
import { NO_STORE_HEADERS } from '@/lib/api-utils'
import { createHmac, timingSafeEqual } from 'crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

// Disable body parser — Stripe needs the raw body for signature verification
export const config = {
  api: {
    bodyParser: false,
  },
}

// -------------------------------------------------------------------
// Stripe signature verification (HMAC-SHA256, no SDK required)
// -------------------------------------------------------------------

function verifyStripeSignature(
  rawBody: string,
  signatureHeader: string | null,
  webhookSecret: string
): boolean {
  if (!signatureHeader) return false

  // Stripe signature format: t=timestamp,v1=signature[,v1=...]
  const parts = signatureHeader.split(',').reduce<Record<string, string>>((acc, part) => {
    const [key, ...rest] = part.split('=')
    acc[key] = rest.join('=')
    return acc
  }, {})

  const timestamp = parts.t
  const signature = parts.v1

  if (!timestamp || !signature) return false

  // Reject if timestamp is older than 5 minutes (replay protection)
  const tolerance = 300
  const now = Math.floor(Date.now() / 1000)
  if (Math.abs(now - Number(timestamp)) > tolerance) return false

  const signedPayload = `${timestamp}.${rawBody}`
  const expectedSignature = createHmac('sha256', webhookSecret)
    .update(signedPayload)
    .digest('hex')

  // Constant-time comparison to prevent timing attacks
  const sigBuffer = Buffer.from(signature, 'utf8')
  const expectedBuffer = Buffer.from(expectedSignature, 'utf8')

  if (sigBuffer.length !== expectedBuffer.length) return false
  return timingSafeEqual(sigBuffer, expectedBuffer)
}

// -------------------------------------------------------------------
// Route handler
// -------------------------------------------------------------------

export async function POST(req: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not set')
    return NextResponse.json(
      { success: false, error: 'Webhook secret not configured' },
      { status: 500, headers: NO_STORE_HEADERS }
    )
  }

  // Read raw body for signature verification
  const rawBody = await req.text()
  if (!rawBody) {
    return NextResponse.json(
      { success: false, error: 'Empty webhook body' },
      { status: 400, headers: NO_STORE_HEADERS }
    )
  }

  // Verify signature (skip in development if no secret)
  const isDev = process.env.NODE_ENV !== 'production'
  const signatureHeader = req.headers.get('stripe-signature')

  if (!isDev || webhookSecret) {
    const valid = verifyStripeSignature(rawBody, signatureHeader, webhookSecret)
    if (!valid) {
      return NextResponse.json(
        { success: false, error: 'Invalid Stripe webhook signature' },
        { status: 401, headers: NO_STORE_HEADERS }
      )
    }
  }

  let event: Record<string, unknown>
  try {
    event = JSON.parse(rawBody) as Record<string, unknown>
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON payload' },
      { status: 400, headers: NO_STORE_HEADERS }
    )
  }

  // We only care about onramp_session.updated
  if (event.type !== 'crypto.onramp_session.updated') {
    return NextResponse.json({ success: true, received: true }, { headers: NO_STORE_HEADERS })
  }

  const data = event.data as { object?: Record<string, unknown> } | undefined
  const session = data?.object as Record<string, unknown> | undefined
  if (!session) {
    return NextResponse.json({ success: true, received: true }, { headers: NO_STORE_HEADERS })
  }

  const status = session.status as string | undefined
  const sessionId = session.id as string | undefined
  const metadata = session.metadata as Record<string, string> | undefined
  const transactionDetails = session.transaction_details as Record<string, unknown> | undefined

  console.log(`[webhook] onramp_session.updated — id=${sessionId} status=${status}`)

  // Update the purchase record
  if (sessionId) {
    await prisma.onrampPurchase.update({
      where: { stripeSessionId: sessionId },
      data: {
        status: status ?? 'unknown',
        destinationTxHash: (transactionDetails?.transaction_id as string) ?? null,
      },
    }).catch((err) => {
      console.warn(`Failed to update onramp purchase ${sessionId}:`, err)
    })
  }

  // On fulfillment_complete: activate subscription via shared helper
  if (status === 'fulfillment_complete' && sessionId && metadata) {
    const walletAddress = metadata.wallet_address
    const tier = Number(metadata.tier) as Tier

    if (walletAddress && isValidTier(tier)) {
      try {
        await activateSubscription(walletAddress, tier, sessionId)
        console.log(`[webhook] Subscription activated — wallet=${walletAddress} tier=${tier}`)
      } catch (err) {
        console.error(`[webhook] Failed to activate subscription for ${walletAddress}:`, err)
      }
    }
  }

  // Return 200 immediately — Stripe expects fast response
  return NextResponse.json({ success: true, received: true }, { headers: NO_STORE_HEADERS })
}
