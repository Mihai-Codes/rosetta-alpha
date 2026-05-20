'use client'

import { useEffect, useRef, useState } from 'react'
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit'
import { type State, WagmiProvider, useAccount, useConnectors, useReconnect } from 'wagmi'
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
  const { reconnect, isPending } = useReconnect()
  const attemptedRef = useRef(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    if (isConnected) {
      sessionStorage.removeItem('rosetta.wallet.manualDisconnect')
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
      isPending ||
      sessionStorage.getItem('rosetta.wallet.manualDisconnect') === '1'
    ) {
      return
    }

    attemptedRef.current = true
    const timers = [0, 500, 1500].map((delay) =>
      window.setTimeout(() => {
        reconnect({ connectors })
      }, delay)
    )

    return () => timers.forEach((timer) => window.clearTimeout(timer))
  }, [connectors, isConnected, isConnecting, isPending, isReconnecting, reconnect, sessionStatus])

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
