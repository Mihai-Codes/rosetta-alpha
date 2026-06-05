/**
 * Rosetta Alpha — Agentalent.ai Portfolio Screenshots
 * Captures 4 targeted shots at 1440×900 from the live Vercel deployment.
 *
 * Usage:
 *   node scripts/portfolio_screenshots.mjs
 *
 * Output: scripts/portfolio/
 */

import { chromium } from 'playwright'
import { mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const BASE_URL = 'https://rosetta-alpha.vercel.app'
const OUT_DIR = join(__dirname, 'portfolio')
mkdirSync(OUT_DIR, { recursive: true })

async function settle(page) {
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {})
  await page.waitForTimeout(1500)
}

async function dismissModal(page) {
  // The auth modal renders as: DIV.fixed.inset-0.z-[100].flex.items-center.justify-center
  // No role="dialog" or aria-modal — hide it by targeting the z-[100] fixed overlay
  try {
    await page.evaluate(() => {
      document.querySelectorAll('div').forEach(el => {
        const s = window.getComputedStyle(el)
        if (s.position === 'fixed' && s.zIndex >= 100 && el.offsetWidth > 200) {
          el.style.display = 'none'
        }
      })
    })
    await page.waitForTimeout(400)
  } catch {}
}

async function main() {
  console.log('\n🌸 Rosetta Alpha — Portfolio Screenshot Run')
  console.log(`   Target: ${BASE_URL}\n`)

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    reducedMotion: 'reduce',
  })
  const page = await context.newPage()

  // ── 1. Home page — hero + desk cards ────────────────────────────────────────
  console.log('📸 1/4  Home page...')
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 30000 })
  await settle(page)
  await page.screenshot({ path: join(OUT_DIR, '1_home.png'), fullPage: false, animations: 'disabled' })
  console.log('   ✓  1_home.png')

  // ── 2. Desks page — 5 regional cards + IPFS gateway links ───────────────────
  console.log('📸 2/4  Desks page...')
  await page.goto(`${BASE_URL}/desks`, { waitUntil: 'domcontentloaded', timeout: 30000 })
  await settle(page)
  await page.screenshot({ path: join(OUT_DIR, '2_desks.png'), fullPage: true, animations: 'disabled' })
  console.log('   ✓  2_desks.png')

  // ── 3. Registry page — on-chain provenance panel ────────────────────────────
  console.log('📸 3/4  Registry page...')
  await page.goto(`${BASE_URL}/registry`, { waitUntil: 'domcontentloaded', timeout: 30000 })
  await settle(page)
  await dismissModal(page)
  await page.screenshot({ path: join(OUT_DIR, '3_registry.png'), fullPage: true, animations: 'disabled' })
  console.log('   ✓  3_registry.png')

  // ── 4. Feed page — live deliberation stream ──────────────────────────────────
  console.log('📸 4/4  Feed page...')
  await page.goto(`${BASE_URL}/feed`, { waitUntil: 'domcontentloaded', timeout: 30000 })
  await settle(page)
  await dismissModal(page)
  await page.screenshot({ path: join(OUT_DIR, '4_feed.png'), fullPage: false, animations: 'disabled' })
  console.log('   ✓  4_feed.png')

  await browser.close()
  console.log(`\n✅ Done — 4 screenshots saved to ${OUT_DIR}\n`)
}

main().catch(err => { console.error('Fatal:', err); process.exit(1) })
