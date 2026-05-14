import React from 'react'
import { Gavel, Clock, Coins, CheckCircle, AlertCircle } from 'lucide-react'
import { DeskProps } from './DeskCard'

export function MarketBoard({ desks }: { desks: DeskProps[] }) {
  // Only show desks that have an on-chain market created
  const markets = desks.filter(d => d.arc_tx && d.question)

  return (
    <div className="bg-card border rounded-2xl overflow-hidden shadow-xl">
      <div className="p-6 border-b bg-muted/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/20 rounded-lg">
            <Gavel className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-black uppercase tracking-tighter">On-Chain Prediction Markets</h3>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Settled in USDC • Secured on Arc</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full border border-primary/20">
          <Coins className="w-3 h-3 text-primary" />
          <span className="text-[10px] font-black text-primary uppercase">{markets.length * 10} ROSETTA Bonded</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-muted/5 border-b text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">
              <th className="px-6 py-4">Market / Question</th>
              <th className="px-6 py-4">Region</th>
              <th className="px-6 py-4 text-center">Bond (Stake)</th>
              <th className="px-6 py-4">Expiry</th>
              <th className="px-6 py-4 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y border-border/50">
            {markets.map((m, i) => (
              <tr key={i} className="hover:bg-muted/5 transition-colors group">
                <td className="px-6 py-5">
                  <div className="space-y-1">
                    <p className="text-sm font-bold group-hover:text-primary transition-colors">{m.question}</p>
                    <p className="text-[10px] font-mono text-muted-foreground/60 break-all">{m.arc_tx}</p>
                  </div>
                </td>
                <td className="px-6 py-5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase bg-muted/20 px-2 py-0.5 rounded border border-border/50">{m.desk}</span>
                  </div>
                </td>
                <td className="px-6 py-5 text-center">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-500/5 text-green-500 rounded-lg border border-green-500/10 text-xs font-bold">
                    10.00 <span className="text-[10px] opacity-60">RST</span>
                  </div>
                </td>
                <td className="px-6 py-5">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <Clock className="w-3.5 h-3.5" />
                    Aug 12, 2026
                  </div>
                </td>
                <td className="px-6 py-5 text-right">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-yellow-500/10 text-yellow-500 rounded-full border border-yellow-500/20 text-[10px] font-black uppercase tracking-widest animate-pulse">
                    <AlertCircle className="w-3 h-3" />
                    Pending
                  </div>
                </td>
              </tr>
            ))}
            {markets.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground text-sm font-medium italic">
                  No active markets found. Run the E2E pipeline to generate on-chain trades.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
