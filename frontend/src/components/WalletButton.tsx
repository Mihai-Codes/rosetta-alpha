'use client'

import { useAccount, useBalance, useDisconnect, useSwitchChain } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { arcTestnet } from '@/lib/wagmi'
import React from 'react'

const ARC_CHAIN_ID = arcTestnet.id

/** Truncate address: 0x1234...abcd */
function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function WalletButton() {
  const { address, isConnected, chainId } = useAccount()
  const { disconnect } = useDisconnect()
  const { openConnectModal } = useConnectModal()
  const { switchChain } = useSwitchChain()
  const [dropdownOpen, setDropdownOpen] = React.useState(false)
  const [wrongNetworkBanner, setWrongNetworkBanner] = React.useState(false)

  // Auto-prompt switch to Arc Testnet when wallet connects on wrong chain
  React.useEffect(() => {
    if (!isConnected || !chainId) return
    if (chainId !== ARC_CHAIN_ID) {
      switchChain(
        { chainId: ARC_CHAIN_ID },
        {
          onError: () => setWrongNetworkBanner(true),
        }
      )
    } else {
      setWrongNetworkBanner(false)
    }
  }, [isConnected, chainId, switchChain])

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
      <button
        onClick={openConnectModal}
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
