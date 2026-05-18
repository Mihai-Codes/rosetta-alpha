/**
 * Rosetta Alpha — Visual Review Screenshot Script
 * Captures all pages at 4 breakpoints for Gemini visual QA.
 *
 * Usage:
 *   node scripts/screenshot.mjs [--url http://localhost:3000]
 *
 * Output: scripts/screenshots/<breakpoint>/<page>.png
 */

import { chromium } from 'playwright'
import { mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ─── Config ───────────────────────────────────────────────────────────────────

const BASE_URL = process.argv.includes('--url')
  ? process.argv[process.argv.indexOf('--url') + 1]
  : 'http://localhost:3000'

const BREAKPOINTS = [
  { name: 'mobile',  width: 375,  height: 812 },
  { name: 'tablet',  width: 768,  height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tv',      width: 1920, height: 1080 },
]

const PAGES = [
  { name: 'home',      path: '/' },
  { name: 'desks',     path: '/desks' },
  { name: 'feed',      path: '/feed' },
  { name: 'registry',  path: '/registry' },
  { name: 'quiz',      path: '/quiz' },
  { name: 'dashboard', path: '/dashboard' },
  { name: 'about',     path: '/about' },
  { name: 'signin',    path: '/signin' },
]

const OUT_DIR = join(__dirname, 'screenshots')

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ensureDir(dir) {
  try { mkdirSync(dir, { recursive: true }) } catch {}
}

async function waitForPageReady(page) {
  // Wait for network idle + any framer-motion entrance animations to settle
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
  await page.waitForTimeout(800)
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🌸 Rosetta Alpha — Visual Review Screenshot Run`)
  console.log(`   Base URL : ${BASE_URL}`)
  console.log(`   Output   : ${OUT_DIR}\n`)

  const browser = await chromium.launch({ headless: true })
  const results = []

  for (const bp of BREAKPOINTS) {
    console.log(`📐 Breakpoint: ${bp.name} (${bp.width}×${bp.height})`)
    const bpDir = join(OUT_DIR, bp.name)
    ensureDir(bpDir)

    const context = await browser.newContext({
      viewport: { width: bp.width, height: bp.height },
      deviceScaleFactor: bp.name === 'mobile' ? 2 : 1,
      // Disable animations for crisp screenshots
      reducedMotion: 'reduce',
    })

    const page = await context.newPage()

    for (const pg of PAGES) {
      const url = `${BASE_URL}${pg.path}`
      const outFile = join(bpDir, `${pg.name}.png`)

      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 })
        await waitForPageReady(page)

        await page.screenshot({
          path: outFile,
          fullPage: true,
          animations: 'disabled',
        })

        console.log(`  ✓ ${bp.name}/${pg.name}.png`)
        results.push({ bp: bp.name, page: pg.name, status: 'ok', path: outFile })
      } catch (err) {
        console.error(`  ✗ ${bp.name}/${pg.name} — ${err.message}`)
        results.push({ bp: bp.name, page: pg.name, status: 'error', error: err.message })
      }
    }

    await context.close()
  }

  await browser.close()

  // ── Summary ──────────────────────────────────────────────────────────────────
  const ok = results.filter(r => r.status === 'ok').length
  const fail = results.filter(r => r.status === 'error').length

  console.log(`\n✅ Done — ${ok} screenshots captured${fail ? `, ⚠️  ${fail} failed` : ''}`)
  console.log(`📁 ${OUT_DIR}\n`)

  if (fail > 0) {
    console.log('Failed pages:')
    results.filter(r => r.status === 'error').forEach(r => {
      console.log(`  ${r.bp}/${r.page}: ${r.error}`)
    })
  }
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
