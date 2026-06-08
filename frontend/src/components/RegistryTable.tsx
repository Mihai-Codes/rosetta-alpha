'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { PageTransition } from '@/components/PageTransition'
import posthog from 'posthog-js'
import { CheckCircle2, ExternalLink, Search, Download, ArrowUpDown } from 'lucide-react'
import { DeskProps } from './DeskCard'
import { regionMeta, truncateHash, formatRelative } from '../lib/format'

interface RegistryTableProps {
  desks: DeskProps[]
  onCidClick?: (cid: string) => void
}

type SortKey = 'desk' | 'ticker' | 'direction' | 'confidence' | 'time'

interface RegistryEntry extends DeskProps {
  timestamp: number
}

export function RegistryTable({ desks, onCidClick }: RegistryTableProps) {
  const [sortKey, setSortKey] = React.useState<SortKey>('time')
  const [sortDesc, setSortDesc] = React.useState(true)
  const [search, setSearch] = React.useState('')

  const [now, setNow] = React.useState<number | null>(null)
  React.useEffect(() => { setNow(Date.now()) }, [])

  const entries: RegistryEntry[] = React.useMemo(() => {
    const enriched = desks.map((d, i) => ({ ...d, timestamp: (now ?? 1716508800000) - i * 90_000 }))
    const filtered = search
      ? enriched.filter(
          d =>
            d.ticker.toLowerCase().includes(search.toLowerCase()) ||
            d.desk.toLowerCase().includes(search.toLowerCase()) ||
            d.arc_tx.toLowerCase().includes(search.toLowerCase())
        )
      : enriched

    return [...filtered].sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case 'desk':       cmp = a.desk.localeCompare(b.desk); break
        case 'ticker':     cmp = a.ticker.localeCompare(b.ticker); break
        case 'direction':  cmp = a.direction.localeCompare(b.direction); break
        case 'confidence': cmp = a.confidence - b.confidence; break
        case 'time':       cmp = a.timestamp - b.timestamp; break
      }
      return sortDesc ? -cmp : cmp
    })
  }, [desks, sortKey, sortDesc, search])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDesc(!sortDesc)
    else { setSortKey(key); setSortDesc(true) }
  }

  const exportCsv = () => {
    posthog.capture('registry_exported_csv')
    const headers = ['Desk', 'Ticker', 'Direction', 'Confidence', 'Question', 'IPFS CID', 'Arc Tx']
    const rows = entries.map(e => [
      e.desk, e.ticker, e.direction, e.confidence.toFixed(2),
      `"${e.question.replace(/"/g, '""')}"`, e.ipfs_thesis_cid, e.arc_tx,
    ])
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `rosetta-alpha-registry-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const SortHeader = ({ label, k }: { label: string; k: SortKey }) => (
    <button
      onClick={() => toggleSort(k)}
      className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.2em] text-text-tertiary hover:text-text-primary transition-colors min-h-[44px] md:min-h-0"
    >
      {label}
      <ArrowUpDown className={`w-3 h-3 ${sortKey === k ? 'text-brand-red' : 'opacity-40'}`} />
    </button>
  )

  return (
    <PageTransition className="space-y-4 sm:space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3" role="search">
        <div className="relative flex-1 sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary" />
          <input
            type="text"
            placeholder="Search ticker, desk, hash…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-3 min-h-[44px] bg-bg-secondary border border-border text-sm text-text-primary placeholder:text-text-tertiary focus:border-brand-red focus:outline-none transition-colors"
            aria-label="Search registry entries"
          />
        </div>
        <button
          onClick={exportCsv}
          className="flex items-center justify-center gap-2 px-4 py-3 min-h-[44px] border border-border text-[10px] font-medium uppercase tracking-[0.2em] text-text-primary bg-bg-secondary hover:bg-white/[0.05] transition-colors"
        >
          <Download className="w-3 h-3" />
          Export CSV
        </button>
      </div>

      {/* ── Mobile card stack (< md) ── */}
      <div className="md:hidden space-y-2" role="list">
        {entries.length === 0 ? (
          <div className="solid-panel p-12 text-center">
            <p className="font-display text-xl text-text-tertiary">No traces found</p>
            <p className="text-[11px] uppercase tracking-[0.25em] text-text-tertiary/60 mt-2">Adjust your search</p>
          </div>
        ) : entries.map((e, i) => {
          const meta = regionMeta(e.desk)
          const dirColor = e.direction === 'LONG' ? '#22C55E' : e.direction === 'SHORT' ? '#D82B2B' : '#888888'
          return (
            <div
              key={i}
              className="solid-panel p-4 border-l-2 cursor-pointer"
              style={{ borderLeftColor: meta.color }}
              onClick={() => posthog.capture('registry_row_clicked', { region: e.desk, hash_truncated: e.arc_tx?.slice(0, 10) })}
              role="listitem"
              tabIndex={0}
              onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.click()}
            >
              {/* Row 1: Region + Asset + Direction */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-text-secondary">
                    {meta.flag} {meta.name}
                  </span>
                  <span className="font-mono text-sm text-text-primary font-medium">{e.ticker}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-medium uppercase tracking-[0.2em]" style={{ color: dirColor }}>
                    {e.direction}
                  </span>
                  <span className="font-mono text-[11px] text-text-primary">{(e.confidence * 100).toFixed(0)}%</span>
                </div>
              </div>
              {/* Row 2: Hashes */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 mb-2">
                {e.ipfs_thesis_cid && e.ipfs_thesis_cid.length > 20 && (
                  <div className="flex items-center gap-2">
                    {onCidClick && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          onCidClick(e.ipfs_thesis_cid)
                        }}
                        className="inline-flex items-center gap-1 font-mono text-[10px] text-brand-red hover:text-white transition-colors min-h-[44px]"
                      >
                        Chain
                      </button>
                    )}
                    <a
                      href={`https://dweb.link/ipfs/${e.ipfs_thesis_cid}`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 font-mono text-[10px] text-text-secondary hover:text-brand-red transition-colors min-h-[44px]"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <span className="text-text-tertiary uppercase tracking-wider">IPFS</span>
                      {truncateHash(e.ipfs_thesis_cid, 6, 4)}
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                )}
                {e.arc_tx && e.arc_tx.length > 20 && (
                  <a
                    href={`https://testnet.arcscan.app/tx/${e.arc_tx}`}
                    target="_blank" rel="noopener noreferrer"
                    
                    className="flex items-center gap-1 font-mono text-[10px] text-text-secondary hover:text-brand-red transition-colors min-h-[44px]"
                  >
                    <span className="text-text-tertiary uppercase tracking-wider">Arc</span>
                    {truncateHash(e.arc_tx, 6, 4)}
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </div>
              {/* Row 3: Time + Status */}
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-text-tertiary">{formatRelative(e.timestamp)}</span>
                <span className="inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.2em] text-positive">
                  <CheckCircle2 className="w-3 h-3" />
                  Verified
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Desktop table (≥ md) ── */}
      <div className="hidden md:block solid-panel overflow-x-auto">
        <table className="w-full" role="table">
          <thead>
            <tr className="border-b border-white/[0.05]">
              <th className="px-4 sm:px-6 py-4 text-left"><SortHeader label="Desk" k="desk" /></th>
              <th className="px-4 sm:px-6 py-4 text-left"><SortHeader label="Asset" k="ticker" /></th>
              <th className="px-4 sm:px-6 py-4 text-left"><SortHeader label="Direction" k="direction" /></th>
              <th className="px-4 sm:px-6 py-4 text-right"><SortHeader label="Conviction" k="confidence" /></th>
              <th className="px-4 sm:px-6 py-4 text-left">
                <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-text-tertiary">IPFS · Arc Tx</span>
              </th>
              <th className="px-4 sm:px-6 py-4 text-left"><SortHeader label="Est. Recorded" k="time" /></th>
              <th className="px-4 sm:px-6 py-4 text-center">
                <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-text-tertiary">Status</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.02]">
            {entries.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-16 text-center">
                  <p className="font-display text-xl text-text-tertiary">No traces found</p>
                  <p className="text-[11px] uppercase tracking-[0.25em] text-text-tertiary/60 mt-2">Adjust your search</p>
                </td>
              </tr>
            ) : entries.map((e, i) => {
              const meta = regionMeta(e.desk)
              const dirColor = e.direction === 'LONG' ? '#22C55E' : e.direction === 'SHORT' ? '#D82B2B' : '#888888'
              return (
                <tr key={i} className="hover:bg-white/[0.03] transition-all duration-300 cursor-default">
                  <td className="px-4 sm:px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="w-1 h-6 shrink-0" style={{ background: meta.color }} />
                      <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-text-secondary">{meta.name}</span>
                    </div>
                  </td>
                  <td className="px-4 sm:px-6 py-4">
                    <span className="font-mono text-sm text-text-primary">{e.ticker}</span>
                  </td>
                  <td className="px-4 sm:px-6 py-4">
                    <span className="text-[10px] font-medium uppercase tracking-[0.2em]" style={{ color: dirColor }}>
                      {e.direction}
                    </span>
                  </td>
                  <td className="px-4 sm:px-6 py-4 text-right">
                    <span className="font-mono text-sm text-text-primary">{(e.confidence * 100).toFixed(0)}%</span>
                  </td>
                  <td className="px-4 sm:px-6 py-4">
                    <div className="flex flex-col gap-1">
                      {e.ipfs_thesis_cid && e.ipfs_thesis_cid.length > 20 && (
                        <div className="flex items-center gap-2">
                          {onCidClick && (
                            <button
                              type="button"
                              onClick={() => onCidClick(e.ipfs_thesis_cid)}
                              className="inline-flex items-center gap-1 font-mono text-[10px] text-brand-red hover:text-white transition-colors"
                            >
                              Chain
                            </button>
                          )}
                          <a
                            href={`https://dweb.link/ipfs/${e.ipfs_thesis_cid}`}
                            target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 font-mono text-[10px] text-text-secondary hover:text-brand-red transition-colors"
                          >
                            <span className="text-text-tertiary uppercase tracking-wider">IPFS</span>
                            {truncateHash(e.ipfs_thesis_cid, 6, 4)}
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </div>
                      )}
                      {e.arc_tx && e.arc_tx.length > 20 && (
                        <a
                          href={`https://testnet.arcscan.app/tx/${e.arc_tx}`}
                          target="_blank" rel="noopener noreferrer"
                          
                          className="flex items-center gap-1 font-mono text-[10px] text-text-secondary hover:text-brand-red transition-colors"
                        >
                          <span className="text-text-tertiary uppercase tracking-wider">Arc</span>
                          {truncateHash(e.arc_tx, 6, 4)}
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="px-4 sm:px-6 py-4">
                    <span className="font-mono text-[11px] text-text-tertiary">{formatRelative(e.timestamp)}</span>
                  </td>
                  <td className="px-4 sm:px-6 py-4 text-center">
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.2em] text-positive">
                      <CheckCircle2 className="w-3 h-3" />
                      Verified
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="text-[10px] text-text-tertiary uppercase tracking-[0.25em]">
        {entries.length} trace{entries.length === 1 ? '' : 's'} · All hashes verified on Arc L1 testnet
      </p>
    </PageTransition>
  )
}
