'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useAccount } from 'wagmi'

// ─── Mock leaderboard data ────────────────────────────────────────────────────

interface Trader {
  rank: number
  address: string
  label?: string          // optional ENS / alias
  correct: number
  total: number
  earned: number          // USDC
  arcTxCount: number
  streak: number          // current win streak
  badge?: string
}

const TRADERS: Trader[] = [
  { rank: 1,  address: '0xA1b2...9F3c', label: 'macro.eth',    correct: 47, total: 55, earned: 23.5, arcTxCount: 47, streak: 8,  badge: '🏆' },
  { rank: 2,  address: '0x3E7d...2B1a', label: 'satoshi99',    correct: 41, total: 50, earned: 20.5, arcTxCount: 41, streak: 5,  badge: '🥈' },
  { rank: 3,  address: '0xF4c8...6D0e', label: 'dalio.arc',    correct: 38, total: 47, earned: 19.0, arcTxCount: 38, streak: 4,  badge: '🥉' },
  { rank: 4,  address: '0x8B2f...1C7d',                         correct: 34, total: 44, earned: 17.0, arcTxCount: 34, streak: 3  },
  { rank: 5,  address: '0x2D9e...5A4f',                         correct: 31, total: 42, earned: 15.5, arcTxCount: 31, streak: 2  },
  { rank: 6,  address: '0x7F1b...8E2c', label: 'quant.usdc',   correct: 29, total: 40, earned: 14.5, arcTxCount: 29, streak: 1  },
  { rank: 7,  address: '0xC5a3...3F9b',                         correct: 26, total: 38, earned: 13.0, arcTxCount: 26, streak: 0  },
  { rank: 8,  address: '0x1E4d...7B6a',                         correct: 24, total: 36, earned: 12.0, arcTxCount: 24, streak: 0  },
  { rank: 9,  address: '0x9C6f...4D2e',                         correct: 21, total: 33, earned: 10.5, arcTxCount: 21, streak: 0  },
  { rank: 10, address: '0x4A8b...0C5f', label: 'newbie.arc',   correct: 18, total: 30, earned: 9.0,  arcTxCount: 18, streak: 0  },
]

// Simulate the current user appearing at rank 7 when connected
const MY_ADDRESS_MOCK = '0xC5a3...3F9b'

type SortKey = 'rank' | 'accuracy' | 'earned' | 'streak'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function accuracy(t: Trader) {
  return Math.round((t.correct / t.total) * 100)
}

function accuracyColor(pct: number) {
  if (pct >= 80) return 'text-positive'
  if (pct >= 65) return 'text-accent-gold'
  return 'text-text-secondary'
}

// ─── Podium card (top 3) ─────────────────────────────────────────────────────

function PodiumCard({ trader, isMe }: { trader: Trader; isMe: boolean }) {
  const pct = accuracy(trader)
  const heights = ['h-28 sm:h-36', 'h-20 sm:h-28', 'h-16 sm:h-24']
  const h = heights[trader.rank - 1]

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: trader.rank * 0.1 }}
      className={`flex flex-col items-center gap-3 w-full ${trader.rank === 1 ? "order-2" : trader.rank === 2 ? "order-1" : "order-3"}`}
    >
      {/* Badge + label */}
      <div className="text-center space-y-1">
        <p className="text-2xl">{trader.badge}</p>
        <p className="font-mono text-[10px] text-text-primary font-bold">
          {trader.label ?? trader.address}
        </p>
        <p className={`font-display text-xl font-bold ${accuracyColor(pct)}`}>{pct}%</p>
        <p className="text-[9px] uppercase tracking-[0.2em] text-text-tertiary">
          {trader.earned} USDC earned
        </p>
        {isMe && (
          <span className="inline-block text-[8px] uppercase tracking-[0.2em] px-2 py-0.5 rounded border border-accent-gold text-accent-gold">
            You
          </span>
        )}
      </div>
      {/* Podium block */}
      <div
        className={`w-full ${h} rounded-none flex items-center justify-center ${
          trader.rank === 1
            ? 'bg-accent-gold/20 border border-accent-gold/40'
            : 'bg-bg-tertiary border border-border'
        }`}
      >
        <span className="font-display text-3xl font-bold text-text-tertiary">#{trader.rank}</span>
      </div>
    </motion.div>
  )
}

// ─── Sort button ──────────────────────────────────────────────────────────────

function SortBtn({
  label, active, onClick,
}: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-[9px] uppercase tracking-[0.2em] font-medium border transition-all ${
        active
          ? 'border-brand-red text-brand-red'
          : 'border-border text-text-tertiary hover:border-border-strong hover:text-text-secondary'
      }`}
    >
      {label}
    </button>
  )
}

// ─── Main LeaderboardView ────────────────────────────────────────────────────

export function LeaderboardView() {
  const { address, isConnected } = useAccount()
  const [sort, setSort] = useState<SortKey>('rank')

  // Determine if any trader matches the connected wallet (mock: match by position)
  const myAddress = isConnected ? MY_ADDRESS_MOCK : null

  const sorted = [...TRADERS].sort((a, b) => {
    if (sort === 'accuracy') return accuracy(b) - accuracy(a)
    if (sort === 'earned')   return b.earned - a.earned
    if (sort === 'streak')   return b.streak - a.streak
    return a.rank - b.rank
  })

  const myEntry = sorted.find(t => t.address === myAddress)

  return (
    <div className="space-y-10">

      {/* ── Stats banner ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border/60 border border-border/60 rounded-none mb-10">
        {[
          { label: 'Active Traders',  value: String(TRADERS.length), accent: 'text-accent-gold' },
          { label: 'USDC Distributed', value: `${TRADERS.reduce((s, t) => s + t.earned, 0)}`, sub: 'USDC', accent: 'text-positive' },
          { label: 'Correct Calls',   value: String(TRADERS.reduce((s, t) => s + t.correct, 0)), accent: '' },
          { label: 'Arc Settlements', value: String(TRADERS.reduce((s, t) => s + t.arcTxCount, 0)), accent: '' },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="bg-[#050505] px-6 py-8 flex flex-col gap-3 hover:bg-[#0A0A0F] border-b-2 border-transparent hover:border-brand-red/50 transition-colors relative group"
          >
            <div className="absolute top-0 left-0 w-full h-[1px] bg-border group-hover:bg-brand-red/30 transition-colors" />
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-text-tertiary">{s.label}</p>
            <p className={`font-display text-3xl font-bold tracking-tight ${s.accent || 'text-text-primary'}`}>
              {s.value}
            </p>
            {s.sub && <p className="text-[9px] text-text-tertiary font-mono tracking-wide">{s.sub}</p>}
          </motion.div>
        ))}
      </div>

      {/* ── Podium (top 3) ── */}
      <div className="solid-panel rounded-none p-6 sm:p-10">
        <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-text-tertiary mb-8 sm:mb-10">
          Top Traders
        </p>
        <div className="grid grid-cols-3 gap-3 sm:gap-6 items-end max-w-lg mx-auto">
          {TRADERS.slice(0, 3).map(t => (
            <PodiumCard key={t.rank} trader={t} isMe={t.address === myAddress} />
          ))}
        </div>
      </div>

      {/* ── Full rankings table ── */}
      <div className="solid-panel rounded-none overflow-hidden">
        <div className="px-5 sm:px-6 py-4 border-b border-border flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
          <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-text-tertiary">
            Full Rankings
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[9px] uppercase tracking-[0.2em] text-text-tertiary">Sort</span>
            {(['rank', 'accuracy', 'earned', 'streak'] as SortKey[]).map(k => (
              <SortBtn key={k} label={k} active={sort === k} onClick={() => setSort(k)} />
            ))}
          </div>
        </div>

        {/* Your rank callout */}
        {isConnected && myEntry && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="px-5 sm:px-6 py-3 border-b border-accent-gold/20 bg-accent-gold/5 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-gold animate-pulse" />
              <span className="text-[10px] uppercase tracking-[0.2em] text-accent-gold font-medium">
                Your Position — #{myEntry.rank}
              </span>
            </div>
            <span className="text-[10px] font-mono text-accent-gold">
              {accuracy(myEntry)}% accuracy · {myEntry.earned} USDC
            </span>
          </motion.div>
        )}

        {/* Desktop table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                {['Rank', 'Trader', 'Accuracy', 'Correct', 'USDC Earned', 'Streak', 'Arc Txs'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-[9px] uppercase tracking-[0.2em] text-text-tertiary font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((t, i) => {
                const isMe = t.address === myAddress
                const pct = accuracy(t)
                return (
                  <motion.tr
                    key={t.rank}
                    data-testid="leaderboard-row"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className={`border-b border-border/40 transition-colors ${
                      isMe ? 'bg-accent-gold/5 hover:bg-accent-gold/8' : 'hover:bg-bg-tertiary/40'
                    }`}
                  >
                    <td className="px-5 py-4">
                      <span className={`font-display text-lg font-bold ${
                        t.rank === 1 ? 'text-accent-gold' :
                        t.rank === 2 ? 'text-text-secondary' :
                        t.rank === 3 ? 'text-[#CD7F32]' :
                        'text-text-tertiary'
                      }`}>
                        {t.badge ?? `#${t.rank}`}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] text-text-primary font-bold">
                          {t.label ?? t.address}
                        </span>
                        {!t.label && (
                          <span className="text-[9px] text-text-tertiary font-mono">{t.address}</span>
                        )}
                        {isMe && (
                          <span className="text-[8px] uppercase tracking-[0.2em] px-1.5 py-0.5 border border-accent-gold/50 text-accent-gold rounded">
                            You
                          </span>
                        )}
                      </div>
                    </td>
                    <td className={`px-5 py-4 font-mono font-bold text-[11px] ${accuracyColor(pct)}`}>
                      {pct}%
                    </td>
                    <td className="px-5 py-4 font-mono text-[11px] text-text-secondary">
                      {t.correct}/{t.total}
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-mono font-bold text-[11px] text-positive">
                        +{t.earned} USDC
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {t.streak > 0 ? (
                        <span className="text-[10px] text-brand-red font-medium">
                          🔥 {t.streak}
                        </span>
                      ) : (
                        <span className="text-text-tertiary text-[10px]">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4 font-mono text-[10px] text-text-tertiary">
                      {t.arcTxCount}
                    </td>
                  </motion.tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="sm:hidden divide-y divide-border/40">
          {sorted.map((t, i) => {
            const isMe = t.address === myAddress
            const pct = accuracy(t)
            return (
              <motion.div
                key={t.rank}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.05 }}
                className={`px-5 py-4 space-y-2 ${isMe ? 'bg-accent-gold/5' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`font-display text-xl font-bold ${
                      t.rank === 1 ? 'text-accent-gold' :
                      t.rank === 2 ? 'text-text-secondary' :
                      t.rank === 3 ? 'text-[#CD7F32]' :
                      'text-text-tertiary'
                    }`}>
                      {t.badge ?? `#${t.rank}`}
                    </span>
                    <div>
                      <p className="font-mono text-[11px] text-text-primary font-bold">
                        {t.label ?? t.address}
                      </p>
                      {t.label && (
                        <p className="font-mono text-[9px] text-text-tertiary">{t.address}</p>
                      )}
                    </div>
                    {isMe && (
                      <span className="text-[8px] uppercase tracking-[0.15em] px-1.5 py-0.5 border border-accent-gold/50 text-accent-gold rounded">
                        You
                      </span>
                    )}
                  </div>
                  <span className={`font-mono font-bold text-sm ${accuracyColor(pct)}`}>{pct}%</span>
                </div>
                <div className="flex items-center gap-4 text-[10px]">
                  <span className="text-positive font-mono font-bold">+{t.earned} USDC</span>
                  <span className="text-text-tertiary">{t.correct}/{t.total} correct</span>
                  {t.streak > 0 && <span className="text-brand-red">🔥 {t.streak} streak</span>}
                  <span className="text-text-tertiary">{t.arcTxCount} Arc txs</span>
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Footer note */}
        <div className="px-5 sm:px-6 py-4 border-t border-border/40">
          <p className="text-[9px] uppercase tracking-[0.2em] text-text-tertiary">
            Rankings update after each quiz round · Settled on Arc Testnet
          </p>
        </div>
      </div>
    </div>
  )
}
