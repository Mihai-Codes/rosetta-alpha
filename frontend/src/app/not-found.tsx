'use client'

import React from 'react'
import { Layout } from '@/components/Layout'
import Link from 'next/link'

export default function NotFoundPage() {
  return (
    <Layout activeTab="desks">
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 pb-16 pt-28 sm:pt-36 lg:pt-48">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full border-2 border-border flex items-center justify-center">
              <span className="font-mono text-2xl text-text-tertiary">404</span>
            </div>
          </div>
          <h1 className="font-display text-4xl md:text-5xl text-text-primary mb-4">
            Page not found
          </h1>
          <p className="text-text-secondary text-sm mb-6 max-w-md mx-auto">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <Link
            href="/"
            className="inline-block px-8 py-3 border border-brand-red text-brand-red hover:bg-brand-red hover:text-white transition-colors text-sm font-medium uppercase tracking-wider"
          >
            Return Home
          </Link>
        </div>
      </div>
    </Layout>
  )
}