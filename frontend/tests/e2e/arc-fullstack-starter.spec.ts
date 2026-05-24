/**
 * arc-fullstack-starter.spec.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Sanity checks for the arc-fullstack-starter kit.
 *
 * Run against localhost:3001 if the starter kit runs separately:
 *   STARTER_KIT_URL=http://localhost:3001 npx playwright test arc-fullstack-starter
 *
 * If STARTER_KIT_URL is not set, these tests are skipped gracefully.
 */

import { test, expect } from '@playwright/test'

const STARTER_KIT_URL = process.env.STARTER_KIT_URL

// Skip all tests in this file if the starter kit URL is not configured
test.beforeEach(async ({}, testInfo) => {
  if (!STARTER_KIT_URL) {
    testInfo.skip(true, 'STARTER_KIT_URL not set — skipping starter kit tests')
  }
})

test('starter kit home page loads', async ({ page }) => {
  await page.goto(STARTER_KIT_URL!)
  await expect(page).not.toHaveTitle(/Error|404|500/)
})

test('starter kit references Arc Testnet (chain ID 5042002)', async ({ page }) => {
  await page.goto(STARTER_KIT_URL!)
  // Page should mention Arc Testnet in visible text or meta
  const bodyText = await page.locator('body').textContent()
  const mentionsArc =
    (bodyText ?? '').toLowerCase().includes('arc') ||
    (bodyText ?? '').includes('5042002')
  expect(mentionsArc).toBe(true)
})

test('starter kit has no broken JS imports (no 404 scripts)', async ({ page }) => {
  const failed404s: string[] = []
  page.on('requestfailed', req => {
    if (req.resourceType() === 'script') {
      failed404s.push(req.url())
    }
  })
  page.on('response', res => {
    if (res.request().resourceType() === 'script' && res.status() === 404) {
      failed404s.push(res.url())
    }
  })

  await page.goto(STARTER_KIT_URL!, { waitUntil: 'networkidle' })
  expect(failed404s, `Broken script imports:\n${failed404s.join('\n')}`).toHaveLength(0)
})

test('starter kit has no console errors on load', async ({ page }) => {
  const errors: string[] = []
  page.on('console', msg => {
    if (
      msg.type() === 'error' &&
      !msg.text().includes('ResizeObserver') &&
      !msg.text().includes('ERR_BLOCKED_BY_CLIENT')
    ) {
      errors.push(msg.text())
    }
  })
  await page.goto(STARTER_KIT_URL!, { waitUntil: 'domcontentloaded' })
  expect(errors, `Console errors:\n${errors.join('\n')}`).toHaveLength(0)
})
