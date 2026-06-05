import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RawReceipt = {
  id?: string
  trace_cid?: string
  provider?: string
  cid?: string
  pinned_at?: string | Date | null
  provider_ref?: string | null
  status?: string | null
  error?: string | null
  last_verified_at?: string | Date | null
  created_at?: string | Date | null
}

type StepStatus = 'completed' | 'in_progress' | 'failed'

function mapReceiptStatus(status?: string | null): StepStatus {
  const normalized = (status ?? '').toLowerCase().trim()
  if (['ok', 'success', 'pinned', 'verified'].includes(normalized)) return 'completed'
  if (['pending', 'queued', 'processing', 'syncing', 'in_progress'].includes(normalized)) return 'in_progress'
  if (!normalized) return 'in_progress'
  return 'failed'
}

function firstValidDate(values: Array<string | Date | null | undefined>): string | null {
  for (const value of values) {
    if (!value) continue
    const date = new Date(value)
    if (!Number.isNaN(date.getTime())) return date.toISOString()
  }
  return null
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cid: string }> }
) {
  const { cid } = await params

  if (!cid || cid.length < 10) {
    return NextResponse.json(
      { error: 'Invalid CID parameter' },
      { status: 400 }
    )
  }

  const qp = request.nextUrl.searchParams
  const desk = qp.get('desk') ?? 'unknown'
  const ticker = qp.get('ticker') ?? 'unknown'
  const model = qp.get('model') ?? 'unknown'
  const arcTx = qp.get('arcTx') ?? ''
  const stakeTx = qp.get('stakeTx') ?? arcTx
  const recordTx = qp.get('recordTx') ?? arcTx
  const question = qp.get('question') ?? ''
  const marketUrl = qp.get('marketUrl') ?? (question ? `https://polymarket.com/search?q=${encodeURIComponent(question)}` : '')

  try {
    const receipts = (await prisma.$queryRaw`
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
    `) as RawReceipt[]

    const pinata = receipts.find((r) => (r.provider ?? '').toLowerCase().includes('pinata'))
    const storacha = receipts.find((r) => {
      const p = (r.provider ?? '').toLowerCase()
      return p.includes('storacha') || p.includes('web3.storage') || p.includes('filecoin')
    })

    const pinataStatus = mapReceiptStatus(pinata?.status)
    const storachaStatus = mapReceiptStatus(storacha?.status)
    const pinStepStatus: StepStatus =
      pinataStatus === 'failed' || storachaStatus === 'failed'
        ? 'failed'
        : pinataStatus === 'completed' || storachaStatus === 'completed'
          ? 'completed'
          : 'in_progress'

    const receiptTimes = receipts
      .map((r) => firstValidDate([r.pinned_at, r.last_verified_at, r.created_at]))
      .filter(Boolean) as string[]

    const pinTimestamp = receiptTimes.length > 0 ? receiptTimes.sort()[0] : null
    const baseTimestamp = pinTimestamp

    const steps = [
      {
        id: 'analyze',
        label: 'Analyze',
        icon: 'brain',
        status: cid ? 'completed' : 'in_progress',
        timestamp: baseTimestamp,
        link: null,
        details: { desk, ticker, model },
      },
      {
        id: 'hash',
        label: 'Hash (SHA-256)',
        icon: 'hash',
        status: cid ? 'completed' : 'in_progress',
        timestamp: baseTimestamp,
        link: `https://dweb.link/ipfs/${cid}`,
        details: { traceCid: cid, algorithm: 'SHA-256' },
      },
      {
        id: 'pin',
        label: 'Pin (Pinata + Storacha)',
        icon: 'database',
        status: pinStepStatus,
        timestamp: pinTimestamp,
        link: `https://dweb.link/ipfs/${cid}`,
        details: {
          pinata: {
            cid: pinata?.cid ?? null,
            status: pinata?.status ?? null,
            providerRef: pinata?.provider_ref ?? null,
          },
          storacha: {
            cid: storacha?.cid ?? null,
            status: storacha?.status ?? null,
            providerRef: storacha?.provider_ref ?? null,
          },
          cidEqual: Boolean(pinata?.cid && storacha?.cid && pinata.cid === storacha.cid),
        },
      },
      {
        id: 'stake',
        label: 'Stake (10 ROSETTA)',
        icon: 'coins',
        status: stakeTx ? 'completed' : 'in_progress',
        timestamp: baseTimestamp,
        link: stakeTx ? `https://testnet.arcscan.app/tx/${stakeTx}` : null,
        details: {
          token: 'ROSETTA',
          amount: '10',
          tx: stakeTx || null,
          chain: 'Arc L1 Testnet',
        },
      },
      {
        id: 'record',
        label: 'Record (ReasoningRegistry)',
        icon: 'link',
        status: recordTx ? 'completed' : 'in_progress',
        timestamp: baseTimestamp,
        link: recordTx ? `https://testnet.arcscan.app/tx/${recordTx}` : null,
        details: {
          contract: 'ReasoningRegistry',
          tx: recordTx || null,
          traceCid: cid,
        },
      },
      {
        id: 'market',
        label: 'Market (Polymarket)',
        icon: 'bar-chart-3',
        status: marketUrl ? 'completed' : 'in_progress',
        timestamp: null,
        link: marketUrl || null,
        details: {
          question: question || null,
          platform: 'Polymarket',
        },
      },
    ] as const

    return NextResponse.json({
      trace_cid: cid,
      steps,
      receipts,
      providers: {
        total: Array.isArray(receipts) ? receipts.length : 0,
        ok: Array.isArray(receipts)
          ? receipts.filter((r) => mapReceiptStatus(r.status) === 'completed').length
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
