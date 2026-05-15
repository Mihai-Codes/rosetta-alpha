const fs = require('fs');

// 1. Rewrite Layout.tsx completely
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
    const i = setInterval(() => setIsGreek(g => !g), 5000)
    return () => clearInterval(i)
  }, [])
  return (
    <span className="italic text-text-secondary text-2xl md:text-3xl font-display tracking-wide relative inline-flex items-center justify-center min-w-[600px] h-[50px] drop-shadow-[0_0_16px_rgba(255,255,255,0.2)]">
      <span className={\`absolute transition-