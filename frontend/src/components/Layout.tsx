import React from 'react'

export type Tab = 'desks' | 'feed' | 'registry' | 'about'

interface LayoutProps {
  children: React.ReactNode
  activeTab: Tab
  onTabChange: (tab: Tab) => void
  navVisible: boolean
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'desks', label: 'Desks' },
  { id: 'feed', label: 'Live Feed' },
  { id: 'registry', label: 'Registry' },
  { id: 'about', label: 'About' },
]

export function Layout({ children, activeTab, onTabChange, navVisible }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-bg-primary">
      {/* Sticky nav — appears after hero scroll */}
      <header
        className={`
          fixed top-0 left-0 right-0 z-50 transition-all duration-500
          ${navVisible
            ? 'translate-y-0 opacity-100'
            : '-translate-y-full opacity-0 pointer-events-none'
          }
        `}
        style={{
          background: 'rgba(10, 10, 15, 0.92)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          borderBottom: '1px solid #2A2A38',
        }}
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo: R∆ */}
          <button
            onClick={() => onTabChange('desks')}
            className="flex items-baseline gap-1 group"
            aria-label="Rosetta Alpha home"
          >
            <span className="font-display text-2xl text-text-primary leading-none group-hover:text-gold transition-colors">
              R
            </span>
            <span className="font-display text-2xl text-gold leading-none transition-transform group-hover:translate-y-[-1px]">
              ∆
            </span>
            <span className="ml-2 text-[10px] font-medium uppercase tracking-[0.25em] text-text-tertiary">
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
                      ${isActive ? 'text-gold' : 'text-text-secondary hover:text-text-primary'}
                    `}
                  >
                    {tab.label}
                    <span
                      className={`absolute left-4 right-4 -bottom-px h-px transition-all duration-300 ${
                        isActive ? 'bg-gold opacity-100' : 'bg-gold opacity-0'
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
              flex items-center gap-2 px-4 py-1.5
              border border-gold/40 hover:border-gold
              text-gold text-[11px] font-medium uppercase tracking-[0.15em]
              transition-all duration-200
              hover:shadow-glow-gold hover:-translate-y-px
            "
            onClick={() => alert('Wallet connection — coming soon')}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-gold gold-pulse" />
            <span className="hidden sm:inline">Connect Wallet</span>
            <span className="sm:hidden">Wallet</span>
          </button>
        </div>
      </header>

      <main className="flex-1 w-full">{children}</main>

      <footer className="border-t border-border/60 py-10 mt-20">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-3 gap-8 text-[11px] text-text-tertiary">
          <div>
            <p className="font-display text-text-primary text-base mb-2">
              Rosetta <span className="text-gold">Alpha</span>
            </p>
            <p className="font-light leading-relaxed">
              Multi-language reasoning traces secured on Arc L1.
              An institutional-grade intelligence layer for global macro.
            </p>
          </div>
          <div>
            <p className="uppercase tracking-[0.25em] text-text-secondary mb-3">Stack</p>
            <ul className="space-y-1.5 font-light">
              <li>AdalFlow · Multi-agent reasoning</li>
              <li>Arc L1 · On-chain provenance</li>
              <li>IPFS · Permanent thesis storage</li>
              <li>Circle Paymaster · Gasless USDC</li>
            </ul>
          </div>
          <div>
            <p className="uppercase tracking-[0.25em] text-text-secondary mb-3">Built For</p>
            <p className="font-light leading-relaxed">
              Agora Agents Hackathon · 2026<br />
              Inspired by the All Weather discipline of Bridgewater Associates.
            </p>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 mt-8 pt-6 border-t border-border/40 flex items-center justify-between text-[10px] text-text-tertiary uppercase tracking-[0.25em]">
          <span>© 2026 Rosetta Alpha</span>
          <span>Made with discipline · Not noise</span>
        </div>
      </footer>
    </div>
  )
}
