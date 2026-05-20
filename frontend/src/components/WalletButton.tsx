'use client'

import { useAccount, useBalance, useConnect, useConnectors, useDisconnect, useSwitchChain } from 'wagmi'
import { arcTestnet } from '@/lib/wagmi'
import React from 'react'

const ARC_CHAIN_ID = arcTestnet.id

/** Truncate address: 0x1234...abcd */
function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

/** Detect if a wallet extension is available via window globals */
function isWalletInstalled(connectorId: string): boolean {
  if (typeof window === 'undefined') return false
  const eth = (window as unknown as Record<string, unknown>).ethereum as Record<string, unknown> | undefined
  switch (connectorId) {
    case 'metaMaskWallet':
      return !!(eth?.isMetaMask && !eth?.isBraveWallet)
    case 'braveWallet':
      return !!(eth?.isBraveWallet)
    case 'okxWallet':
      return !!(
        (window as unknown as Record<string, unknown>).okxwallet ||
        (eth?.isOkxWallet) ||
        (eth?.isOKExWallet)
      )
    case 'coinbaseWallet':
      return !!(eth?.isCoinbaseWallet || (window as unknown as Record<string, unknown>).coinbaseWalletExtension)
    case 'injectedWallet':
      // Show "Browser Wallet" only if window.ethereum exists and it's not already claimed
      return !!(eth && !eth.isMetaMask && !eth.isBraveWallet && !eth.isOkxWallet && !eth.isCoinbaseWallet)
    default:
      return false
  }
}

const DOWNLOAD_URLS: Record<string, string> = {
  metaMaskWallet: 'https://metamask.io/download/',
  okxWallet: 'https://www.okx.com/web3/wallet',
  coinbaseWallet: 'https://www.coinbase.com/wallet/downloads',
}

/** Custom connect modal — bypasses RainbowKit's WalletConnect verify iframe */
function ConnectModal({ onClose }: { onClose: () => void }) {
  const connectors = useConnectors()
  const { connect, isPending, variables } = useConnect()
  const [error, setError] = React.useState<string | null>(null)

  const handleConnect = (connector: ReturnType<typeof useConnectors>[number]) => {
    setError(null)
    connect(
      { connector, chainId: ARC_CHAIN_ID },
      {
        onSuccess: onClose,
        onError: (err) => {
          const msg = err instanceof Error ? err.message : String(err)
          if (!msg.toLowerCase().includes('rejected') && !msg.toLowerCase().includes('denied')) {
            setError(msg.split('\n')[0].substring(0, 100))
          }
        },
      }
    )
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Modal */}
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[340px] solid-panel rounded-2xl border border-border-strong shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-text-primary">
            Connect Wallet
          </span>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary transition-colors text-lg leading-none"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Wallet list */}
        <div className="p-3 flex flex-col gap-1">
          {connectors.map((connector) => {
            const installed = isWalletInstalled(connector.id)
            const isConnecting = isPending && variables?.connector === connector
            const downloadUrl = DOWNLOAD_URLS[connector.id]
            const showInstallLink = !installed && downloadUrl

            return (
              <div
                key={connector.uid}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-bg-tertiary transition-colors group"
              >
                {/* Icon */}
                {connector.icon ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={connector.icon}
                    alt={connector.name}
                    className="w-9 h-9 rounded-xl shrink-0"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-xl bg-bg-secondary border border-border flex items-center justify-center text-lg shrink-0">
                    🔗
                  </div>
                )}

                {/* Name + status */}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-text-primary">{connector.name}</div>
                  {showInstallLink ? (
                    <div className="text-[10px] text-text-muted">Not installed</div>
                  ) : (
                    <div className="text-[10px] text-text-muted">
                      {installed ? 'Ready' : 'Available'}
                    </div>
                  )}
                </div>

                {/* Action */}
                {showInstallLink ? (
                  <a
                    href={downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-accent-gold hover:underline uppercase tracking-wider shrink-0"
                  >
                    Install
                  </a>
                ) : (
                  <button
                    onClick={() => handleConnect(connector)}
                    disabled={isPending}
                    className="text-[10px] font-medium uppercase tracking-wider text-accent-gold hover:text-white transition-colors disabled:opacity-50 shrink-0"
                  >
                    {isConnecting ? (
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-accent-gold animate-pulse" />
                        Connecting
                      </span>
                    ) : (
                      'Connect'
                    )}
                  </button>
                )}
              </div>
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
          Arc Testnet · Chain ID {ARC_CHAIN_ID}
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

  // Auto-prompt switch to Arc Testnet when wallet connects on wrong chain.
  // switchAttempted ref prevents infinite loop when switchChain itself triggers chainId change.
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
    switchChain(
      { chainId: ARC_CHAIN_ID },
      { onError: () => setWrongNetworkBanner(true) }
    )
  }, [isConnected, chainId]) // intentionally omit switchChain to avoid loop

  const { data: balance } = useBalance({
    address,
    chainId: arcTestnet.id,
  })

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address)
      setDropdownOpen(false)
    }
  }

  const viewOnExplorer = () => {
    if (address) {
      window.open(
        `${arcTestnet.blockExplorers?.default.url ?? 'https://testnet.arcscan.app'}/address/${address}`,
        '_blank'
      )
      setDropdownOpen(false)
    }
  }

  if (wrongNetworkBanner && isConnected) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#E8A020]/50 bg-[#E8A020]/10 text-[10px] text-[#E8A020] font-medium uppercase tracking-[0.15em]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#E8A020] animate-pulse shrink-0" />
          <span className="hidden sm:inline">Switch to Arc Testnet</span>
          <button
            onClick={() => switchChain({ chainId: ARC_CHAIN_ID }, { onError: () => {} })}
            className="underline hover:no-underline transition-all"
          >
            Switch
          </button>
          <button
            onClick={() => setWrongNetworkBanner(false)}
            className="ml-1 hover:text-white transition-colors"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      </div>
    )
  }

  if (!isConnected) {
    return (
      <>
        <button
          onClick={() => setConnectModalOpen(true)}
          className="
            flex items-center gap-2 px-5 py-2
            solid-panel rounded-full
            text-text-primary text-[10px] font-medium uppercase tracking-[0.2em]
            transition-all duration-300
            border border-accent-gold/40
            hover:border-accent-gold hover:shadow-[0_0_30px_rgba(201,168,76,0.3)]
          "
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
        className="
          flex items-center gap-2 px-4 py-2
          solid-panel rounded-full
          text-text-primary text-[10px] font-medium tracking-wide
          transition-all duration-300
          border border-accent-gold/30
          hover:border-accent-gold/60
        "
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
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setDropdownOpen(false)}
          />
          {/* Dropdown */}
          <div className="absolute right-0 top-full mt-2 z-50 w-52 solid-panel rounded-xl border border-border-strong overflow-hidden shadow-2xl">
            <button
              onClick={copyAddress}
              className="w-full px-4 py-3 text-left text-xs text-text-primary hover:bg-bg-tertiary transition-colors"
            >
              Copy Address
            </button>
            <button
              onClick={viewOnExplorer}
              className="w-full px-4 py-3 text-left text-xs text-text-primary hover:bg-bg-tertiary transition-colors border-t border-border"
            >
              View on Arc Explorer
            </button>
            <button
              onClick={() => {
                disconnect()
                setDropdownOpen(false)
                // Clear wagmi cookieStorage so the wallet doesn't auto-reconnect on refresh
                document.cookie.split(';').forEach(c => {
                  if (c.trim().startsWith('wagmi')) {
                    document.cookie = c.trim().split('=')[0] + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
                  }
                })
                // Hard reload to fully reset wagmi state
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
