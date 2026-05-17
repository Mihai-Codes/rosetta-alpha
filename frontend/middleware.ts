export { auth as default } from './auth'

export const config = {
  // Protect these routes — requires authentication
  matcher: ['/feed/:path*', '/registry/:path*', '/dashboard/:path*', '/quiz/:path*'],
}
