/**
 * POST /api/crypto/onramp/session — Create a Stripe Crypto Onramp session
 * =========================================================================
 *
 * Accepts { amount_usd, tier, wallet_address } and returns { clientSecret, sessionId }.
 * The frontend uses @stripe/crypto's loadStripeOnramp() + createSession() to mount the widget.
 *
 * Stripe Onramp API is NOT in the Node.js SDK — we call it via raw HTTP.
 * Retry logic + error labels are in lib/stripe-api.ts (DRY).
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Tier, TIER_PRICES_USD, isValidTier } from '@/lib/subscription'
import { NO_STORE_HEADERS, isValidEthereumAddress, handleServerError, requireAuth } from '@/lib/api-utils'
import { createStripeOnrampSession } from '@/lib/stripe-api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type SessionPayload = {
  amount_usd?: unknown
  tier?: unknown
  wallet_address?: unknown
}

export async function POST(req: Request) {
  try {
    const authError = await requireAuth()
    if (authError) return authError

    const body = (await req.json().catch(() => null)) as SessionPayload | null

    const walletAddress = typeof body?.wallet_address === 'string' ? body.wallet_address.trim() : ''
    const tier = body?.tier
    const amountUsd = typeof body?.amount_usd === 'number' ? body.amount_usd : null

    if (!isValidEthereumAddress(walletAddress)) {
      return NextResponse.json(
        { success: false, error: 'Invalid Ethereum wallet address' },
        { status: 400, headers: NO_STORE_HEADERS }
      )
    }

    if (!isValidTier(tier)) {
      return NextResponse.json(
        { success: false, error: 'Invalid tier — must be "premium" or "pro"' },
        { status: 400, headers: NO_STORE_HEADERS }
      )
    }

    const expectedAmount = TIER_PRICES_USD[tier]
    if (amountUsd !== expectedAmount) {
      return NextResponse.json(
        { success: false, error: `Amount must be ${expectedAmount} USD for ${tier === Tier.Premium ? 'Premium' : 'Pro'} tier` },
        { status: 400, headers: NO_STORE_HEADERS }
      )
    }

    // Build form-encoded body for Stripe API
    const params = new URLSearchParams()
    params.append('wallet_addresses[ethereum]', walletAddress)
    params.append('source_currency', 'usd')
    params.append('source_amount', amountUsd.toString())
    params.append('destination_currency', 'usdc')
    params.append('destination_network', 'ethereum')
    params.append('destination_currencies[]', 'usdc')
    params.append('destination_networks[]', 'ethereum')
    params.append('lock_wallet_address', 'true')
    params.append('metadata[tier]', tier.toString())
    params.append('metadata[wallet_address]', walletAddress)

    const { session, error, code } = await createStripeOnrampSession(params)

    if (!session) {
      console.error('Stripe onramp session creation failed:', code, error)
      return NextResponse.json(
        { success: false, error, code },
        { status: 502, headers: NO_STORE_HEADERS }
      )
    }

    // Persist the session for webhook correlation and polling.
    // Clean up any stale purchase records for this wallet+tier first
    // (user may have retried after a failed/expired session).
    await prisma.onrampPurchase.deleteMany({
      where: {
        userWallet: walletAddress.toLowerCase(),
        tier: tier as number,
        status: { notIn: ['fulfillment_complete'] },
      },
    }).catch(() => {})

    await prisma.onrampPurchase.create({
      data: {
        userWallet: walletAddress.toLowerCase(),
        amountUsdc: amountUsd,
        tier: tier as number,
        stripeSessionId: session.id,
        status: session.status ?? 'initialized',
      },
    }).catch((err) => {
      console.warn('Failed to persist onramp purchase record:', err)
    })

    const isTestMode = process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_') ?? true

    return NextResponse.json(
      {
        success: true,
        clientSecret: session.client_secret,
        sessionId: session.id,
        testMode: isTestMode,
      },
      { headers: NO_STORE_HEADERS }
    )
  } catch (error) {
    return handleServerError(error, 'Onramp session creation')
  }
}
