import { connectorsForWallets } from '@rainbow-me/rainbowkit'
import {
  metaMaskWallet,
  base,
  injectedWallet,
  okxWallet,
} from '@rainbow-me/rainbowkit/wallets'
import { createConfig, http, cookieStorage, createStorage } from 'wagmi'
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
} as const

const PROJECT_ID =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'bec422518cfa4cfbc6e83d3c1bd8d07b'

const APP_URL = 'https://rosetta-alpha.vercel.app'

/**
 * Force Base Smart Wallet into smart-wallet-only mode.
 * Without this, the connector tries dual-mode (extension + smart wallet)
 * and throws "unsupported connection" on custom chains like Arc Testnet.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(base as any).preference = { options: 'smartWalletOnly' }

/**
 * Explicit wallet list via connectorsForWallets.
 * Using this instead of getDefaultConfig prevents WalletConnect relay from
 * initializing eagerly on page load — fixing the "this page couldn't load" error.
 * WalletConnect is included last as a lazy fallback.
 */
const connectors = connectorsForWallets(
  [
    {
      groupName: 'Recommended',
      wallets: [
        base,           // Coinbase / Base Smart Wallet (passkey, no extension needed)
        metaMaskWallet, // MetaMask browser extension
        okxWallet,      // OKX injected extension
      ],
    },
    {
      groupName: 'More',
      wallets: [
        injectedWallet, // Brave, Frame, or any other EIP-6963 injected wallet
      ],
    },
  ],
  {
    appName: 'Rosetta Alpha',
    projectId: PROJECT_ID,
    /**
     * Explicit appUrl + metadata ensure the WalletConnect Verify API can
     * match this domain against the project allowlist on dashboard.reown.com.
     * Without this, the iframe may fail even if the domain is allowlisted.
     */
    appUrl: APP_URL,
    appIcon: `${APP_URL}/arc-logo.svg`,
    appDescription: 'Institutional AI-powered investment thesis platform on Arc Testnet',
  }
)

/**
 * Factory function — required for cookie-based SSR persistence.
 * Call getConfig() in layout.tsx to extract initialState from cookies,
 * then pass it to WagmiProvider so the wallet stays connected on refresh.
 */
export function getConfig() {
  return createConfig({
    connectors,
    chains: [arcTestnet, mainnet],
    /**
     * cookieStorage persists wallet state server-side.
     * Prevents the "disconnected" flash on page refresh.
     */
    storage: createStorage({ storage: cookieStorage }),
    /**
     * Explicit HTTP transports bypass the WalletConnect relay for RPC calls.
     * This is the key fix for slow/failing wallet connections on custom chains.
     */
    transports: {
      [arcTestnet.id]: http(
        process.env.NEXT_PUBLIC_ARC_RPC_URL || 'https://rpc.testnet.arc.network'
      ),
      [mainnet.id]: http(),
    },
    ssr: true,
  })
}

/** Singleton config instance — used by WagmiProvider and cookieToInitialState */
export const config = getConfig()
