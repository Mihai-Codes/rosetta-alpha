/**
 * GET /api/keys/list — List API keys for the authenticated wallet
 * ===============================================================
 *
 * Returns list of keys (without plaintext) for the authenticated user's wallet.
 */

import { NextResponse } from 'next/server'
import { auth } from '../../../../../auth'
import { prisma } from '@/lib/prisma'
import { NO_STORE_HEADERS, handleServerError } from '@/lib/api-utils'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await auth()
    const wallet = (session?.user as { wallet?: string } | undefined)?.wallet

    if (!wallet) {
      return NextResponse.json(
        { success: false, error: 'Authentication required — connect your wallet' },
        { status: 401, headers: NO_STORE_HEADERS }
      )
    }

    const keys = await prisma.apiKey.findMany({
      where: { wallet: wallet.toLowerCase() },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        tier: true,
        active: true,
        lastUsed: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(
      { success: true, keys },
      { headers: NO_STORE_HEADERS }
    )
  } catch (error) {
    return handleServerError(error, 'API key listing')
  }
}
