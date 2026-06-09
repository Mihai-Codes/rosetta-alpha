/**
 * Shared API route utilities — DRY single source of truth.
 *
 * Used by all API routes for consistent response headers, validation,
 * and error handling.
 */

import { NextResponse } from 'next/server'
import { auth } from '../../auth'

/** Standard no-cache headers for all API responses. */
export const NO_STORE_HEADERS = { 'Cache-Control': 'no-store, max-age=0' } as const

/** Validate an Ethereum address (0x + 40 hex chars). */
export function isValidEthereumAddress(addr: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(addr)
}

/**
 * Resolve an env var with a fallback.
 * Handles common misconfigurations: 'undefined', 'null', empty string.
 */
export function getEnv(val: string | undefined, fallback: string): string {
  if (!val || val === 'undefined' || val === 'null' || val === '') return fallback
  return val
}

/**
 * Require authenticated session — returns 401 response if not logged in.
 * DRY: replaces copy-pasted auth guard blocks across all API routes.
 *
 * Usage:
 *   const res = await requireAuth()
 *   if (res) return res  // 401 — stop here
 *   const session = await auth()  // guaranteed non-null after this
 */
export async function requireAuth(): Promise<NextResponse | null> {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401, headers: NO_STORE_HEADERS }
    )
  }
  return null
}

// ─── Arc Testnet Constants ─────────────────────────────────────────────────

/** USDC contract address on Arc Testnet. */
export const ARC_USDC_ADDRESS = '0x3600000000000000000000000000000000000000'

/** Treasury/dead address fallback. */
export const ARC_TREASURY_FALLBACK = '0x000000000000000000000000000000000000dEaD'

/** Arc Testnet chain ID. */
export const ARC_CHAIN_ID = 5042002

/** Handle an unexpected server error — log + return structured 500 response.
 * DRY: every route's catch block becomes `return handleServerError(error, 'Label')`.
 */
export function handleServerError(error: unknown, context: string): NextResponse {
  console.error(`${context}:`, error)
  return NextResponse.json(
    { success: false, error: 'Internal Server Error' },
    { status: 500, headers: NO_STORE_HEADERS }
  )
}
