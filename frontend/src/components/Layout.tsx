'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { useDisconnect, useConnectors } from 'wagmi'
import { Brain, Layers, HardDrive, CircleDollarSign, Menu, X, LogOut } from 'lucide-react'
import { WalletButton } from './WalletButton'
import { OnboardingModal } from './OnboardingModal'
import { SignInModal, authModalState } from './SignInModal'

export type Tab = 'desks' | 'feed' | 'registry' | 'about' | 'leaderboard' | 'dashboard' | 'quiz' | 'knowledge-graph' | 'pricing'

interface LayoutProps {
  children: React.ReactNode
  activeTab: Tab
}

const PUBLIC_TABS: { id: Tab; label: string; href: string }[] = [
  { id: 'desks', label: 'Desks', href: '/' },
  { id: 'leaderboard', label: 'Leaderboard', href: '/leaderboard' },
  { id: 'pricing', label: 'Pricing', href: '/pricing' },
  { id: 'about', label: 'About', href: '/about' },
]

const AUTH_TABS: { id: Tab; label: string; href: string }[] = [
  { id: 'desks', label: 'Desks', href: '/' },
  { id: 'dashboard', label: 'Dashboard', href: '/dashboard' },
  { id: 'leaderboard', label: 'Rankings', href: '/leaderboard' },
  { id: 'feed', label: 'Live Feed', href: '/feed' },
  { id: 'registry', label: 'Registry', href: '/registry' },
  { id: 'pricing', label: 'Pricing', href: '/pricing' },
  { id: 'quiz', label: 'Quiz', href: '/quiz' },
]

function GreekDelimiter({ isGreek }: { isGreek: boolean }) {
  return (
    <span className="relative inline-flex items-center justify-center w-2 h-3 text-[9px] text-white/20 select-none mx-0.5">
      <span className={`absolute transition-opacity duration-1000 ease-in-out ${isGreek ? 'opacity-100' : 'opacity-0'}`}>|</span>
      <span className={`absolute transition-opacity duration-1000 ease-in-out ${!isGreek ? 'opacity-80 text-brand-red drop-shadow-[0_0_4px_rgba(216,43,43,0.5)]' : 'opacity-0'}`}>Δ</span>
    </span>
  )
}

function QuoteMatrix({ isGreek }: { isGreek: boolean }) {
  return (
    <span className="italic text-text-secondary text-[11px] font-display tracking-wide relative inline-flex items-center justify-center min-w-[280px] sm:min-w-[420px] h-[24px] whitespace-nowrap">
      <span className={`absolute transition-all duration-1000 ease-in-out ${isGreek ? 'opacity-100 blur-0 scale-100' : 'opacity-0 blur-md scale-95'}`}>
        "Τὸ γὰρ ὅλον παρὰ τὰ μόρια"
      </span>
      <span className={`absolute transition-all duration-1000 ease-in-out ${!isGreek ? 'opacity-100 blur-0 scale-100 text-brand-red drop-shadow-[0_0_8px_rgba(216,43,43,0.8)]' : 'opacity-0 blur-md scale-105'}`}>
        "The whole is something besides the parts"
      </span>
    </span>
  )
}

export function Layout({ children, activeTab }: LayoutProps) {
  const { data: session } = useSession()
  const pathname = usePathname()
  const router = useRouter()
  const isSignedIn = !!session?.user
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const [scrolled, setScrolled] = React.useState(false)
  
  // Shared animation state for Greek motifs
  const [isGreek, setIsGreek] = React.useState(true)
  React.useEffect(() => {
    const i = setInterval(() => setIsGreek(g => !g), 5000)
    return () => clearInterval(i)
  }, [])

  React.useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const { disconnectAsync } = useDisconnect()
  const connectors = useConnectors()

  const handleSignOut = React.useCallback(async () => {
    sessionStorage.setItem('rosetta.wallet.manualDisconnect', '1')

    // Step 1: Revoke browser-level wallet permissions so wallets cannot auto-reconnect
    if (typeof window !== 'undefined') {
      const win = window as any
      const providers = [win.ethereum, win.okxwallet].filter(Boolean)
      for (const provider of providers) {
        try {
          await provider.request({ method: 'wallet_revokePermissions', params: [{ eth_accounts: {} }] })
        } catch { /* wallet may not support it */ }
      }
    }
    // Step 2: Disconnect all wagmi connectors
    for (const connector of connectors) {
      try { await disconnectAsync({ connector }) } catch { /* ignore */ }
    }
    // Step 3: Sign out NextAuth session
    await signOut({ redirect: false })
    // Step 4: Wipe wagmi cookies server-side without full page reload
    await fetch('/api/disconnect?mode=json', { method: 'GET', credentials: 'include' })
    router.replace('/')
    router.refresh()
  }, [connectors, disconnectAsync])

  // Close drawer on route change
  React.useEffect(() => { setMobileOpen(false) }, [pathname])

  const tabs = isSignedIn ? AUTH_TABS : PUBLIC_TABS

  return (
    <div className="min-h-screen flex flex-col bg-bg-primary relative selection:bg-brand-red/20">
      <div className="bg-grain" aria-hidden="true" />
      <div className="global-grid-wrapper" aria-hidden="true">
        <div className="global-grid-bg" />
      </div>

      {/* Skip to content link (accessibility) */}
      <a
        href="#main-content"
        className="absolute -top-16 left-4 z-50 px-4 py-2 bg-bg-primary border border-brand-red/30 text-brand-red text-sm font-medium rounded focus:top-4 focus:left-4 transition-all duration-300"
        aria-label="Skip to main content"
      >
        Skip to Content
      </a>

      {/* ── Header ── */}
      <header 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled 
            ? 'bg-bg-primary/90 backdrop-blur-md border-b border-brand-red/50 shadow-[0_4px_30px_rgba(216,43,43,0.3)]' 
            : 'bg-transparent border-b border-brand-red/20 shadow-[0_4px_30px_rgba(216,43,43,0.05)]'
        }`}
        role="banner"
      >
        <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 h-16 flex items-center justify-between">

          {/* Logo */}
          <Link href="/" className="flex items-baseline gap-0.5 group logo-container" aria-label="Rosetta Alpha home">
            <span className="font-display text-2xl text-text-primary leading-none logo-r">R</span>
            <span className="font-display text-2xl text-brand-red leading-none logo-triangle">△</span>
            <span className="hidden sm:inline-block ml-2 text-[10px] font-medium uppercase tracking-[0.25em] text-text-tertiary">
              Rosetta Alpha
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1" role="navigation">
            {tabs.map((tab, idx) => {
              const isActive = pathname === tab.href || activeTab === tab.id
              return (
                <React.Fragment key={tab.id}>
                  <Link
                    href={tab.href}
                    className={`nav-link px-2.5 lg:px-3 py-1 text-[10px] font-medium uppercase tracking-[0.16em] ${isActive ? 'text-brand-red' : 'text-text-secondary hover:text-text-primary'}`}
                    data-active={isActive}
                  >
                    {tab.label}
                  </Link>
                  {idx < tabs.length - 1 && <GreekDelimiter isGreek={isGreek} />}
                </React.Fragment>
              )
            })}
          </nav>

          <div className="flex items-center gap-2">
            {isSignedIn ? (
              <>
                {session?.user?.image && (
                  <img src={session.user.image} alt={session.user.name ?? 'User'} className="hidden md:block w-7 h-7 rounded-full border border-border" />
                )}
                <WalletButton />
                <button
                  onClick={handleSignOut}
                  className="hidden md:flex items-center justify-center w-8 h-8 text-text-tertiary hover:text-brand-red transition-colors"
                  aria-label="Sign out"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <button onClick={() => authModalState.open()} className="hidden md:flex items-center gap-2 px-5 py-2 solid-panel rounded-full text-text-primary text-[10px] font-medium uppercase tracking-[0.2em] transition-all duration-300 hover:border-brand-red hover:bg-brand-red/5  hover: cursor-pointer"><span className="w-1.5 h-1.5 rounded-full bg-brand-red" />Sign In</button>
            )}

            {/* Hamburger — mobile only */}
            <button
              onClick={() => setMobileOpen(o => !o)}
              className="md:hidden flex items-center justify-center w-11 h-11 text-text-secondary hover:text-text-primary transition-colors"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile drawer overlay */}
        {mobileOpen && (
          <div
            className="md:hidden fixed inset-0 top-16 z-40 bg-bg-primary/95 backdrop-blur-md border-t border-white/[0.05] flex flex-col px-6 py-8 gap-2"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
          >
            {tabs.map((tab) => {
              const isActive = pathname === tab.href || activeTab === tab.id
              return (
                <Link
                  key={tab.id}
                  href={tab.href}
                  className={`flex items-center px-4 py-4 min-h-[44px] rounded-lg text-sm font-medium uppercase tracking-[0.2em] transition-colors ${
                    isActive
                      ? 'text-brand-red bg-brand-red/10 border border-brand-red/20'
                      : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.04]'
                  }`}
                >
                  {tab.label}
                </Link>
              )
            })}

            {isSignedIn ? (
              <button
                onClick={handleSignOut}
                className="mt-4 flex items-center justify-center gap-2 px-5 py-4 min-h-[44px] border border-border bg-bg-secondary hover:border-brand-red/50 text-text-secondary hover:text-brand-red text-[10px] font-medium uppercase tracking-[0.2em] transition-all duration-300"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            ) : (
              <button onClick={() => { authModalState.open(); setMobileOpen(false); }} className="mt-4 w-full flex items-center justify-center gap-2 px-5 py-4 min-h-[44px] solid-panel rounded-full text-text-primary text-[10px] font-medium uppercase tracking-[0.2em] transition-all duration-300 hover:border-brand-red hover:bg-brand-red/5  hover: cursor-pointer"><span className="w-1.5 h-1.5 rounded-full bg-brand-red" />Sign In</button>
            )}
          </div>
        )}
      </header>

      <OnboardingModal isSignedIn={isSignedIn} />
      <SignInModal />

      <main className="flex-1 w-full z-10" role="main" id="main-content">{children}</main>

      <footer className="border-t border-white/10 py-8 sm:py-12 mt-0 bg-bg-primary z-10 relative" role="contentinfo">
        <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 flex flex-col lg:flex-row justify-between items-center gap-12 lg:gap-4 text-[11px] text-text-tertiary">
          
          {/* Left: Rosetta Alpha */}
          <div className="flex-1 flex justify-start w-full lg:w-auto">
            <div className="xl:ml-12 max-w-[320px]">
              <p className="font-display text-text-primary text-base mb-2">
                Rosetta <span className="text-brand-red">Alpha</span>
              </p>
              <div className="flex flex-col gap-0.5 font-light text-[12px] text-text-secondary">
                <p>Multi-language reasoning traces secured on Arc L1.</p>
                <p>An institutional-grade intelligence layer for global macro.</p>
              </div>
            </div>
          </div>

          {/* Separator 1 - Claw */}
          <div className="hidden lg:block w-[1px] h-28 bg-gradient-to-b from-transparent via-white/20 to-transparent" />

          {/* Center: Stack */}
          <div className="shrink-0 flex flex-col items-center text-left w-full lg:w-[320px]">
            <div className="w-fit">
              <p className="uppercase tracking-[0.25em] text-text-secondary mb-3 text-[10px] text-center lg:text-left">Stack</p>
              <ul className="space-y-3 font-light">
                <li className="flex items-center gap-2"><Brain className="w-3.5 h-3.5 text-brand-red opacity-80"/> AdalFlow · Multi-agent reasoning</li>
                <li className="flex items-center gap-2"><Layers className="w-3.5 h-3.5 text-brand-red opacity-80"/> Arc L1 · On-chain provenance</li>
                <li className="flex items-center gap-2"><HardDrive className="w-3.5 h-3.5 text-brand-red opacity-80"/> IPFS · Permanent storage</li>
                <li className="flex items-center gap-2"><CircleDollarSign className="w-3.5 h-3.5 text-brand-red opacity-80"/> Circle Paymaster · Gasless USDC</li>
              </ul>
            </div>
          </div>

          {/* Separator 2 - Claw */}
          <div className="hidden lg:block w-[1px] h-28 bg-gradient-to-b from-transparent via-white/20 to-transparent" />

          {/* Right: Reference */}
          <div className="flex-1 flex justify-end w-full lg:w-auto">
            <div className="xl:mr-8 max-w-[320px] text-left lg:text-right">
              <p className="uppercase tracking-[0.25em] text-text-secondary mb-3 text-[10px]">Reference</p>
              <p className="font-light leading-relaxed">
                <a href="https://agora.thecanteenapp.com/" target="_blank" rel="noopener noreferrer"  className="text-brand-red hover:text-text-primary transition-colors font-medium underline underline-offset-4 decoration-white/10">Agora Agents Hackathon</a><br />
                Engineered for <a href="https://www.principles.com/" target="_blank" rel="noopener noreferrer"  className="text-brand-red hover:text-text-primary transition-colors font-medium drop-shadow-[0_0_8px_rgba(216,43,43,0.4)]">Radical Truth</a>.
              </p>
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 mt-10 lg:mt-12 pt-6 lg:pt-8 border-t border-white/[0.02] flex items-center justify-between text-[10px] text-text-tertiary uppercase tracking-[0.25em]">
          <div className="flex-1 hidden xl:flex justify-start">
            <span className="font-medium text-brand-red italic tracking-[0.4em]">Decentralized Reason</span>
          </div>
          
          <div className="shrink-0 flex items-center justify-center gap-4 sm:gap-6">
            <QuoteMatrix isGreek={isGreek} />
            <div className="hidden sm:flex items-center gap-3">
              <div className="flex items-center gap-2 group">
                <span className="text-[18px] leading-none grayscale group-hover:grayscale-0 transition-all duration-500" title="Aristotle">🏛️</span>
                <span className="text-text-secondary tracking-[0.4em] font-medium">Aristotle</span>
              </div>
            </div>
          </div>

          <div className="flex-1 hidden xl:flex justify-end">
            <span className="text-white tracking-[0.4em] italic font-medium">PROVENANCE LAYER</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
