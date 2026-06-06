import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const JSON_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
  'Content-Type': 'application/json',
}

const ARC_CAIP2 = 'eip155:5042002'
const ARC_TESTNET_USDC = '0x3600000000000000000000000000000000000000'
const MAX_AUTH_HEADER_LEN = 4096

type Desk = 'US' | 'CHINA' | 'EU' | 'JAPAN' | 'CRYPTO'

const INSIGHTS: Record<Desk, { thesis: string; confidence: number; horizon: string }> = {
  US: {
    thesis: 'US desk flags disinflation momentum with sticky labor strength; favors high-quality large caps over duration-sensitive small caps.',
    confidence: 0.69,
    horizon: '7d',
  },
  CHINA: {
    thesis: 'China desk sees policy-guided stabilization in domestic demand with selective upside in consumer leaders and exporters.',
    confidence: 0.64,
    horizon: '7d',
  },
  EU: {
    thesis: 'EU desk identifies margin resilience in quality defensives while cyclical beta remains path-dependent on PMIs.',
    confidence: 0.61,
    horizon: '7d',
  },
  JAPAN: {
    thesis: 'Japan desk models supportive earnings translation from yen sensitivity but keeps risk limits around BoJ repricing shocks.',
    confidence: 0.66,
    horizon: '7d',
  },
  CRYPTO: {
    thesis: 'Crypto desk remains constructive on BTC relative strength while positioning around short-term liquidity rotations.',
    confidence: 0.71,
    horizon: '72h',
  },
}

function getDesk(param: string | null): Desk {
  const normalized = (param ?? 'CRYPTO').toUpperCase()
  if (normalized === 'US' || normalized === 'CHINA' || normalized === 'EU' || normalized === 'JAPAN' || normalized === 'CRYPTO') {
    return normalized
  }
  return 'CRYPTO'
}

function unpaid402Response(desk: Desk): NextResponse {
  // x402-compatible response: buyer retries with signed payment authorization.
  const paymentRequired = {
    version: 2,
    scheme: 'exact',
    network: ARC_CAIP2,
    asset: process.env.X402_USDC_ADDRESS || ARC_TESTNET_USDC,
    maxAmount: '0.01',
    payTo: process.env.X402_SELLER_ADDRESS || '0x000000000000000000000000000000000000dEaD',
    resource: `/api/x402/agent-insight?desk=${desk}`,
    description: `Premium ${desk} desk insight`,
  }

  const encodedPaymentRequired = Buffer.from(JSON.stringify(paymentRequired), 'utf8').toString('base64')

  return new NextResponse(JSON.stringify({
    ok: false,
    error: 'Payment required for premium insight',
    hint: 'Retry with x402 payment authorization headers.',
    paymentRequired,
  }), {
    status: 402,
    headers: {
      ...JSON_HEADERS,
      // x402 quickstart pattern: base64-encoded payment options payload
      'PAYMENT-REQUIRED': encodedPaymentRequired,
      // convenience for manual debugging in browser/devtools
      'X-PAYMENT-REQUIRED-JSON': JSON.stringify(paymentRequired),
    },
  })
}

/**
 * Verify subscriber bypass via signed timestamp + on-chain tier check.
 *
 * Protocol:
 *   1. Frontend signs message: "rosetta-subscribe:{address}:{timestamp}" with wallet
 *   2. API receives: x-subscriber-address, x-subscriber-sig, x-subscriber-ts
 *   3. Verify signature recovers to claimed address
 *   4. Verify timestamp is within 5 minutes (replay protection)
 *   5. Verify address has active subscription on-chain (via RosettaSubscription.getTier)
 *
 * Fallback: If signature headers missing, check address-only mode for hackathon demos.
 */
async function hasSubscriberBypass(req: Request): Promise<boolean> {
  const subscriberAddr = req.headers.get('x-subscriber-address')
  if (!subscriberAddr || !subscriberAddr.startsWith('0x') || subscriberAddr.length !== 42) {
    return false
  }

  const signature = req.headers.get('x-subscriber-sig')
  const timestamp = req.headers.get('x-subscriber-ts')

  if (signature && timestamp) {
    // Production path: verify signature + freshness + on-chain tier
    const ts = parseInt(timestamp, 10)
    const now = Math.floor(Date.now() / 1000)
    const MAX_AGE = 300 // 5 minutes replay window

    if (isNaN(ts) || Math.abs(now - ts) > MAX_AGE) return false

    try {
      const { verifyMessage } = await import('viem')
      const message = `rosetta-subscribe:${subscriberAddr.toLowerCase()}:${timestamp}`
      const valid = await verifyMessage({
        address: subscriberAddr as `0x${string}`,
        message,
        signature: signature as `0x${string}`,
      })
      if (!valid) return false
    } catch {
      return false
    }

    // On-chain tier verification (async, reads contract)
    try {
      const { getSubscriptionStatus, Tier } = await import('@/lib/subscription')
      const status = await getSubscriptionStatus(subscriberAddr as `0x${string}`)
      return status.active && status.tier >= Tier.Premium
    } catch {
      return false
    }
  }

  // Hackathon fallback: trust address header if no sig provided
  // (allows demo walkthrough without full signing UX)
  const devBypass = process.env.X402_DEV_BYPASS_TOKEN
  if (devBypass) return true // Only enabled when dev token is set

  return false
}

async function hasValidPayment(req: Request): Promise<boolean> {
  // Subscriber bypass — Premium/Pro users don't need per-request payment.
  if (await hasSubscriberBypass(req)) return true

  const auth = req.headers.get('x-payment')
    || req.headers.get('x-402-payment')
    || req.headers.get('x-payment-authorization')

  if (!auth) return false

  const token = auth.trim()
  if (!token || token.length > MAX_AUTH_HEADER_LEN) return false

  // Dev bypass for hackathon demos. In production, replace with Circle Gateway settle/verify flow.
  const devToken = process.env.X402_DEV_BYPASS_TOKEN
  if (devToken && token === devToken) return true

  // Support explicit demo tokens to simplify judge walkthrough.
  return token.startsWith('demo_paid_') || token.startsWith('signed:')
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const desk = getDesk(searchParams.get('desk'))

  if (!(await hasValidPayment(req))) {
    return unpaid402Response(desk)
  }

  const insight = INSIGHTS[desk]
  return NextResponse.json(
    {
      ok: true,
      paid: true,
      desk,
      pricedInUSDC: '0.01',
      insight,
      source: 'x402-protected premium endpoint',
    },
    { headers: JSON_HEADERS }
  )
}
