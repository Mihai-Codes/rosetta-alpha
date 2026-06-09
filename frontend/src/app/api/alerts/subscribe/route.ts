/**
 * POST /api/alerts/subscribe — Subscribe to email alerts
 * =======================================================
 *
 * Accepts { wallet, email, types? } and stores the subscription.
 * Types default to "regime_change,divergence".
 *
 * Skeleton endpoint — email sending is not yet implemented.
 * When email infra is added, this record becomes the subscription list.
 */

import { NextResponse } from 'next/server'
import { auth } from '../../../../../auth'
import { prisma } from '@/lib/prisma'
import { NO_STORE_HEADERS, handleServerError, isValidEthereumAddress } from '@/lib/api-utils'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const VALID_ALERT_TYPES = ['regime_change', 'divergence', 'thesis_update', 'market_event']

type AlertPayload = {
  wallet?: unknown
  email?: unknown
  types?: unknown
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401, headers: NO_STORE_HEADERS }
      )
    }

    const body = (await req.json().catch(() => null)) as AlertPayload | null
    const wallet = typeof body?.wallet === 'string' ? body.wallet.trim() : ''

    if (!wallet || !isValidEthereumAddress(wallet)) {
      return NextResponse.json(
        { success: false, error: 'Invalid wallet address' },
        { status: 400, headers: NO_STORE_HEADERS }
      )
    }

    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email address' },
        { status: 400, headers: NO_STORE_HEADERS }
      )
    }

    // Validate and filter alert types
    let alertTypes = ['regime_change', 'divergence']
    if (Array.isArray(body?.types)) {
      const filtered = (body.types as unknown[]).filter(
        (t): t is string => typeof t === 'string' && VALID_ALERT_TYPES.includes(t)
      )
      if (filtered.length > 0) alertTypes = filtered
    }

    const record = await prisma.alertSubscription.upsert({
      where: {
        wallet_email: { wallet: wallet.toLowerCase(), email },
      },
      update: {
        types: alertTypes.join(','),
        active: true,
      },
      create: {
        wallet: wallet.toLowerCase(),
        email,
        types: alertTypes.join(','),
        active: true,
      },
      select: {
        id: true,
        wallet: true,
        email: true,
        types: true,
        active: true,
        createdAt: true,
      },
    })

    return NextResponse.json(
      { success: true, subscription: record },
      { headers: NO_STORE_HEADERS }
    )
  } catch (error) {
    return handleServerError(error, 'Alert subscription')
  }
}
