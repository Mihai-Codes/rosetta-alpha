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
 *
 * Design decisions:
 * - Base Smart Wallet (passkey) removed — incompatible with Arc Testnet custom RPC.
 * - coinbaseWallet kept — browser extension path works fine on Arc Testnet.
 * - injectedWallet in "More" catches Brave (when not auto-detected), Rabby, Frame, etc.
 * - walletConnectParameters.disableProviderPing suppresses the WalletConnect relay
 *   iframe that causes "this page couldn't load" errors in MetaMask/OKX modals.
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
      /**
       * Disables the relay ping that loads verify.walletconnect.com in an iframe.
       * Without this, clicking MetaMask or OKX shows "this page couldn't load"
       * because the WalletConnect verification iframe fails on custom/testnet chains.
       */
      disableProviderPing: true,
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
  })
}

/** Singleton config instance — used by WagmiProvider and cookieToInitialState */
export const config = getConfig()
