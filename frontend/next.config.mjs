/** @type {import('next').NextConfig} */

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
  'https://cca-lite.coinbase.com',
  // Coinbase Smart Wallet internal RPC — blocked by CSP causes silent claim failure
  'https://eth.merkle.io',
  'wss://eth.merkle.io',
  // Coinbase Smart Wallet passkey and account endpoints
  'https://keys.coinbase.com',
  'https://api.developer.coinbase.com',
  'https://wallet.coinbase.com',
].join(' ')

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: [
      `default-src 'self'`,
      `script-src 'self' 'unsafe-inline' 'unsafe-eval'`,
      `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
      `font-src 'self' https://fonts.gstatic.com https://fonts.reown.com`,
      `img-src * 'self' data: blob:`,
      `connect-src 'self' ${WC_CONNECT_SRC}`,
      `frame-src 'self' ${WC_FRAME_SRC}`,
    ].join('; '),
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
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion', 'recharts'],
  },
}

export default nextConfig
