/**
 * public-pages.spec.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * E2E tests for all public-facing pages of Rosetta Alpha.
 *
 * Key facts about the app that shape these tests:
 *   - Auth is modal-based: no /signin route — middleware redirects to /?auth=login
 *   - /quiz, /feed, /registry, /dashboard are protected (middleware)
 *   - /desks is public (paywall overlay, not redirect)
 *   - HeroSection CTA scrolls to #desks-section; "Try Quiz" links to /quiz
 *   - StatsBar has data-testid="stats-ticker"
 *   - Leaderboard uses static mock data — always has rows
 */

import { test, expect } from '@playwright/test'

// ─── Hero / Landing ───────────────────────────────────────────────────────────

test.describe('Hero page', () => {
  test('loads and shows key elements', async ({ page }) => {
    // Capture console errors BEFORE navigating
    const errors: string[] = []
    page.on('console', msg => {
      if (
        msg.type() === 'error' &&
        !msg.text().includes('ResizeObserver') &&
        !msg.text().includes('hydration') &&
        !msg.text().includes('NEXT_')
      ) {
        errors.push(msg.text())
      }
    })

    await page.goto('/')
    await expect(page).toHaveTitle(/Rosetta Alpha/)

    // CTA buttons injected into HeroSection actions div
    await expect(page.getByTestId('enter-terminal-btn')).toBeVisible()
    await expect(page.getByTestId('try-quiz-cta')).toBeVisible()

    // Subtitle contains Dalio reference
    await expect(page.locator('text=Dalio')).toBeVisible()

    // Stats ticker
    await expect(page.getByTestId('stats-ticker')).toBeVisible()

    expect(errors).toHaveLength(0)
  })

  test('wallet connect button is present and enabled', async ({ page }) => {
    await page.goto('/')
    const connectBtn = page.getByTestId('connect-wallet-btn')
    await expect(connectBtn).toBeVisible()
    await expect(connectBtn).toBeEnabled()
  })

  test('"Enter Terminal" scrolls to desks section', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('enter-terminal-btn').click()
    // After smooth-scroll the desks section should be in/near viewport
    await expect(page.locator('#desks-section')).toBeVisible()
  })

  test('"Try Quiz" CTA navigates to quiz or auth redirect', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('try-quiz-cta').click()
    // Quiz is protected — unauthenticated users land on /?auth=login
    // so we accept either /quiz OR / (with auth param)
    await expect(page).toHaveURL(/\/(quiz.*)?($|\?auth=login)/)
  })
})

// ─── Desks page ───────────────────────────────────────────────────────────────

test.describe('Desks page', () => {
  test('loads with all 5 region tabs visible', async ({ page }) => {
    await page.goto('/desks')

    await expect(page.getByTestId('region-tab-US')).toBeVisible()
    await expect(page.getByTestId('region-tab-CN')).toBeVisible()
    await expect(page.getByTestId('region-tab-EU')).toBeVisible()
    await expect(page.getByTestId('region-tab-JP')).toBeVisible()
    await expect(page.getByTestId('region-tab-CRYPTO')).toBeVisible()
  })

  test('shows premium paywall gate for unauthenticated users', async ({ page }) => {
    await page.goto('/desks')
    await expect(page.getByTestId('thesis-blur-gate')).toBeVisible()
    // CTA inside paywall
    await expect(page.locator('text=Authenticate Session')).toBeVisible()
  })

  test('region tab switching works', async ({ page }) => {
    await page.goto('/desks')
    // Click CRYPTO tab — should become active (aria-selected)
    const cryptoTab = page.getByTestId('region-tab-CRYPTO')
    await cryptoTab.click()
    await expect(cryptoTab).toHaveAttribute('aria-selected', 'true')
  })

  test('share button opens share modal with tweet preview', async ({ page }) => {
    await page.goto('/desks')
    // Share button may be behind paywall — click it
    const shareBtn = page.getByTestId('share-button').first()
    await shareBtn.click()
    await expect(page.getByTestId('share-modal')).toBeVisible()
    const tweetText = await page.getByTestId('tweet-preview').textContent()
    expect(tweetText).toContain('rosetta-alpha.vercel.app')
    expect(tweetText).toMatch(/LONG|SHORT|NEUTRAL/)
  })
})

// ─── Leaderboard ─────────────────────────────────────────────────────────────

test.describe('Leaderboard page', () => {
  test('loads and shows heading', async ({ page }) => {
    await page.goto('/leaderboard')
    await expect(page.locator('h1, h2').filter({ hasText: /Leaderboard/i })).toBeVisible()
  })

  test('shows leaderboard rows (static mock data)', async ({ page }) => {
    await page.goto('/leaderboard')
    // The component always renders 10 mock rows
    const rows = page.getByTestId('leaderboard-row')
    await expect(rows.first()).toBeVisible()
    expect(await rows.count()).toBeGreaterThan(0)
  })
})

// ─── Auth redirect (sign-in modal) ───────────────────────────────────────────

test.describe('Sign-in modal', () => {
  test('opens when visiting protected route unauthenticated (/feed)', async ({ page }) => {
    await page.goto('/feed')
    // Middleware redirects to /?auth=login which auto-opens the SignInModal
    await expect(page).toHaveURL(/\?auth=login/)
    await expect(page.getByTestId('signin-google')).toBeVisible({ timeout: 8000 })
    await expect(page.getByTestId('signin-github')).toBeVisible()
  })

  test('opens when visiting /registry unauthenticated', async ({ page }) => {
    await page.goto('/registry')
    await expect(page).toHaveURL(/\?auth=login/)
    await expect(page.getByTestId('signin-google')).toBeVisible({ timeout: 8000 })
  })

  test('opens when visiting /dashboard unauthenticated', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\?auth=login/)
    await expect(page.getByTestId('signin-google')).toBeVisible({ timeout: 8000 })
  })

  test('opens when visiting /quiz unauthenticated', async ({ page }) => {
    await page.goto('/quiz')
    await expect(page).toHaveURL(/\?auth=login/)
    await expect(page.getByTestId('signin-google')).toBeVisible({ timeout: 8000 })
  })

  test('shows Google and GitHub providers, no email field', async ({ page }) => {
    await page.goto('/?auth=login')
    await expect(page.getByTestId('signin-google')).toBeVisible({ timeout: 8000 })
    await expect(page.getByTestId('signin-github')).toBeVisible()
    await expect(page.locator('input[type="email"]')).not.toBeVisible()
  })

  test('modal closes on Escape key', async ({ page }) => {
    await page.goto('/?auth=login')
    await expect(page.getByTestId('signin-google')).toBeVisible({ timeout: 8000 })
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('signin-google')).not.toBeVisible({ timeout: 3000 })
  })
})

// ─── About page ──────────────────────────────────────────────────────────────

test.describe('About page', () => {
  test('loads and shows content', async ({ page }) => {
    await page.goto('/about')
    await expect(page.locator('text=About')).toBeVisible()
    // Page should not redirect
    await expect(page).toHaveURL(/\/about/)
  })
})
