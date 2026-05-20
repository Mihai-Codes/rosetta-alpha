import { connectorsForWallets } from '@rainbow-me/rainbowkit'
import {
  metaMaskWallet,
  braveWallet,
  okxWallet,
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
 * Standard RainbowKit wallet list.
 * EIP-6963 multiInjectedProviderDiscovery handles deduplication via rdns,
 * so we use standard connectors instead of custom wrappers.
 * With multiInjectedProviderDiscovery enabled, any other EIP-6963 wallets (Rabby, Phantom, etc.)
 * are automatically discovered and shown without needing an explicit injectedWallet entry.
 */
const connectors = connectorsForWallets(
  [
    {
      groupName: 'Recommended',
      wallets: [
        metaMaskWallet,
        braveWallet,
        okxWallet,
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
 * EIP-6963 multiInjectedProviderDiscovery is enabled so each wallet extension
 * self-identifies via standardized rdns, eliminating provider hijacking and
 * "Browser Wallet" ambiguity. RainbowKit auto-deduplicates discovered wallets
 * against the explicit list above using rdns matching.
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
    multiInjectedProviderDiscovery: true,
  })
}

export const config = getConfig()
