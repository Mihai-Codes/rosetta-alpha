'use client'

import React, { useEffect, Suspense } from 'react'
import posthog from 'posthog-js'
import { PostHogProvider as PHProvider, usePostHog } from 'posthog-js/react'
import { usePathname, useSearchParams } from 'next/navigation'

/** Tracks SPA navigation as $pageview events (App Router safe — wrapped in Suspense). */
function PostHogPageView() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const ph = usePostHog()

  useEffect(() => {
    if (!pathname || !ph) return
    let url = window.location.origin + pathname
    if (searchParams.toString()) url += `?${searchParams.toString()}`
    ph.capture('$pageview', { $current_url: url })
  }, [pathname, searchParams, ph])

  return null
}

/**
 * PostHog provider — initialises posthog-js once on the client, wraps children
 * in the React context, and fires $pageview on every App Router navigation.
 *
 * Env vars required:
 *   NEXT_PUBLIC_POSTHOG_KEY   — project API key (phc_...)
 *   NEXT_PUBLIC_POSTHOG_HOST  — ingest host (https://us.i.posthog.com)
 */
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
    if (!key) return
    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
      // Manual pageview — fired in PostHogPageView to handle SPA navigation correctly
      capture_pageview: false,
      capture_pageleave: true,
      autocapture: true,
      session_recording: {
        maskAllInputs: false,
      },
    })
  }, [])

  return (
    <PHProvider client={posthog}>
      {/* Suspense required: useSearchParams() suspends in App Router */}
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
      {children}
    </PHProvider>
  )
}
