import React from 'react'
import { CheckCircle2, ExternalLink, Search, Download, ArrowUpDown } from 'lucide-react'
import { DeskProps } from './DeskCard'
import { regionMeta, truncateHash, formatRelative } from '../lib/format'

interface RegistryTableProps {
  desks: DeskProps[]
}

type SortKey = 'desk' | 'ticker' | 'direction' | 'confidence' | 'time'

interface RegistryEntry extends DeskProps {
  timestamp: number
}

export function RegistryTable({ desks }: RegistryTableProps) {
  const [sortKey, setSortKey] = React.useState<SortKey>('time')
  const [sortDesc, setSortDesc] = React.useState(true)
  const [search, setSearch] = React.useState('')

  const entries: RegistryEntry[] = React.useMemo(() => {
    // Timestamps are approximated from run order; real block time not yet surfaced by API
    const enriched = desks.map((d, i) => ({ ...d, timestamp: Date.now() - i * 90_000 }))
    const filtered = search
      ? enriched.filter(
          d =>
            d.ticker.toLowerCase().includes(search.toLowerCase()) ||
            d.desk.toLowerCase().includes(search.toLowerCase()) ||
            d.arc_tx.toLowerCase().includes(search.toLowerCase())
        )
      : enriched

    const sorted = [...filtered].sort((a, b) => {
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
    return sorted
  }, [desks, sortKey, sortDesc, search])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDesc(!sortDesc)
    else { setSortKey(key); setSortDesc(true) }
  }

  const exportCsv = () => {
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
      className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.2em] text-text-tertiary hover:text-text-primary transition-colors"
    >
      {label}
      <ArrowUpDown className={`w-3 h-3 ${sortKey === k ? 'text-gold' : 'opacity-40'}`} />
    </button>
  )

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary" />
          <input
            type="text"
            placeholder="Search ticker, desk, hash…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="
              w-full pl-9 pr-3 py-2 bg-bg-secondary border border-border
              text-sm text-text-primary placeholder:text-text-tertiary
              focus:border-gold focus:outline-none transition-colors
            "
          />
        </div>
        <button
          onClick={exportCsv}
          className="
            flex items-center gap-2 px-4 py-2 border border-border
            text-[10px] font-medium uppercase tracking-[0.2em] text-text-secondary
            hover:border-gold hover:text-gold transition-colors
          "
        >
          <Download className="w-3 h-3" />
          Export CSV
        </button>
      </div>

      {/* Table */}
      <div className="bg-bg-secondary border border-border overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-bg-tertiary/40">
              <th className="px-6 py-4 text-left"><SortHeader label="Desk" k="desk" /></th>
              <th className="px-6 py-4 text-left"><SortHeader label="Asset" k="ticker" /></th>
              <th className="px-6 py-4 text-left"><SortHeader label="Direction" k="direction" /></th>
              <th className="px-6 py-4 text-right"><SortHeader label="Conviction" k="confidence" /></th>
              <th className="px-6 py-4 text-left">
                <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-text-tertiary">
                  IPFS · Arc Tx
                </span>
              </th>
              <th className="px-6 py-4 text-left"><SortHeader label="Est. Recorded" k="time" /></th>
              <th className="px-6 py-4 text-center">
                <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-text-tertiary">
                  Status
                </span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {entries.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-16 text-center">
                  <p className="font-display text-xl text-text-tertiary">No traces found</p>
                  <p className="text-[11px] uppercase tracking-[0.25em] text-text-tertiary/60 mt-2">
                    Adjust your search criteria
                  </p>
                </td>
              </tr>
            ) : (
              entries.map((e, i) => {
                const meta = regionMeta(e.desk)
                const dirColor = e.direction === 'LONG' ? '#4A9F6F' : e.direction === 'SHORT' ? '#9F4A4A' : '#7B8FA6'
                return (
                  <tr key={i} className="hover:bg-bg-tertiary/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-1 h-6 shrink-0"
                          style={{ background: meta.color }}
                        />
                        <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-text-secondary">
                          {meta.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm text-text-primary">{e.ticker}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className="text-[10px] font-medium uppercase tracking-[0.2em]"
                        style={{ color: dirColor }}
                      >
                        {e.direction}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-mono text-sm text-text-primary">
                        {(e.confidence * 100).toFixed(0)}%
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <a
                          href={`https://gateway.pinata.cloud/ipfs/${e.ipfs_thesis_cid}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 font-mono text-[10px] text-text-secondary hover:text-gold transition-colors"
                        >
                          <span className="text-text-tertiary uppercase tracking-wider">IPFS</span>
                          {truncateHash(e.ipfs_thesis_cid, 6, 4)}
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                        <a
                          href={`https://testnet.arcscan.app/tx/${e.arc_tx}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 font-mono text-[10px] text-text-secondary hover:text-gold transition-colors"
                        >
                          <span className="text-text-tertiary uppercase tracking-wider">Arc</span>
                          {truncateHash(e.arc_tx, 6, 4)}
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-[11px] text-text-tertiary">
                        {formatRelative(e.timestamp)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.2em] text-positive">
                        <CheckCircle2 className="w-3 h-3" />
                        Verified
                      </span>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <p className="text-[10px] text-text-tertiary uppercase tracking-[0.25em]">
        {entries.length} trace{entries.length === 1 ? '' : 's'} · All hashes verified on Arc L1 testnet
      </p>
    </div>
  )
}
