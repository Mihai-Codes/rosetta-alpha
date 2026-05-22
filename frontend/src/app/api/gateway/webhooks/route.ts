import { NextResponse } from 'next/server'
import { createPublicKey, createVerify, type KeyObject } from 'crypto'
import { addGatewayEvent } from '@/lib/gatewayEventStore'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type CirclePublicKeyResponse = {
  data?: {
    id?: string
    algorithm?: string
    publicKey?: string
  }
}

const JSON_HEADERS = { 'Cache-Control': 'no-store, max-age=0' }
const MAX_WEBHOOK_BODY_BYTES = 256 * 1024
const ACCEPTED_TYPES = new Set([
  'gateway.deposit.finalized',
  'gateway.mint.finalized',
  'gateway.mint.forwarded',
])

function normalizeSignature(value: string): Buffer[] {
  const candidates: Buffer[] = []

  try {
    candidates.push(Buffer.from(value, 'base64'))
  } catch {}

  // base64url fallback
  try {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
    candidates.push(Buffer.from(normalized, 'base64'))
  } catch {}

  return candidates.filter((buf) => buf.length > 0)
}

async function fetchCirclePublicKey(keyId: string): Promise<KeyObject | null> {
  const apiKey = process.env.CIRCLE_API_KEY
  if (!apiKey) return null

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)

    const response = await fetch(`https://api.circle.com/v2/notifications/publicKey/${keyId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: 'no-store',
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout))

    if (!response.ok) return null

    const payload = (await response.json().catch(() => null)) as CirclePublicKeyResponse | null
    const encoded = payload?.data?.publicKey
    const algorithm = payload?.data?.algorithm

    if (!encoded || algorithm !== 'ECDSA_SHA_256') return null

    // API returns base64-encoded DER public key
    const der = Buffer.from(encoded, 'base64')
    return createPublicKey({ key: der, format: 'der', type: 'spki' })
  } catch {
    return null
  }
}

function verifySignature(rawBody: string, signatureHeader: string, publicKey: KeyObject): boolean {
  const signatures = normalizeSignature(signatureHeader)
  if (signatures.length === 0) return false

  for (const signature of signatures) {
    // Try DER first
    try {
      const verify = createVerify('SHA256')
      verify.update(rawBody)
      verify.end()
      if (verify.verify(publicKey, signature)) return true
    } catch {}

    // Try IEEE-P1363 encoding fallback
    try {
      const verify = createVerify('SHA256')
      verify.update(rawBody)
      verify.end()
      if (verify.verify({ key: publicKey, dsaEncoding: 'ieee-p1363' }, signature)) return true
    } catch {}
  }

  return false
}

export async function POST(req: Request) {
  const rawBody = await req.text()
  if (!rawBody) {
    return NextResponse.json({ ok: false, error: 'Empty webhook body' }, { status: 400, headers: JSON_HEADERS })
  }

  if (Buffer.byteLength(rawBody, 'utf8') > MAX_WEBHOOK_BODY_BYTES) {
    return NextResponse.json({ ok: false, error: 'Webhook payload too large' }, { status: 413, headers: JSON_HEADERS })
  }

  const signature = req.headers.get('x-circle-signature')
  const keyId = req.headers.get('x-circle-key-id')
  const skipVerify = process.env.CIRCLE_WEBHOOK_SKIP_VERIFY === 'true'

  if (!skipVerify) {
    if (!signature || !keyId) {
      return NextResponse.json(
        { ok: false, error: 'Missing webhook signature headers' },
        { status: 401, headers: JSON_HEADERS }
      )
    }

    const publicKey = await fetchCirclePublicKey(keyId)
    if (!publicKey) {
      return NextResponse.json(
        { ok: false, error: 'Unable to fetch Circle notification public key' },
        { status: 401, headers: JSON_HEADERS }
      )
    }

    const valid = verifySignature(rawBody, signature, publicKey)
    if (!valid) {
      return NextResponse.json(
        { ok: false, error: 'Invalid Circle webhook signature' },
        { status: 401, headers: JSON_HEADERS }
      )
    }
  }

  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON payload' }, { status: 400, headers: JSON_HEADERS })
  }

  if (!payload || typeof payload !== 'object') {
    return NextResponse.json({ ok: false, error: 'Invalid webhook payload' }, { status: 400, headers: JSON_HEADERS })
  }

  const record = addGatewayEvent(payload)
  const acceptedType = ACCEPTED_TYPES.has(record.notificationType)

  return NextResponse.json(
    {
      ok: true,
      verified: !skipVerify,
      acceptedType,
      event: {
        notificationType: record.notificationType,
        notificationId: record.notificationId,
        walletAddress: record.walletAddress,
        txHash: record.txHash,
      },
    },
    { status: 200, headers: JSON_HEADERS }
  )
}
