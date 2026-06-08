'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Wallet, CreditCard, Loader2, AlertCircle, Check, ArrowRight, Shield, Zap } from 'lucide-react'
import { useAccount, useBalance, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseUnits } from 'viem'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { CryptoOnrampWidget } from './CryptoOnrampModal'
import { Tier, TIER_LABELS, TIER_PRICES_USD, ARC_USDC, SUBSCRIPTION_CONTRACT, SUBSCRIPTION_ABI, ERC20_APPROVE_ABI } from '@/lib/subscription'
import { arcTestnet } from '@/lib/chains'

interface SubscribeModalProps {
  tier: Tier
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

type PaymentMethod = 'select' | 'wallet' | 'card'

export function SubscribeModal({ tier, isOpen, onClose, onSuccess }: SubscribeModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('select')
  const [cardSuccess, setCardSuccess] = useState(false)

  const { address, isConnected, chainId } = useAccount()
  const { data: balance } = useBalance({ address, chainId: arcTestnet.id })
  const { openConnectModal } = useConnectModal()

  const { writeContract: approveUsdc, data: approveHash } = useWriteContract()
  const { writeContract: subscribe, data: subscribeHash } = useWriteContract()
  const { isLoading: isApproving } = useWaitForTransactionReceipt({ hash: approveHash })
  const { isLoading: isSubscribing } = useWaitForTransactionReceipt({ hash: subscribeHash })

  // Wallet payment step: idle → approving → subscribing → done
  const [walletStep, setWalletStep] = useState<'idle' | 'approving' | 'subscribing' | 'done' | 'error'>('idle')
  const [walletError, setWalletError] = useState<string | null>(null)
  const onSuccessRef = useRef(onSuccess)
  onSuccessRef.current = onSuccess
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const tierRef = useRef(tier)
  tierRef.current = tier

  const isPending = isApproving || isSubscribing || walletStep === 'approving' || walletStep === 'subscribing'
  const isWrongNetwork = isConnected && chainId !== arcTestnet.id

  const price = TIER_PRICES_USD[tier]
  const tierName = TIER_LABELS[tier]
  const balanceNum = balance ? parseFloat(balance.formatted) : 0
  const hasInsufficientBalance = balanceNum < price

  const statusMessage =
    walletStep === 'approving' ? 'Approving USDC spend...' :
    walletStep === 'subscribing' ? 'Confirming transaction on Arc...' :
    ''

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEsc)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  useEffect(() => {
    if (!isOpen) {
      setPaymentMethod('select')
      setCardSuccess(false)
      setWalletStep('idle')
      setWalletError(null)
    }
  }, [isOpen])

  // Step 2: After approval confirms, trigger subscribe
  useEffect(() => {
    if (walletStep !== 'approving' || !approveHash) return
    if (isApproving) return // still waiting for receipt

    // Approval mined — now subscribe
    setWalletStep('subscribing')
    try {
      subscribe({
        address: SUBSCRIPTION_CONTRACT,
        abi: SUBSCRIPTION_ABI,
        functionName: 'subscribe',
        args: [tierRef.current],
      })
    } catch (err) {
      setWalletStep('error')
      setWalletError(err instanceof Error ? err.message : 'Subscribe transaction failed')
    }
  }, [walletStep, approveHash, isApproving, subscribe])

  // Step 3: After subscribe confirms, complete
  useEffect(() => {
    if (walletStep !== 'subscribing' || !subscribeHash) return
    if (isSubscribing) return // still waiting for receipt

    setWalletStep('done')
    onSuccessRef.current()
    const timer = setTimeout(() => onCloseRef.current(), 1500)
    return () => clearTimeout(timer)
  }, [walletStep, subscribeHash, isSubscribing])

  async function handleWalletSubscribe() {
    if (!isConnected || !address || tier === Tier.None || isPending) return

    setWalletStep('approving')
    setWalletError(null)

    const priceWei = parseUnits(price.toString(), 6)

    try {
      approveUsdc({
        address: ARC_USDC,
        abi: ERC20_APPROVE_ABI,
        functionName: 'approve',
        args: [SUBSCRIPTION_CONTRACT, priceWei],
      })
    } catch (err) {
      setWalletStep('error')
      setWalletError(err instanceof Error ? err.message : 'Approval transaction failed')
    }
  }

  const handleCardSuccess = () => {
    setCardSuccess(true)
    setTimeout(() => {
      onSuccess()
      onClose()
    }, 3000)
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-[520px] bg-[#0A0A0A] border border-border rounded-xl shadow-2xl overflow-hidden outline-none"
          role="dialog"
          aria-labelledby="subscribe-modal-title"
          aria-describedby="subscribe-modal-desc"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-text-tertiary hover:text-text-primary transition-colors rounded-lg hover:bg-white/5 z-10"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="p-6">
            {paymentMethod === 'select' ? (
              <PaymentMethodSelector
                tier={tier}
                tierName={tierName}
                price={price}
                isConnected={isConnected}
                onSelect={setPaymentMethod}
              />
            ) : paymentMethod === 'wallet' ? (
              <WalletPayment
                tier={tier}
                tierName={tierName}
                price={price}
                isConnected={isConnected}
                isWrongNetwork={isWrongNetwork}
                address={address}
                balance={balanceNum}
                hasInsufficientBalance={hasInsufficientBalance}
                isPending={isPending}
                statusMessage={statusMessage}
                walletStep={walletStep}
                walletError={walletError}
                onBack={() => { setPaymentMethod('select'); setWalletStep('idle'); setWalletError(null) }}
                onConnect={() => openConnectModal?.()}
                onSubscribe={handleWalletSubscribe}
                onSwitchToCard={() => { setPaymentMethod('card'); setWalletStep('idle'); setWalletError(null) }}
              />
            ) : (
              <CardPayment
                tier={tier}
                tierName={tierName}
                price={price}
                isConnected={isConnected}
                address={address || ''}
                isWrongNetwork={isWrongNetwork}
                cardSuccess={cardSuccess}
                onBack={() => setPaymentMethod('select')}
                onConnect={() => openConnectModal?.()}
                onSuccess={handleCardSuccess}
                onClose={onClose}
              />
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

interface PaymentMethodSelectorProps {
  tier: Tier
  tierName: string
  price: number
  isConnected: boolean
  onSelect: (method: PaymentMethod) => void
}

function PaymentMethodSelector({ tier, tierName, price, isConnected, onSelect }: PaymentMethodSelectorProps) {
  return (
    <div>
      <div className="mb-6">
        <h2 id="subscribe-modal-title" className="text-lg font-semibold text-text-primary">
          Subscribe to {tierName}
        </h2>
        <p id="subscribe-modal-desc" className="text-sm text-text-secondary mt-1">
          ${price}/month · Choose how you want to pay
        </p>
      </div>

      <div className="space-y-3">
        <button
          onClick={() => onSelect('wallet')}
          className="w-full p-4 bg-bg-secondary border border-border rounded-lg text-left hover:border-brand-red/50 hover:bg-brand-red/5 transition-all group"
        >
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-brand-red/10 flex items-center justify-center shrink-0 group-hover:bg-brand-red/20 transition-colors">
              <Wallet className="w-5 h-5 text-brand-red" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-text-primary">Pay with Wallet</span>
                <ArrowRight className="w-4 h-4 text-text-tertiary group-hover:text-brand-red transition-colors" />
              </div>
              <p className="text-xs text-text-secondary mt-1">
                {isConnected ? 'USDC on Arc Testnet' : 'Connect wallet first'}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-positive/10 text-positive text-[10px] font-medium">
                  <Zap className="w-3 h-3" />
                  Instant
                </span>
                <span className="text-[10px] text-text-tertiary">No fees</span>
              </div>
            </div>
          </div>
        </button>

        <button
          onClick={() => onSelect('card')}
          className="w-full p-4 bg-bg-secondary border border-border rounded-lg text-left hover:border-brand-red/50 hover:bg-brand-red/5 transition-all group"
        >
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-brand-red/10 flex items-center justify-center shrink-0 group-hover:bg-brand-red/20 transition-colors">
              <CreditCard className="w-5 h-5 text-brand-red" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-text-primary">Pay with Card</span>
                <ArrowRight className="w-4 h-4 text-text-tertiary group-hover:text-brand-red transition-colors" />
              </div>
              <p className="text-xs text-text-secondary mt-1">
                Credit or debit card via Stripe
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-red/10 text-brand-red text-[10px] font-medium">
                  <Shield className="w-3 h-3" />
                  Secure
                </span>
                <span className="text-[10px] text-text-tertiary">USDC delivered to wallet</span>
              </div>
            </div>
          </div>
        </button>
      </div>

      <p className="mt-4 text-[10px] text-text-tertiary text-center">
        Both methods deliver {price} USDC to your Arc wallet
      </p>
    </div>
  )
}

interface WalletPaymentProps {
  tier: Tier
  tierName: string
  price: number
  isConnected: boolean
  isWrongNetwork: boolean
  address: string | undefined
  balance: number
  hasInsufficientBalance: boolean
  isPending: boolean
  statusMessage: string
  walletStep: 'idle' | 'approving' | 'subscribing' | 'done' | 'error'
  walletError: string | null
  onBack: () => void
  onConnect: () => void
  onSubscribe: () => void
  onSwitchToCard: () => void
}

function WalletPayment({
  tier,
  tierName,
  price,
  isConnected,
  isWrongNetwork,
  address,
  balance,
  hasInsufficientBalance,
  isPending,
  statusMessage,
  walletStep,
  walletError,
  onBack,
  onConnect,
  onSubscribe,
  onSwitchToCard,
}: WalletPaymentProps) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="p-1 text-text-tertiary hover:text-text-primary transition-colors">
          <ArrowRight className="w-4 h-4 rotate-180" />
        </button>
        <div className="w-8 h-8 rounded-full bg-brand-red/10 flex items-center justify-center">
          <Wallet className="w-4 h-4 text-brand-red" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-text-primary">Pay with Wallet</h2>
          <p className="text-xs text-text-secondary">USDC on Arc Testnet</p>
        </div>
      </div>

      {!isConnected ? (
        <div className="text-center py-8">
          <div className="w-12 h-12 rounded-full bg-brand-red/10 flex items-center justify-center mx-auto mb-4">
            <Wallet className="w-6 h-6 text-brand-red" />
          </div>
          <p className="text-sm text-text-secondary mb-4">
            Connect your wallet to pay with USDC
          </p>
          <button
            onClick={onConnect}
            className="px-6 py-3 bg-brand-red text-white rounded-lg hover:bg-brand-red/90 transition-colors text-sm font-medium"
          >
            Connect Wallet
          </button>
          <p className="mt-4 text-xs text-text-tertiary">
            Don&apos;t have USDC?{' '}
            <button onClick={onSwitchToCard} className="text-brand-red hover:underline">
              Pay with card instead
            </button>
          </p>
        </div>
      ) : isWrongNetwork ? (
        <div className="text-center py-8">
          <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6 text-warning" />
          </div>
          <p className="text-sm text-text-secondary mb-4">
            Please switch to Arc Testnet
          </p>
          <p className="text-xs text-text-tertiary">
            Use your wallet&apos;s network selector
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-3 bg-bg-secondary rounded-lg border border-border space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">Wallet</span>
              <span className="text-text-primary font-mono text-xs">
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">Network</span>
              <span className="text-positive font-mono text-xs flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-positive" />
                Arc Testnet
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">USDC Balance</span>
              <span className={`font-mono text-xs ${hasInsufficientBalance ? 'text-negative' : 'text-text-primary'}`}>
                {balance.toFixed(2)} USDC
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">Cost</span>
              <span className="text-text-primary font-medium text-xs">{price}.00 USDC / month</span>
            </div>
          </div>

          {hasInsufficientBalance && (
            <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
              <p className="text-xs text-warning">
                Insufficient USDC.{' '}
                <button onClick={onSwitchToCard} className="underline hover:no-underline font-medium">
                  Pay with card
                </button>{' '}
                to buy USDC with your credit card.
              </p>
            </div>
          )}

          {walletStep === 'error' && walletError && (
            <div className="p-3 bg-negative/10 border border-negative/20 rounded-lg">
              <p className="text-xs text-negative">{walletError}</p>
            </div>
          )}

          {isPending && statusMessage && (
            <div className="flex items-center gap-2 p-3 bg-brand-red/10 border border-brand-red/20 rounded-lg">
              <Loader2 className="w-4 h-4 text-brand-red animate-spin" />
              <span className="text-xs text-text-primary">{statusMessage}</span>
            </div>
          )}

          <button
            onClick={onSubscribe}
            disabled={isPending || hasInsufficientBalance}
            className="w-full py-3 bg-brand-red text-white rounded-lg hover:bg-brand-red/90 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : (
              `Approve & Subscribe · ${price} USDC`
            )}
          </button>
        </div>
      )}
    </div>
  )
}

interface CardPaymentProps {
  tier: Tier
  tierName: string
  price: number
  isConnected: boolean
  address: string
  isWrongNetwork: boolean
  cardSuccess: boolean
  onBack: () => void
  onConnect: () => void
  onSuccess: () => void
  onClose: () => void
}

function CardPayment({
  tier,
  tierName,
  price,
  isConnected,
  address,
  isWrongNetwork,
  cardSuccess,
  onBack,
  onConnect,
  onSuccess,
  onClose,
}: CardPaymentProps) {
  const [showOnramp, setShowOnramp] = useState(false)

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="p-1 text-text-tertiary hover:text-text-primary transition-colors">
          <ArrowRight className="w-4 h-4 rotate-180" />
        </button>
        <div className="w-8 h-8 rounded-full bg-brand-red/10 flex items-center justify-center">
          <CreditCard className="w-4 h-4 text-brand-red" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-text-primary">Pay with Card</h2>
          <p className="text-xs text-text-secondary">Powered by Stripe</p>
        </div>
      </div>

      {!isConnected ? (
        <div className="text-center py-8">
          <div className="w-12 h-12 rounded-full bg-brand-red/10 flex items-center justify-center mx-auto mb-4">
            <CreditCard className="w-6 h-6 text-brand-red" />
          </div>
          <p className="text-sm text-text-secondary mb-4">
            Connect your wallet first — we need a destination address for your USDC
          </p>
          <button
            onClick={onConnect}
            className="px-6 py-3 bg-brand-red text-white rounded-lg hover:bg-brand-red/90 transition-colors text-sm font-medium"
          >
            Connect Wallet
          </button>
          <p className="mt-4 text-xs text-text-tertiary">
            Already have USDC?{' '}
            <button onClick={onBack} className="text-brand-red hover:underline">
              Pay with wallet instead
            </button>
          </p>
        </div>
      ) : isWrongNetwork ? (
        <div className="text-center py-8">
          <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6 text-warning" />
          </div>
          <p className="text-sm text-text-secondary mb-4">
            Please switch to Arc Testnet
          </p>
        </div>
      ) : cardSuccess ? (
        <div className="text-center py-8">
          <div className="w-12 h-12 rounded-full bg-positive/10 flex items-center justify-center mx-auto mb-4">
            <Check className="w-6 h-6 text-positive" />
          </div>
          <p className="text-sm text-text-primary mb-2">Subscribed!</p>
          <p className="text-xs text-text-secondary">USDC received on Arc. Closing...</p>
        </div>
      ) : showOnramp ? (
        <CryptoOnrampWidget
          tier={tier}
          walletAddress={address}
          onSuccess={onSuccess}
          onClose={onClose}
        />
      ) : (
        <div className="space-y-4">
          <div className="p-3 bg-bg-secondary rounded-lg border border-border space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">You pay</span>
              <span className="text-text-primary font-semibold">${price}.00 USD</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">You receive</span>
              <span className="text-positive font-mono text-xs">{price} USDC</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">Delivered to</span>
              <span className="text-text-primary font-mono text-xs">
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">Network</span>
              <span className="text-positive font-mono text-xs flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-positive" />
                Arc Testnet
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 bg-bg-secondary rounded-lg border border-border">
            <Shield className="w-4 h-4 text-brand-red" />
            <span className="text-[10px] text-text-secondary">
              Powered by Stripe · 256-bit encryption · PCI compliant
            </span>
          </div>

          <button
            onClick={() => setShowOnramp(true)}
            className="w-full py-3 bg-brand-red text-white rounded-lg hover:bg-brand-red/90 transition-colors text-sm font-medium flex items-center justify-center gap-2"
          >
            <CreditCard className="w-4 h-4" />
            Continue to Stripe
          </button>
        </div>
      )}
    </div>
  )
}
