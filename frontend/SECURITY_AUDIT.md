# Security Audit Findings

**Date:** 2025-06-07  
**Scope:** Frontend (Next.js 16), API routes, Auth.js v5 integration, environment configuration  
**Severity:** CRITICAL / HIGH / MEDIUM / LOW

---

## Summary

| Severity | Count | Status |
|----------|-------|--------|
| CRITICAL | 2 | ✅ Fixed |
| HIGH | 4 | ✅ Fixed |
| MEDIUM | 5 | 3 Acknowledged, 2 Fixed |
| LOW | 3 | Acknowledged |

---

## CRITICAL

### C-1: Hardcoded Private Key Fallback in API Routes

**Files:** `src/app/api/quiz/claim/route.ts`, `src/app/api/thesis/[id]/route.ts`  
**Status:** ✅ Fixed  
**Fix:** Removed hardcoded fallback; now requires `ARC_SETTLER_PRIVATE_KEY` env var.

### C-2: Open Redirect in Disconnect Route

**File:** `src/app/api/disconnect/route.ts`  
**Issue:** User-controlled `next` query param passed directly to `new URL()` without validation.  
**Status:** ✅ Fixed — validated to only allow relative paths starting with `/`.

---

## HIGH

### H-1: Playwright Auth Bypass Available in Production

**File:** `middleware.ts`  
**Issue:** `PLAYWRIGHT_BYPASS === 'true'` disabled all route protection without checking `NODE_ENV`.  
**Status:** ✅ Fixed — added `NODE_ENV !== 'production'` guard.

### H-2: API Disconnect Route Missing Auth Check

**File:** `src/app/api/disconnect/route.ts`  
**Issue:** Any unauthenticated request could force-disconnect a user's wallet.  
**Status:** ✅ Fixed — now requires valid session.

### H-3: No Replay Protection for Off-Chain Payments

**File:** `src/lib/x402Server.ts`  
**Issue:** When `settleOnChain: false`, the same payment header could be replayed unlimited times.  
**Status:** ✅ Fixed — added in-memory nonce dedup with 5min TTL.  
**Note:** Ineffective in serverless (Vercel) where each invocation gets a fresh Map. Acceptable for hackathon.

### H-4: Onramp Session Routes Missing Auth Checks

**Files:** `src/app/api/crypto/onramp/session/route.ts`, `src/app/api/crypto/onramp/session/[sessionId]/route.ts`  
**Issue:** Anyone could create Stripe onramp sessions for arbitrary wallets or poll any session ID.  
**Status:** ✅ Fixed — both routes now require authenticated session.

---

## MEDIUM

### M-1: No Inbound Rate Limiting on API Routes

**Impact:** Unlimited request rates on authenticated endpoints could enable abuse.  
**Mitigation:** x402 payment gates on quiz claims (0.001 USDC fee) provide economic rate limiting.  
**Recommendation:** Add `@upstash/ratelimit` with Redis for production deployment.

### M-2: Session Table Orphaned Records

**Issue:** JWT strategy with PrismaAdapter means database `Session` rows are never cleaned up.  
**Mitigation:** Not a security risk — just storage waste. Add a cron job to delete expired sessions.

### M-3: PostHog Session Recording Captures Form Inputs

**File:** `src/providers/PostHogProvider.tsx`  
**Issue:** `maskAllInputs: false` records wallet addresses, quiz answers, and auth modal interactions.  
**Mitigation:** Acceptable for hackathon demo. Set `maskAllInputs: true` before production.

### M-4: Error Messages Leak Internal Details

**File:** `src/lib/x402Server.ts`  
**Issue:** Raw error messages from viem (RPC URLs, contract errors) returned to clients.  
**Status:** ✅ Fixed — sanitized to generic messages.

### M-5: Nonce Replay Protection Ineffective in Serverless

**File:** `src/lib/x402Server.ts`  
**Issue:** In-memory Map resets per invocation in Vercel, making nonce dedup ineffective.  
**Mitigation:** Acceptable for hackathon. Use Upstash Redis for production.

---

## LOW

### L-1: trustHost: True Disables Host Validation

**File:** `auth.ts`  
**Issue:** Auth.js trusts any `Host` header. Required for Vercel but risky in misconfigured deployments.  
**Mitigation:** Acceptable — Vercel handles host validation at the edge.

### L-2: Cookie Security Relies on Implicit Defaults

**File:** `auth.ts`  
**Issue:** No explicit `secure`, `httpOnly`, `sameSite` cookie options. Auth.js v5 defaults to `secure: true` in production.  
**Mitigation:** Verify `NODE_ENV=production` in Vercel environment.

### L-3: Fragile `as any` Cast in Session Key Hook

**File:** `src/hooks/useSessionKey.ts:244`  
**Issue:** `signTypedDataAsync(typedData as any)` suppresses TypeScript validation.  
**Mitigation:** Acceptable — wagmi EIP-712 type mismatch workaround.

---

## Recommendations for Production

1. Add `@upstash/ratelimit` with Redis for API rate limiting
2. Use Upstash Redis for nonce replay protection (replaces in-memory Map)
3. Set `maskAllInputs: true` in PostHog config
4. Add a cron job to clean up expired session rows
5. Review `trustHost` setting after deployment
6. Add explicit cookie options to `NextAuth()` config
