'use client'

import { useRef } from 'react'
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { config } from '@/lib/wagmi'
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
}

export function Web3Provider({ children }: Web3ProviderProps) {
  // useRef ensures a single QueryClient instance per component lifetime, but does NOT
  // persist the module-level singleton across OAuth redirects/sign-in cycles.
  // Module-level QueryClient singletons cache "connected" wallet state through sign-out.
  const queryClientRef = useRef<QueryClient | null>(null)
  if (!queryClientRef.current) {
    queryClientRef.current = new QueryClient()
  }

  return (
    // reconnectOnMount=false: prevents wagmi from auto-reconnecting browser-authorized
    // wallets on every mount — eliminates ghost connections after sign-out/sign-in.
    <WagmiProvider config={config} reconnectOnMount={false}>
      <QueryClientProvider client={queryClientRef.current}>
        <RainbowKitProvider theme={customTheme} modalSize="compact">
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
