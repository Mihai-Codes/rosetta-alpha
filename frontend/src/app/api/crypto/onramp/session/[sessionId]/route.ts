/**
 * GET /api/crypto/onramp/session/[sessionId] — Poll Stripe Onramp session status
 * ================================================================================
 *
 * Returns the current status and transaction_details for a given onramp session.
 * Also activates subscription server-side when fulfillment_complete is detected,
 * eliminating DB write latency as a concern (belt-and-suspenders with webhook).
 */

import { NextResponse } from 'next/server'
import { NO_STORE_HEADERS, handleServerError, requireAuth } from '@/lib/api-utils'
import { getStripeOnrampSession } from '@/lib/stripe-api'
import { Tier, activateSubscription, isValidTier } from '@/lib/subscription'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const authError = await requireAuth()
    if (authError) return authError

    const { sessionId } = await params

    if (!sessionId || !sessionId.startsWith('cos_')) {
      return NextResponse.json(
        { success: false, error: 'Invalid session ID format' },
        { status: 400, headers: NO_STORE_HEADERS }
      )
    }

    const session = await getStripeOnrampSession(sessionId)

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch onramp session' },
        { status: 404, headers: NO_STORE_HEADERS }
      )
    }

    // Update the purchase record in DB
    if (session.status) {
      const txHash = (session.transaction_details as Record<string, unknown> | null)?.transaction_id as string | null
      await prisma.onrampPurchase.update({
        where: { stripeSessionId: sessionId },
        data: { status: session.status, destinationTxHash: txHash },
      }).catch(() => {})
    }

    // Belt-and-suspenders: activate subscription server-side when we detect
    // fulfillment_complete. This eliminates DB latency as a concern — the
    // subscription is activated at the same moment the status is returned.
    if (session.status === 'fulfillment_complete' && session.metadata) {
      const walletAddress = session.metadata.wallet_address as string | undefined
      const tier = Number(session.metadata.tier) as Tier

      if (walletAddress && isValidTier(tier)) {
        try {
          await activateSubscription(walletAddress, tier, sessionId)
        } catch (err) {
          console.error(`[poll] Failed to activate subscription for ${walletAddress}:`, err)
        }
      }
    }

    return NextResponse.json(
      {
        success: true,
        status: session.status,
        transactionDetails: session.transaction_details ?? null,
        metadata: session.metadata ?? null,
      },
      { headers: NO_STORE_HEADERS }
    )
  } catch (error) {
    return handleServerError(error, 'Onramp session poll')
  }
}
