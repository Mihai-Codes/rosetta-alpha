import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { cookieToInitialState } from 'wagmi'
import { serverConfig } from '@/lib/wagmi-server'
import { AuthProvider } from '@/lib/session-provider'
import { Web3Provider } from '@/providers/Web3Provider'
import { PostHogProvider } from '@/providers/PostHogProvider'
import { FeedbackSurvey } from '@/components/FeedbackSurvey'
import { SimpleAnalytics } from '@simpleanalytics/next'
import '../index.css'



export const metadata: Metadata = {
  metadataBase: new URL('https://rosetta-alpha.vercel.app'),
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
  const initialState = cookieToInitialState(
    serverConfig,
    (await headers()).get('cookie')
  )

  return (
    <html lang="en" className="dark">
      <body className="bg-bg-primary text-text-primary antialiased">
        {/* AuthProvider must be outermost so SessionTracker in PostHogProvider can call useSession() */}
        <AuthProvider>
          <PostHogProvider>
            <Web3Provider initialState={initialState}>{children}</Web3Provider>
            {/* Exit survey: appears after 60s if not already seen */}
            <FeedbackSurvey />
          </PostHogProvider>
        </AuthProvider>
        {/* Simple Analytics — privacy-first traffic analytics (no cookies, GDPR compliant) */}
        <SimpleAnalytics />
      </body>
    </html>
  )
}
