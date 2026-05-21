import { NextResponse } from 'next/server'
import { auth } from '../../../../auth'
import { prisma } from '@/lib/prisma'

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

export async function POST(req: Request) {
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

    return NextResponse.json({ success: true, attempt }, { headers: NO_STORE_HEADERS })
  } catch (error) {
    console.error('Failed to save quiz attempt:', error)
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500, headers: NO_STORE_HEADERS }
    )
  }
}
