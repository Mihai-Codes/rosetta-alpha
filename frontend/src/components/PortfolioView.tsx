import React from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { Wallet, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react'
import { DeskProps } from './DeskCard'

const CHART_COLORS = ['#3b82f6', '#ef4444', '#a855f7', '#f59e0b', '#10b981']

export function PortfolioView({ desks }: { desks: DeskProps[] }) {
  const chartData = desks.map((d, i) => ({
    name: d.desk + ' Desk',
    value: 20,
    color: CHART_COLORS[i % CHART_COLORS.length]
  }))

  const signals = desks.map(d => d.confidence * (d.direction === 'LONG' ? 1 : d.direction === 'SHORT' ? -1 : 0))
  const netSignal = signals.length > 0 ? signals.reduce((a, b) => a + b, 0) / signals.length : 0.0
  const avgConfidence = desks.length > 0 ? desks.reduce((acc, d) => acc + d.confidence, 0.0) / desks.length : 0.0
  const displaySignal = netSignal > 0.1 ? 'LONG' : netSignal < -0.1 ? 'SHORT' : 'NEUTRAL'

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 bg-card border rounded-xl p-6 flex flex-col md:flex-row items-center">
        <div className="flex-1 w-full h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#f8fafc', fontWeight: 'bold', fontSize: '12px' }}
                itemStyle={{ color: '#f8fafc' }}
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
              />
              <Legend verticalAlign="middle" align="right" layout="vertical" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 space-y-6 w-full px-4 text-center md:text-left mt-6 md:mt-0">
          <div>
            <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2 justify-center md:justify-start">
              <Wallet className="w-4 h-4 text-primary/60" />
              Allocation Strategy
            </h3>
            <p className="text-3xl font-black mt-2 tracking-tighter">All-Weather Risk Parity</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-muted/10 p-3 rounded-xl border border-border/50">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Rebalance</span>
              <p className="text-sm font-bold mt-1">Daily (UTC 00:00)</p>
            </div>
            <div className="bg-muted/10 p-3 rounded-xl border border-border/50">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Status</span>
              <p className="text-sm font-bold text-green-500 mt-1 uppercase tracking-wider">Live & Balanced</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-primary/5 border border-primary/20 rounded-xl p-8 flex flex-col justify-center items-center text-center relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
           <ArrowUpRight className="w-32 h-32" />
        </div>
        <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-4">Aggregated Signal</span>
        <div className="flex items-center gap-3 text-5xl md:text-6xl font-black mb-6 tracking-tighter uppercase">
          {displaySignal === 'LONG' && <ArrowUpRight className="w-12 h-12 text-green-500" />}
          {displaySignal === 'SHORT' && <ArrowDownRight className="w-12 h-12 text-red-500" />}
          {displaySignal === 'NEUTRAL' && <Minus className="w-12 h-12 text-slate-500" />}
          <span>{displaySignal}</span>
        </div>
        <div className="space-y-1">
          <p className="text-4xl font-mono font-bold tracking-tighter">
            {netSignal > 0 ? '+' : ''}{netSignal.toFixed(2)}
          </p>
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Net Conviction Signal</p>
        </div>
        <div className="mt-10 pt-8 border-t border-primary/10 w-full">
          <div className="flex justify-between text-[10px] font-black mb-3 uppercase tracking-widest">
            <span className="text-muted-foreground">Avg Confidence</span>
            <span className="text-primary">{(avgConfidence * 100).toFixed(0)}%</span>
          </div>
          <div className="w-full bg-primary/10 h-2 rounded-full overflow-hidden border border-primary/20 p-[1px]">
            <div 
              className="h-full bg-primary rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${avgConfidence * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
