'use client'

import React from 'react'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { useAccount } from 'wagmi'

const STORAGE_KEY = 'rosetta_onboarded'

interface OnboardingModalProps {
  isSignedIn: boolean
}

const slides = [
  {
    title: 'What is Rosetta Alpha?',
    subtitle: 'All Weather Intelligence',
    content:
      'Inspired by Ray Dalio\'s All Weather portfolio strategy, Rosetta Alpha uses five AI agents — each reasoning in their native language — to produce structured investment theses across global markets.',
    icon: '1',
  },
  {
    title: 'How it works',
    subtitle: '5 Agents → Arc Verification',
    content:
      'Each agent analyzes its region (US, China, EU, Japan, Crypto), produces a thesis with confidence scores, then hashes the reasoning trace on Arc L1 for permanent, tamper-proof provenance.',
    icon: '2',
  },
  {
    title: 'Connect your wallet',
    subtitle: 'Arc Testnet is free',
    content:
      'Connect a wallet to stake on predictions, earn USDC rewards, and track your portfolio. Arc Testnet uses free USDC for gas — no real money needed.',
    icon: '3',
    isConnectSlide: true,
  },
]

export function OnboardingModal({ isSignedIn }: OnboardingModalProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [currentSlide, setCurrentSlide] = React.useState(0)
  const { openConnectModal } = useConnectModal()
  const { isConnected } = useAccount()
  const handleConnectClick = () => {
    sessionStorage.removeItem('rosetta.wallet.manualDisconnect')
    openConnectModal?.()
  }

  React.useEffect(() => {
    // Only show if signed in, wallet not connected, and not previously dismissed
    if (isSignedIn && !isConnected) {
      const dismissed = localStorage.getItem(STORAGE_KEY)
      if (!dismissed) {
        setIsOpen(true)
      }
    }
  }, [isSignedIn, isConnected])

  // Close modal when wallet connects
  React.useEffect(() => {
    if (isConnected && isOpen) {
      localStorage.setItem(STORAGE_KEY, 'true')
      setIsOpen(false)
    }
  }, [isConnected, isOpen])

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true')
    setIsOpen(false)
  }

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1)
    }
  }

  const handleBack = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1)
    }
  }

  if (!isOpen) return null

  const slide = slides[currentSlide]

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleDismiss}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md mx-4 bg-bg-secondary border border-border rounded-2xl overflow-hidden shadow-2xl">
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 pt-6">
          {slides.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                i === currentSlide
                  ? 'bg-brand-red w-6'
                  : i < currentSlide
                  ? 'bg-brand-red/50'
                  : 'bg-border-strong'
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="px-8 py-8 text-center">
          <span className="text-4xl mb-4 block">{slide.icon}</span>
          <p className="text-[10px] uppercase tracking-[0.3em] text-brand-red mb-2">
            {slide.subtitle}
          </p>
          <h2 className="font-display text-2xl text-text-primary mb-4">
            {slide.title}
          </h2>
          <p className="text-text-secondary text-sm leading-relaxed">
            {slide.content}
          </p>

          {/* Connect button on last slide */}
          {slide.isConnectSlide && (
            <button
              onClick={handleConnectClick}
              className="
                mt-6 inline-flex items-center gap-2 px-6 py-3
                bg-brand-red/10 border border-brand-red/40 rounded-lg
                text-text-primary text-sm font-medium
                hover:bg-brand-red/20 hover:border-brand-red/60
                transition-all duration-300
                hover:shadow-[0_0_30px_rgba(201,168,76,0.3)]
              "
            >
              <span className="w-2 h-2 rounded-full bg-brand-red" />
              Connect Wallet
            </button>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between px-8 pb-6">
          <button
            onClick={handleBack}
            className={`text-xs text-text-tertiary hover:text-text-primary transition-colors ${
              currentSlide === 0 ? 'invisible' : ''
            }`}
          >
            ← Back
          </button>

          {currentSlide < slides.length - 1 ? (
            <button
              onClick={handleNext}
              className="text-xs text-brand-red hover:text-brand-red/80 font-medium transition-colors"
            >
              Next →
            </button>
          ) : (
            <button
              onClick={handleDismiss}
              className="text-xs text-text-tertiary hover:text-text-primary transition-colors"
            >
              Skip for now
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
