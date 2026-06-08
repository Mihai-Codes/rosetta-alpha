/**
 * GET /api/crypto/onramp/session/[sessionId] — Poll Stripe Onramp session status
 * ================================================================================
 *
 * Returns the current status and transaction_details for a given onramp session.
 * Used by the frontend to check if payment completed (handles race with webhook).
 */

import { NextResponse } from 'next/server'
import { NO_STORE_HEADERS, handleServerError } from '@/lib/api-utils'
import { getStripeOnrampSession } from '@/lib/stripe-api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
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
