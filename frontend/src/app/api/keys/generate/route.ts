/**
 * POST /api/keys/generate — Generate a new API key
 * =================================================
 *
 * Accepts { wallet, name } and returns a new API key.
 * The key is hashed before storage; only the plaintext is returned once.
 *
 * Requires Pro subscription. Max 5 active keys per wallet.
 */

import { NextResponse } from 'next/server'
import { createHash, randomBytes } from 'crypto'
import { auth } from '../../../../../auth'
import { prisma } from '@/lib/prisma'
import { NO_STORE_HEADERS, handleServerError, isValidEthereumAddress } from '@/lib/api-utils'
import { Tier } from '@/lib/subscription'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type KeyPayload = {
  wallet?: unknown
  name?: unknown
}

function generateApiKey(): { plaintext: string; hash: string; prefix: string } {
  const raw = randomBytes(32).toString('hex')
  const plaintext = `rs_${raw}`
  const hash = createHash('sha256').update(plaintext).digest('hex')
  const prefix = plaintext.slice(0, 11) // "rs_a1b2c3d4" — 11 chars for display
  return { plaintext, hash, prefix }
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

    const body = (await req.json().catch(() => null)) as KeyPayload | null
    const wallet = typeof body?.wallet === 'string' ? body.wallet.trim() : ''

    if (!wallet || !isValidEthereumAddress(wallet)) {
      return NextResponse.json(
        { success: false, error: 'Invalid wallet address' },
        { status: 400, headers: NO_STORE_HEADERS }
      )
    }

    const name = typeof body?.name === 'string' ? body.name.trim() : ''

    if (!name || name.length < 3 || name.length > 64) {
      return NextResponse.json(
        { success: false, error: 'Key name must be 3-64 characters' },
        { status: 400, headers: NO_STORE_HEADERS }
      )
    }

    // Check subscription tier — API access requires Pro
    const subscription = await prisma.subscription.findUnique({
      where: { userWallet: wallet.toLowerCase() },
      select: { tier: true, expiresAt: true },
    }).catch(() => null)

    const isActive = subscription && subscription.expiresAt > new Date()
    const hasProAccess = isActive && subscription.tier >= Tier.Pro

    if (!hasProAccess) {
      return NextResponse.json(
        { success: false, error: 'API access requires Pro subscription' },
        { status: 403, headers: NO_STORE_HEADERS }
      )
    }

    // Rate limit: max 5 active keys per wallet
    const activeKeys = await prisma.apiKey.count({
      where: { wallet: wallet.toLowerCase(), active: true },
    }).catch(() => 0)

    if (activeKeys >= 5) {
      return NextResponse.json(
        { success: false, error: 'Maximum 5 active API keys per wallet' },
        { status: 429, headers: NO_STORE_HEADERS }
      )
    }

    const { plaintext, hash, prefix } = generateApiKey()

    const record = await prisma.apiKey.create({
      data: {
        wallet: wallet.toLowerCase(),
        name: name.slice(0, 64),
        keyHash: hash,
        keyPrefix: prefix,
        tier: Tier.Pro,
        active: true,
      },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        tier: true,
        active: true,
        createdAt: true,
      },
    })

    return NextResponse.json(
      {
        success: true,
        apiKey: plaintext, // Only returned once
        key: record,
      },
      { headers: NO_STORE_HEADERS }
    )
  } catch (error) {
    return handleServerError(error, 'API key generation')
  }
}
