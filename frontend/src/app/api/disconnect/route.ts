import { NextResponse } from 'next/server'
import { auth } from '../../../../auth'

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
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const rawNext = searchParams.get('next') ?? '/'
  // Prevent open redirect: only allow relative paths starting with /
  const redirectTo = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/'

  const mode = searchParams.get('mode')
  const response = mode === 'json'
    ? NextResponse.json({ ok: true })
    : NextResponse.redirect(new URL(redirectTo, req.url))

  // Nuke wagmi cookieStorage keys at the HTTP layer with matching path/samesite.
  // wagmi stores shimDisconnect flags separately from wagmi.store, and stale
  // wagmi.<connector>.disconnected cookies make connector.isAuthorized() return false.
  // Cover both legacy connector IDs and EIP-6963 rdns-based IDs.
  const cookieNames = [
    'wagmi.store',
    'wagmi.recentConnectorId',
    // Legacy connector IDs
    'wagmi.injected.connected',
    'wagmi.injected.disconnected',
    'wagmi.metaMask.disconnected',
    'wagmi.coinbaseWallet.disconnected',
    'wagmi.okxWallet.disconnected',
    // EIP-6963 rdns-based connector IDs
    'wagmi.io.metamask.disconnected',
    'wagmi.com.brave.wallet.disconnected',
    'wagmi.com.okex.wallet.disconnected',
    'wagmi.coinbaseWalletSDK.disconnected',
  ]

  for (const cookieName of cookieNames) {
    response.cookies.set(cookieName, '', {
      maxAge: 0,
      path: '/',
      sameSite: 'lax',
    })
  }

  return response
}
