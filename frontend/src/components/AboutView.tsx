import React from 'react'
import { Layers } from 'lucide-react'

export function AboutView() {
  return (
    <div className="max-w-5xl space-y-20 mx-auto px-4">
      <header className="text-center">
        <p className="text-[11px] font-medium uppercase tracking-[0.4em] text-brand-red mb-6">
          Institutional reasoning layer
        </p>
        <h1 className="font-display text-[clamp(2.5rem,6vw,5rem)] text-text-primary leading-[0.95] mb-10">
          A Global Macro perspective,<br />
          <em className="text-brand-red not-italic">in every language.</em>
        </h1>
        <div className="grid md:grid-cols-2 gap-12 text-justify">
          <div className="space-y-4">
            <h4 className="text-brand-red uppercase tracking-[0.3em] text-[11px] font-bold border-b border-brand-red/20 pb-2">Native Intelligence</h4>
            <p className="text-text-secondary leading-relaxed font-light text-[15px]">
              Most AI investment platforms speak one language and see one market. Rosetta Alpha runs five regional analysts, each native to their market's culture, language, and data sources, then settles their conviction on-chain as verifiable prediction markets. This ensures the local context remains the primary driver of the agent's thesis.
            </p>
          </div>
          <div className="space-y-4">
            <h4 className="text-brand-red uppercase tracking-[0.3em] text-[11px] font-bold border-b border-brand-red/20 pb-2">Cognitive Risk Parity</h4>
            <p className="text-text-secondary leading-relaxed font-light text-[15px]">
              Ray Dalio's All Weather strategy succeeds because it acknowledges that no single asset class and no single perspective captures every economic regime. Rosetta Alpha extends that discipline to the AI layer: a Chinese analyst reads the <span className="font-medium text-text-primary">财报</span> in Mandarin; a Japanese analyst interprets BoJ policy; a US analyst processes 10-Qs.
            </p>
          </div>
        </div>
      </header>

      <div className="solid-panel rounded-3xl p-12 mb-16 border-white/[0.03] shadow-[0_30px_60px_-12px_rgba(0,0,0,0.5)]">
        <h3 className="font-display text-3xl text-text-primary mb-10 flex items-center justify-center gap-4">
          <Layers className="text-brand-red w-8 h-8" />
          Balanced Economic Exposure
        </h3>
        <div className="max-w-3xl mx-auto text-center mb-12">
          <p className="text-text-secondary leading-relaxed text-lg font-light italic">
            Rosetta Alpha implements the All Weather discipline by maintaining structural equilibrium across the four distinct economic environments that drive asset returns.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Rising Growth', assets: 'Equities &\nCommodities' },
            { label: 'Falling Growth', assets: 'Nominal Bonds\n& Cash' },
            { label: 'Rising Inflation', assets: 'ILBs &\nCommodities' },
            { label: 'Falling Inflation', assets: 'Equities &\nNominal Bonds' }
          ].map((item, i) => (
            <div key={i} className="group p-8 bg-white/[0.01] border border-white/[0.03] rounded-xl flex flex-col items-center text-center transition-all duration-500 hover:bg-brand-red/[0.03] hover:border-brand-red/20">
              <p className="text-[10px] uppercase tracking-[0.4em] text-brand-red/60 mb-4 group-hover:text-brand-red transition-colors">{item.label}</p>
              <p className="text-[15px] font-medium text-text-primary leading-tight whitespace-pre-line">{item.assets}</p>
            </div>
          ))}
        </div>
      </div>

      <section className="space-y-6">
        <h2 className="font-display text-2xl text-text-primary">The pipeline</h2>
        <ol className="space-y-5 border-l border-border pl-8">
          {[
            { n: '01', t: 'Regional ingest', d: 'Each desk pulls market data, filings, and news in the local language.' },
            { n: '02', t: 'Multi-agent reasoning', d: 'Specialized analysts (fundamental, technical, sentiment, macro) produce structured ReasoningBlocks.' },
            { n: '03', t: 'Thesis synthesis', d: 'A Portfolio Manager agent reconciles agent outputs into a single direction + conviction.' },
            { n: '04', t: 'Provenance', d: 'The full thesis is hashed, pinned to IPFS, and the hash is recorded on Arc L1.' },
            { n: '05', t: 'Market settlement', d: 'A binary prediction market is opened on the thesis question. Settlement is autonomous.' },
          ].map(step => (
            <li key={step.n} className="relative">
              <span
                className="absolute -left-[33px] top-0 w-6 h-6 flex items-center justify-center font-mono text-[10px] bg-bg-primary border border-brand-red/60 text-brand-red"
              >
                {step.n}
              </span>
              <p className="font-display text-lg text-text-primary mb-1">{step.t}</p>
              <p className="text-text-secondary font-light leading-relaxed">{step.d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="grid md:grid-cols-2 gap-4 sm:gap-6">
        <div className="border border-border bg-bg-secondary p-6">
          <p className="text-[10px] uppercase tracking-[0.25em] text-text-tertiary mb-3">Built On</p>
          <ul className="space-y-2 text-sm text-text-secondary font-light">
            <li>· AdalFlow — multi-agent orchestration</li>
            <li>· Arc L1 — on-chain provenance</li>
            <li>· IPFS via Pinata — permanent storage</li>
            <li>· ROSETTA Token — performance bond staking</li>
            <li>· PredictionMarket.sol — on-chain binary markets</li>
          </ul>
        </div>
        <div className="border border-border bg-bg-secondary p-6">
          <p className="text-[10px] uppercase tracking-[0.25em] text-text-tertiary mb-3">Inspired By</p>
          <ul className="space-y-2 text-sm text-text-secondary font-light">
            <li>· Bridgewater Associates — All Weather</li>
            <li>· Ray Dalio — <em>Principles</em></li>
            <li>· Bloomberg Terminal — institutional UX</li>
            <li>· The Economist — editorial restraint</li>
          </ul>
        </div>
      </section>

    </div>
  )
}
