# Manual Stripe Crypto Onramp Test Guide

## Prerequisites
1. Start the dev server: `cd frontend && npm run dev`
2. Or use the deployed Vercel app: `https://rosetta-alpha.vercel.app`

## Test Steps

### 1. Verify Test Mode Keys
The `.env.local` has test keys configured:
- `STRIPE_SECRET_KEY=sk_test_...`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...`

### 2. Connect Wallet (MetaMask)
1. Open `/pricing`
2. Click "Connect Wallet" button in header
3. Select MetaMask (or use the mock provider in Playwright tests)
4. Switch to Arc Testnet (chain ID 5042002) if prompted

### 3. Test "Buy with Card" Flow
1. On Premium or Pro tier card, click **"Buy $29 USDC with Card"** (or $99 for Pro)
2. Modal should open with "Buy USDC with Card" header
3. Status should show: "Initializing secure session…" → "Loading payment form…"
4. **Stripe widget should render** inside the modal

### 4. Complete Test Payment
1. In the Stripe widget:
   - Card: `4242 4242 4242 4242`
   - Expiry: Any future date (e.g., `12/34`)
   - CVC: Any 3 digits (e.g., `123`)
   - ZIP: Any 5 digits (e.g., `94107`)
2. Complete KYC if prompted (test mode uses simplified flow):
   - SSN: `000000000`
   - Address line 1: `address_full_match`
   - OTP: `000000`
3. Click "Buy" / "Confirm"

### 5. Verify Completion
1. Status should show: "Processing payment… Verifying identity…"
2. Then: "USDC delivered to your wallet!"
3. Green success banner appears on pricing page
4. Modal auto-closes after 3 seconds
5. Check wallet on Arc Testnet — USDC should arrive within 1-5 minutes

### 6. Verify Subscription Activation
1. After payment, pricing page should show "Premium active" or "Pro active"
2. Check `/dashboard` — subscription should be visible
3. Check Arc Testnet explorer for USDC transfer to your wallet

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Widget doesn't load | Check browser console for errors. Verify `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is set. |
| "Payment form failed to load" | Check Stripe Dashboard → Crypto Onramp → ensure domains include localhost:3000 |
| Wallet not detected | Ensure MetaMask is on Arc Testnet (5042002) |
| Payment stuck on "Processing" | Wait up to 5 minutes. Check session status via API: `GET /api/crypto/onramp/session/[sessionId]` |

## API Endpoints for Debugging

```bash
# Create session
curl -X POST http://localhost:3000/api/crypto/onramp/session \
  -H "Content-Type: application/json" \
  -d '{"walletAddress":"0x...", "tier":1, "amountUsd":29}'

# Poll session
curl http://localhost:3000/api/crypto/onramp/session/cos_...

# Check subscription
curl http://localhost:3000/api/subscription/status?wallet=0x...
```

## Test Card Numbers (Stripe Test Mode)

| Scenario | Card Number |
|----------|-------------|
| Success (Visa) | 4242 4242 4242 4242 |
| Success (Mastercard) | 5555 5555 5555 4444 |
| Decline | 4000 0000 0000 0002 |
| Insufficient funds | 4000 0000 0000 9995 |
| 3D Secure | 4000 0025 0000 3155 |

All test cards: any future expiry, any CVC, any ZIP.
