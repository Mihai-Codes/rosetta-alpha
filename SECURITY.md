# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in Rosetta Alpha, please report it responsibly.

**Do NOT open a public GitHub issue for security vulnerabilities.**

Instead, please contact us via:

- **Email:** hello@mihai.codes (preferred)
- **Discord:** DM @mihai_chindris on Discord

### What to include

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### Response timeline

- **Acknowledgment:** Within 24 hours
- **Initial assessment:** Within 72 hours
- **Resolution:** Depends on severity, typically within 7 days for critical issues

## Scope

The following are in scope for security reports:

- Smart contracts (`contracts/src/`)
- Frontend application (`frontend/src/`)
- Backend API (`api/`)
- Webhook handlers
- Authentication and authorization
- Payment processing (Stripe, x402)
- Wallet integration

## Out of Scope

- Third-party services (Stripe, WalletConnect, Circle, Pinata)
- Denial of service attacks
- Social engineering
- Issues requiring physical access to user devices

## Security Measures

### Smart Contracts

- OpenZeppelin base contracts (Ownable, ReentrancyGuard, SafeERC20)
- Foundry invariant fuzzing (15 tests, 256 runs each)
- Slither static analysis
- Manual security audit documented in `contracts/SECURITY_AUDIT.md`

### Frontend

- Content Security Policy (CSP) headers
- CSRF protection via Next.js Origin check
- Environment variable validation
- Webhook signature verification (HMAC-SHA256, ECDSA)
- Rate limiting on API routes

### Backend

- Input validation via Pydantic models
- CORS configuration
- Error handling without stack trace exposure

### Payments

- Stripe webhook signature verification
- x402 payment verification with EIP-3009
- Session key spending limits and expiry
- No hardcoded private keys in source code

## Acknowledgments

We thank the security research community for helping improve Rosetta Alpha's security.
