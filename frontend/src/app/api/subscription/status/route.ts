/**
 * GET /api/subscription/status?wallet=0x... — Check subscription tier
 * ====================================================================
 *
 * Returns the current subscription status for a wallet address.
 * Checks both on-chain (RosettaSubscription.sol) and DB (Stripe purchases).
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSubscriptionStatus, TIER_LABELS, Tier } from '@/lib/subscription'
import { NO_STORE_HEADERS, isValidEthereumAddress, handleServerError } from '@/lib/api-utils'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const wallet = searchParams.get('wallet')

    if (!wallet || !isValidEthereumAddress(wallet)) {
      return NextResponse.json(
        { success: false, error: 'Invalid or missing wallet address' },
        { status: 400, headers: NO_STORE_HEADERS }
      )
    }

    const walletLower = wallet.toLowerCase()

    // 1. Check on-chain subscription first (source of truth)
    try {
      const onChainStatus = await getSubscriptionStatus(wallet as `0x${string}`)
      if (onChainStatus.active) {
        return NextResponse.json(
          {
            success: true,
            tier: onChainStatus.tier,
            tierLabel: TIER_LABELS[onChainStatus.tier as Tier] ?? 'Free',
            expiresAt: onChainStatus.expiresAt,
            source: 'on-chain',
          },
          { headers: NO_STORE_HEADERS }
        )
      }
    } catch {
      // On-chain read failed — fall through to DB check
    }

    // 2. Check DB subscription (from Stripe onramp purchases)
    const dbSubscription = await prisma.subscription.findUnique({
      where: { userWallet: walletLower },
    }).catch(() => null)

    if (dbSubscription && new Date(dbSubscription.expiresAt) > new Date()) {
      return NextResponse.json(
        {
          success: true,
          tier: dbSubscription.tier,
          tierLabel: TIER_LABELS[dbSubscription.tier as Tier] ?? 'Free',
          expiresAt: Math.floor(new Date(dbSubscription.expiresAt).getTime() / 1000),
          source: 'stripe-onramp',
        },
        { headers: NO_STORE_HEADERS }
      )
    }

    // 3. No active subscription
    return NextResponse.json(
      {
        success: true,
        tier: Tier.None,
        tierLabel: TIER_LABELS[Tier.None],
        expiresAt: 0,
        source: 'none',
      },
      { headers: NO_STORE_HEADERS }
    )
  } catch (error) {
    return handleServerError(error, 'Subscription status check')
  }
}
