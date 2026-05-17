'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { Brain, Layers, HardDrive, CircleDollarSign } from 'lucide-react'

export type Tab = 'desks' | 'feed' | 'registry' | 'about' | 'leaderboard' | 'dashboard' | 'quiz'

interface LayoutProps {
  children: React.ReactNode
  activeTab: Tab
  onTabChange: (tab: Tab | 'home') => void
}

/** Navigation items — different for signed-in vs signed-out */
const PUBLIC_TABS: { id: Tab; label: string; href: string }[] = [
  { id: 'desks', label: 'Desks', href: '/desks' },
  { id: 'leaderboard', label: 'Leaderboard', href: '/leaderboard' },
  { id: 'about', label: 'About', href: '/about' },
]

const AUTH_TABS: { id: Tab; label: string; href: string }[] = [
  { id: 'desks', label: 'Desks', href: '/desks' },
  { id: 'feed', label: 'Live Feed', href: '/feed' },
  { id: 'registry', label: 'Registry', href: '/registry' },
  { id: 'dashboard', label: 'Dashboard', href: '/dashboard' },
]

function QuoteMatrix() {
  const [isGreek, setIsGreek] = React.useState(true)
  React.useEffect(() => {
    const i = setInterval(() => setIsGreek(g => !g), 5000)
    return () => clearInterval(i)
  }, [])
  return (
    <span className="italic text-text-secondary text-[11px] font-display tracking-wide relative inline-flex items-center justify-center min-w-[420px] h-[24px] whitespace-nowrap">
      <span className={`absolute transition-all duration-1000 ease-in-out ${isGreek ? 'opacity-100 blur-0 scale-100' : 'opacity-0 blur-md scale-95'}`}>
        "Τὸ γὰρ ὅλον παρὰ τὰ μόρια"
      </span>
      <span className={`absolute transition-all duration-1000 ease-in-out ${!isGreek ? 'opacity-100 blur-0 scale-100 text-brand-red drop-shadow-[0_0_8px_rgba(216,43,43,0.8)]' : 'opacity-0 blur-md scale-105'}`}>
        "The whole is something besides the parts"
      </span>
    </span>
  )
}

export function Layout({ children, activeTab, onTabChange }: LayoutProps) {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const isSignedIn = !!session?.user

  const tabs = isSignedIn ? AUTH_TABS : PUBLIC_TABS

  return (
    <div className="min-h-screen flex flex-col bg-bg-primary relative selection:bg-brand-red/20">
      <div className="bg-grain" aria-hidden="true" />
      <div className="global-grid-wrapper" aria-hidden="true">
        <div className="global-grid-bg" />
      </div>
      
      <header
        className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.03]"
        style={{ background: 'transparent' }}
      >
        <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-baseline gap-1 group logo-container"
            aria-label="Rosetta Alpha home"
          >
            <span className="font-display text-2xl text-text-primary leading-none logo-r">R</span>
            <span className="font-display text-2xl text-brand-red leading-none logo-triangle">△</span>
            <span className="hidden sm:inline-block ml-2 text-[10px] font-medium uppercase tracking-[0.25em] text-text-tertiary">
              Rosetta Alpha
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1" role="navigation">
            {tabs.map((tab) => {
              const isActive = pathname === tab.href || activeTab === tab.id
              return (
                <Link
                  key={tab.id}
                  href={tab.href}
                  className={`nav-link px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] ${isActive ? 'text-brand-red' : 'text-text-secondary hover:text-text-primary'}`}
                  data-active={isActive}
                >
                  {tab.label}
                </Link>
              )
            })}
          </nav>

          <div className="flex items-center gap-3">
            {isSignedIn ? (
              <>
                {/* User avatar */}
                {session.user?.image && (
                  <img
                    src={session.user.image}
                    alt={session.user.name ?? 'User'}
                    className="w-7 h-7 rounded-full border border-border"
                  />
                )}
                {/* Connect Wallet button */}
                <button
                  className="
                    flex items-center gap-2 px-5 py-2
                    solid-panel rounded-full
                    text-text-primary text-[10px] font-medium uppercase tracking-[0.2em]
                    transition-all duration-300
                    hover:border-brand-red/50 hover:shadow-[0_0_30px_rgba(216,43,43,0.7)]
                  "
                  onClick={() => alert('Wallet connection — coming in next sprint')}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-red red-pulse" />
                  <span className="hidden sm:inline">Connect Wallet</span>
                  <span className="sm:hidden">Wallet</span>
                </button>
              </>
            ) : (
              <Link
                href="/signin"
                className="
                  flex items-center gap-2 px-5 py-2
                  solid-panel rounded-full
                  text-text-primary text-[10px] font-medium uppercase tracking-[0.2em]
                  transition-all duration-300
                  hover:border-brand-red/50 hover:shadow-[0_0_30px_rgba(216,43,43,0.7)]
                "
              >
                <span className="w-1.5 h-1.5 rounded-full bg-accent-gold" />
                <span className="hidden sm:inline">Sign In</span>
                <span className="sm:hidden">Sign In</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 w-full z-10">{children}</main>

      <footer className="border-t border-white/[0.05] py-16 mt-24 bg-bg-primary z-10 relative">
        <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 grid md:grid-cols-3 gap-10 text-[11px] text-text-tertiary">
          <div>
            <p className="font-display text-text-primary text-base mb-2">
              Rosetta <span className="text-brand-red">Alpha</span>
            </p>
            <div className="flex flex-col gap-0.5 font-light text-[12px] text-text-secondary">
              <p className="whitespace-nowrap">Multi-language reasoning traces secured on Arc L1.</p>
              <p className="whitespace-nowrap">An institutional-grade intelligence layer for global macro.</p>
            </div>
          </div>
          <div>
            <p className="uppercase tracking-[0.25em] text-text-secondary mb-3 text-[10px]">Stack</p>
            <ul className="space-y-2 font-light">
              <li className="flex items-center gap-2"><Brain className="w-3.5 h-3.5 text-brand-red opacity-80"/> AdalFlow · Multi-agent reasoning</li>
              <li className="flex items-center gap-2"><Layers className="w-3.5 h-3.5 text-brand-red opacity-80"/> Arc L1 · On-chain provenance</li>
              <li className="flex items-center gap-2"><HardDrive className="w-3.5 h-3.5 text-brand-red opacity-80"/> IPFS · Permanent storage</li>
              <li className="flex items-center gap-2"><CircleDollarSign className="w-3.5 h-3.5 text-brand-red opacity-80"/> Circle Paymaster · Gasless USDC</li>
            </ul>
          </div>
          <div>
            <p className="uppercase tracking-[0.25em] text-text-secondary mb-3 text-[10px]">Reference</p>
            <p className="font-light leading-relaxed">
              <a href="https://agora.thecanteenapp.com/" target="_blank" rel="noopener noreferrer" className="text-brand-red hover:text-text-primary transition-colors font-medium underline underline-offset-4 decoration-white/10">Agora Agents Hackathon</a><br />
              Built on the <a href="https://www.bridgewater.com/research-and-insights/the-all-weather-story" target="_blank" rel="noopener noreferrer" className="text-brand-red hover:text-text-primary transition-colors font-medium drop-shadow-[0_0_8px_rgba(216,43,43,0.4)]">All Weather discipline</a>.
            </p>
          </div>
        </div>
        <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 mt-12 pt-8 border-t border-white/[0.02] flex items-center justify-center relative flex-wrap gap-4 text-[10px] text-text-tertiary uppercase tracking-[0.25em]">
          <span className="absolute left-4 sm:left-8 lg:left-12 font-medium text-brand-red hidden xl:block italic tracking-[0.4em]">Decentralized Reason</span>
          <div className="flex items-center gap-6">
            <QuoteMatrix />
            <div className="flex items-center gap-3">
              <span className="w-px h-4 bg-white/10" />
              <div className="flex items-center gap-2 group">
                <span className="text-[18px] leading-none grayscale group-hover:grayscale-0 transition-all duration-500" title="Aristotle">🏛️</span>
                <span className="text-text-secondary tracking-[0.4em] font-medium">Aristotle</span>
              </div>
            </div>
          </div>
          <span className="absolute right-4 sm:right-8 lg:right-12 xl:block hidden text-white tracking-[0.4em] italic font-medium">PROVENANCE LAYER</span>
        </div>
      </footer>
    </div>
  )
}
