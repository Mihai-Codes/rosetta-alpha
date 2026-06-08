'use client'

import React from 'react'

interface SkeletonProps {
  className?: string
  height?: string | number
  width?: string | number
  variant?: 'text' | 'card' | 'circle'
}

export function Skeleton({ className = '', height, width, variant = 'text' }: SkeletonProps) {
  const baseClasses = 'skeleton'
  const variantClasses = variant === 'circle' ? 'rounded-full' : variant === 'card' ? 'rounded' : 'rounded'
  
  return (
    <div
      className={`${baseClasses} ${variantClasses} ${className}`}
      style={{ height, width }}
      aria-hidden="true"
    />
  )
}

export function ThesisSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton height={32} width="60%" variant="text" />
      <Skeleton height={16} width="40%" variant="text" />
      <div className="space-y-3 pt-4">
        <Skeleton height={14} variant="text" />
        <Skeleton height={14} width="92%" variant="text" />
        <Skeleton height={14} width="76%" variant="text" />
      </div>
      <div className="grid grid-cols-3 gap-4 pt-4">
        <Skeleton height={64} variant="card" />
        <Skeleton height={64} variant="card" />
        <Skeleton height={64} variant="card" />
      </div>
    </div>
  )
}

export function FeedItemSkeleton() {
  return (
    <div className="flex items-start gap-4 p-5 border-b border-border/40">
      <Skeleton width={4} height={48} variant="text" />
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-3">
          <Skeleton height={12} width={80} variant="text" />
          <Skeleton height={12} width={60} variant="text" />
        </div>
        <Skeleton height={16} width="80%" variant="text" />
        <Skeleton height={12} width="50%" variant="text" />
      </div>
    </div>
  )
}

export function DeskCardSkeleton() {
  return (
    <div className="solid-panel border border-border/20 overflow-hidden rounded-none">
      <div className="px-6 pt-6 pb-4 border-b border-border/50">
        <Skeleton height={12} width="40%" variant="text" className="mb-2" />
        <Skeleton height={24} width="30%" variant="text" />
      </div>
      <div className="px-6 py-4 space-y-4">
        <div>
          <div className="flex justify-between items-center mb-2">
            <Skeleton height={10} width="20%" variant="text" />
            <Skeleton height={10} width="15%" variant="text" />
          </div>
          <Skeleton height={4} width="100%" variant="text" />
        </div>
        <Skeleton height={12} width="90%" variant="text" />
        <div>
          <Skeleton height={10} width="30%" variant="text" className="mb-2" />
          <Skeleton height={12} width="80%" variant="text" />
        </div>
      </div>
      <div className="px-6 py-3 border-t border-border/50 bg-bg-secondary">
        <Skeleton height={10} width="25%" variant="text" />
      </div>
    </div>
  )
}

export function TableRowSkeleton() {
  return (
    <tr className="border-b border-border/40">
      <td className="px-4 sm:px-6 py-4"><Skeleton height={12} width="80%" variant="text" /></td>
      <td className="px-4 sm:px-6 py-4"><Skeleton height={12} width="60%" variant="text" /></td>
      <td className="px-4 sm:px-6 py-4"><Skeleton height={12} width="40%" variant="text" /></td>
      <td className="px-4 sm:px-6 py-4"><Skeleton height={12} width="30%" variant="text" /></td>
      <td className="px-4 sm:px-6 py-4"><Skeleton height={12} width="50%" variant="text" /></td>
    </tr>
  )
}

export function ChartSkeleton() {
  return (
    <div className="solid-panel p-6 space-y-4">
      <Skeleton height={20} width="40%" variant="text" />
      <div className="flex justify-center">
        <Skeleton width={160} height={160} variant="circle" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center gap-2">
          <Skeleton width={12} height={12} variant="circle" />
          <Skeleton height={10} width="60%" variant="text" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton width={12} height={12} variant="circle" />
          <Skeleton height={10} width="60%" variant="text" />
        </div>
      </div>
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="solid-panel p-8 sm:p-12 text-center border border-border/40">
      <div className="flex justify-center mb-4">
        <div className="w-12 h-12 rounded-full border-2 border-brand-red/30 flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 8V12" stroke="#D82B2B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 16V16.01" stroke="#D82B2B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
      <h3 className="font-display text-lg text-text-primary mb-2">Error Loading Data</h3>
      <p className="text-text-secondary text-sm mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-6 py-2 border border-brand-red text-brand-red hover:bg-brand-red hover:text-white transition-colors text-sm font-medium"
        >
          Try Again
        </button>
      )}
    </div>
  )
}

export function EmptyState({ title, subtitle, action }: { title: string; subtitle: string; action?: React.ReactNode }) {
  return (
    <div className="solid-panel p-8 sm:p-12 text-center border border-border/40">
      <div className="flex justify-center mb-4">
        <div className="w-12 h-12 rounded-full border-2 border-border flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0ZM4.95 4.95a10 10 0 1 1 14.14 14.14M12 16v-4" stroke="#888888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
      <h3 className="font-display text-lg text-text-primary mb-2">{title}</h3>
      <p className="text-text-secondary text-sm mb-4">{subtitle}</p>
      {action}
    </div>
  )
}

export function LoadingSpinner() {
  return (
    <div className="flex justify-center items-center py-8">
      <div className="w-8 h-8 border-2 border-brand-red/30 border-t-brand-red rounded-full animate-spin"></div>
    </div>
  )
}
