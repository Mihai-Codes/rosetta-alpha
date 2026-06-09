/**
 * GET /api/keys/list — List API keys for a wallet
 * ================================================
 *
 * Accepts ?wallet=0x... query param.
 * Returns list of keys (without plaintext) for the wallet.
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { NO_STORE_HEADERS, isValidEthereumAddress, handleServerError } from '@/lib/api-utils'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const wallet = searchParams.get('wallet') ?? ''

    if (!isValidEthereumAddress(wallet)) {
      return NextResponse.json(
        { success: false, error: 'Invalid wallet address' },
        { status: 400, headers: NO_STORE_HEADERS }
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
