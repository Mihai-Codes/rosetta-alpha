'use client'

import { useEffect, useRef, useState } from 'react'
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit'
import { type State, WagmiProvider, useAccount, useConfig, useConnectors, useDisconnect, useReconnect } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
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

function WalletReconnectBridge() {
  const { status: sessionStatus } = useSession()
  const { isConnected, isConnecting, isReconnecting } = useAccount()
  const connectors = useConnectors()
  const config = useConfig()
  const { disconnectAsync } = useDisconnect()
  const { reconnect, isPending } = useReconnect()
  const attemptedRef = useRef(false)
  const forcedDisconnectRef = useRef(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const manualDisconnect = sessionStorage.getItem('rosetta.wallet.manualDisconnect') === '1'

    if (manualDisconnect) {
      attemptedRef.current = false

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

      return
    }

    forcedDisconnectRef.current = false

    if (isConnected) {
      attemptedRef.current = true
      return
    }

    if (sessionStatus !== 'authenticated') {
      attemptedRef.current = false
      return
    }

    if (
      attemptedRef.current ||
      isConnecting ||
      isReconnecting ||
      isPending
    ) {
      return
    }

    attemptedRef.current = true
    const timers = [0, 500, 1500, 3000, 6000].map((delay) =>
      window.setTimeout(() => {
        reconnect({ connectors })
      }, delay)
    )

    return () => timers.forEach((timer) => window.clearTimeout(timer))
  }, [config, connectors, disconnectAsync, isConnected, isConnecting, isPending, isReconnecting, reconnect, sessionStatus])

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
      reconnectOnMount={false}
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
