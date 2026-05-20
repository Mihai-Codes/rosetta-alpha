'use client'

import { useAccount, useBalance, useConnect, useConnectors, useDisconnect, useSwitchChain } from 'wagmi'
import { arcTestnet } from '@/lib/wagmi'
import React from 'react'

const ARC_CHAIN_ID = arcTestnet.id

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

/**
 * Known download URLs for wallets that may not be installed.
 * Only shown when the connector has no provider available.
 */
const DOWNLOAD_URLS: Record<string, string> = {
  metaMaskWallet: 'https://metamask.io/download/',
  okxWallet: 'https://www.okx.com/web3/wallet',
  coinbaseWallet: 'https://www.coinbase.com/wallet/downloads',
}

/**
 * Custom ConnectModal — directly calls wagmi useConnect() per connector.
 * This completely bypasses RainbowKit's ConnectModal and its embedded
 * WalletConnect verify iframe (verify.walletconnect.com) which causes
 * "this page couldn't load" on unregistered domains.
 *
 * With multiInjectedProviderDiscovery=false in wagmi config, useConnectors()
 * returns only our 5 explicitly registered connectors — no duplicates.
 */
function ConnectModal({ onClose }: { onClose: () => void }) {
  const connectors = useConnectors()
  const { connect, isPending, variables } = useConnect({
    mutation: {
      onSuccess: onClose,
      onError: (err) => {
        const msg = err instanceof Error ? err.message : String(err)
        const isReject = msg.toLowerCase().includes('reject') ||
          msg.toLowerCase().includes('denied') ||
          msg.toLowerCase().includes('4001')
        if (!isReject) setError(msg.split('\n')[0].substring(0, 120))
      },
    }
  })
  const [error, setError] = React.useState<string | null>(null)

  // Filter to only show connectors that are relevant (skip WalletConnect-only ones)
  const visibleConnectors = connectors.filter(
    (c) => !c.id.toLowerCase().includes('walletconnect')
  )

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[340px] solid-panel rounded-2xl border border-border-strong shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-text-primary">
            Connect Wallet
          </span>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors" aria-label="Close">
            ✕
          </button>
        </div>

        {/* Wallet list */}
        <div className="p-3 flex flex-col gap-1">
          {visibleConnectors.map((connector) => {
            const isConnecting = isPending && variables?.connector === connector
            const downloadUrl = DOWNLOAD_URLS[connector.id]

            return (
              <button
                key={connector.uid}
                onClick={() => {
                  setError(null)
                  connect({ connector, chainId: ARC_CHAIN_ID })
                }}
                disabled={isPending}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-bg-tertiary transition-colors text-left w-full disabled:opacity-60 group"
              >
                {/* Icon */}
                {connector.icon ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={connector.icon} alt={connector.name} className="w-9 h-9 rounded-xl shrink-0" />
                ) : (
                  <div className="w-9 h-9 rounded-xl bg-bg-secondary border border-border flex items-center justify-center text-base shrink-0">
                    🔗
                  </div>
                )}

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-text-primary">{connector.name}</div>
                  <div className="text-[10px] text-text-muted">
                    {isConnecting ? 'Connecting…' : 'Click to connect'}
                  </div>
                </div>

                {/* Status indicator */}
                {isConnecting ? (
                  <span className="w-2 h-2 rounded-full bg-accent-gold animate-pulse shrink-0" />
                ) : downloadUrl ? (
                  <a
                    href={downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-[10px] text-text-muted hover:text-accent-gold uppercase tracking-wider shrink-0 transition-colors"
                  >
                    Install
                  </a>
                ) : (
                  <span className="text-text-muted group-hover:text-text-primary transition-colors shrink-0">›</span>
                )}
              </button>
            )
          })}
        </div>

        {/* Error */}
        {error && (
          <div className="mx-3 mb-3 px-3 py-2 rounded-lg bg-negative/10 border border-negative/30 text-[10px] text-negative">
            {error}
          </div>
        )}

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border text-[10px] text-text-muted text-center">
          Arc Testnet · Chain {ARC_CHAIN_ID}
        </div>
      </div>
    </>
  )
}

export function WalletButton() {
  const { address, isConnected, chainId } = useAccount()
  const { disconnect } = useDisconnect()
  const { switchChain } = useSwitchChain()
  const [dropdownOpen, setDropdownOpen] = React.useState(false)
  const [connectModalOpen, setConnectModalOpen] = React.useState(false)
  const [wrongNetworkBanner, setWrongNetworkBanner] = React.useState(false)

  const switchAttempted = React.useRef(false)
  React.useEffect(() => {
    if (!isConnected || !chainId) {
      switchAttempted.current = false
      return
    }
    if (chainId === ARC_CHAIN_ID) {
      setWrongNetworkBanner(false)
      switchAttempted.current = false
      return
    }
    if (switchAttempted.current) return
    switchAttempted.current = true
    switchChain({ chainId: ARC_CHAIN_ID }, { onError: () => setWrongNetworkBanner(true) })
  }, [isConnected, chainId]) // intentionally omit switchChain

  const { data: balance } = useBalance({ address, chainId: arcTestnet.id })

  if (wrongNetworkBanner && isConnected) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#E8A020]/50 bg-[#E8A020]/10 text-[10px] text-[#E8A020] font-medium uppercase tracking-[0.15em]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#E8A020] animate-pulse shrink-0" />
        <span className="hidden sm:inline">Switch to Arc Testnet</span>
        <button onClick={() => switchChain({ chainId: ARC_CHAIN_ID }, { onError: () => {} })} className="underline hover:no-underline">
          Switch
        </button>
        <button onClick={() => setWrongNetworkBanner(false)} className="ml-1 hover:text-white transition-colors" aria-label="Dismiss">✕</button>
      </div>
    )
  }

  if (!isConnected) {
    return (
      <>
        <button
          onClick={() => setConnectModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2 solid-panel rounded-full text-text-primary text-[10px] font-medium uppercase tracking-[0.2em] transition-all duration-300 border border-accent-gold/40 hover:border-accent-gold hover:shadow-[0_0_30px_rgba(201,168,76,0.3)]"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-accent-gold" />
          <span className="hidden sm:inline">Connect Wallet</span>
          <span className="sm:hidden">Wallet</span>
        </button>
        {connectModalOpen && <ConnectModal onClose={() => setConnectModalOpen(false)} />}
      </>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="flex items-center gap-2 px-4 py-2 solid-panel rounded-full text-text-primary text-[10px] font-medium tracking-wide transition-all duration-300 border border-accent-gold/30 hover:border-accent-gold/60"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-positive animate-pulse" />
        <span className="font-mono">{truncateAddress(address!)}</span>
        {balance && (
          <span className="text-text-secondary ml-1">
            {parseFloat(balance.formatted).toFixed(2)} USDC
          </span>
        )}
      </button>

      {dropdownOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-50 w-52 solid-panel rounded-xl border border-border-strong overflow-hidden shadow-2xl">
            <button
              onClick={() => { navigator.clipboard.writeText(address!); setDropdownOpen(false) }}
              className="w-full px-4 py-3 text-left text-xs text-text-primary hover:bg-bg-tertiary transition-colors"
            >
              Copy Address
            </button>
            <button
              onClick={() => {
                window.open(`${arcTestnet.blockExplorers?.default.url ?? 'https://testnet.arcscan.app'}/address/${address}`, '_blank')
                setDropdownOpen(false)
              }}
              className="w-full px-4 py-3 text-left text-xs text-text-primary hover:bg-bg-tertiary transition-colors border-t border-border"
            >
              View on Arc Explorer
            </button>
            <button
              onClick={() => {
                disconnect()
                setDropdownOpen(false)
                document.cookie.split(';').forEach(c => {
                  if (c.trim().startsWith('wagmi')) {
                    document.cookie = c.trim().split('=')[0] + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
                  }
                })
                window.location.reload()
              }}
              className="w-full px-4 py-3 text-left text-xs text-negative hover:bg-bg-tertiary transition-colors border-t border-border"
            >
              Disconnect
            </button>
          </div>
        </>
      )}
    </div>
  )
}
