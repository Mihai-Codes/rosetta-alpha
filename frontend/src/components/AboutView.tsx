import React from 'react'

export function AboutView() {
  return (
    <div className="max-w-3xl space-y-12">
      <header>
        <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-gold mb-4">
          About Rosetta Alpha
        </p>
        <h1 className="font-display text-5xl text-text-primary leading-tight mb-6">
          A reasoning layer for global macro,<br />
          <em className="text-gold">in every language.</em>
        </h1>
        <p className="text-lg text-text-secondary font-light leading-relaxed">
          Most AI investment platforms speak one language and see one market.
          Rosetta Alpha runs five regional analysts — each native to their
          market's culture, language, and data sources — then settles their
          conviction on-chain as verifiable prediction markets.
        </p>
      </header>

      <section className="space-y-6">
        <h2 className="font-display text-2xl text-text-primary">Why this exists</h2>
        <p className="text-text-secondary font-light leading-relaxed">
          Ray Dalio's All Weather strategy succeeds because it acknowledges that
          no single asset class — and no single perspective — captures every
          economic regime. Rosetta Alpha extends that discipline to the AI layer:
          a Chinese analyst reads the 财报 in Mandarin; a Japanese analyst
          interprets BoJ policy in Japanese; a US analyst processes 10-Qs.
          Their conclusions are then merged, hashed, and recorded permanently.
        </p>
      </section>

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
                className="absolute -left-[33px] top-0 w-6 h-6 flex items-center justify-center font-mono text-[10px] bg-bg-primary border border-gold/60 text-gold"
              >
                {step.n}
              </span>
              <p className="font-display text-lg text-text-primary mb-1">{step.t}</p>
              <p className="text-text-secondary font-light leading-relaxed">{step.d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="grid md:grid-cols-2 gap-6">
        <div className="border border-border bg-bg-secondary p-6">
          <p className="text-[10px] uppercase tracking-[0.25em] text-text-tertiary mb-3">Built On</p>
          <ul className="space-y-2 text-sm text-text-secondary font-light">
            <li>· AdalFlow — multi-agent orchestration</li>
            <li>· Arc L1 — on-chain provenance</li>
            <li>· IPFS via Pinata — permanent storage</li>
            <li>· Circle Paymaster — gasless USDC tx</li>
            <li>· Polymarket V2 — market liquidity</li>
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

      <hr className="hr-gold" />

      <p className="text-center text-[10px] uppercase tracking-[0.3em] text-text-tertiary">
        Built for the Agora Agents Hackathon · 2026
      </p>
    </div>
  )
}
