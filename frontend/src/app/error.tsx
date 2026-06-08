'use client'

import React from 'react'
import { Layout } from '@/components/Layout'

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  return (
    <Layout activeTab="desks">
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 pb-16 pt-28 sm:pt-36 lg:pt-48">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full border-2 border-brand-red/30 flex items-center justify-center">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 8V12" stroke="#D82B2B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 16V16.01" stroke="#D82B2B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
          <h1 className="font-display text-4xl md:text-5xl text-text-primary mb-4">
            Something went wrong
          </h1>
          <p className="text-text-secondary text-sm mb-6 max-w-md mx-auto">
            {process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred. Please try again.'}
          </p>
          <button
            onClick={reset}
            className="px-8 py-3 border border-brand-red text-brand-red hover:bg-brand-red hover:text-white transition-colors text-sm font-medium uppercase tracking-wider"
          >
            Try Again
          </button>
        </div>
      </div>
    </Layout>
  )
}