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
  return (
    <div className="min-h-screen flex flex-col bg-bg-primary relative selection:bg-brand-red/20">
      <div className="bg-grain" aria-hidden="true" />
      <div className="global-grid-bg" aria-hidden="true" />
      
      <header
        className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.05]"
        style={{
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'saturate(180%) blur(20px)',
          WebkitBackdropFilter: 'saturate(180%) blur(20px)',
        }}
      >
        <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 h-16 flex items-center justify-between">
          <button
            onClick={() => onTabChange('home')}
            className="flex items-baseline gap-1 group logo-container"
            aria-label="Rosetta Alpha home"
          >
            <span className="font-display text-2xl text-text-primary leading-none logo-r">R</span>
            <span className="font-display text-2xl text-brand-red leading-none logo-triangle">△</span>
            <span className="hidden sm:inline-block ml-2 text-[10px] font-medium uppercase tracking-[0.25em] text-text-tertiary">
              Rosetta Alpha
            </span>
          </button>

          <nav className="hidden md:flex items-center gap-1" role="navigation">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`nav-link px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] ${isActive ? 'text-brand-red' : 'text-text-secondary hover:text-text-primary'}`} 
                  data-active={isActive}
                >
                  {tab.label}
                </button>
              )
            })}
          </nav>

          <button
            className="
              flex items-center gap-2 px-5 py-2
              solid-panel rounded-full
              text-text-primary text-[10px] font-medium uppercase tracking-[0.2em]
              transition-all duration-300
              hover:border-brand-red/50 hover:shadow-[0_0_30px_rgba(216,43,43,0.7)]
            "
            onClick={() => alert('Wallet connection — coming soon')}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-brand-red red-pulse" />
            <span className="hidden sm:inline">Connect Wallet</span>
            <span className="sm:hidden">Wallet</span>
          </button>
        </div>
      </header>

      <main className="flex-1 w-full z-10">{children}</main>

      <footer className="border-t border-white/[0.05] py-16 mt-24 bg-black/90 backdrop-blur-md z-10">
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
        <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 mt-12 pt-8 border-t border-white/[0.02] flex items-center justify-between flex-wrap gap-4 text-[10px] text-text-tertiary uppercase tracking-[0.25em]">
          <span className="font-medium text-text-secondary">Rosetta Alpha</span>
          <QuoteMatrix />
          <span>Aristotle</span>
        </div>
      </footer>
    </div>
  )
}
