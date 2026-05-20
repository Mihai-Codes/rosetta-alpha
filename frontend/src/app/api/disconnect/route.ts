import { NextResponse } from 'next/server'

/**
 * GET /api/disconnect
 *
 * Server-side cookie wipe for wagmi's cookieStorage.
 * Client-side cookie deletion races with wagmi's async state subscription
 * that re-writes the cookie after disconnect() but before window.location.reload().
 * By routing through here, the Set-Cookie header is sent BEFORE Next.js SSR
 * runs cookieToInitialState() — no race condition possible.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const redirectTo = searchParams.get('next') ?? '/'

  const response = NextResponse.redirect(new URL(redirectTo, req.url))

  // Nuke the wagmi cookie at the HTTP layer with matching path/samesite
  response.cookies.set('wagmi.store', '', {
    maxAge: 0,
    path: '/',
    sameSite: 'lax',
  })

  return response
}
