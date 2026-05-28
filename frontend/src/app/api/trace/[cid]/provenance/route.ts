import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/trace/[cid]/provenance
 *
 * Returns all pin_receipts for a given IPFS CID, showing which providers
 * have pinned the reasoning trace and their current status.
 *
 * Used by the frontend provenance badge component to display:
 *   "Pinned to: 🟢 Pinata · 🟢 Storacha (Filecoin)"
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ cid: string }> }
) {
  const { cid } = await params

  if (!cid || cid.length < 10) {
    return NextResponse.json(
      { error: 'Invalid CID parameter' },
      { status: 400 }
    )
  }

  try {
    // Query pin_receipts table for all rows matching this trace CID
    const receipts = await prisma.$queryRaw`
      SELECT
        id,
        trace_cid,
        provider,
        cid,
        pinned_at,
        provider_ref,
        status,
        error,
        last_verified_at,
        created_at
      FROM pin_receipts
      WHERE trace_cid = ${cid}
      ORDER BY provider ASC, created_at DESC
    `

    return NextResponse.json({
      trace_cid: cid,
      receipts,
      providers: {
        total: Array.isArray(receipts) ? receipts.length : 0,
        ok: Array.isArray(receipts)
          ? receipts.filter((r: any) => r.status === 'ok').length
          : 0,
      },
    })
  } catch (error) {
    console.error(`[provenance] Failed to query pin_receipts for CID ${cid}:`, error)

    return NextResponse.json(
      { error: 'Failed to fetch provenance data', detail: String(error) },
      { status: 500 }
    )
  }
}
