import React from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { DeskProps } from './DeskCard'

const CHART_COLORS = ['#C9A84C', '#A07840', '#7B6030', '#52B788', '#7B8FA6']

export function PortfolioView({ desks }: { desks: DeskProps[] }) {
  const chartData = desks.map((d, i) => ({
    name: d.ticker,
    value: 20,
    color: CHART_COLORS[i % CHART_COLORS.length],
  }))

  const signals = desks.map(d =>
    d.confidence * (d.direction === 'LONG' ? 1 : d.direction === 'SHORT' ? -1 : 0)
  )
  const netSignal = signals.length > 0 ? signals.reduce((a, b) => a + b, 0) / signals.length : 0
  const avgConfidence = desks.length > 0 ? desks.reduce((acc, d) => acc + d.confidence, 0) / desks.length : 0
  const displaySignal = netSignal > 0.1 ? 'LONG' : netSignal < -0.1 ? 'SHORT' : 'NEUTRAL'

  const signalColor =
    displaySignal === 'LONG' ? 'text-[#52B788]' :
    displaySignal === 'SHORT' ? 'text-[#C0392B]' :
    'text-[#7B8FA6]'

  return (
    <div className="space-y-10">
      {/* Summary row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Active Desks', value: String(desks.length) },
          { label: 'Avg Conviction', value: `${(avgConfidence * 100).toFixed(0)}%` },
          { label: 'Rebalance Cycle', value: 'Daily · UTC 00:00' },
        ].map(item => (
          <div key={item.label} className="glass-panel border border-border/20 rounded-2xl shadow-none px-8 py-8">
            <p className="text-[9px] font-medium uppercase tracking-[0.25em] text-text-tertiary mb-1">{item.label}</p>
            <p className="font-display text-3xl font-light text-text-primary tracking-tight">{item.value}</p>
          </div>
        ))}
      </div>

      {/* Chart + signal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Allocation donut */}
        <div className="lg:col-span-2 glass-panel border border-border/20 rounded-2xl p-10 shadow-none">
          <p className="text-[9px] font-medium uppercase tracking-[0.25em] text-text-tertiary mb-6">Portfolio Allocation</p>
          <div className="flex flex-col sm:flex-row items-center gap-8">
            <div className="w-[200px] h-[200px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={chartData} cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={3} dataKey="value" strokeWidth={0}>
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: 'hsl(40 14% 7%)', border: '1px solid hsl(40 10% 13%)', borderRadius: 2, fontSize: 11, fontWeight: 500 }}
                    itemStyle={{ color: 'hsl(38 22% 88%)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3 w-full">
              {desks.map((d, i) => (
                <div key={d.ticker} className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                    <span className="text-xs font-medium text-foreground/80">{d.ticker}</span>
                    <span className="text-[9px] text-muted-foreground/40 uppercase tracking-wider">{d.desk}</span>
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground/60">20%</span>
                </div>
              ))}
              <div className="pt-3 border-t border-border/50">
                <p className="text-[9px] text-muted-foreground/40 uppercase tracking-widest">All-Weather Risk Parity</p>
              </div>
            </div>
          </div>
        </div>

        {/* Aggregated signal */}
        <div className="glass-panel border border-border/20 rounded-2xl p-10 shadow-none flex flex-col justify-between">
          <p className="text-[9px] font-medium uppercase tracking-[0.25em] text-muted-foreground/50">Aggregated Signal</p>
          <div className="text-center py-6">
            <div className={`flex items-center justify-center gap-3 mb-2 ${signalColor}`}>
              {displaySignal === 'LONG' && <TrendingUp className="w-8 h-8" />}
              {displaySignal === 'SHORT' && <TrendingDown className="w-8 h-8" />}
              {displaySignal === 'NEUTRAL' && <Minus className="w-8 h-8" />}
              <span className={`font-display text-5xl font-light tracking-tight ${signalColor}`}>{displaySignal}</span>
            </div>
            <p className="font-mono text-3xl font-light text-foreground/60 mt-1">
              {netSignal > 0 ? '+' : ''}{netSignal.toFixed(3)}
            </p>
            <p className="text-[9px] text-muted-foreground/40 uppercase tracking-widest mt-1">Net Conviction</p>
          </div>
          <div>
            <div className="flex justify-between text-[9px] font-medium uppercase tracking-widest mb-2">
              <span className="text-muted-foreground/40">Avg Confidence</span>
              <span className="text-primary/80">{(avgConfidence * 100).toFixed(0)}%</span>
            </div>
            <div className="h-px bg-border overflow-hidden">
              <div
                className="h-full bg-primary/60 transition-all duration-1000"
                style={{ width: `${avgConfidence * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Desk signal rows */}
      <div className="bg-card border border-border divide-y divide-border/50">
        <div className="grid grid-cols-4 px-6 py-3 text-[9px] font-medium uppercase tracking-[0.2em] text-muted-foreground/40">
          <span>Desk</span>
          <span>Asset</span>
          <span>Signal</span>
          <span className="text-right">Conviction</span>
        </div>
        {desks.map(d => {
          const col = d.direction === 'LONG' ? 'text-[#52B788]' : d.direction === 'SHORT' ? 'text-[#C0392B]' : 'text-[#7B8FA6]'
          return (
            <div key={d.ticker} className="grid grid-cols-4 px-6 py-4 hover:bg-accent/20 transition-colors">
              <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground/60">{d.desk.toUpperCase()}</span>
              <span className="font-mono text-sm font-medium text-foreground/90">{d.ticker}</span>
              <span className={`text-[10px] font-medium uppercase tracking-widest ${col}`}>{d.direction}</span>
              <span className="text-right font-mono text-sm text-muted-foreground/70">{(d.confidence * 100).toFixed(0)}%</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
