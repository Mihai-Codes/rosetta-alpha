'use client'

import React from 'react'
import { Scale } from 'lucide-react'

export function AboutView() {
  return (
    <div className="max-w-6xl space-y-24 mx-auto px-4 py-20 animate-rain">
      
      {/* Ray Dalio & The Philosophy Section */}
      <div className="grid md:grid-cols-12 gap-12 items-center">
        <div className="md:col-span-7 space-y-6">
          <p className="text-[11px] font-medium uppercase tracking-[0.4em] text-brand-red">
            Institutional reasoning layer
          </p>
          <h1 className="font-display text-[clamp(2.5rem,5vw,4.5rem)] text-text-primary leading-[0.95]">
            Built on the <br />
            <em className="text-brand-red not-italic">All Weather</em> discipline.
          </h1>
          <div className="space-y-4 pt-4">
            <p className="text-text-secondary leading-relaxed font-light text-[15px] max-w-3xl mx-auto text-justify hyphens-auto">
              Rosetta Alpha is fundamentally inspired by Ray Dalio's pioneering work on the All Weather strategy and Bridgewater's culture of radical truth. By combining multi-agent LLM reasoning with decentralized prediction markets, we've reimagined Dalio's principles for the AI era.
            </p>
            <p className="text-text-secondary leading-relaxed font-light text-[15px] max-w-3xl mx-auto text-justify hyphens-auto">
              Most AI investment platforms speak one language and see one market. Rosetta Alpha runs five regional analysts, each native to their market's culture, language, and data sources, then settles their conviction on-chain as verifiable prediction markets.
            </p>
          </div>
        </div>
        
        <div className="md:col-span-5 flex justify-center mt-10 md:mt-0">
          {/* Levitating Ray Dalio Portrait */}
          <div className="relative group w-64 h-64 sm:w-80 sm:h-80 animate-levitate">
            <div className="absolute inset-0 bg-gradient-to-tr from-brand-red to-[#FFD700] opacity-30 blur-2xl group-hover:opacity-60 transition-opacity duration-700" />
            <div className="absolute inset-0 border border-white/20 bg-[#0A0A0A] shadow-[0_0_40px_rgba(216,43,43,0.3)] z-10 overflow-hidden ">
              <img 
                src="/ray-dalio.webp" 
                alt="Ray Dalio" 
                className="w-full h-full object-cover opacity-75 mix-blend-screen grayscale hover:grayscale-0 transition-all duration-700" 
              />
            </div>
            {/* Corner Bracket Accents */}
            <div className="absolute -top-2 -left-2 w-6 h-6 border-t-2 border-l-2 border-brand-red z-20" />
            <div className="absolute -bottom-2 -right-2 w-6 h-6 border-b-2 border-r-2 border-brand-red z-20" />
            <div className="absolute -top-2 -right-2 w-6 h-6 border-t-2 border-r-2 border-[#FFD700] z-20" />
            <div className="absolute -bottom-2 -left-2 w-6 h-6 border-b-2 border-l-2 border-[#FFD700] z-20" />
          </div>
        </div>
      </div>

      {/* Cognitive Risk Parity & Quadrants */}
      <div className="bg-gradient-to-b from-[#000000] to-black rounded-[2rem] p-8 md:p-12 border border-brand-red/50 shadow-[0_0_40px_rgba(216,43,43,0.15)]">
        <div className="flex flex-col items-center text-center mb-10">
          <Scale className="text-brand-red w-8 h-8 mb-4" />
          <h3 className="font-display text-2xl text-text-primary tracking-tight">
            Balanced Economic Exposure
          </h3>
          <div className="h-0.5 w-8 bg-brand-red/30 mt-4 rounded-full" />
        </div>

        <div className="flex flex-col lg:flex-row items-center gap-12 mb-10">
          <div className="relative w-full max-w-sm shrink-0 animate-levitate" style={{ animationDelay: '1.5s' }}>
            <div className="relative z-10 grid grid-cols-2 grid-rows-2 aspect-square border border-brand-red/40 shadow-[0_10px_40px_rgba(0,0,0,0.8)] rounded-2xl overflow-hidden bg-[#0A0A0A]">
              <div className="border-r border-b border-brand-red/30 bg-gradient-to-br from-brand-red/10 to-transparent p-5 flex flex-col justify-between">
                <span className="text-[10px] uppercase tracking-[0.2em] text-brand-red/60 font-bold">Rising Growth</span>
                <span className="font-display text-lg sm:text-xl text-text-primary leading-tight">Equities<br/>Commodities</span>
              </div>
              <div className="border-b border-brand-red/30 bg-gradient-to-bl from-[#FFD700]/10 to-transparent p-5 flex flex-col justify-between text-right">
                <span className="text-[10px] uppercase tracking-[0.2em] text-[#FFD700]/60 font-bold">Falling Growth</span>
                <span className="font-display text-lg sm:text-xl text-text-primary leading-tight">Nominal Bonds<br/>Cash</span>
              </div>
              <div className="border-r border-brand-red/30 bg-gradient-to-tr from-[#00FF00]/10 to-transparent p-5 flex flex-col justify-between">
                <span className="font-display text-lg sm:text-xl text-text-primary leading-tight">ILBs<br/>Commodities</span>
                <span className="text-[10px] uppercase tracking-[0.2em] text-[#00FF00]/60 font-bold">Rising Inflation</span>
              </div>
              <div className="bg-gradient-to-tl from-[#888888]/10 to-transparent p-5 flex flex-col justify-between text-right">
                <span className="font-display text-lg sm:text-xl text-text-primary leading-tight">Equities<br/>Nominal Bonds</span>
                <span className="text-[10px] uppercase tracking-[0.2em] text-[#888888]/60 font-bold">Falling Inflation</span>
              </div>
              {/* Center crosshair */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full border border-brand-red/40 bg-[#0A0A0A] flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-red " />
              </div>
            </div>
          </div>

          <div className="flex-1">
            <p className="text-text-secondary leading-relaxed text-sm font-light italic mb-6 max-w-2xl mx-auto text-justify hyphens-auto">
              Ray Dalio's strategy succeeds because it acknowledges that no single asset class captures every economic regime. Rosetta Alpha extends that discipline to the AI layer: maintaining structural equilibrium across the four distinct economic environments that drive asset returns.
            </p>
            
            <div className="flex flex-col gap-3">
              {[
                { label: 'Rising Growth', assets: 'Equities & Commodities', desc: 'Positive growth surprises favor ownership of the productive economy.' },
                { label: 'Falling Growth', assets: 'Nominal Bonds & Cash', desc: 'Economic contraction increases the value of safe, fixed-return assets.' },
                { label: 'Rising Inflation', assets: 'ILBs & Commodities', desc: 'Currency devaluation favors inflation-linked bonds and tangible assets.' },
                { label: 'Falling Inflation', assets: 'Equities & Nominal Bonds', desc: 'Deflationary environments increase real returns on financial capital.' }
              ].map((item, i) => (
                <div key={i} className="group flex flex-col md:flex-row items-stretch gap-0 p-0 bg-[#0A0A0A] border border-brand-red/20 rounded-none transition-all duration-700 hover:bg-brand-red/[0.05] hover:border-brand-red/40 hover:shadow-[0_0_15px_rgba(216,43,43,0.15)]">
                  <div className="md:w-[150px] shrink-0 p-4 flex items-center">
                    <p className="text-[10px] uppercase tracking-[0.3em] text-brand-red/50 group-hover:text-brand-red transition-all duration-500 font-bold">{item.label}</p>
                  </div>
                  <div className="md:w-[200px] shrink-0 md:border-l border-t md:border-t-0 border-brand-red/30 p-4 flex items-center">
                    <p className="text-sm font-display text-text-primary tracking-tight leading-snug">{item.assets}</p>
                  </div>
                  <div className="flex-1 md:border-l border-t md:border-t-0 border-brand-red/30 p-4 flex items-center">
                    <p className="text-[13px] text-text-secondary font-light leading-normal tracking-wide text-left">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <section className="space-y-6">
        <h2 className="font-display text-2xl text-text-primary">The Pipeline</h2>
        <ol className="space-y-5 pl-8">
          {[
            { n: '01', t: 'Regional ingest', d: 'Each desk pulls market data, filings, and news in the local language.' },
            { n: '02', t: 'Multi-agent reasoning', d: 'Specialized analysts (fundamental, technical, sentiment, macro) produce structured ReasoningBlocks.' },
            { n: '03', t: 'Thesis synthesis', d: 'A Portfolio Manager agent reconciles agent outputs into a single direction + conviction.' },
            { n: '04', t: 'Provenance', d: 'The full thesis is hashed, pinned to IPFS, and the hash is recorded on Arc L1.' },
            { n: '05', t: 'Market settlement', d: 'A binary prediction market is opened on the thesis question. Settlement is autonomous.' },
          ].map(step => (
            <li key={step.n} className="relative">
              <span className="absolute -left-[33px] top-0 w-6 h-6 flex items-center justify-center font-mono text-[10px] bg-bg-primary border border-brand-red/60 text-brand-red">
                {step.n}
              </span>
              <p className="font-display text-lg text-text-primary mb-1">{step.t}</p>
              <p className="text-text-secondary font-light leading-relaxed">{step.d}</p>
            </li>
          ))}
        </ol>
      </section>

    </div>
  )
}
