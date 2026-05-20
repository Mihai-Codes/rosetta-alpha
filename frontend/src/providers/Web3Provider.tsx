'use client'

import { useEffect, useRef, useState } from 'react'
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit'
import { type State, WagmiProvider, useAccount, useConfig, useConnectors, useDisconnect } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { getConfig } from '@/lib/wagmi'
import '@rainbow-me/rainbowkit/styles.css'

const customTheme = darkTheme({
  accentColor: '#C9A84C',
  accentColorForeground: '#0A0A0F',
  borderRadius: 'medium',
  overlayBlur: 'small',
})

customTheme.colors.modalBackground = '#111118'
customTheme.colors.modalBorder = '#2A2A38'
customTheme.colors.profileForeground = '#111118'
customTheme.colors.connectButtonBackground = '#111118'

interface Web3ProviderProps {
  children: React.ReactNode
  initialState?: State
}

/**
 * WalletReconnectBridge — handles only the manual-disconnect guard.
 * With EIP-6963 + cookieStorage + reconnectOnMount (default true),
 * wagmi natively handles session restoration. This bridge only needs to
 * enforce the "user clicked Disconnect" contract by force-clearing state
 * when the manualDisconnect flag is set.
 */
function WalletReconnectBridge() {
  const { isConnected } = useAccount()
  const connectors = useConnectors()
  const config = useConfig()
  const { disconnectAsync } = useDisconnect()
  const forcedDisconnectRef = useRef(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const manualDisconnect = sessionStorage.getItem('rosetta.wallet.manualDisconnect') === '1'

    if (!manualDisconnect) {
      forcedDisconnectRef.current = false
      return
    }

    // User explicitly disconnected — prevent wagmi from auto-reconnecting.
    if (isConnected && !forcedDisconnectRef.current) {
      forcedDisconnectRef.current = true
      void (async () => {
        for (const connector of connectors) {
          try { await disconnectAsync({ connector }) } catch { /* ignore */ }
        }
        config.setState((state) => ({
          ...state,
          current: null,
          connections: new Map(),
          status: 'disconnected',
        }))
      })()
    }
  }, [config, connectors, disconnectAsync, isConnected])

  return null
}

export function Web3Provider({ children, initialState }: Web3ProviderProps) {
  const [config] = useState(() => getConfig())
  const queryClientRef = useRef<QueryClient | null>(null)
  if (!queryClientRef.current) {
    queryClientRef.current = new QueryClient()
  }

  return (
    <WagmiProvider
      config={config}
      initialState={initialState}
    >
      <QueryClientProvider client={queryClientRef.current}>
        <WalletReconnectBridge />
        <RainbowKitProvider theme={customTheme} modalSize="compact">
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
