/**
 * Shared API route utilities — DRY single source of truth.
 *
 * Used by all API routes for consistent response headers, validation,
 * and error handling.
 */

import { NextResponse } from 'next/server'

/** Standard no-cache headers for all API responses. */
export const NO_STORE_HEADERS = { 'Cache-Control': 'no-store, max-age=0' } as const

/** Validate an Ethereum address (0x + 40 hex chars). */
export function isValidEthereumAddress(addr: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(addr)
}

/** Normalize a wallet address to lowercase for consistent DB lookups. */
export function normalizeWallet(addr: string): string {
  return addr.toLowerCase()
}

/**
 * Handle an unexpected server error — log + return structured 500 response.
 * DRY: every route's catch block becomes `return handleServerError(error, 'Label')`.
 */
export function handleServerError(error: unknown, context: string): NextResponse {
  console.error(`${context}:`, error)
  return NextResponse.json(
    { success: false, error: 'Internal Server Error' },
    { status: 500, headers: NO_STORE_HEADERS }
  )
}
