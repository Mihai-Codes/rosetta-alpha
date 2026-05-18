import { connectorsForWallets } from '@rainbow-me/rainbowkit'
import {
  metaMaskWallet,
  base,
  rainbowWallet,
  walletConnectWallet,
  injectedWallet,
  okxWallet,
} from '@rainbow-me/rainbowkit/wallets'
import { createConfig, http } from 'wagmi'
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

/**
 * Explicit wallet list via connectorsForWallets.
 * Using this instead of getDefaultConfig prevents WalletConnect relay from
 * initializing eagerly on page load — fixing the "this page couldn't load" error.
 * WalletConnect is included last as a lazy fallback.
 */
const APP_URL = 'https://rosetta-alpha.vercel.app'

const connectors = connectorsForWallets(
  [
    {
      groupName: 'Recommended',
      wallets: [
        base,           // Coinbase / Base Smart Wallet (passkey, no extension needed)
        metaMaskWallet, // MetaMask browser extension
        rainbowWallet,  // Rainbow mobile + desktop
      ],
    },
    {
      groupName: 'More',
      wallets: [
        okxWallet,
        injectedWallet,      // any other injected (Brave, frame, etc.)
        walletConnectWallet, // QR-code fallback for any WC-compatible wallet
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

export const config = createConfig({
  connectors,
  chains: [arcTestnet, mainnet],
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
