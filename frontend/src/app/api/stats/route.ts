import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { NO_STORE_HEADERS } from '@/lib/api-utils'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/stats
 *
 * Returns live platform statistics for the StatsBar component.
 *
 * Sources:
 *   - theses_published: known seed desks/theses for this demo
 *   - arc_tx_count:      known Arc L1 trace transactions for those theses
 *   - ipfs_pins_count:   known IPFS thesis pins for those theses
 *   - quiz_attempts:     real QuizAttempt rows written by /api/quiz
 *   - avg_cost_per_trace: static — Arc's ~$0.01 fee design
 */
export async function GET() {
  try {
    const quizAttemptCount = await prisma.quizAttempt.count().catch((error) => {
      console.error('Failed to count quiz attempts:', error)
      return 0
    })

    return NextResponse.json({
      theses_published: 5,
      arc_tx_count: 5,
      ipfs_pins_count: 5,
      quiz_attempts: quizAttemptCount,
      avg_cost_per_trace: 0.01,
    }, { headers: NO_STORE_HEADERS })
  } catch (error) {
    console.error('Failed to load stats:', error)

    return NextResponse.json({
      theses_published: 5,
      arc_tx_count: 5,
      ipfs_pins_count: 5,
      quiz_attempts: 0,
      avg_cost_per_trace: 0.01,
    }, { headers: NO_STORE_HEADERS })
  }
}
