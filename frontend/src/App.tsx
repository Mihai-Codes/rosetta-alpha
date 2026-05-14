import React from 'react'
import { Layout } from './components/Layout'
import { DeskGrid, MOCK_DATA } from './components/DeskGrid'
import { PortfolioView } from './components/PortfolioView'
import { MarketBoard } from './components/MarketBoard'
import { DeskProps } from './components/DeskCard'
import { motion, AnimatePresence } from 'framer-motion'

function App() {
  const [data, setData] = React.useState<DeskProps[]>(MOCK_DATA)
  const [loading, setLoading] = React.useState(true)
  const [lastUpdated, setLastUpdated] = React.useState<string | null>(null)

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/results')
        const json = await res.json()
        if (json && json.length > 0) {
          setData(json)
          setLastUpdated(new Date().toLocaleTimeString())
        }
      } catch (err) {
        console.error("Failed to fetch live results:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <Layout>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-7xl mx-auto space-y-16"
      >
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b pb-8 border-primary/10">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
               <span className="w-2 h-2 bg-primary rounded-full animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
               <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/80">Quantum Intelligence Layer</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter uppercase italic leading-none">
              Rosetta <span className="text-primary font-light not-italic drop-shadow-sm">Alpha</span>
            </h1>
            <p className="text-muted-foreground font-medium max-w-2xl leading-relaxed text-base md:text-lg">
              Securing global alpha via multi-language reasoning traces. Securely hashed, IPFS-pinned, and recorded on the Arc L1.
            </p>
          </div>
          <div className="flex flex-col items-end gap-3">
            <div className="flex items-center gap-3 px-5 py-2.5 bg-green-500/10 border border-green-500/20 rounded-full text-green-500 text-xs font-black uppercase tracking-widest shadow-[0_0_15px_rgba(34,197,94,0.1)]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              Arc Node: Synchronized
            </div>
            {lastUpdated && (
              <div className="flex items-center gap-2 px-3 py-1 bg-muted/30 rounded-md border border-border/50">
                <span className="text-[9px] font-black text-muted-foreground uppercase tracking-tighter">Last Trace:</span>
                <span className="text-[9px] font-mono font-bold text-primary">{lastUpdated}</span>
              </div>
            )}
          </div>
        </div>

        <section className="space-y-8">
          <div className="flex items-center gap-4">
            <h2 className="text-xs font-black uppercase tracking-[0.4em] text-muted-foreground/60 whitespace-nowrap bg-background px-2">Global Strategy</h2>
            <div className="h-px bg-gradient-to-r from-border via-primary/20 to-transparent w-full -ml-4" />
          </div>
          <PortfolioView desks={data} />
        </section>

        <section className="space-y-8">
          <div className="flex items-center gap-4">
            <h2 className="text-xs font-black uppercase tracking-[0.4em] text-muted-foreground/60 whitespace-nowrap bg-background px-2">Research Desks</h2>
            <div className="h-px bg-gradient-to-r from-border via-primary/20 to-transparent w-full -ml-4" />
          </div>
          <AnimatePresence mode="wait">
            {loading && data === MOCK_DATA ? (
              <motion.div 
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
              >
                 {[1, 2, 3].map(i => (
                   <div key={i} className="h-[400px] bg-card/30 border border-primary/5 rounded-2xl animate-pulse relative overflow-hidden">
                     <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent" />
                   </div>
                 ))}
              </motion.div>
            ) : (
              <motion.div
                key="content"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
              >
                <DeskGrid data={data} />
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        <section className="space-y-8 pb-20">
          <div className="flex items-center gap-4">
            <h2 className="text-xs font-black uppercase tracking-[0.4em] text-muted-foreground/60 whitespace-nowrap bg-background px-2">Market Settlement</h2>
            <div className="h-px bg-gradient-to-r from-border via-primary/20 to-transparent w-full -ml-4" />
          </div>
          <MarketBoard desks={data} />
        </section>
      </motion.div>
    </Layout>
  )
}

export default App
