'use client'

import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit'
import { WagmiProvider, type State } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { config } from '@/lib/wagmi'
import '@rainbow-me/rainbowkit/styles.css'

const queryClient = new QueryClient()

const customTheme = darkTheme({
  accentColor: '#C9A84C',
  accentColorForeground: '#0A0A0F',
  borderRadius: 'medium',
  overlayBlur: 'small',
})

// Override modal colors to match Rosetta design system
customTheme.colors.modalBackground = '#111118'
customTheme.colors.modalBorder = '#2A2A38'
customTheme.colors.profileForeground = '#111118'
customTheme.colors.connectButtonBackground = '#111118'

interface Web3ProviderProps {
  children: React.ReactNode
  /** Cookie-extracted initial wallet state — prevents disconnect flash on refresh */
  initialState?: State
}

export function Web3Provider({ children, initialState }: Web3ProviderProps) {
  return (
    <WagmiProvider config={config} initialState={initialState}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={customTheme} modalSize="compact">
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
