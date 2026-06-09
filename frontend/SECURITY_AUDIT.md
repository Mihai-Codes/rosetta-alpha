# Security Audit Findings

**Date:** 2025-06-07  
**Scope:** Frontend (Next.js 16), API routes, Auth.js v5 integration, environment configuration  
**Severity:** CRITICAL / HIGH / MEDIUM / LOW

---

## Summary

| Severity | Count | Status |
|----------|-------|--------|
| CRITICAL | 1 | ✅ Fixed |
| HIGH | 2 | ✅ Fixed |
| MEDIUM | 3 | Acknowledged |
| LOW | 2 | Acknowledged |

---

## CRITICAL

### C-1: Hardcoded Private Key Fallback in API Routes

**Files:** `src/app/api/quiz/claim/route.ts`, `src/app/api/thesis/[id]/route.ts`  
**Status:** ✅ Fixed  
**Fix:** Removed hardcoded fallback; now requires `ARC_SETTLER_PRIVATE_KEY` env var.

---

## HIGH

### H-1: Playwright Auth Bypass Available in Production

**File:** `middleware.ts`  
**Issue:** `PLAYWRIGHT_BYPASS === 'true'` disabled all route protection without checking `NODE_ENV`.  
**Status:** ✅ Fixed — added `NODE_ENV !== 'production'` guard.

### H-2: API Disconnect Route Missing Auth Check

**File:** `src/app/api/disconnect/route.ts`  
**Issue:** Any unauthenticated request could force-disconnect a user's wallet by calling `GET /api/disconnect`.  
**Status:** ✅ Fixed — now requires valid session.

---

## MEDIUM

### M-1: No Inbound Rate Limiting on API Routes

**Impact:** Unlimited request rates on authenticated endpoints could enable abuse.  
**Mitigation:** x402 payment gates on quiz claims (0.001 USDC fee) provide economic rate limiting. Business quota (max 5 API keys/wallet) on key generation.  
**Recommendation:** Add `@upstash/ratelimit` with Redis for production deployment.

### M-2: Session Table Orphaned Records

**Issue:** JWT strategy with PrismaAdapter means database `Session` rows are never cleaned up.  
**Mitigation:** Not a security risk — just storage waste. Add a cron job to delete expired sessions.

### M-3: PostHog Session Recording Captures Form Inputs

**File:** `src/providers/PostHogProvider.tsx`  
**Issue:** `maskAllInputs: false` records wallet addresses, quiz answers, and auth modal interactions.  
**Mitigation:** Acceptable for hackathon demo. Set `maskAllInputs: true` before production.

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

---

## Recommendations for Production

1. Add `@upstash/ratelimit` with Redis for API rate limiting
2. Set `maskAllInputs: true` in PostHog config
3. Add a cron job to clean up expired session rows
4. Review `trustHost` setting after deployment
5. Add explicit cookie options to `NextAuth()` config
