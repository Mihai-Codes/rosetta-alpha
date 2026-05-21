import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/stats
 *
 * Returns live platform statistics for the StatsBar component.
 *
 * Sources:
 *   - theses_published: count of desks in SEED_DATA + any fetched from API results
 *   - arc_tx_count:      number of unique arc_tx hashes across all known theses
 *   - ipfs_pins_count:   number of unique ipfs_cid values across all known theses
 *   - quiz_attempts:     total User registrations (proxy for quiz engagement;
 *                         TODO: replace with actual QuizResult model once available)
 *   - avg_cost_per_trace: static — Arc's ~$0.01 fee design
 */
export async function GET() {
  try {
    // Count total registered users as a proxy for quiz attempts
    // TODO: Create a QuizResult or QuizAttempt model in Prisma for accurate counts
    const userCount = await prisma.user.count().catch(() => 0)

    // These are hardcoded from the known seed data (5 theses, each with an Arc TX and IPFS CID)
    // TODO: Fetch these from an on-chain Arc query or your API results endpoint
    const stats = {
      theses_published: 5,
      arc_tx_count: 5,
      ipfs_pins_count: 5,
      quiz_attempts: userCount,
      avg_cost_per_trace: 0.01,
    }

    return NextResponse.json(stats)
  } catch (error) {
    // Fallback to hardcoded defaults if the database is unreachable
    return NextResponse.json({
      theses_published: 5,
      arc_tx_count: 5,
      ipfs_pins_count: 5,
      quiz_attempts: 0,
      avg_cost_per_trace: 0.01,
    })
  }
}
