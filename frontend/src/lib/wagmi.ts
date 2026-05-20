import { connectorsForWallets } from '@rainbow-me/rainbowkit'
import {
  metaMaskWallet,
  injectedWallet,
  okxWallet,
  braveWallet,
  coinbaseWallet,
} from '@rainbow-me/rainbowkit/wallets'
import { createConfig, http, cookieStorage, createStorage } from 'wagmi'
import { mainnet } from 'wagmi/chains'
import { arcTestnet } from './chains'

export { arcTestnet }

const PROJECT_ID =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'bec422518cfa4cfbc6e83d3c1bd8d07b'

const APP_URL = 'https://rosetta-alpha.vercel.app'

/**
 * Explicit wallet list via connectorsForWallets.
 */
const connectors = connectorsForWallets(
  [
    {
      groupName: 'Recommended',
      wallets: [
        metaMaskWallet,  // MetaMask browser extension
        braveWallet,     // Brave built-in wallet
        okxWallet,       // OKX injected extension
        coinbaseWallet,  // Coinbase Wallet browser extension
      ],
    },
    {
      groupName: 'More',
      wallets: [
        injectedWallet,  // Any other EIP-6963 wallet: Rabby, Frame, Brave (fallback), etc.
      ],
    },
  ],
  {
    appName: 'Rosetta Alpha',
    projectId: PROJECT_ID,
    appUrl: APP_URL,
    appIcon: `${APP_URL}/arc-logo.svg`,
    appDescription: 'Institutional AI-powered investment thesis platform on Arc Testnet',
    walletConnectParameters: {
      // By omitting walletconnect verification entirely or passing standard metadata,
      // it stops trying to embed the verify iframe that crashes custom networks.
      metadata: {
        name: 'Rosetta Alpha',
        description: 'Institutional AI-powered investment thesis platform',
        url: APP_URL,
        icons: [`${APP_URL}/arc-logo.svg`],
        verifyUrl: '' // Empty verify URL prevents the iframe from trying to load
      }
    },
  }
)

/**
 * Factory function — required for cookie-based SSR persistence.
 */
export function getConfig() {
  return createConfig({
    connectors,
    chains: [arcTestnet, mainnet],
    storage: createStorage({ storage: cookieStorage }),
    transports: {
      [arcTestnet.id]: http(
        process.env.NEXT_PUBLIC_ARC_RPC_URL || 'https://rpc.testnet.arc.network'
      ),
      [mainnet.id]: http(),
    },
    ssr: true,
    multiInjectedProviderDiscovery: false // Prevents Wagmi from adding duplicate EIP-6963 wallets
  })
}

/** Singleton config instance — used by WagmiProvider and cookieToInitialState */
export const config = getConfig()
