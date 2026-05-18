/**
 * Chain definitions — no connectors, safe to import in Server Components.
 */

export const arcTestnet = {
  id: Number(process.env.NEXT_PUBLIC_ARC_CHAIN_ID) || 5042002,
  name: 'Arc Testnet',
  iconUrl: 'https://rosetta-alpha.vercel.app/arc-logo.svg',
  iconBackground: '#0A0A0F',
  nativeCurrency: {
    name: 'USDC',
    symbol: 'USDC',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_ARC_RPC_URL || 'https://rpc.testnet.arc.network'],
      webSocket: [process.env.NEXT_PUBLIC_ARC_WS_URL || 'wss://rpc.testnet.arc.network'],
    },
  },
  blockExplorers: {
    default: {
      name: 'ArcScan',
      url: process.env.NEXT_PUBLIC_ARC_EXPLORER_URL || 'https://testnet.arcscan.app',
    },
  },
  testnet: true,
} as const
