import React from 'react'
import { ExternalLink, Clock } from 'lucide-react'
import { DeskProps } from './DeskCard'

export function MarketBoard({ desks }: { desks: DeskProps[] }) {
  const markets = desks.filter(d => d.arc_tx && d.question)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between gap-4 pb-6 border-b border-border/50">
        <div>
          <p className="text-[9px] font-medium uppercase tracking-[0.25em] text-muted-foreground/50 mb-2">
            On-Chain Prediction Markets
          </p>
          <h2 className="font-display text-3xl font-light text-foreground">
            Settlement Registry
          </h2>
          <p className="text-sm text-muted-foreground/60 font-light mt-1">
            Trade theses recorded on Arc L1 · Settled in USDC
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 border border-border text-[10px] font-medium uppercase tracking-widest text-muted-foreground/60 shrink-0">
          <span className="w-1.5 h-1.5 bg-[#52B788] rounded-full" />
          {markets.length} Active
        </div>
      </div>

      {/* Table */}
      <div className="glass-panel border border-border/20 rounded-2xl overflow-hidden shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/[0.05] bg-transparent">
                {['Question', 'Region', 'Arc Transaction', 'Expiry', 'Status'].map(h => (
                  <th key={h} className="px-6 py-4 text-[9px] font-medium uppercase tracking-[0.2em] text-muted-foreground/40">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.02]">
              {markets.map((m, i) => (
                <tr key={i} className="hover:bg-accent/10 transition-colors group">
                  <td className="px-6 py-5 max-w-xs">
                    <p className="text-sm font-light text-foreground/80 leading-snug group-hover:text-foreground transition-colors">
                      {m.question}
                    </p>
                  </td>
                  <td className="px-6 py-5">
                    <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground/60 border border-border px-2 py-1">
                      {m.desk.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    {m.arc_tx && !m.arc_tx.endsWith('...') ? (
                      <a
                        href={`https://testnet.arcscan.app/tx/${m.arc_tx}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 font-mono text-[10px] text-primary/60 hover:text-primary transition-colors"
                      >
                        {m.arc_tx.slice(0, 10)}…{m.arc_tx.slice(-6)}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="font-mono text-[10px] text-muted-foreground/30">{m.arc_tx}</span>
                    )}
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/50">
                      <Clock className="w-3 h-3" />
                      Aug 12, 2026
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className="text-[9px] font-medium uppercase tracking-widest text-[#C9A84C] border border-[rgba(201,168,76,0.25)] bg-[rgba(201,168,76,0.05)] px-3 py-1">
                      Pending
                    </span>
                  </td>
                </tr>
              ))}
              {markets.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <p className="font-display text-xl font-light text-muted-foreground/30">No active markets</p>
                    <p className="text-[11px] text-muted-foreground/20 mt-2 uppercase tracking-widest">Run the E2E pipeline to generate on-chain markets</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Provenance note */}
      <p className="text-[10px] text-muted-foreground/30 font-light uppercase tracking-widest">
        All market theses are cryptographically hashed, pinned to IPFS, and permanently recorded on the Arc testnet blockchain.
      </p>
    </div>
  )
}
