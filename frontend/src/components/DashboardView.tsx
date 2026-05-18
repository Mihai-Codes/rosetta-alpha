'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { useAccount, useBalance } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { arcTestnet } from '@/lib/wagmi'
import { AllWeatherChart } from '@/components/AllWeatherChart'

// ─── Mock prediction history ──────────────────────────────────────────────────

const HISTORY = [
  {
    id: 1,
    ticker: 'BTC',
    desk: 'Crypto',
    question: 'BTC > $65k by June 15, 2026?',
    userCall: 'LONG' as const,
    aiCall: 'LONG' as const,
    match: true,
    usdc: 0.5,
    arcTx: '0x50fd3228...',
    ts: '2026-05-17',
  },
  {
    id: 2,
    ticker: 'AAPL',
    desk: 'US Equities',
    question: 'AAPL within 1% band over 30 days?',
    userCall: 'LONG' as const,
    aiCall: 'NEUTRAL' as const,
    match: false,
    usdc: 0,
    arcTx: null,
    ts: '2026-05-17',
  },
  {
    id: 3,
    ticker: 'ETH',
    desk: 'Crypto',
    question: 'ETH outperforms BTC +5% in 14 days?',
    userCall: 'SHORT' as const,
    aiCall: 'SHORT' as const,
    match: true,
    usdc: 0.5,
    arcTx: '0x8d2f119a...',
    ts: '2026-05-17',
  },
]

type Direction = 'LONG' | 'SHORT' | 'NEUTRAL'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function directionColor(d: Direction) {
  if (d === 'LONG') return 'text-positive'
  if (d === 'SHORT') return 'text-negative'
  return 'text-accent-gold'
}

function directionLabel(d: Direction) {
  if (d === 'LONG') return '↑ Long'
  if (d === 'SHORT') return '↓ Short'
  return '→ Neutral'
}

// ─── Stat tile ────────────────────────────────────────────────────────────────

function StatTile({
  label,
  value,
  sub,
  accent,
  delay = 0,
}: {
  label: string
  value: string
  sub?: string
  accent?: string
  delay?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="solid-panel rounded-2xl px-6 py-6 flex flex-col gap-2"
    >
      <p className="text-[9px] font-medium uppercase tracking-[0.25em] text-text-tertiary">{label}</p>
      <p className={`font-display text-2xl sm:text-3xl font-light tracking-tight ${accent ?? 'text-text-primary'}`}>
        {value}
      </p>
      {sub && <p className="text-[10px] text-text-tertiary font-mono">{sub}</p>}
    </motion.div>
  )
}

// ─── Wallet gate ──────────────────────────────────────────────────────────────

function WalletGate() {
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

// ─── Prediction history table ─────────────────────────────────────────────────

function PredictionHistory() {
  return (
    <div className="solid-panel rounded-2xl overflow-hidden">
      <div className="px-6 py-5 border-b border-border flex items-center justify-between">
        <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-text-tertiary">
          Prediction History
        </p>
        <span className="text-[9px] uppercase tracking-[0.2em] text-brand-red font-medium">
          {HISTORY.filter(h => h.match).length}/{HISTORY.length} Correct
        </span>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border">
              {['Asset', 'Your Call', 'AI Call', 'Match', 'USDC', 'Date', 'Arc Tx'].map(h => (
                <th key={h} className="px-6 py-3 text-left text-[9px] uppercase tracking-[0.2em] text-text-tertiary font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {HISTORY.map((row, i) => (
              <motion.tr
                key={row.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * i }}
                className="border-b border-border/50 hover:bg-bg-tertiary/40 transition-colors"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-text-primary text-[11px]">{row.ticker}</span>
                    <span className="text-[9px] text-text-tertiary uppercase tracking-[0.15em]">{row.desk}</span>
                  </div>
                </td>
                <td className={`px-6 py-4 font-mono font-bold text-[10px] ${directionColor(row.userCall)}`}>
                  {directionLabel(row.userCall)}
                </td>
                <td className={`px-6 py-4 font-mono font-bold text-[10px] ${directionColor(row.aiCall)}`}>
                  {directionLabel(row.aiCall)}
                </td>
                <td className="px-6 py-4">
                  <span className={`text-[10px] font-medium ${row.match ? 'text-positive' : 'text-negative'}`}>
                    {row.match ? '✓ Match' : '✗ Miss'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`font-mono text-[11px] font-bold ${row.usdc > 0 ? 'text-positive' : 'text-text-tertiary'}`}>
                    {row.usdc > 0 ? `+${row.usdc} USDC` : '—'}
                  </span>
                </td>
                <td className="px-6 py-4 text-text-tertiary font-mono text-[10px]">{row.ts}</td>
                <td className="px-6 py-4">
                  {row.arcTx ? (
                    <a
                      href={`https://testnet.arcscan.app/tx/${row.arcTx}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-[10px] text-accent-gold hover:underline"
                    >
                      {row.arcTx}
                    </a>
                  ) : (
                    <span className="text-text-tertiary text-[10px] font-mono">—</span>
                  )}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden divide-y divide-border/50">
        {HISTORY.map((row, i) => (
          <motion.div
            key={row.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 * i }}
            className="px-5 py-4 space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-text-primary text-[11px]">{row.ticker}</span>
                <span className="text-[9px] text-text-tertiary uppercase tracking-[0.15em]">{row.desk}</span>
              </div>
              <span className={`text-[10px] font-medium ${row.match ? 'text-positive' : 'text-negative'}`}>
                {row.match ? '✓ Match' : '✗ Miss'}
              </span>
            </div>
            <p className="text-text-secondary text-[11px] leading-relaxed">{row.question}</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className={`font-mono text-[10px] font-bold ${directionColor(row.userCall)}`}>
                  You: {directionLabel(row.userCall)}
                </span>
                <span className="text-text-tertiary text-[9px]">vs</span>
                <span className={`font-mono text-[10px] font-bold ${directionColor(row.aiCall)}`}>
                  AI: {directionLabel(row.aiCall)}
                </span>
              </div>
              <span className={`font-mono text-[11px] font-bold ${row.usdc > 0 ? 'text-positive' : 'text-text-tertiary'}`}>
                {row.usdc > 0 ? `+${row.usdc} USDC` : '—'}
              </span>
            </div>
            {row.arcTx && (
              <a
                href={`https://testnet.arcscan.app/tx/${row.arcTx}`}
                target="_blank"
                rel="noreferrer"
                className="block font-mono text-[10px] text-accent-gold hover:underline truncate"
              >
                {row.arcTx}
              </a>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// ─── Main DashboardView ───────────────────────────────────────────────────────

export function DashboardView() {
  const { address, isConnected } = useAccount()
  const { data: balance } = useBalance({ address, chainId: arcTestnet.id })

  const totalEarned = HISTORY.filter(h => h.match).reduce((s, h) => s + h.usdc, 0)
  const accuracy = Math.round((HISTORY.filter(h => h.match).length / HISTORY.length) * 100)

  if (!isConnected) {
    return (
      <div className="space-y-8">
        <WalletGate />
        {/* Still show the allocation chart — public info */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AllWeatherChart />
          <div className="solid-panel rounded-2xl p-6 flex flex-col justify-center gap-4">
            <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-text-tertiary">
              Strategy Overview
            </p>
            <p className="font-display text-2xl text-text-primary leading-snug">
              All-Weather<br />
              <em className="text-brand-red">Risk Parity</em>
            </p>
            <p className="text-text-secondary text-xs leading-relaxed max-w-sm">
              Rosetta allocates across four economic regimes using Ray Dalio's All-Weather framework.
              Every thesis is settled on Arc L1 with a cryptographic trace hash.
            </p>
            <div className="grid grid-cols-2 gap-3 pt-2">
              {[
                { label: 'Active Desks', value: '4' },
                { label: 'Rebalance', value: 'Daily' },
                { label: 'Chain', value: 'Arc Testnet' },
                { label: 'Provenance', value: 'IPFS + Arc L1' },
              ].map(s => (
                <div key={s.label} className="glass-panel rounded-xl px-4 py-3">
                  <p className="text-[9px] uppercase tracking-[0.2em] text-text-tertiary">{s.label}</p>
                  <p className="font-mono text-[11px] text-text-primary font-bold mt-0.5">{s.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Stat tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile
          label="USDC Balance"
          value={balance ? `${parseFloat(balance.formatted).toFixed(2)}` : '—'}
          sub={balance ? 'USDC · Arc Testnet' : 'Connect to view'}
          accent="text-accent-gold"
          delay={0}
        />
        <StatTile
          label="Total Earned"
          value={`${totalEarned} USDC`}
          sub="From quiz rewards"
          accent="text-positive"
          delay={0.08}
        />
        <StatTile
          label="Accuracy"
          value={`${accuracy}%`}
          sub={`${HISTORY.filter(h => h.match).length}/${HISTORY.length} calls correct`}
          delay={0.16}
        />
        <StatTile
          label="Arc Receipts"
          value={String(HISTORY.filter(h => h.arcTx).length)}
          sub="On-chain settlements"
          delay={0.24}
        />
      </div>

      {/* AllWeather + wallet summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <AllWeatherChart />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="solid-panel rounded-2xl p-6 flex flex-col gap-5"
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

      {/* Prediction history */}
      <PredictionHistory />
    </div>
  )
}
