import { auth } from './auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  // Allow Playwright local screenshot runs to bypass auth — ONLY in development
  if (process.env.NODE_ENV !== 'production' && process.env.PLAYWRIGHT_BYPASS === 'true') {
    return NextResponse.next()
  }
  const isLoggedIn = !!req.auth
  const isProtected = ['/feed', '/registry', '/dashboard', '/quiz'].some(
    (path) => req.nextUrl.pathname.startsWith(path)
  )
  if (isProtected && !isLoggedIn) {
    // With modal-based auth, we redirect to home with a query param to trigger the modal
    const signInUrl = new URL('/?auth=login', req.nextUrl.origin)
    return NextResponse.redirect(signInUrl)
  }
  return NextResponse.next()
})

export const config = {
  matcher: ['/feed/:path*', '/registry/:path*', '/dashboard/:path*', '/quiz/:path*'],
}
