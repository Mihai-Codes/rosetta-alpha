import React from 'react'

interface SkeletonProps {
  className?: string
  height?: string | number
  width?: string | number
}

export function Skeleton({ className = '', height, width }: SkeletonProps) {
  return (
    <div
      className={`skeleton rounded ${className}`}
      style={{ height, width }}
      aria-hidden="true"
    />
  )
}

export function ThesisSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton height={32} width="60%" />
      <Skeleton height={16} width="40%" />
      <div className="space-y-3 pt-4">
        <Skeleton height={14} />
        <Skeleton height={14} width="92%" />
        <Skeleton height={14} width="76%" />
      </div>
      <div className="grid grid-cols-3 gap-4 pt-4">
        <Skeleton height={64} />
        <Skeleton height={64} />
        <Skeleton height={64} />
      </div>
    </div>
  )
}

export function FeedItemSkeleton() {
  return (
    <div className="flex items-start gap-4 p-5 border-b border-border/40">
      <Skeleton width={4} height={48} />
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-3">
          <Skeleton height={12} width={80} />
          <Skeleton height={12} width={60} />
        </div>
        <Skeleton height={16} width="80%" />
        <Skeleton height={12} width="50%" />
      </div>
    </div>
  )
}
