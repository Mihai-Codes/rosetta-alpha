import React from 'react'
import { Brain, Layers, HardDrive, CircleDollarSign } from 'lucide-react'

export type Tab = 'desks' | 'feed' | 'registry' | 'about'

interface LayoutProps {
  children: React.ReactNode
  activeTab: Tab
  onTabChange: (tab: Tab | 'home') => void
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'desks', label: 'Desks' },
  { id: 'feed', label: 'Live Feed' },
  { id: 'registry', label: 'Registry' },
  { id: 'about', label: 'About' },
]

export function Layout({ children, activeTab, onTabChange }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-bg-primary relative selection:bg-brand-red/20">
      {/* Anthropic-style subtle grain */}
      <div className="bg-grain" aria-hidden="true" />
      {/* Always-visible sticky nav */}
      <header
        className="fixed top-0 left-0 right-0 z-50"
        style={{
          background: 'rgba(10, 10, 15, 0.4)',
          backdropFilter: 'saturate(180%) blur(48px)',
          WebkitBackdropFilter: 'saturate(180%) blur(48px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        }}
      >
        <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 h-16 flex items-center justify-between">
          {/* Logo: R△ */}
          <button
            onClick={() => onTabChange('home')}
            className="flex items-baseline gap-1 group"
            aria-label="Rosetta Alpha home"
          >
            <span className="font-display text-2xl text-text-primary leading-none transition-colors">
              R
            </span>
            <span className="font-display text-2xl text-brand-red leading-none transition-all duration-500 group-hover:scale-110 group-hover:drop-shadow-[0_0_16px_rgba(216,43,43,1)] origin-bottom">
              △
            </span>
            <span className="hidden sm:inline-block ml-2 text-[10px] font-medium uppercase tracking-[0.25em] text-text-tertiary">
              Rosetta Alpha
            </span>
          </button>

          {/* Nav tabs */}
          <nav className="hidden md:flex items-center" role="navigation">
            {TABS.map((tab, i) => {
              const isActive = activeTab === tab.id
              return (
                <React.Fragment key={tab.id}>
                  {i > 0 && <span aria-hidden className="w-px h-3.5 bg-border mx-1" />}
                  <button
                    onClick={() => onTabChange(tab.id)}
                    className={`
                      relative px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] transition-colors duration-200
                      ${isActive ? 'text-brand-red' : 'text-text-secondary hover:text-text-primary'}
                    `}
                  >
                    {tab.label}
                    <span
                      className={`absolute left-4 right-4 -bottom-px h-px transition-all duration-300 ${
                        isActive ? 'bg-brand-red opacity-100' : 'bg-brand-red opacity-0'
                      }`}
                    />
                  </button>
                </React.Fragment>
              )
            })}
          </nav>

          {/* Wallet connect (ghost, mock) */}
          <button
            className="
              flex items-center gap-2 px-5 py-2
              glass-panel border border-white/[0.05] rounded-full
              text-text-primary text-[10px] font-medium uppercase tracking-[0.2em]
              transition-all duration-300
              hover:border-brand-red/30 hover:shadow-glow-red
            "
            onClick={() => alert('Wallet connection — coming soon')}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-positive animate-pulse" />
            <span className="hidden sm:inline">Connect Wallet</span>
            <span className="sm:hidden">Wallet</span>
          </button>
        </div>
      </header>

      <main className="flex-1 w-full">{children}</main>

      <footer className="border-t border-white/[0.05] py-16 mt-24">
        <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 grid md:grid-cols-3 gap-5 sm:p-8 text-[11px] text-text-tertiary">
          <div>
            <p className="font-display text-text-primary text-base mb-2">
              Rosetta <span className="text-brand-red">Alpha</span>
            </p>
            <p className="font-light leading-relaxed max-w-[240px]">
              Multi-language reasoning traces secured on Arc L1.<br className="hidden sm:block" />
              An institutional-grade intelligence layer for global macro.
            </p>
          </div>
          <div>
            <p className="uppercase tracking-[0.25em] text-text-secondary mb-3">Stack</p>
            <ul className="space-y-2 font-light">
              <li className="flex items-center gap-2"><Brain className="w-3.5 h-3.5 text-brand-red"/> AdalFlow · Multi-agent reasoning</li>
              <li className="flex items-center gap-2"><Layers className="w-3.5 h-3.5 text-brand-red"/> Arc L1 · On-chain provenance</li>
              <li className="flex items-center gap-2"><HardDrive className="w-3.5 h-3.5 text-brand-red"/> IPFS · Permanent thesis storage</li>
              <li className="flex items-center gap-2"><CircleDollarSign className="w-3.5 h-3.5 text-brand-red"/> Circle Paymaster · Gasless USDC</li>
            </ul>
          </div>
          <div>
            <p className="uppercase tracking-[0.25em] text-text-secondary mb-3">Built For</p>
            <p className="font-light leading-relaxed">
              <a href="https://agora.thecanteenapp.com/" target="_blank" rel="noopener noreferrer" className="text-text-secondary hover:text-brand-red transition-colors font-medium">Agora Agents Hackathon</a> · 2026<br />
              Inspired by the <a href="https://www.bridgewater.com/research-and-insights/the-all-weather-story" target="_blank" rel="noopener noreferrer" className="text-text-secondary hover:text-brand-red transition-colors font-medium">All Weather discipline</a> of Bridgewater Associates.
            </p>
          </div>
        </div>
        <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 mt-12 pt-8 border-t border-white/[0.02] flex items-center justify-between flex-wrap gap-4 text-[10px] text-text-tertiary uppercase tracking-[0.25em]">
          <span>© 2026 Rosetta Alpha</span>
          <span className="italic text-text-secondary">"Τὸ γὰρ ὅλον παρὰ τὰ μόρια" <span className="text-text-tertiary normal-case tracking-normal ml-1">(The whole is something besides the parts)</span> — Aristotle</span>
        </div>
      </footer>
    </div>
  )
}
