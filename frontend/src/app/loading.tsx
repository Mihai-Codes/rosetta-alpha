'use client'

import React from 'react'
import { Layout } from '@/components/Layout'

export default function LoadingPage() {
  return (
    <Layout activeTab="desks">
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 pb-16 pt-28 sm:pt-36 lg:pt-48">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 border-2 border-brand-red/30 border-t-brand-red rounded-full animate-spin"></div>
          </div>
          <h1 className="font-display text-4xl md:text-5xl text-text-primary mb-4">
            Loading
          </h1>
          <p className="text-text-secondary text-sm">
            Please wait while we prepare your experience
          </p>
        </div>
      </div>
    </Layout>
  )
}