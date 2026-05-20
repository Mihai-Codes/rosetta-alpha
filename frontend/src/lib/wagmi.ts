import { connectorsForWallets } from '@rainbow-me/rainbowkit'
import {
  metaMaskWallet as defaultMetaMaskWallet,
  okxWallet as defaultOkxWallet,
  braveWallet,
  coinbaseWallet,
  injectedWallet,
} from '@rainbow-me/rainbowkit/wallets'
import { createConfig, http, createConnector, cookieStorage, createStorage } from 'wagmi'
import { mainnet } from 'wagmi/chains'
import { injected } from 'wagmi/connectors'
import { arcTestnet } from './chains'

export { arcTestnet }

const PROJECT_ID =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'bec422518cfa4cfbc6e83d3c1bd8d07b'

const APP_URL = 'https://rosetta-alpha.vercel.app'

/**
 * Custom MetaMask Wrapper — pure injected, no WalletConnect QR fallback.
 */
const customMetaMaskWallet = (options: any) => {
  const wallet = defaultMetaMaskWallet(options)
  return {
    ...wallet,
    qrCode: undefined,
    createConnector: (walletDetails: any) => {
      return createConnector((config) => {
        const connector = injected({
          target: 'metaMask',
          shimDisconnect: true,
        })(config)
        return { ...connector, ...walletDetails }
      })
    }
  }
}

/**
 * Custom OKX Wrapper — uses native RainbowKit connector when installed,
 * no-op (install screen) when not installed.
 */
const customOkxWallet = (options: any) => {
  const wallet = defaultOkxWallet(options)
  const isOkxInstalled = typeof window !== 'undefined' &&
    ((window as any).okxwallet || (window as any).OKXWallet)

  if (isOkxInstalled) {
    return { ...wallet, qrCode: undefined }
  }

  return {
    ...wallet,
    qrCode: undefined,
    installed: false,
    createConnector: (walletDetails: any) => {
      return createConnector((config) => {
        const connector = injected({
          target: { id: 'okxWallet', name: 'OKX Wallet', provider: () => undefined },
          shimDisconnect: true,
        })(config)
        return { ...connector, ...walletDetails }
      })
    }
  }
}

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
      wallets: [injectedWallet],
    },
  ],
  {
    appName: 'Rosetta Alpha',
    projectId: PROJECT_ID,
    appUrl: APP_URL,
    appIcon: `${APP_URL}/arc-logo.svg`,
    appDescription: 'Institutional AI-powered investment thesis platform on Arc Testnet',
  }
)

/**
 * Wagmi config with NO persistent storage.
 *
 * Using noopStorage (the wagmi default when no storage is specified) means
 * wagmi never reads or writes connection state to cookies or localStorage.
 * This permanently fixes ghost wallet reconnections — wagmi always starts
 * disconnected on page load. Users reconnect once per session (acceptable UX).
 *
 * All previous attempts to clear cookieStorage failed because wagmi's internal
 * state subscription re-wrote the cookie faster than we could delete it.
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
    multiInjectedProviderDiscovery: false,
  })
}

export const config = getConfig()
