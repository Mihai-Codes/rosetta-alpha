'use client'

import React, { useState } from 'react'
import posthog from 'posthog-js'
import { motion } from 'framer-motion'
import { useAccount, useBalance } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { arcTestnet } from '@/lib/chains'
import { Lock, Key } from 'lucide-react'
import { MobMeter } from './MobMeter'

// ─── Typed mock data interfaces ───────────────────────────────────────────────

interface PredictionRow {
  id: string
  thesis: string          // e.g. "BTC > $65k by June 15?"
  region: string          // e.g. "crypto", "us", "cn"
  direction: 'LONG' | 'SHORT' | 'NEUTRAL'
  stake: number           // USDC amount
  status: 'OPEN' | 'RESOLVED_WIN' | 'RESOLVED_LOSS'
  pnl: number             // positive = profit, negative = loss
  arcTx?: string
}

interface AgentLeaderboardRow {
  rank: number
  agent: string           // e.g. "Alpha-7", "Nexus-AI"
  region: string          // e.g. "United States", "Crypto", "China"
  accuracy: number        // 0–100
  theses: number          // total theses generated
  streak: number          // current win streak
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const PREDICTIONS: PredictionRow[] = [
  {
    id: 'p1',
    thesis: 'BTC > $65k by June 15, 2026?',
    region: 'crypto',
    direction: 'LONG',
    stake: 50,
    status: 'RESOLVED_WIN',
    pnl: 47.5,
    arcTx: '0x50fd3228a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6',
  },
  {
    id: 'p2',
    thesis: 'AAPL within 1% band over 30 days?',
    region: 'us',
    direction: 'NEUTRAL',
    stake: 25,
    status: 'RESOLVED_LOSS',
    pnl: -25,
  },
  {
    id: 'p3',
    thesis: 'ETH outperforms BTC +5% in 14 days?',
    region: 'crypto',
    direction: 'SHORT',
    stake: 75,
    status: 'OPEN',
    pnl: 0,
  },
  {
    id: 'p4',
    thesis: 'CNY strengthens >2% vs USD in Q3?',
    region: 'cn',
    direction: 'SHORT',
    stake: 40,
    status: 'RESOLVED_WIN',
    pnl: 38.0,
    arcTx: '0x8d2f119ab1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6',
  },
  {
    id: 'p5',
    thesis: 'Nikkei 225 closes >38,000 by July?',
    region: 'jp',
    direction: 'LONG',
    stake: 60,
    status: 'OPEN',
    pnl: 0,
  },
]

const AGENT_LEADERBOARD: AgentLeaderboardRow[] = [
  { rank: 1, agent: 'Alpha-7',      region: 'Crypto',          accuracy: 91, theses: 142, streak: 12 },
  { rank: 2, agent: 'Nexus-AI',     region: 'United States',   accuracy: 87, theses: 198, streak: 8 },
  { rank: 3, agent: 'Dragon-9',     region: 'China',           accuracy: 84, theses: 156, streak: 5 },
  { rank: 4, agent: 'Samurai-X',    region: 'Japan',           accuracy: 81, theses: 134, streak: 4 },
  { rank: 5, agent: 'EuroQuant',    region: 'Europe',          accuracy: 79, theses: 167, streak: 3 },
  { rank: 6, agent: 'Meridian',     region: 'Crypto',          accuracy: 76, theses: 98,  streak: 2 },
  { rank: 7, agent: 'Sentinel-V',   region: 'United States',   accuracy: 74, theses: 189, streak: 1 },
  { rank: 8, agent: 'Phoenix-3',    region: 'China',           accuracy: 72, theses: 112, streak: 0 },
  { rank: 9, agent: 'Horizon',      region: 'Europe',          accuracy: 69, theses: 145, streak: 0 },
  { rank: 10, agent: 'Nova-Prime',  region: 'Japan',           accuracy: 67, theses: 78,  streak: 0 },
]

const REGION_META: Record<string, { name: string; flag: string; color: string }> = {
  us:     { name: 'United States', flag: '🇺🇸', color: '#FFFFFF' },
  cn:     { name: 'China',         flag: '🇨🇳', color: '#D82B2B' },
  eu:     { name: 'Europe',        flag: '🇪🇺', color: '#888888' },
  jp:     { name: 'Japan',         flag: '🇯🇵', color: '#FFD700' },
  crypto: { name: 'Crypto',        flag: '₿',  color: '#00FF00' },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusColor(s: PredictionRow['status']) {
  if (s === 'OPEN')         return 'text-accent-gold border-accent-gold/40 bg-accent-gold/5'
  if (s === 'RESOLVED_WIN') return 'text-positive border-positive/40 bg-positive/5'
  return 'text-negative border-negative/40 bg-negative/5'
}

function statusLabel(s: PredictionRow['status']) {
  if (s === 'OPEN')         return 'OPEN'
  if (s === 'RESOLVED_WIN') return 'RESOLVED WIN'
  return 'RESOLVED LOSS'
}

function directionArrow(d: PredictionRow['direction']) {
  if (d === 'LONG')   return '↑ Long'
  if (d === 'SHORT')  return '↓ Short'
  return '→ Neutral'
}

function directionColor(d: PredictionRow['direction']) {
  if (d === 'LONG')   return 'text-positive'
  if (d === 'SHORT')  return 'text-negative'
  return 'text-text-secondary'
}

function truncateHash(hash: string, head = 6, tail = 4): string {
  if (!hash || hash.length < head + tail + 2) return hash
  return `${hash.slice(0, head)}…${hash.slice(-tail)}`
}

function formatUSDC(n: number): string {
  if (n === 0) return '0.00 USDC'
  const s = n < 0 ? '-' : '+'
  return `${s}${Math.abs(n).toFixed(2)} USDC`
}

function formatPercent(n: number): string {
  return `${n}%`
}

// ─── SVG Ring Chart (pure SVG, no libraries) ──────────────────────────────────

interface Quadrant {
  label: string
  pct: number
  color: string
}

const QUADRANTS: Quadrant[] = [
  { label: 'Equities',    pct: 40, color: '#FFFFFF' },
  { label: 'Bonds',       pct: 30, color: '#FFD700' },
  { label: 'Commodities', pct: 15, color: '#D82B2B' },
  { label: 'Crypto',      pct: 15, color: '#FFFFFF' },
]

function RingChart() {
  const total = QUADRANTS.reduce((s, q) => s + q.pct, 0)
  const radius = 80 // Reduced radius slightly to completely avoid clipping
  const cx = 100
  const cy = 100
  const circumference = 2 * Math.PI * radius
  let offset = 0

  return (
    <div className="flex flex-col items-center gap-4 sm:gap-6 w-full max-w-xs mx-auto">
      <div className="relative flex items-center justify-center w-[200px] h-[200px] mx-auto">
        <svg width="200" height="200" viewBox="0 0 200 200" className="transform -rotate-90 absolute inset-0">
          {/* Track */}
          <circle cx={100} cy={100} r={radius} fill="none" stroke="var(--color-border)" strokeWidth="12" />
          {/* Segments */}
          {QUADRANTS.map((q, i) => {
            const len = (q.pct / total) * circumference
            const seg = (
              <circle key={i} cx={100} cy={100} r={radius} fill="none" stroke={q.color} strokeWidth="12"
                strokeDasharray={`${len} ${circumference}`} strokeDashoffset={-offset} strokeLinecap="butt"
                style={{ transition: 'stroke-dashoffset 1.2s ease-out' }}
              />
            )
            offset += len
            return seg
          })}
        </svg>
        {/* Center label with optical alignment for tracking */}
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none">
          <p className="font-mono text-[10px] text-text-secondary tracking-[0.2em] uppercase mb-1 pl-[0.2em]">
            All Weather
          </p>
          <p className="font-display text-4xl text-text-primary font-bold leading-none" style={{ transform: 'translateX(3px)' }}>
            {total}%
          </p>
        </div>
      </div>

      {/* Stat pills */}
      <div className="grid grid-cols-2 gap-2 w-full">
        {QUADRANTS.map(q => (
          <div
            key={q.label}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border/40 bg-bg-primary/60"
          >
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: q.color }} />
            <div className="min-w-0">
              <p className="text-[10px] text-text-secondary font-medium truncate">{q.label}</p>
              <p className="text-[10px] font-mono text-text-primary">{q.pct}%</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Wallet gate / connect prompt ─────────────────────────────────────────────



// ─── My Predictions section ───────────────────────────────────────────────────

function MyPredictions() {
  return (
    <div className="solid-panel rounded-none border overflow-hidden">
      <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-border flex items-center justify-between">
        <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-text-tertiary">
          My Predictions
        </p>
        <span className="text-[9px] uppercase tracking-[0.2em] text-accent-gold font-medium">
          {PREDICTIONS.filter(p => p.status === 'RESOLVED_WIN').length}/{PREDICTIONS.length} Wins
        </span>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border">
              {['Thesis', 'Region', 'Direction', 'Stake', 'Status', 'PnL'].map(h => (
                <th key={h} className="px-5 py-3 text-left text-[9px] uppercase tracking-[0.2em] text-text-tertiary font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PREDICTIONS.map((row, i) => (
              <motion.tr
                key={row.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className="border-b border-border/40 hover:bg-bg-tertiary/40 transition-colors cursor-pointer"
                onClick={() => posthog.capture('dashboard_prediction_clicked', { thesis: row.thesis, region: row.region, status: row.status })}
              >
                <td className="px-5 py-4">
                  <span className="text-text-primary text-[11px] font-medium">{row.thesis}</span>
                </td>
                <td className="px-5 py-4">
                  <span className="text-[10px] text-text-secondary">{REGION_META[row.region]?.name ?? row.region}</span>
                </td>
                <td className={`px-5 py-4 font-mono text-[10px] font-bold ${directionColor(row.direction)}`}>
                  {directionArrow(row.direction)}
                </td>
                <td className="px-5 py-4">
                  <span className="font-mono text-[11px] text-text-primary">{row.stake} USDC</span>
                </td>
                <td className="px-5 py-4">
                  <span className={`text-[9px] uppercase tracking-[0.15em] font-medium px-2 py-1 rounded border ${statusColor(row.status)}`}>
                    {statusLabel(row.status)}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <span className={`font-mono text-[11px] font-bold ${row.pnl >= 0 ? 'text-positive' : 'text-negative'}`}>
                    {formatUSDC(row.pnl)}
                  </span>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden divide-y divide-border/40">
        {PREDICTIONS.map((row, i) => (
          <motion.div
            key={row.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.06 }}
            className="px-4 py-4 space-y-2.5"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="text-text-primary text-[11px] font-medium leading-relaxed">{row.thesis}</span>
              <span className={`text-[9px] uppercase tracking-[0.15em] font-medium px-2 py-1 rounded border shrink-0 ${statusColor(row.status)}`}>
                {statusLabel(row.status)}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-text-secondary">{REGION_META[row.region]?.name ?? row.region}</span>
              <span className={`font-mono text-[10px] font-bold ${directionColor(row.direction)}`}>
                {directionArrow(row.direction)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] text-text-primary">{row.stake} USDC staked</span>
              <span className={`font-mono text-[11px] font-bold ${row.pnl >= 0 ? 'text-positive' : 'text-negative'}`}>
                {formatUSDC(row.pnl)}
              </span>
            </div>
            {row.arcTx && (
              <a
                href={`https://testnet.arcscan.app/tx/${row.arcTx}`}
                target="_blank" rel="noopener noreferrer"

                className="block font-mono text-[10px] text-accent-gold hover:underline truncate"
              >
                Arc: {truncateHash(row.arcTx, 6, 4)}
              </a>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// ─── Leaderboard section (agents) ─────────────────────────────────────────────

function Leaderboard() {
  const [sort, setSort] = useState<'rank' | 'accuracy' | 'theses' | 'streak'>('rank')

  const sorted = [...AGENT_LEADERBOARD].sort((a, b) => {
    if (sort === 'accuracy') return b.accuracy - a.accuracy
    if (sort === 'theses')   return b.theses - a.theses
    if (sort === 'streak')   return b.streak - a.streak
    return a.rank - b.rank
  })

  const medalBorder = (rank: number) => {
    if (rank === 1) return 'border-l-2 border-l-accent-gold'
    if (rank === 2) return 'border-l-2 border-l-[#FFFFFF]'
    if (rank === 3) return 'border-l-2 border-l-[#FFD700]'
    return ''
  }

  return (
    <div className="solid-panel rounded-none border overflow-hidden">
      <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-border flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
        <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-text-tertiary">
          Agent Leaderboard
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[9px] uppercase tracking-[0.2em] text-text-tertiary">Sort</span>
          {(['rank', 'accuracy', 'theses', 'streak'] as const).map(k => (
            <button
              key={k}
              onClick={() => setSort(k)}
              className={`px-3 py-1.5 text-[9px] uppercase tracking-[0.2em] font-medium border transition-all ${
                sort === k
                  ? 'border-brand-red text-brand-red'
                  : 'border-border text-text-tertiary hover:border-border-strong hover:text-text-secondary'
              }`}
            >
              {k}
            </button>
          ))}
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border">
              {['Rank', 'Agent', 'Region', 'Accuracy', 'Theses', 'Streak'].map(h => (
                <th key={h} className="px-5 py-3 text-left text-[9px] uppercase tracking-[0.2em] text-text-tertiary font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => (
              <motion.tr
                key={row.rank}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className={`border-b border-border/40 hover:bg-bg-tertiary/40 transition-colors ${medalBorder(row.rank)}`}
              >
                <td className="px-5 py-4">
                  <span className={`font-mono text-sm font-semibold ${
                    row.rank === 1 ? 'text-accent-gold' :
                    row.rank === 2 ? 'text-text-secondary' :
                    row.rank === 3 ? 'text-warning' :
                    'text-text-tertiary'
                  }`}>
                    #{row.rank}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <span className="font-mono text-[11px] text-text-primary font-bold">{row.agent}</span>
                </td>
                <td className="px-5 py-4">
                  <span className="text-[10px] text-text-secondary">{row.region}</span>
                </td>
                <td className={`px-5 py-4 font-mono font-bold text-[11px] ${
                  row.accuracy >= 80 ? 'text-positive' :
                  row.accuracy >= 65 ? 'text-accent-gold' :
                  'text-text-secondary'
                }`}>
                  {row.accuracy}%
                </td>
                <td className="px-5 py-4">
                  <span className="font-mono text-[11px] text-text-secondary">{row.theses}</span>
                </td>
                <td className="px-5 py-4">
                  {row.streak > 0 ? (
                    <span className="text-[10px] text-brand-red font-medium">
                      STREAK: {row.streak}
                    </span>
                  ) : (
                    <span className="text-text-tertiary text-[10px]">—</span>
                  )}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden divide-y divide-border/40">
        {sorted.map((row, i) => (
          <motion.div
            key={row.rank}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.05 }}
            className={`px-4 py-4 space-y-2 ${medalBorder(row.rank)}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className={`font-mono text-sm font-semibold ${
                  row.rank === 1 ? 'text-accent-gold' :
                  row.rank === 2 ? 'text-text-secondary' :
                  row.rank === 3 ? 'text-warning' :
                  'text-text-tertiary'
                }`}>
                  #{row.rank}
                </span>
                <div>
                  <p className="font-mono text-[11px] text-text-primary font-bold">{row.agent}</p>
                  <p className="text-[9px] text-text-secondary">{row.region}</p>
                </div>
              </div>
              <span className={`font-mono font-bold text-sm ${
                row.accuracy >= 80 ? 'text-positive' :
                row.accuracy >= 65 ? 'text-accent-gold' :
                'text-text-secondary'
              }`}>
                {row.accuracy}%
              </span>
            </div>
            <div className="flex items-center gap-4 text-[10px]">
              <span className="text-text-secondary">{row.theses} theses</span>
              {row.streak > 0 && <span className="text-brand-red">STREAK: {row.streak} streak</span>}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-4 sm:px-6 py-4 border-t border-border/40">
        <p className="text-[9px] uppercase tracking-[0.2em] text-text-tertiary">
          Rankings update after each quiz round · Settled on Arc Testnet
        </p>
      </div>
    </div>
  )
}

// ─── Main DashboardView ───────────────────────────────────────────────────────

export function DashboardView() {
  const { address, isConnected } = useAccount()
  const { data: balance } = useBalance({ address, chainId: arcTestnet.id })

  const totalEarned = PREDICTIONS.filter(p => p.status === 'RESOLVED_WIN').reduce((s, p) => s + p.pnl, 0)
  const accuracy = Math.round((PREDICTIONS.filter(p => p.status === 'RESOLVED_WIN').length / PREDICTIONS.length) * 100)

  const { openConnectModal } = useConnectModal()
  const [copiedDash, setCopiedDash] = useState(false)
  const handleConnectClick = () => {
    sessionStorage.removeItem('rosetta.wallet.manualDisconnect')
    openConnectModal?.()
  }

  if (!isConnected) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-px bg-border/60 border border-border/60 rounded-none animate-rain">
        {/* Terminal Lock Screen */}
        <div className="lg:col-span-2 bg-bg-primary p-8 sm:p-16 flex flex-col items-center justify-center min-h-[450px] text-center relative overflow-hidden border-r border-border/60">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-brand-red/10 via-transparent to-transparent opacity-40 pointer-events-none" />
          <div className="relative z-10 flex flex-col items-center w-full max-w-md border border-brand-red/20 bg-bg-primary/80 p-8 sm:p-10 shadow-none">
            <div className="w-16 h-16 border border-brand-red/50 bg-brand-red/10 flex items-center justify-center  mb-6 rounded-none relative">
              <Lock className="w-6 h-6 text-brand-red" />
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-red/10 border border-brand-red/30 text-brand-red text-[9px] font-mono uppercase tracking-widest mb-6">
              <span className="w-1.5 h-1.5 bg-brand-red  rounded-none" />
              Access Restricted
            </div>
            <h2 className="font-display text-text-primary text-2xl sm:text-3xl mb-4 tracking-tight uppercase">
              Encrypted Portfolio
            </h2>
            <div className="w-full h-px bg-brand-red/20 mb-6" />
            <p className="text-text-secondary text-[11px] leading-relaxed mb-8 font-mono text-left w-full border-l-2 border-brand-red/50 pl-4 bg-bg-secondary py-3">
              {">"} Connect Web3 Wallet to establish secure channel.<br/>
              {">"} Access proprietary allocation, verify trace accuracy, and sync USDC settlements on Arc Testnet.
            </p>
            <button
              onClick={handleConnectClick}
              className="group relative overflow-hidden inline-flex items-center gap-3 px-8 py-3.5 bg-brand-red/10 border border-brand-red/50 text-brand-red text-[11px] font-bold uppercase tracking-[0.2em] transition-all duration-300 hover:bg-brand-red hover:text-white w-full justify-center"
            >
              <span className="relative z-10">Initialize Handshake</span>
              <span className="transition-transform duration-300 group-hover:translate-x-1 relative z-10">→</span>
            </button>
          </div>
        </div>

        {/* Locked Analytics Preview */}
        <div className="bg-bg-primary p-6 sm:p-10 flex flex-col relative overflow-hidden border-l border-border/60 justify-between">
          
          <div className="flex flex-col gap-6 relative z-10 opacity-50">
            <div className="flex items-center justify-between pb-4 border-b border-white/5">
              <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-text-tertiary">
                Target Allocation
              </p>
              <span className="flex items-center gap-1.5 px-2 py-1 bg-brand-red/5 border border-brand-red/20 text-brand-red text-[8px] uppercase tracking-[0.2em]">
                <span className="w-1 h-1 bg-brand-red  rounded-none" /> SECURE
              </span>
            </div>
            
            <div className="space-y-4 font-mono text-[10px] text-text-tertiary uppercase tracking-widest">
               <div className="flex justify-between"><span>Equities</span> <span className="text-text-secondary">██%</span></div>
               <div className="flex justify-between"><span>Bonds</span> <span className="text-text-secondary">██%</span></div>
               <div className="flex justify-between"><span>Commodities</span> <span className="text-text-secondary">██%</span></div>
               <div className="flex justify-between"><span>Crypto</span> <span className="text-text-secondary">██%</span></div>
            </div>
          </div>
          
          {/* Overlay scanning effect */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[length:100%_4px,3px_100%] z-20 pointer-events-none opacity-40" />
          
          {/* Overlay text */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30 bg-bg-primary/40 backdrop-blur-[2px]">
            <div className="flex flex-col items-center gap-3">
               <span className="font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.25em] text-brand-red bg-bg-primary/95 px-5 py-3 border border-brand-red/30 shadow-none flex items-center gap-2">
                 <Key className="w-3.5 h-3.5" />
                 Awaiting Decryption
               </span>
            </div>
          </div>
          
          <div className="mt-12 space-y-4 relative z-10 opacity-50">
            <div className="h-px w-full bg-border/50" />
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-text-tertiary">Live PnL</span>
              <span className="font-mono text-[11px] text-text-secondary">-- USDC</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-text-tertiary">Win Rate</span>
              <span className="font-mono text-[11px] text-text-secondary">-- %</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 sm:space-y-10">
      {/* ── Genuine Terminal Telemetry Dashboard ── */}
      <div className="mb-10 solid-panel bg-bg-primary p-6 sm:p-8 border border-border/80 shadow-2xl relative overflow-hidden">
        {/* Subtle top red glow */}
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-brand-red/50 to-transparent" />
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-white/5 pb-4 mb-6 gap-4">
           <div className="flex items-center gap-3">
              <span className="w-1.5 h-3 bg-positive  shadow-none" />
              <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-text-primary font-bold">Live Telemetry</span>
           </div>
           <div className="flex items-center gap-4">
              <span 
                className="text-[9px] font-mono text-text-tertiary uppercase tracking-[0.1em] hidden sm:inline-block"
                suppressHydrationWarning
              >
                SYS.TIME: {new Date().toISOString().split('T')[1].slice(0, 8)}Z
              </span>
              <span className="text-[9px] font-mono text-brand-red uppercase tracking-[0.15em] font-bold border border-brand-red/30 px-2 py-1 bg-brand-red/10">
                ARC_TESTNET
              </span>
           </div>
        </div>
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-0 lg:divide-x divide-white/5">
          {[
            { label: 'USDC Balance', value: balance ? `${parseFloat(balance.formatted).toFixed(2)}` : '—', sub: 'AVAILABLE', color: 'text-text-primary' },
            { label: 'Total Earned', value: `+${totalEarned.toFixed(2)}`, sub: 'USDC (PnL)', color: 'text-positive' },
            { label: 'Win Rate', value: `${accuracy}%`, sub: `${PREDICTIONS.filter(p => p.status === 'RESOLVED_WIN').length}/${PREDICTIONS.length} TRADES`, color: 'text-accent-gold' },
            { label: 'Active Stakes', value: String(PREDICTIONS.filter(p => p.status === 'OPEN').length), sub: 'OPEN POSITIONS', color: 'text-brand-red' },
          ].map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="lg:px-8 flex flex-col justify-between group"
            >
              <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-text-tertiary mb-3 group-hover:text-brand-red transition-colors flex items-center justify-between">
                {s.label}
                <span className="opacity-0 group-hover:opacity-100 transition-opacity font-bold">↗</span>
              </span>
              <span className={`font-mono text-3xl sm:text-4xl tracking-tight font-bold ${s.color}`}>
                {s.value}
              </span>
              <span className="text-[8px] font-mono uppercase text-text-tertiary mt-2 tracking-widest">{s.sub}</span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── Portfolio Overview (ring chart + terminal access) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-px bg-border/60 border border-border/60 rounded-none shadow-2xl">
        <div className="lg:col-span-2 bg-bg-secondary p-6 sm:p-10 flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-text-tertiary flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-brand-red/50" />
              Portfolio Overview
            </p>
            <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-text-secondary opacity-60">Risk Parity Strategy</span>
          </div>
          <div className="flex-1 flex items-center justify-center pt-2 sm:pt-4">
             <RingChart />
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-bg-primary p-6 sm:p-10 flex flex-col gap-6 border-l border-border/60 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-positive/5 via-transparent to-transparent opacity-40 pointer-events-none" />
          
          <div className="flex items-center justify-between relative z-10">
            <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-text-tertiary">
              Terminal Access
            </p>
            <span className="flex items-center gap-1.5 px-2 py-1 bg-positive/10 border border-positive/30 text-positive text-[9px] uppercase tracking-[0.2em] shadow-none">
              <span className="w-1.5 h-3 bg-positive " /> Connected
            </span>
          </div>

          <div className="space-y-4 relative z-10 mt-4">
            {[
              { label: 'Address', value: `${address?.slice(0, 6)}...${address?.slice(-4)}`, isAddress: true },
              { label: 'Network', value: 'Arc Testnet' },
              { label: 'Chain ID', value: '5042002' },
              { label: 'Balance', value: balance ? `${parseFloat(balance.formatted).toFixed(4)} USDC` : 'Loading...' },
            ].map(r => (
              <div key={r.label} className="flex justify-between items-end pb-3 border-b border-border/50">
                <span className="text-[9px] uppercase tracking-[0.2em] text-text-tertiary">{r.label}</span>
                {r.isAddress ? (
                  <button 
                    onClick={() => {
                      if (address) {
                        navigator.clipboard.writeText(address);
                        setCopiedDash(true);
                        setTimeout(() => setCopiedDash(false), 2000);
                      }
                    }}
                    className="font-mono text-[11px] text-text-primary hover:text-brand-red transition-colors flex items-center gap-2"
                  >
                    {r.value}
                    {copiedDash ? <span className="text-positive text-[9px] ml-1 font-bold">✓</span> : null}
                  </button>
                ) : (
                  <span className={`font-mono text-[11px] ${r.label === 'Balance' ? 'text-accent-gold font-bold' : 'text-text-primary'}`}>{r.value}</span>
                )}
              </div>
            ))}
          </div>
          
          <a
            href={`https://testnet.arcscan.app/address/${address}`}
            target="_blank" rel="noopener noreferrer"

            className="group mt-auto pt-6 flex items-center gap-2 text-[9px] uppercase tracking-[0.2em] text-brand-red hover:text-white transition-colors relative z-10"
          >
            <span>View on ArcScan</span>
            <span className="transition-transform group-hover:translate-x-1 font-bold">→</span>
          </a>
        </motion.div>
      </div>

      {/* ── Crowd Extremity Backtest Preview ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-px bg-border/60 border border-border/60 rounded-none">
        <div className="lg:col-span-2">
          <MobMeter ticker="AAPL" />
        </div>
        <div className="bg-bg-primary p-6 sm:p-8 flex flex-col justify-center text-left">
          <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-text-tertiary mb-4">
            Historical Signal
          </p>
          <div className="p-5 border border-warning/20 bg-warning/5 rounded mb-5">
             <p className="font-mono text-sm font-bold text-warning leading-tight uppercase tracking-wider">
               Extreme agreement is treated as a reversal-risk warning, not confirmation.
             </p>
          </div>
          <p className="text-[11px] text-text-secondary leading-relaxed border-l-[3px] border-border pl-4">
            Backtest hooks are ready for rosetta_dataset.jsonl. Live calibration updates after Arc settlements.
          </p>
        </div>
      </div>

      {/* ── My Predictions ── */}
      <MyPredictions />

      {/* ── Agent Leaderboard ── */}
      <Leaderboard />
    </div>
  )
}
