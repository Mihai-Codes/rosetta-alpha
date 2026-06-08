/**
 * POST /api/crypto/onramp/session — Create a Stripe Crypto Onramp session
 * =========================================================================
 *
 * Accepts { amount_usd, tier, wallet_address } and returns { clientSecret, sessionId }.
 * The frontend uses @stripe/crypto's loadStripeOnramp() + createSession() to mount the widget.
 *
 * Stripe Onramp API is NOT in the Node.js SDK — we call it via raw HTTP.
 * Required header: Stripe-Version: 2025-10-29.clover;crypto_onramp_beta=v2
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Tier, TIER_PRICES_USD, isValidTier } from '@/lib/subscription'
import { NO_STORE_HEADERS, isValidEthereumAddress, handleServerError } from '@/lib/api-utils'
import { STRIPE_API_BASE, stripeHeaders } from '@/lib/stripe-api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

type SessionPayload = {
  amount_usd?: unknown
  tier?: unknown
  wallet_address?: unknown
}

export async function POST(req: Request) {
  try {
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

    const response = await fetch(`${STRIPE_API_BASE}/crypto/onramp_sessions`, {
      method: 'POST',
      headers: {
        ...stripeHeaders(),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
      cache: 'no-store',
    })

    const data = await response.json().catch(() => null) as Record<string, unknown> | null

    if (!response.ok || !data?.id || !data?.client_secret) {
      const error = data?.error as { message?: string; code?: string } | undefined
      console.error('Stripe onramp session creation failed:', error ?? data)
      return NextResponse.json(
        {
          success: false,
          error: error?.message ?? 'Failed to create onramp session',
          code: error?.code ?? 'stripe_error',
        },
        { status: response.status >= 400 && response.status < 600 ? response.status : 502, headers: NO_STORE_HEADERS }
      )
    }

    // Persist the session for webhook correlation and polling
    await prisma.onrampPurchase.create({
      data: {
        userWallet: walletAddress.toLowerCase(),
        amountUsdc: amountUsd,
        tier: tier as number,
        stripeSessionId: data.id as string,
        status: (data.status as string) ?? 'initialized',
      },
    }).catch((err) => {
      console.warn('Failed to persist onramp purchase record:', err)
    })

    return NextResponse.json(
      {
        success: true,
        clientSecret: data.client_secret,
        sessionId: data.id,
      },
      { headers: NO_STORE_HEADERS }
    )
  } catch (error) {
    return handleServerError(error, 'Onramp session creation')
  }
}
