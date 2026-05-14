import React from 'react'
import { Globe, BarChart3, ShieldCheck, Zap } from 'lucide-react'

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl">
            <Globe className="w-6 h-6 text-primary" />
            <span>Rosetta Alpha</span>
          </div>
          <nav className="flex items-center gap-6">
            <a href="#" className="flex items-center gap-1.5 text-sm font-medium hover:text-primary transition-colors">
              <Zap className="w-4 h-4" />
              Live Feed
            </a>
            <a href="#" className="flex items-center gap-1.5 text-sm font-medium hover:text-primary transition-colors text-primary">
              <BarChart3 className="w-4 h-4" />
              Desks
            </a>
            <a href="#" className="flex items-center gap-1.5 text-sm font-medium hover:text-primary transition-colors">
              <ShieldCheck className="w-4 h-4" />
              Registry
            </a>
          </nav>
        </div>
      </header>
      <main className="flex-1 container mx-auto px-4 py-8">
        {children}
      </main>
      <footer className="border-t py-6 bg-card/30">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          Built with AdalFlow & Arc Testnet
        </div>
      </footer>
    </div>
  )
}
