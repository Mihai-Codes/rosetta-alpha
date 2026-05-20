import { connectorsForWallets } from '@rainbow-me/rainbowkit'
import {
  metaMaskWallet as defaultMetaMaskWallet,
  okxWallet as defaultOkxWallet,
  braveWallet,
  coinbaseWallet,
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
          unstable_shimAsyncInject: 3000,
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
          target: {
            id: 'okxWallet',
            name: 'OKX Wallet',
            provider: (window) => (window as any).okxwallet || (window as any).OKXWallet,
          },
          shimDisconnect: true,
          unstable_shimAsyncInject: 3000,
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
 * Wagmi config with cookieStorage for SSR-safe wallet persistence.
 *
 * The server reads wagmi.store in app/layout.tsx and passes it to WagmiProvider
 * as initialState so signed-in users keep their wallet connection on refresh.
 * Sign-out and manual wallet disconnect still route through /api/disconnect,
 * which deletes wagmi.store before the next SSR pass.
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
