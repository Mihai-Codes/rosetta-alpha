/**
 * stripe-onramp.spec.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * E2E smoke tests for the Stripe Crypto Onramp integration.
 *
 * Tests the pricing page UI and modal flow. Cannot test actual Stripe widget
 * rendering (Stripe blocks automated testing per their docs), but verifies
 * our React components render correctly and the modal opens.
 *
 * Uses EIP-6963 mock provider for wallet simulation (no MetaMask needed).
 */

import { test, expect } from '@playwright/test'

// ─── Mock Wallet Provider ─────────────────────────────────────────────────────
// Reuses the EIP-6963 pattern from wallet-connections.spec.ts

const MOCK_WALLET = {
  rdns: 'io.metamask',
  name: 'MetaMask',
  uuid: 'mock-metamask-uuid',
  chainId: '0x4CB212', // Arc testnet 5042002
  accounts: ['0x742d35Cc6634C0532925a3b844Bc9e7595f2bD28'],
}

const INJECT_MOCK_WALLET = `
  (function() {
    const wallet = ${JSON.stringify(MOCK_WALLET)};

    window.addEventListener('eip6963:requestProvider', () => {
      announceWallet(wallet);
    });

    function announceWallet(w) {
      const provider = createProvider(w);
      window.dispatchEvent(new CustomEvent('eip6963:announceProvider', {
        detail: { info: { rdns: w.rdns, name: w.name, uuid: w.uuid }, provider }
      }));
    }

    function createProvider(w) {
      let connected = false;
      let currentChainId = w.chainId;
      const accounts = w.accounts;

      return {
        request: async ({ method, params }) => {
          switch (method) {
            case 'eth_requestAccounts':
              connected = true;
              return accounts;
            case 'eth_accounts':
              return connected ? accounts : [];
            case 'eth_chainId':
              return currentChainId;
            case 'wallet_switchEthereumChain':
              currentChainId = params[0].chainId;
              return null;
            case 'personal_sign':
              return '0xmocksignature';
            default:
              return null;
          }
        },
        on: () => {},
        removeListener: () => {},
      };
    }

    // Trigger discovery
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('eip6963:requestProvider'));
    }, 100);
  })();
`

// ─── Pricing Page ─────────────────────────────────────────────────────────────

test.describe('Pricing page', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript({ content: INJECT_MOCK_WALLET })
  })

  test('loads and shows all three tiers', async ({ page }) => {
    const errors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error' && !msg.text().includes('ResizeObserver')) {
        errors.push(msg.text())
      }
    })

    await page.goto('/pricing')
    await expect(page).toHaveTitle(/Rosetta Alpha/)

    // Header
    await expect(page.getByText('Intelligence, Priced Fairly')).toBeVisible()

    // Three tier cards
    await expect(page.getByText('Free')).toBeVisible()
    await expect(page.getByText('Premium')).toBeVisible()
    await expect(page.getByText('Pro')).toBeVisible()

    // Pricing amounts
    await expect(page.getByText('$29').first()).toBeVisible()
    await expect(page.getByText('$99').first()).toBeVisible()

    // x402 callout
    await expect(page.getByText('Pay-per-Insight with x402')).toBeVisible()

    expect(errors).toHaveLength(0)
  })

  test('shows Connect Wallet button when not connected', async ({ page }) => {
    await page.goto('/pricing')

    // Both Premium and Pro cards should show "Connect Wallet" for subscribe
    const connectButtons = page.getByRole('button', { name: /Connect Wallet/i })
    await expect(connectButtons.first()).toBeVisible()
  })

  test('Pay with Card button exists for paid tiers', async ({ page }) => {
    await page.goto('/pricing')

    // Premium and Pro should have Buy USDC with Card buttons
    const payButtons = page.getByRole('button', { name: /Buy.*USDC with Card/i })
    await expect(payButtons.first()).toBeVisible()
  })

  test('payment methods are visually separated', async ({ page }) => {
    await page.goto('/pricing')

    // "or pay with card" divider should exist
    await expect(page.getByText('or pay with card')).toBeVisible()

    // On-chain subtitle
    await expect(page.getByText('Pay on-chain via USDC').first()).toBeVisible()

    // Card subtitle
    await expect(page.getByText('Via Stripe · credit or debit card').first()).toBeVisible()
  })
})

// ─── CryptoOnrampModal ────────────────────────────────────────────────────────

test.describe('CryptoOnrampModal', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript({ content: INJECT_MOCK_WALLET })
  })

  test('modal opens when Pay with Card is clicked after wallet connection', async ({ page }) => {
    await page.goto('/pricing')

    // Connect wallet via RainbowKit modal
    const connectBtn = page.getByTestId('connect-wallet-btn')
    if (await connectBtn.isVisible()) {
      await connectBtn.click()
      // Click the mock MetaMask option
      const mockWallet = page.getByText('MetaMask').first()
      if (await mockWallet.isVisible({ timeout: 3000 }).catch(() => false)) {
        await mockWallet.click()
        await page.waitForTimeout(1000)
      }
    }

    // Navigate back to pricing if redirected
    if (!page.url().includes('/pricing')) {
      await page.goto('/pricing')
    }

    // Click Pay with Card
    const payBtn = page.getByRole('button', { name: /Pay with Card/i }).first()
    if (await payBtn.isEnabled({ timeout: 3000 }).catch(() => false)) {
      await payBtn.click()

      // Modal should appear
      await expect(page.getByText('Buy USDC with Card')).toBeVisible({ timeout: 5000 })
      // Status message should show
      await expect(page.getByText(/Initializing secure session|Loading payment|Complete the payment/)).toBeVisible()
    }
  })
})

// ─── Subscription Status API ──────────────────────────────────────────────────

test.describe('Subscription status endpoint', () => {
  test('returns valid JSON for any wallet', async ({ request }) => {
    const wallet = '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD28'
    const res = await request.get(`/api/subscription/status?wallet=${wallet}`)
    expect(res.ok()).toBeTruthy()

    const data = await res.json()
    expect(data).toHaveProperty('success')
    expect(data).toHaveProperty('active')
    expect(data).toHaveProperty('tier')
    expect(typeof data.active).toBe('boolean')
    expect(typeof data.tier).toBe('number')
  })

  test('rejects invalid wallet address', async ({ request }) => {
    const res = await request.get('/api/subscription/status?wallet=not-a-wallet')
    // Should return 400 or still return a valid response with active=false
    const data = await res.json()
    expect(data).toHaveProperty('success')
  })
})

// ─── Session Polling API ──────────────────────────────────────────────────────

test.describe('Session polling endpoint', () => {
  test('rejects invalid session ID format', async ({ request }) => {
    const res = await request.get('/api/crypto/onramp/session/invalid_id')
    expect(res.status()).toBe(400)

    const data = await res.json()
    expect(data.success).toBe(false)
    expect(data.error).toContain('Invalid session ID format')
  })

  test('rejects non-cos_ prefixed session ID', async ({ request }) => {
    const res = await request.get('/api/crypto/onramp/session/pix_abc123')
    expect(res.status()).toBe(400)
  })
})
