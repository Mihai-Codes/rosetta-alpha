import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { mainnet } from 'wagmi/chains'
import { type Chain } from 'viem'

/** Arc Testnet — official config from docs.arc.network */
// @ts-expect-error RainbowKit custom chain properties not in viem Chain type
export const arcTestnet: Chain = {
  id: Number(process.env.NEXT_PUBLIC_ARC_CHAIN_ID) || 5042002,
  name: 'Arc Testnet',
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI0Q4MkIyQiI+PHBhdGggZD0iTTEyIDJMMjIgMjBIMloiLz48L3N2Zz4=',
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
}

export const config = getDefaultConfig({
  appName: 'Rosetta Alpha',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'bec422518cfa4cfbc6e83d3c1bd8d07b',
  chains: [arcTestnet, mainnet],
  ssr: true,
})
