const fs = require('fs');

// --- 1. index.css ---
const css = `@import "tailwindcss";

@theme {
  --color-bg-primary: #000000;
  --color-bg-secondary: #0A0A0A;
  --color-bg-tertiary: #141414;
  --color-border: #1A1A1A;
  --color-border-strong: #2A2A2A;

  --color-text-primary: #FFFFFF;
  --color-text-secondary: #A3A3A3;
  --color-text-tertiary: #666666;

  --color-brand-red: #D82B2B;
  --color-accent-gold: #D82B2B;
  --color-accent-amber: #D82B2B;
  --color-accent-blue: #4A7FBF;

  --color-region-us: #4A7FBF;
  --color-region-cn: #BF4A4A;
  --color-region-eu: #4A8F6F;
  --color-region-jp: #8F6F4A;
  --color-region-crypto: #7A4ABF;

  --color-positive: #4A9F6F;
  --color-negative: #9F4A4A;
  --color-neutral: #7B8FA6;

  /* Native Apple Typography */
  --font-display: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  --font-body: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;

  /* Compatibility tokens for Tailwind utilities */
  --color-background: var(--color-bg-primary);
  --color-foreground: var(--color-text-primary);
  --color-card: var(--color-bg-secondary);
  --color-card-foreground: var(--color-text-primary);
  --color-popover: var(--color-bg-secondary);
  --color-popover-foreground: var(--color-text-primary);
  --color-primary: var(--color-brand-red);
  --color-primary-foreground: var(--color-bg-primary);
  --color-secondary: var(--color-bg-tertiary);
  --color-secondary-foreground: var(--color-text-secondary);
  --color-muted: var(--color-bg-tertiary);
  --color-muted-foreground: var(--color-text-secondary);
  --color-accent: var(--color-bg-tertiary);
  --color-accent-foreground: var(--color-text-primary);
  --color-destructive: var(--color-negative);
  --color-destructive-foreground: var(--color-text-primary);
  --color-input: var(--color-border);
  --color-ring: var(--color-brand-red);
  --radius-lg: 12px;
  --radius-md: 8px;
  --radius-sm: 4px;
}

@layer base {
  :root {
    --background: var(--color-bg-primary);
    --foreground: var(--color-text-primary);
    --border: var(--color-border);
    --primary: var(--color-brand-red);
  }
  * { border-color: var(--color-border); }
  *:focus-visible { outline: 2px solid var(--color-brand-red); outline-offset: 2px; border-radius: 2px; }
  html { scroll-behavior: smooth; background: var(--color-bg-primary); }
  body {
    background: var(--color-bg-primary); color: var(--color-text-primary);
    font-family: var(--font-body); font-feature-settings: "rlig" 1, "calt" 1, "ss01" 1;
    line-height: 1.6; letter-spacing: 0.01em; -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
  }
  ::selection { background: rgba(216, 43, 43, 0.25); color: var(--color-text-primary); }
  h1, h2, h3, h4, .font-display { font-family: var(--font-display); line-height: 1.2; letter-spacing: -0.01em; }
  code, pre, .font-mono { font-family: var(--font-mono); font-variant-numeric: tabular-nums; }
  button { cursor: pointer; }
}

@keyframes red-pulse {
  0%, 100% { opacity: 0.8; filter: drop-shadow(0 0 12px rgba(216,43,43,0.8)); }
  50% { opacity: 1; filter: drop-shadow(0 0 32px rgba(216,43,43,1)) drop-shadow(0 0 16px rgba(216,43,43,0.9)); }
}
.red-pulse { animation: red-pulse 2.5s ease-in-out infinite; }

@keyframes shimmer {
  0% { background-position: -1000px 0; }
  100% { background-position: 1000px 0; }
}
.skeleton {
  background: linear-gradient(90deg, var(--color-bg-secondary) 0%, var(--color-bg-tertiary) 50%, var(--color-bg-secondary) 100%);
  background-size: 1000px 100%; animation: shimmer 2s infinite linear;
}

@keyframes hero-grid-drift {
  0%   { transform: translate(0, 0); }
  100% { transform: translate(-40px, -40px); }
}

@keyframes fade-up {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}
.fade-up { animation: fade-up 0.8s cubic-bezier(0.22, 1, 0.36, 1) forwards; }

.bg-grain {
  position: fixed; inset: 0; z-index: 9999; pointer-events: none; opacity: 0.025; mix-blend-mode: screen;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.5' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
}

.global-grid-bg {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background-image: linear-gradient(rgba(216, 43, 43, 0.25) 1px, transparent 1px), linear-gradient(90deg, rgba(216, 43, 43, 0.25) 1px, transparent 1px);
  background-size: 100px 100px;
  animation: hero-grid-drift 20s linear infinite, red-pulse 3.5s ease-in-out infinite;
  pointer-events: none;
  mask-image: linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.8) 40%, transparent 100%);
  -webkit-mask-image: linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.8) 40%, transparent 100%);
  z-index: 0;
}

.hero-vignette { background: radial-gradient(ellipse at center, transparent 0%, rgba(0, 0, 0, 0.6) 50%, var(--color-bg-primary) 100%); }

::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--color-border); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: rgba(216, 43, 43, 0.4); }

.glass-panel {
  background: linear-gradient(135deg, rgba(20, 20, 20, 0.4) 0%, rgba(0, 0, 0, 0.1) 100%);
  backdrop-filter: saturate(200%) blur(64px); -webkit-backdrop-filter: saturate(200%) blur(64px);
  box-shadow: inset 0 1px 0 0 rgba(255, 255, 255, 0.05), inset 0 0 0 1px rgba(255, 255, 255, 0.02);
}

.nav-link { position: relative; }
.nav-link::after {
  content: ''; position: absolute; width: 0; height: 2px; bottom: -4px; left: 50%;
  background-color: var(--color-brand-red); transition: all 0.3s ease; transform: translateX(-50%);
  box-shadow: 0 0 8px rgba(216,43,43,0.8);
}
.nav-link:hover::after, .nav-link[data-active="true"]::after { width: 100%; }

@keyframes rain-drop {
  0% { opacity: 0; transform: translateY(-40px); filter: blur(4px); }
  100% { opacity: 1; transform: translateY(0); filter: blur(0px); }
}
.animate-rain { animation: rain-drop 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }

.logo-triangle {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  display: inline-block;
}
.group:hover .logo-triangle {
  transform: scale(1.25);
  filter: drop-shadow(0 0 16px rgba(216,43,43,1));
}
`;
fs.writeFileSync('src/index.css', css);

// --- 2. Layout.tsx ---
const layout = `import React from 'react'
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
    const i = setInterval(() => setIsGreek(g => !g), 4000)
    return () => clearInterval(i)
  }, [])
  return (
    <span className="italic text-text-secondary text-lg md:text-xl font-display tracking-wide relative inline-flex items-center justify-center min-w-[500px] h-[32px]">
      <span className={\`absolute transition-all duration-1000 \${isGreek ? 'opacity-100 blur-0 scale-100' : 'opacity-0 blur-md scale-95'}\`}>
        "Τὸ γὰρ ὅλον παρὰ τὰ μόρια"
      </span>
      <span className={\`absolute transition-all duration-1000 \${!isGreek ? 'opacity-100 blur-0 scale-100 text-brand-red drop-shadow-[0_0_8px_rgba(216,43,43,0.8)]' : 'opacity-0 blur-md scale-105'}\`}>
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
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
        style={{
          background: 'rgba(10, 10, 15, 0.4)',
          backdropFilter: 'saturate(180%) blur(48px)',
          WebkitBackdropFilter: 'saturate(180%) blur(48px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        }}
      >
        <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 h-16 flex items-center justify-between">
          <button
            onClick={() => onTabChange('home')}
            className="flex items-baseline gap-1 group"
            aria-label="Rosetta Alpha home"
          >
            <span className="font-display text-2xl text-text-primary leading-none transition-colors group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]">
              R
            </span>
            <span className="logo-triangle font-display text-2xl text-brand-red leading-none origin-bottom">
              △
            </span>
            <span className="hidden sm:inline-block ml-2 text-[10px] font-medium uppercase tracking-[0.25em] text-text-tertiary">
              Rosetta Alpha
            </span>
          </button>

          <nav className="hidden md:flex items-center" role="navigation">
            {TABS.map((tab, i) => {
              const isActive = activeTab === tab.id
              return (
                <React.Fragment key={tab.id}>
                  {i > 0 && <span aria-hidden className="w-px h-3.5 bg-border mx-1" />}
                  <button
                    onClick={() => onTabChange(tab.id)}
                    className={\`nav-link px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] transition-all duration-300 \${isActive ? 'text-brand-red drop-shadow-[0_0_8px_rgba(216,43,43,0.8)]' : 'text-text-secondary hover:text-brand-red hover:drop-shadow-[0_0_12px_rgba(216,43,43,1)]'}\`} 
                    data-active={isActive}
                  >
                    {tab.label}
                  </button>
                </React.Fragment>
              )
            })}
          </nav>

          <button
            className="
              flex items-center gap-2 px-5 py-2
              glass-panel border border-white/[0.05] rounded-full
              text-text-primary text-[10px] font-medium uppercase tracking-[0.2em]
              transition-all duration-300
              hover:border-brand-red/30 hover:shadow-[0_0_32px_rgba(216,43,43,1)]
            "
            onClick={() => alert('Wallet connection — coming soon')}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-brand-red red-pulse" />
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
            <div className="flex flex-col gap-1.5 font-light whitespace-nowrap overflow-hidden">
              <span className="block truncate">Multi-language reasoning traces secured on Arc L1.</span>
              <span className="block truncate">An institutional-grade intelligence layer for global macro.</span>
            </div>
          </div>
          <div>
            <p className="uppercase tracking-[0.25em] text-text-secondary mb-3">Stack</p>
            <ul className="space-y-2 font-light">
              <li className="flex items-center gap-2"><Brain className="w-3.5 h-3.5 text-brand-red"/> AdalFlow · Multi-agent reasoning</li>
              <li className="flex items-center gap-2"><Layers className="w-3.5 h-3.5 text-brand-red"/>