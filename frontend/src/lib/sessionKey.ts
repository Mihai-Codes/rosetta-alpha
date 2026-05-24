/**
 * Session Key Management for x402 Micropayments
 * ================================================
 * 
 * A session key is an ephemeral secp256k1 keypair that lives in sessionStorage.
 * The user's main wallet (e.g. MetaMask) authorizes it once via EIP-712 signature,
 * granting it spending limits. The session key then signs all subsequent x402
 * micropayments WITHOUT triggering wallet popups — enabling seamless pay-per-use.
 * 
 * Security model:
 * - Keys are stored in sessionStorage (cleared on tab close)
 * - Spending is capped by maxAmountUsdc
 * - Time-bounded by expirySeconds
 * - Contract-scoped by allowedContracts
 * - The user can revoke at any time
 * 
 * Flow:
 * 1. generateSessionKey() → ephemeral keypair
 * 2. User's wallet signs EIP-712 authorization (buildSessionAuthMessage)
 * 3. User sends a small USDC amount to the session key's address (pre-funding)
 *    — this is the ONLY wallet popup needed for the entire session
 * 4. saveSessionKey() persists to sessionStorage
 * 5. x402Client uses loadSessionKey() for automatic micropayments
 *    — session key signs EIP-3009 from its own address (passes ecrecover check)
 * 6. Each payment calls recordSpend() to track budget
 */

import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'
import type { TypedDataDomain } from 'viem'

// ─── Types ───────────────────────────────────────────────────────────────────

export type SessionKeyConfig = {
  /** Maximum total USDC this session key can spend (e.g. 5.0 = $5) */
  maxAmountUsdc: number
  /** How long before this key expires, in seconds (e.g. 86400 = 24h) */
  expirySeconds: number
  /** Which contract addresses this key is allowed to pay */
  allowedContracts: string[]
  /** Random bytes32 hex nonce — prevents replay of authorization */
  nonce: string
}

export type SessionKey = {
  /** Ephemeral private key (hex with 0x prefix) */
  privateKey: `0x${string}`
  /** Derived public address of the session key */
  address: `0x${string}`
  /** Configuration / spending limits */
  config: SessionKeyConfig
  /** The real wallet address that authorized this session key */
  userAddress: `0x${string}`
  /** EIP-712 signature from the real wallet authorizing this session key */
  authorizationSig: string
  /** Running total of USDC spent in this session (human-readable, e.g. 0.003) */
  spentUsdc: number
  /** Unix timestamp (ms) when this session key was created */
  createdAt: number
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STORAGE_KEY = 'rosetta_session_key'

/** EIP-712 domain for Rosetta Alpha session key authorization */
const SESSION_AUTH_DOMAIN: TypedDataDomain = {
  name: 'Rosetta Alpha',
  version: '1',
  chainId: 5042002, // Arc Testnet
}

/** EIP-712 types for the SessionKeyAuthorization message */
const SESSION_AUTH_TYPES = {
  SessionKeyAuthorization: [
    { name: 'sessionAddress', type: 'address' },
    { name: 'maxAmountUsdc', type: 'string' },
    { name: 'expiryTimestamp', type: 'uint256' },
    { name: 'nonce', type: 'bytes32' },
    { name: 'allowedContracts', type: 'bytes' },
  ],
} as const

// ─── Key Generation ──────────────────────────────────────────────────────────

/**
 * Generate a fresh ephemeral secp256k1 keypair.
 * 
 * Uses viem's generatePrivateKey() which internally uses 
 * crypto.getRandomValues() — NOT Math.random(). This is 
 * cryptographically secure randomness suitable for key material.
 * 
 * @returns An object with the private key and derived address
 */
export function generateSessionKey(): { privateKey: `0x${string}`; address: `0x${string}` } {
  // viem's generatePrivateKey uses @noble/secp256k1 which uses
  // crypto.getRandomValues for entropy — safe for production use
  const privateKey = generatePrivateKey()
  const account = privateKeyToAccount(privateKey)

  return {
    privateKey,
    address: account.address,
  }
}

// ─── EIP-712 Authorization Message ──────────────────────────────────────────

/**
 * Build the EIP-712 typed data that the user's main wallet must sign
 * to authorize the session key.
 * 
 * This message says: "I (userAddress) authorize sessionAddress to spend
 * up to maxAmountUsdc USDC on my behalf, expiring at expiryTimestamp,
 * only on the listed contracts."
 * 
 * The user signs this ONCE. After that, the session key operates
 * autonomously within these constraints.
 * 
 * @param userAddress - The real wallet address (signer)
 * @param sessionAddress - The ephemeral session key's address  
 * @param config - Spending limits and constraints
 * @returns EIP-712 typed data object ready for wallet signing
 */
export function buildSessionAuthMessage(
  userAddress: string,
  sessionAddress: string,
  config: SessionKeyConfig
) {
  // Convert maxAmountUsdc to a string with 6 decimal places (USDC precision)
  // e.g. 5.0 → "5000000" (5 USDC in 6-decimal units)
  const maxAmountUsdcString = String(Math.round(config.maxAmountUsdc * 1e6))

  // Calculate absolute expiry timestamp from relative seconds
  const expiryTimestamp = BigInt(Math.floor(Date.now() / 1000) + config.expirySeconds)

  // Encode allowedContracts as packed bytes (concatenated 20-byte addresses)
  // This is a compact representation for on-chain verification
  const allowedContractsBytes = ('0x' +
    config.allowedContracts
      .map((addr) => addr.replace('0x', '').toLowerCase().padStart(40, '0'))
      .join('')) as `0x${string}`

  return {
    domain: SESSION_AUTH_DOMAIN,
    types: SESSION_AUTH_TYPES,
    primaryType: 'SessionKeyAuthorization' as const,
    message: {
      sessionAddress: sessionAddress as `0x${string}`,
      maxAmountUsdc: maxAmountUsdcString,
      expiryTimestamp,
      nonce: config.nonce as `0x${string}`,
      allowedContracts: allowedContractsBytes,
    },
  }
}

// ─── Session Storage Management ─────────────────────────────────────────────

/**
 * Persist the session key to sessionStorage.
 * 
 * SECURITY: We use sessionStorage (NOT localStorage) deliberately:
 * - sessionStorage is cleared when the tab/window closes
 * - This limits the exposure window of the ephemeral key
 * - If a user closes their browser, the key is gone
 * - localStorage would persist across sessions — too risky for key material
 * 
 * The private key is stored in memory — this is acceptable because:
 * - It's ephemeral (short-lived by design)
 * - It has hard spending caps
 * - The alternative (re-prompting the wallet) defeats the purpose
 * 
 * @param key - The complete SessionKey object to persist
 */
export function saveSessionKey(key: SessionKey): void {
  if (typeof window === 'undefined') {
    throw new Error('saveSessionKey can only be called in browser context')
  }

  // Serialize BigInt-safe (our types don't use BigInt, but defensive)
  const serialized = JSON.stringify(key)
  sessionStorage.setItem(STORAGE_KEY, serialized)
}

/**
 * Load and validate the session key from sessionStorage.
 * 
 * Performs two critical checks:
 * 1. Expiry: is the key still within its time window?
 * 2. Budget: has the key exceeded its spending limit?
 * 
 * Returns null if no key exists, or if the key is invalid/expired.
 * This forces the UI to prompt for a new session authorization.
 * 
 * @returns The valid SessionKey, or null if invalid/missing
 */
export function loadSessionKey(): SessionKey | null {
  if (typeof window === 'undefined') return null

  const stored = sessionStorage.getItem(STORAGE_KEY)
  if (!stored) return null

  try {
    const key: SessionKey = JSON.parse(stored)

    // Check 1: Has the key expired?
    const expiresAt = key.createdAt + key.config.expirySeconds * 1000
    if (Date.now() >= expiresAt) {
      // Key has expired — clean up and return null
      sessionStorage.removeItem(STORAGE_KEY)
      return null
    }

    // Check 2: Has the budget been fully consumed?
    if (key.spentUsdc >= key.config.maxAmountUsdc) {
      // Budget exhausted — clean up and return null
      sessionStorage.removeItem(STORAGE_KEY)
      return null
    }

    return key
  } catch {
    // Corrupted data — clear it
    sessionStorage.removeItem(STORAGE_KEY)
    return null
  }
}

/**
 * Revoke the active session key by clearing it from storage.
 * 
 * Call this when:
 * - User explicitly clicks "Revoke Session"
 * - User disconnects their wallet
 * - A security concern is detected
 * - The session key is compromised
 * 
 * After revocation, all subsequent x402 payments will fail until
 * a new session key is authorized.
 */
export function revokeSessionKey(): void {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(STORAGE_KEY)
}

// ─── Budget Management ───────────────────────────────────────────────────────

/**
 * Check if the session key has enough remaining budget for a payment.
 * 
 * This is called BEFORE signing a payment to prevent over-spending.
 * Both budget and time constraints are checked.
 * 
 * @param amountUsdc - The amount to check (in human-readable USDC, e.g. 0.001)
 * @returns true if the payment can proceed, false if it would exceed limits
 */
export function hasSessionBudget(amountUsdc: number): boolean {
  const key = loadSessionKey()
  if (!key) return false

  // Check spending limit: would this payment exceed the max?
  if (key.spentUsdc + amountUsdc > key.config.maxAmountUsdc) {
    return false
  }

  // Check time limit: is the key still valid?
  const expiresAt = key.createdAt + key.config.expirySeconds * 1000
  if (Date.now() >= expiresAt) {
    return false
  }

  return true
}

/**
 * Record a successful payment against the session's budget.
 * 
 * Called AFTER a payment is confirmed successful. Updates the
 * running total and persists back to sessionStorage.
 * 
 * @param amountUsdc - The amount spent (in human-readable USDC, e.g. 0.001)
 */
export function recordSpend(amountUsdc: number): void {
  const key = loadSessionKey()
  if (!key) return

  // Increment the running total
  key.spentUsdc += amountUsdc

  // Persist the updated state
  saveSessionKey(key)
}

// ─── Utility ─────────────────────────────────────────────────────────────────

/**
 * Generate a cryptographically random bytes32 nonce.
 * Used for session key authorization and EIP-3009 transfer nonces.
 * 
 * @returns A random 32-byte hex string with 0x prefix
 */
export function generateNonce(): `0x${string}` {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return ('0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')) as `0x${string}`
}
