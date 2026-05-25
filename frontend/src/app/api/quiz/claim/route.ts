/**
 * POST /api/quiz/claim — x402-gated quiz reward claim
 * =====================================================
 *
 * Wraps the core quiz attempt logic with a 0.001 USDC x402 payment gate.
 * The fee is symbolic — users earn 0.5 USDC reward on correct answers.
 *
 * Payment flow:
 * 1. Client's x402Client sends 0.001 USDC via EIP-3009 (session key, no popup)
 * 2. Server verifies signature + settles on Arc via transferWithAuthorization
 * 3. If payment OK, saves quiz attempt to DB and (in future) distributes reward
 *
 * Request body: { desk: string, score: number, total: number }
 * Response:     { success: true, attempt: QuizAttempt, rewardAmount: 0.5 }
 */

import { NextResponse } from 'next/server'
import { auth } from '../../../../../auth'
import { prisma } from '@/lib/prisma'
import { withX402 } from '@/lib/x402Server'


function getEnv(val: string | undefined, fallback: string): string {
  if (!val || val === 'undefined' || val === 'null' || val === '') return fallback;
  return val;
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
}

type QuizAttemptPayload = {
  desk?: unknown
  score?: unknown
  total?: unknown
}

function parseInteger(value: unknown) {
  const parsed = Number(value)
  return Number.isInteger(parsed) ? parsed : null
}

export const POST = withX402(
  {
    resource: '/api/quiz/claim',
    // 0.001 USDC processing fee — user earns 0.5 USDC reward on correct answers
    priceUsdc: 0.001,
    description: 'Quiz claim processing fee — earn 0.5 USDC on correct answer',
    treasuryAddress: getEnv(process.env.ROSETTA_TREASURY_ADDRESS, '0x000000000000000000000000000000000000dEaD'),
    arcRpcUrl: process.env.NEXT_PUBLIC_ARC_RPC_URL!,
    usdcAddress: getEnv(process.env.NEXT_PUBLIC_USDC_ARC_ADDRESS, '0x3600000000000000000000000000000000000000'),
    settlerPrivateKey: getEnv(process.env.ARC_SETTLER_PRIVATE_KEY, '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'),
  },
  async (req: Request) => {
    try {
      const session = await auth()
      const body = await req.json().catch(() => null) as QuizAttemptPayload | null

      const desk = typeof body?.desk === 'string' ? body.desk.trim() : ''
      const score = parseInteger(body?.score)
      const total = parseInteger(body?.total)

      if (!desk || score === null || total === null || total <= 0 || score < 0 || score > total) {
        return NextResponse.json(
          { success: false, error: 'Invalid quiz attempt payload' },
          { status: 400, headers: NO_STORE_HEADERS }
        )
      }

      const sessionUser = session?.user as { id?: string; email?: string | null } | undefined
      let userId = sessionUser?.id ?? null

      // Existing Google/Gmail sessions should still be treated as regular users
      // even if an older JWT is missing the custom `id` claim.
      if (!userId && sessionUser?.email) {
        const user = await prisma.user.findUnique({
          where: { email: sessionUser.email },
          select: { id: true },
        }).catch(() => null)
        userId = user?.id ?? null
      }

      const attempt = await prisma.quizAttempt.create({
        data: {
          desk: desk.slice(0, 64),
          score,
          total,
          userId,
        },
        select: {
          id: true,
          desk: true,
          score: true,
          total: true,
          userId: true,
          createdAt: true,
        },
      })

      // Reward amount: 0.5 USDC for a correct quiz (score === total)
      // In a full implementation, this would trigger an on-chain payout
      const rewardAmount = score === total ? 0.5 : 0

      return NextResponse.json(
        { success: true, attempt, rewardAmount },
        { headers: NO_STORE_HEADERS }
      )
    } catch (error) {
      console.error('Failed to save quiz attempt:', error)
      return NextResponse.json(
        { success: false, error: 'Internal Server Error' },
        { status: 500, headers: NO_STORE_HEADERS }
      )
    }
  }
)
