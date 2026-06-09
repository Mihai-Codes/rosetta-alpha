/** @type {import('next').NextConfig} */
import withSimpleAnalytics from '@simpleanalytics/next/plugin'

/**
 * Content Security Policy for WalletConnect / Reown AppKit.
 * Required to allow the WC verify iframe and relay connections.
 * Without frame-src, the embedded wallet modal shows "this page couldn't load".
 * See: https://docs.reown.com/advanced/security/content-security-policy
 */
const WC_FRAME_SRC = [
  'https://verify.walletconnect.com',
  'https://verify.walletconnect.org',
  'https://secure.walletconnect.com',
  'https://secure.walletconnect.org',
  // Stripe Crypto Onramp iframe
  'https://js.stripe.com',
  'https://crypto.stripe.com',
].join(' ')

const WC_CONNECT_SRC = [
  'https://rpc.walletconnect.com',
  'https://rpc.walletconnect.org',
  'https://relay.walletconnect.com',
  'https://relay.walletconnect.org',
  'wss://relay.walletconnect.com',
  'wss://relay.walletconnect.org',
  'https://pulse.walletconnect.com',
  'https://pulse.walletconnect.org',
  'https://api.web3modal.com',
  'https://api.web3modal.org',
  'https://keys.walletconnect.com',
  'https://keys.walletconnect.org',
  'https://rpc.testnet.arc.network',
  'wss://rpc.testnet.arc.network',
  // PostHog ingest
  'https://us.i.posthog.com',
  'https://app.posthog.com',
  // Simple Analytics proxied ingest
  'https://simpleanalyticscdn.com',
  'https://queue.simpleanalyticscdn.com',
  'https://scripts.simpleanalyticscdn.com',
  'https://cca-lite.coinbase.com',
  // Coinbase Smart Wallet internal RPC — blocked by CSP causes silent claim failure
  'https://eth.merkle.io',
  'wss://eth.merkle.io',
  // Coinbase Smart Wallet passkey and account endpoints
  'https://keys.coinbase.com',
  'https://api.developer.coinbase.com',
  'https://wallet.coinbase.com',
  // Stripe Crypto Onramp API
  'https://api.stripe.com',
  'https://crypto.stripe.com',
].join(' ')

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: [
      `default-src 'self'`,
      `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://crypto-js.stripe.com`,
      `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
      `font-src 'self' https://fonts.gstatic.com https://fonts.reown.com`,
      `img-src * 'self' data: blob: https://*.stripe.com`,
      `connect-src 'self' ${WC_CONNECT_SRC}`,
      `frame-src 'self' ${WC_FRAME_SRC}`,
    ].join('; '),
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  /**
   * Required for Base Smart Wallet / Coinbase passkey popups.
   * Must be a separate header — NOT a CSP directive.
   */
  {
    key: 'Cross-Origin-Opener-Policy',
    value: 'same-origin-allow-popups',
  },
]

const nextConfig = {
  // Proxy API requests to the FastAPI backend
  async rewrites() {
    return [
      {
        source: '/api/results',
        destination: process.env.NEXT_PUBLIC_API_URL
          ? `${process.env.NEXT_PUBLIC_API_URL}/api/results`
          : 'http://localhost:8000/api/results',
      },
    ]
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
  // Tailwind CSS v4 uses postcss plugin
  // Include Prisma query engine binaries in deployment bundle.
  // Next.js 16 file tracing excludes them by default, causing runtime errors on Vercel.
  outputFileTracingIncludes: {
    '/**/*': ['./node_modules/.prisma/client/**/*'],
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion', 'recharts'],
  },

}

export default withSimpleAnalytics(nextConfig)
