'use client'

import { useEffect, useRef, useState } from 'react'
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit'
import { type State, WagmiProvider, useAccount, useConfig, useConnectors, useReconnect } from 'wagmi'
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

    const recoverSilently = async () => {
      for (const connector of connectors) {
        try {
          const provider = await connector.getProvider() as { request?: (args: { method: string }) => Promise<unknown> } | undefined
          const accounts = await provider?.request?.({ method: 'eth_accounts' })
          if (!Array.isArray(accounts) || accounts.length === 0) continue

          const data = await connector.connect({ isReconnecting: true } as never)
          const nextConnection = {
            accounts: data.accounts,
            chainId: data.chainId,
            connector,
          }

          await config.storage?.removeItem(`${connector.id}.disconnected`)
          await config.storage?.setItem('recentConnectorId', connector.id)

          config.setState((state) => ({
            ...state,
            current: connector.uid,
            connections: new Map(state.connections).set(connector.uid, nextConnection as never),
            status: 'connected',
          }))
          return
        } catch {
          // Try the next connector. Some installed wallets expose providers but reject silent reads.
        }
      }
    }

    const timers = [0, 500, 1500, 3000, 6000].map((delay) =>
      window.setTimeout(() => {
        reconnect({ connectors })
        window.setTimeout(recoverSilently, 250)
      }, delay)
    )

    return () => timers.forEach((timer) => window.clearTimeout(timer))
  }, [config, connectors, isConnected, isConnecting, isPending, isReconnecting, reconnect, sessionStatus])

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
