/**
 * responsive.spec.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Validates that key pages render without horizontal overflow at all
 * major breakpoints and that mobile-specific UI patterns appear correctly.
 *
 * Screenshots are saved to tests/screenshots/ for visual diffing.
 */

import { test, expect } from '@playwright/test'
import path from 'path'

const VIEWPORTS = [
  { name: 'mobile-S', width: 375, height: 812 },
  { name: 'mobile-L', width: 430, height: 932 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tv', width: 1920, height: 1080 },
] as const

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function hasNoHorizontalOverflow(page: import('@playwright/test').Page): Promise<boolean> {
  return page.evaluate(() => {
    return document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1
  })
}

// ─── Hero page responsive tests ───────────────────────────────────────────────

for (const vp of VIEWPORTS) {
  test(`hero page: no horizontal overflow at ${vp.name} (${vp.width}×${vp.height})`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height })
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    // Wait for hero to paint
    await expect(page.getByTestId('stats-ticker')).toBeVisible({ timeout: 10_000 })

    expect(await hasNoHorizontalOverflow(page)).toBe(true)

    await page.screenshot({
      path: path.join('tests', 'screenshots', `hero-${vp.name}.png`),
      fullPage: false,
    })
  })
}

// ─── Desks page responsive tests ─────────────────────────────────────────────

for (const vp of VIEWPORTS) {
  test(`desks page: no horizontal overflow at ${vp.name} (${vp.width}×${vp.height})`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height })
    await page.goto('/desks', { waitUntil: 'domcontentloaded' })

    // Wait for region tabs to render
    await expect(page.getByTestId('region-tab-US')).toBeVisible({ timeout: 10_000 })

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(scrollWidth).toBeLessThanOrEqual(vp.width + 1)

    // On mobile viewports: pill bar container should be present (horizontal scroll)
    if (vp.width < 768) {
      await expect(page.getByTestId('region-tabs-mobile')).toBeVisible()
    }

    await page.screenshot({
      path: path.join('tests', 'screenshots', `desks-${vp.name}.png`),
      fullPage: false,
    })
  })
}

// ─── Leaderboard responsive ───────────────────────────────────────────────────

for (const vp of VIEWPORTS) {
  test(`leaderboard page: no overflow at ${vp.name}`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height })
    await page.goto('/leaderboard', { waitUntil: 'domcontentloaded' })

    await expect(page.getByTestId('leaderboard-row').first()).toBeVisible({ timeout: 10_000 })

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(scrollWidth).toBeLessThanOrEqual(vp.width + 1)
  })
}

// ─── Nav / Layout responsive ──────────────────────────────────────────────────

test('wallet connect button visible on all desktop breakpoints', async ({ page }) => {
  for (const vp of VIEWPORTS.filter(v => v.width >= 768)) {
    await page.setViewportSize({ width: vp.width, height: vp.height })
    await page.goto('/')
    await expect(page.getByTestId('connect-wallet-btn')).toBeVisible()
  }
})
