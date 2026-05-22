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
      events: [
        {
          notificationType: 'gateway.deposit.finalized',
          notificationId: 'evt_demo_1',
          walletAddress: '0x32A46C4FaBcD619d08E67eB5200DF8f2E74C783F',
          txHash: '0x' + Array(64).fill('0').map(() => Math.floor(Math.random() * 16).toString(16)).join(''),
          amount: '1000000',
          receivedAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
        },
        {
          notificationType: 'gateway.mint.forwarded',
          notificationId: 'evt_demo_2',
          walletAddress: '0x32A46C4FaBcD619d08E67eB5200DF8f2E74C783F',
          txHash: '0x' + Array(64).fill('0').map(() => Math.floor(Math.random() * 16).toString(16)).join(''),
          amount: '1000000',
          receivedAt: new Date(Date.now() - 1000 * 60 * 6).toISOString(),
        }
      ],
      acceptedTypes: [
        'gateway.deposit.finalized',
        'gateway.mint.finalized',
        'gateway.mint.forwarded',
      ],
    },
    { headers: JSON_HEADERS }
  )
}
