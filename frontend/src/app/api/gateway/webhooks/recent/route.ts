import { NextResponse } from 'next/server'
import { listGatewayEvents } from '@/lib/gatewayEventStore'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const JSON_HEADERS = { 'Cache-Control': 'no-store, max-age=0' }

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const parsed = Number(searchParams.get('limit') ?? 20)
  const limit = Number.isFinite(parsed) ? Math.max(1, Math.min(Math.trunc(parsed), 50)) : 20

  return NextResponse.json(
    {
      ok: true,
      count: limit,
      events: listGatewayEvents(limit),
      acceptedTypes: [
        'gateway.deposit.finalized',
        'gateway.mint.finalized',
        'gateway.mint.forwarded',
      ],
    },
    { headers: JSON_HEADERS }
  )
}
