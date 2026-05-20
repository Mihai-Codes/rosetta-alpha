import { connectorsForWallets } from '@rainbow-me/rainbowkit'
import {
  metaMaskWallet as defaultMetaMaskWallet,
  okxWallet as defaultOkxWallet,
  braveWallet,
  coinbaseWallet,
  injectedWallet,
} from '@rainbow-me/rainbowkit/wallets'
import { createConfig, http, cookieStorage, createStorage, createConnector } from 'wagmi'
import { mainnet } from 'wagmi/chains'
import { injected } from 'wagmi/connectors'
import { arcTestnet } from './chains'

export { arcTestnet }

const PROJECT_ID =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'bec422518cfa4cfbc6e83d3c1bd8d07b'

const APP_URL = 'https://rosetta-alpha.vercel.app'

/**
 * Custom MetaMask Wrapper for Wagmi v2
 * Completely strips out the WalletConnect QR code fallback.
 * By returning a pure injected connector, RainbowKit will cleanly show the 
 * "Install Extension" UI instead of trying (and failing) to load the 
 * verify.walletconnect.com iframe.
 */
const customMetaMaskWallet = (options: any) => {
  const wallet = defaultMetaMaskWallet(options)
  return {
    ...wallet,
    qrCode: undefined, // Disable WalletConnect fallback UI
    createConnector: (walletDetails: any) => {
      return createConnector((config) => {
        const connector = injected({
          target: 'metaMask',
          shimDisconnect: true, // Tracks disconnect state in storage — prevents auto-reconnect
        })(config)
        return {
          ...connector,
          ...walletDetails,
        }
      })
    }
  }
}

/**
 * Custom OKX Wrapper for Wagmi v2
 * Same logic as MetaMask — pure injected, zero WalletConnect.
 */
const customOkxWallet = (options: any) => {
  const wallet = defaultOkxWallet(options)
  const isOkxInstalled = typeof window !== 'undefined' &&
    ((window as any).okxwallet || (window as any).OKXWallet)

  if (isOkxInstalled) {
    // OKX is installed — use the original RainbowKit connector which has proper
    // disconnect handling. Only strip qrCode to prevent WalletConnect fallback UI.
    return { ...wallet, qrCode: undefined }
  }

  // OKX not installed — return a no-op connector so RainbowKit shows "Install" UI
  // without initializing WalletConnect or crashing the page.
  return {
    ...wallet,
    qrCode: undefined,
    installed: false,
    createConnector: (walletDetails: any) => {
      return createConnector((config) => {
        const connector = injected({
          target: {
            id: 'okxWallet',
            name: 'OKX Wallet',
            provider: () => undefined,
          },
          shimDisconnect: true,
        })(config)
        return { ...connector, ...walletDetails }
      })
    }
  }
}

/**
 * Explicit wallet list via connectorsForWallets.
 */
const connectors = connectorsForWallets(
  [
    {
      groupName: 'Recommended',
      wallets: [
        customMetaMaskWallet,
        braveWallet,
        customOkxWallet,
        coinbaseWallet,
      ],
    },
    {
      groupName: 'More',
      wallets: [
        injectedWallet,
      ],
    },
  ],
  {
    appName: 'Rosetta Alpha',
    projectId: PROJECT_ID,
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

/** Singleton config instance */
export const config = getConfig()
