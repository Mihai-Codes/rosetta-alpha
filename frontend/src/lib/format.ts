// Formatting utilities — institutional precision

export function formatPercent(n: number, decimals = 0): string {
  return `${(n * 100).toFixed(decimals)}%`
}

export function formatNumber(n: number, decimals = 2): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n)
}

export function truncateHash(hash: string, head = 6, tail = 4): string {
  if (!hash || hash.length < head + tail + 2) return hash
  return `${hash.slice(0, head)}…${hash.slice(-tail)}`
}

export function formatTime(date: Date | string | number): string {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export function formatRelative(date: Date | string | number): string {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date
  const diff = Math.floor((Date.now() - d.getTime()) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export const REGION_META: Record<string, { name: string; flag: string; color: string }> = {
  us:     { name: 'United States', flag: 'US', color: '#D82B2B' },
  cn:     { name: 'China',         flag: 'CN', color: '#C9A84C' },
  eu:     { name: 'Europe',        flag: 'EU', color: '#F0EDE8' },
  jp:     { name: 'Japan',         flag: 'JP', color: '#7B8FA6' },
  crypto: { name: 'Digital Assets', flag: 'DA', color: '#2A2A38' },
}

export function regionMeta(desk: string) {
  return REGION_META[desk.toLowerCase()] ?? { name: desk, flag: '◆', color: '#A09C94' }
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
