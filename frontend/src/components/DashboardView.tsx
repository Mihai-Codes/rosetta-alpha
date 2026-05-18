'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useAccount, useBalance } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { arcTestnet } from '@/lib/wagmi'

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
  us:     { name: 'United States', flag: '🇺🇸', color: '#4A7FBF' },
  cn:     { name: 'China',         flag: '🇨🇳', color: '#BF4A4A' },
  eu:     { name: 'Europe',        flag: '🇪🇺', color: '#4A8F6F' },
  jp:     { name: 'Japan',         flag: '🇯🇵', color: '#8F6F4A' },
  crypto: { name: 'Crypto',        flag: '₿',  color: '#7A4ABF' },
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
  { label: 'Equities',    pct: 40, color: '#4A9F6F' },
  { label: 'Bonds',       pct: 30, color: '#C9A84C' },
  { label: 'Commodities', pct: 15, color: '#7B8FA6' },
  { label: 'Crypto',      pct: 15, color: '#D82B2B' },
]

function RingChart() {
  const total = QUADRANTS.reduce((s, q) => s + q.pct, 0)
  const radius = 72
  const cx = 80
  const cy = 80
  const circumference = 2 * Math.PI * radius
  let offset = 0

  return (
    <div className="flex flex-col items-center gap-4 sm:gap-6 w-full max-w-xs mx-auto">
      <div className="relative">
        <svg width="200" height="200" viewBox={`0 0 160 160`} className="transform -rotate-90">
          {/* Track */}
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke="#1A1A24"
            strokeWidth="18"
          />
          {/* Segments */}
          {QUADRANTS.map((q, i) => {
            const len = (q.pct / total) * circumference
            const seg = (
              <circle
                key={i}
                cx={cx}
                cy={cy}
                r={radius}
                fill="none"
                stroke={q.color}
                strokeWidth="18"
                strokeDasharray={`${len} ${circumference}`}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
                style={{ transition: 'stroke-dashoffset 1.2s ease-out' }}
              />
            )
            offset += len
            return seg
          })}
        </svg>
        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="font-display text-xl sm:text-2xl text-text-primary font-light tracking-tight">
            ALL WEATHER
          </p>
          <p className="text-[9px] uppercase tracking-[0.25em] text-text-tertiary mt-0.5">
            Risk Parity
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

function ConnectPrompt() {
  const { openConnectModal } = useConnectModal()
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="solid-panel rounded-2xl p-10 flex flex-col items-center gap-5 text-center"
    >
      <div className="w-12 h-12 rounded-full border border-accent-gold/30 flex items-center justify-center">
        <span className="text-accent-gold text-lg">◈</span>
      </div>
      <div>
        <p className="text-text-primary text-sm font-medium mb-1">Connect your wallet to view your portfolio</p>
        <p className="text-text-tertiary text-xs">
          Track quiz performance, prediction history, and USDC earned on Arc Testnet.
        </p>
      </div>
      <button
        onClick={openConnectModal}
        className="px-8 py-3 rounded-full border border-accent-gold/40 text-accent-gold text-[10px] uppercase tracking-[0.2em] font-medium hover:border-accent-gold hover:shadow-[0_0_30px_rgba(201,168,76,0.25)] transition-all duration-300"
      >
        Connect Wallet
      </button>
    </motion.div>
  )
}

// ─── My Predictions section ───────────────────────────────────────────────────

function MyPredictions() {
  return (
    <div className="solid-panel rounded-2xl overflow-hidden">
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
                className="border-b border-border/40 hover:bg-bg-tertiary/40 transition-colors"
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
                target="_blank"
                rel="noreferrer"
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
    if (rank === 2) return 'border-l-2 border-l-[#C0C0C0]'
    if (rank === 3) return 'border-l-2 border-l-[#CD7F32]'
    return ''
  }

  return (
    <div className="solid-panel rounded-2xl overflow-hidden">
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
                  <span className={`font-display text-lg font-bold ${
                    row.rank === 1 ? 'text-accent-gold' :
                    row.rank === 2 ? 'text-text-secondary' :
                    row.rank === 3 ? 'text-[#CD7F32]' :
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
                      🔥 {row.streak}
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
                <span className={`font-display text-xl font-bold ${
                  row.rank === 1 ? 'text-accent-gold' :
                  row.rank === 2 ? 'text-text-secondary' :
                  row.rank === 3 ? 'text-[#CD7F32]' :
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
              {row.streak > 0 && <span className="text-brand-red">🔥 {row.streak} streak</span>}
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

  if (!isConnected) {
    return (
      <div className="space-y-8">
        <ConnectPrompt />
        {/* Show allocation chart as public preview */}
        <div className="solid-panel rounded-2xl p-6 sm:p-8">
          <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-text-tertiary mb-6">
            Strategy Overview
          </p>
          <RingChart />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 sm:space-y-10">
      {/* ── Stat tiles row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: 'USDC Balance', value: balance ? `${parseFloat(balance.formatted).toFixed(2)}` : '—', sub: 'Arc Testnet', accent: 'text-accent-gold' },
          { label: 'Total Earned', value: `${totalEarned.toFixed(2)} USDC`, sub: 'From predictions', accent: 'text-positive' },
          { label: 'Accuracy', value: `${accuracy}%`, sub: `${PREDICTIONS.filter(p => p.status === 'RESOLVED_WIN').length}/${PREDICTIONS.length} correct`, accent: '' },
          { label: 'Active Stakes', value: String(PREDICTIONS.filter(p => p.status === 'OPEN').length), sub: 'Open positions', accent: '' },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="solid-panel rounded-2xl px-4 sm:px-5 py-4 sm:py-5 flex flex-col gap-1.5"
          >
            <p className="text-[9px] font-medium uppercase tracking-[0.25em] text-text-tertiary">{s.label}</p>
            <p className={`font-display text-xl sm:text-2xl font-light tracking-tight ${s.accent || 'text-text-primary'}`}>
              {s.value}
            </p>
            {s.sub && <p className="text-[9px] text-text-tertiary font-mono">{s.sub}</p>}
          </motion.div>
        ))}
      </div>

      {/* ── Portfolio Overview (ring chart + wallet summary) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2 solid-panel rounded-2xl p-5 sm:p-8">
          <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-text-tertiary mb-6">
            Portfolio Overview
          </p>
          <RingChart />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="solid-panel rounded-2xl p-5 sm:p-6 flex flex-col gap-5"
        >
          <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-text-tertiary">
            Wallet
          </p>
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-positive animate-pulse" />
            <span className="font-mono text-[11px] text-text-primary">
              {address?.slice(0, 8)}...{address?.slice(-6)}
            </span>
          </div>
          <div className="space-y-3">
            {[
              { label: 'Network', value: 'Arc Testnet' },
              { label: 'Chain ID', value: '5042002' },
              { label: 'Balance', value: balance ? `${parseFloat(balance.formatted).toFixed(4)} USDC` : 'Loading...' },
            ].map(r => (
              <div key={r.label} className="flex justify-between items-center py-2 border-b border-border/50">
                <span className="text-[9px] uppercase tracking-[0.2em] text-text-tertiary">{r.label}</span>
                <span className="font-mono text-[10px] text-text-primary">{r.value}</span>
              </div>
            ))}
          </div>
          <a
            href={`https://testnet.arcscan.app/address/${address}`}
            target="_blank"
            rel="noreferrer"
            className="text-[9px] uppercase tracking-[0.2em] text-accent-gold hover:underline mt-auto"
          >
            View on Arc Explorer →
          </a>
        </motion.div>
      </div>

      {/* ── My Predictions ── */}
      <MyPredictions />

      {/* ── Agent Leaderboard ── */}
      <Leaderboard />
    </div>
  )
}
