import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { cookieToInitialState } from 'wagmi'
import { auth } from '../../auth'
import { AuthProvider } from '@/lib/session-provider'
import { Web3Provider } from '@/providers/Web3Provider'
import { serverConfig } from '@/lib/wagmi-server'
import '../index.css'

export const metadata: Metadata = {
  title: 'Rosetta Alpha — AI-Powered Global Macro Intelligence',
  description:
    'Five AI agents, each reasoning in their native language, produce structured investment theses verified on-chain via Arc.',
  openGraph: {
    title: 'Rosetta Alpha',
    description: 'AI-Powered Global Macro Intelligence from every language and market.',
    url: 'https://rosetta-alpha.vercel.app',
    siteName: 'Rosetta Alpha',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Rosetta Alpha',
    description: 'AI-Powered Global Macro Intelligence',
  },
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieHeader = (await headers()).get('cookie')

  // Only hydrate wagmi wallet state when the user has an active NextAuth session.
  // If unauthenticated, pass undefined so wagmi starts fresh — this is the definitive
  // fix for wallet connections persisting across sign-out/sign-in cycles.
  const session = await auth()
  const initialState = session
    ? cookieToInitialState(serverConfig, cookieHeader)
    : undefined

  return (
    <html lang="en" className="dark">
      <body className="bg-bg-primary text-text-primary antialiased">
        <AuthProvider>
          <Web3Provider initialState={initialState}>{children}</Web3Provider>
        </AuthProvider>
      </body>
    </html>
  )
}
