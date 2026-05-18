import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { mainnet } from 'wagmi/chains'

/** Arc Testnet — official config from docs.arc.network */
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
} as any

export const config = getDefaultConfig({
  appName: 'Rosetta Alpha',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'bec422518cfa4cfbc6e83d3c1bd8d07b',
  chains: [arcTestnet, mainnet],
  ssr: true,
})
