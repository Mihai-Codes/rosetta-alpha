'use client'

import { useAccount, useBalance, useDisconnect, useConnectors, useSwitchChain } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { useRouter } from 'next/navigation'
import { arcTestnet } from '@/lib/chains'
import posthog from 'posthog-js'
import React from 'react'

const ARC_CHAIN_ID = arcTestnet.id

/** Truncate address: 0x1234...abcd */
function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function WalletButton() {
  const { address, isConnected, chainId, connector } = useAccount()
  const { disconnectAsync } = useDisconnect()
  const connectors = useConnectors()

  const handleDisconnect = async () => {
    setDropdownOpen(false)
    sessionStorage.setItem('rosetta.wallet.manualDisconnect', '1')

    // Step 1: Revoke browser-level wallet permissions via wallet_revokePermissions.
    // This is the ONLY way to truly prevent wallets from auto-reconnecting.
    // MetaMask, Brave, OKX and Coinbase all support this EIP-2255 method.
    // Without this, shimDisconnect only sets a flag that gets cleared when we wipe wagmi.store.
    const providers: any[] = []
    if (typeof window !== 'undefined') {
      const win = window as any
      if (win.ethereum) providers.push(win.ethereum)
      if (win.okxwallet && win.okxwallet !== win.ethereum) providers.push(win.okxwallet)
    }
    for (const provider of providers) {
      try {
        await provider.request({
          method: 'wallet_revokePermissions',
          params: [{ eth_accounts: {} }],
        })
      } catch { /* wallet may not support it — ignore */ }
    }

    // Step 2: Disconnect all wagmi connectors so shimDisconnect flags are written.
    for (const connector of connectors) {
      try { await disconnectAsync({ connector }) } catch { /* ignore */ }
    }

    // Step 3: Server-side cookie wipe via /api/disconnect, without full-page reload.
    await fetch('/api/disconnect?mode=json', { method: 'GET', credentials: 'include' })
    router.refresh()
  }
  const { openConnectModal } = useConnectModal()
  const { switchChain } = useSwitchChain()
  const router = useRouter()
  const handleConnectClick = () => {
    sessionStorage.removeItem('rosetta.wallet.manualDisconnect')
    posthog.capture('wallet_connect_attempt', { wallet_type: 'rainbowkit' })
    openConnectModal?.()
  }
  const [dropdownOpen, setDropdownOpen] = React.useState(false)
  const [wrongNetworkBanner, setWrongNetworkBanner] = React.useState(false)
  const [copiedAddress, setCopiedAddress] = React.useState(false)
  const [copiedDash, setCopiedDash] = React.useState(false)
  const isCoinbaseConnector =
    connector?.id === 'coinbaseWalletSDK' ||
    connector?.id === 'coinbaseWallet' ||
    connector?.id === 'baseAccount' ||
    connector?.id?.toLowerCase().includes('coinbase') ||
    connector?.id?.toLowerCase().includes('base')

  const addArcChain = async () => {
    const provider = await connector?.getProvider?.() as any
    const targetProvider = provider?.request ? provider : (window as any).ethereum
    if (!targetProvider?.request) return
    await targetProvider.request({
      method: 'wallet_addEthereumChain',
      params: [{
        chainId: '0x' + ARC_CHAIN_ID.toString(16),
        chainName: 'Arc Testnet',
        nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
        rpcUrls: ['https://rpc.testnet.arc.network'],
        blockExplorerUrls: ['https://testnet.arcscan.app'],
      }],
    })
  }

  // Auto-prompt switch to Arc Testnet when wallet connects on wrong chain.
  // switchAttempted ref prevents infinite loop when switchChain itself triggers chainId change.
  // Some wallets (Coinbase) don't support wallet_switchEthereumChain for custom chains,
  // so we fall back to wallet_addEthereumChain which works universally.
  const switchAttempted = React.useRef(false)
  React.useEffect(() => {
    if (!isConnected || !chainId) {
      switchAttempted.current = false
      return
    }
    if (chainId === ARC_CHAIN_ID) {
      setWrongNetworkBanner(false)
      switchAttempted.current = false
      posthog.capture('wallet_connected', { wallet_type: connector?.name ?? connector?.id ?? 'unknown', chain_id: chainId })
      return
    }
    if (switchAttempted.current) return
    switchAttempted.current = true
    posthog.capture('wrong_network_detected', { chain_id: chainId, connector: connector?.id })

    const trySwitch = async () => {
      try {
        if (isCoinbaseConnector) {
          // Coinbase may not support programmatic switch/add for this custom chain.
          // Avoid triggering wallet popups; show manual-switch banner instead.
          setWrongNetworkBanner(true)
          return
        }

        posthog.capture('network_switch_requested', { from_chain_id: chainId, to_chain_id: ARC_CHAIN_ID })
        await switchChain({ chainId: ARC_CHAIN_ID })
      } catch {
        try {
          await addArcChain()
        } catch {
          // Both switch methods failed — verify actual chain before showing banner.
          // Some wallets silently handle the switch and connect correctly.
          try {
            const provider = (window as any).ethereum
            const chainHex = await provider?.request({ method: 'eth_chainId' })
            const actualChainId = parseInt(chainHex, 16)
            if (actualChainId !== ARC_CHAIN_ID) {
              setWrongNetworkBanner(true)
            }
          } catch {
            setWrongNetworkBanner(true)
          }
        }
      }
    }
    trySwitch()
  }, [isConnected, chainId]) // intentionally omit switchChain to avoid loop

  const { data: balance } = useBalance({
    address,
    chainId: arcTestnet.id,
  })

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address)
      setCopiedAddress(true)
      setTimeout(() => { setCopiedAddress(false); setDropdownOpen(false); }, 1500)
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

  if (wrongNetworkBanner && isConnected && !isCoinbaseConnector) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#E8A020]/50 bg-[#E8A020]/10 text-[10px] text-[#E8A020] font-medium uppercase tracking-[0.15em]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#E8A020] animate-pulse shrink-0" />
          <span className="hidden sm:inline">Switch to Arc Testnet</span>
          <button
            onClick={async () => {
              if (isCoinbaseConnector) {
                window.open('https://www.coinbase.com/learn/wallet/How-to-add-custom-networks-Coinbase-Wallet', '_blank')
                return
              }
              switchChain({ chainId: ARC_CHAIN_ID }, { onError: () => {} })
            }}
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
        onClick={handleConnectClick}
        className="flex items-center gap-2 px-5 py-2 solid-panel rounded-full text-text-primary text-[10px] font-medium uppercase tracking-[0.2em] transition-all duration-300 hover:border-brand-red hover:bg-brand-red/5 hover:!shadow-[0_0_12px_rgba(216,43,43,0.5)] hover:button-pulse cursor-pointer"
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
        data-testid="wallet-connected-btn"
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
            <button onClick={copyAddress} className="relative w-full px-4 py-3 text-left text-xs text-text-primary hover:bg-bg-tertiary transition-colors flex justify-between items-center"><span>Copy Address</span>{copiedAddress && <span className="absolute right-2 px-2 py-0.5 bg-positive/20 text-positive text-[9px] uppercase tracking-widest border border-positive/50 rounded-none animate-in fade-in zoom-in duration-200">Copied!</span>}</button>
            <button
              onClick={viewOnExplorer}
              className="w-full px-4 py-3 text-left text-xs text-text-primary hover:bg-bg-tertiary transition-colors border-t border-border"
            >
              View on Arc Explorer
            </button>
            <button
              onClick={handleDisconnect}
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
