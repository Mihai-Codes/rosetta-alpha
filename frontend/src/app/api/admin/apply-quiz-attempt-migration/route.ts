import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST() {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "QuizAttempt" (
        "id" TEXT NOT NULL,
        "userId" TEXT,
        "desk" TEXT NOT NULL,
        "score" INTEGER NOT NULL,
        "total" INTEGER NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "QuizAttempt_pkey" PRIMARY KEY ("id")
      );
    `)

    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "QuizAttempt_userId_idx" ON "QuizAttempt"("userId");`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "QuizAttempt_desk_idx" ON "QuizAttempt"("desk");`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "QuizAttempt_createdAt_idx" ON "QuizAttempt"("createdAt");`)

    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'QuizAttempt_userId_fkey'
        ) THEN
          ALTER TABLE "QuizAttempt"
          ADD CONSTRAINT "QuizAttempt_userId_fkey"
          FOREIGN KEY ("userId") REFERENCES "User"("id")
          ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
      END $$;
    `)

    const count = await prisma.quizAttempt.count()

    return NextResponse.json({ ok: true, quizAttemptCount: count })
  } catch (error) {
    console.error('QuizAttempt migration failed:', error)
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
