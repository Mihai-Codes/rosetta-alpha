/**
 * EIP-3009: Transfer With Authorization for USDC on Arc
 * ======================================================
 * 
 * EIP-3009 defines a meta-transaction pattern for ERC-20 tokens. Instead of
 * the token holder calling transfer() directly (which requires gas), they sign
 * an off-chain EIP-712 message authorizing a specific transfer. Anyone can then
 * submit this signed authorization on-chain via transferWithAuthorization().
 * 
 * Why this matters for x402:
 * - The SESSION KEY signs the transfer authorization (no wallet popup)
 * - The SERVER executes the on-chain tx (pays gas on Arc)
 * - The user's USDC moves from their wallet to the treasury
 * - All without the user clicking "confirm" in MetaMask
 * 
 * USDC on Arc specifics:
 * - Decimals: 6 (NOT 18 like ETH)
 * - EIP-712 domain name: "USD Coin"
 * - EIP-712 domain version: "2"
 * - Supports transferWithAuthorization natively
 * - Chain ID: 5042002 (Arc Testnet)
 * 
 * References:
 * - EIP-3009: https://eips.ethereum.org/EIPS/eip-3009
 * - Circle USDC docs: https://www.circle.com/blog/four-ways-to-authorize-usdc-smart-contract-interactions-with-circle-sdk
 */

import { privateKeyToAccount } from 'viem/accounts'
import type { SessionKey } from './sessionKey'
import { generateNonce } from './sessionKey'

// ─── Types ───────────────────────────────────────────────────────────────────

/**
 * The core transfer authorization data — unsigned.
 * 
 * This represents: "Transfer `value` USDC from `from` to `to`,
 * valid between `validAfter` and `validBefore`, with nonce `nonce`."
 */
export type TransferAuthorization = {
  /** Source wallet (the user's real wallet address that holds USDC) */
  from: `0x${string}`
  /** Destination (treasury/payTo address from the 402 response) */
  to: `0x${string}`
  /** Amount in USDC atomic units (6 decimals). 1 USDC = 1_000_000 */
  value: bigint
  /** Unix timestamp — transfer not valid before this time (typically 0) */
  validAfter: bigint
  /** Unix timestamp — transfer not valid after this time (e.g. now + 5 min) */
  validBefore: bigint
  /** Random bytes32 nonce — prevents double-spending of same authorization */
  nonce: `0x${string}`
}

/**
 * A fully signed transfer authorization — ready for on-chain execution.
 * Contains the original authorization data plus the EIP-712 signature components.
 */
export type SignedAuthorization = TransferAuthorization & {
  /** Signature recovery parameter (27 or 28) */
  v: number
  /** ECDSA r component */
  r: `0x${string}`
  /** ECDSA s component */
  s: `0x${string}`
  /** Full 65-byte concatenated signature (r + s + v) */
  signature: `0x${string}`
}

// ─── EIP-712 Message Construction ───────────────────────────────────────────

/**
 * EIP-712 type definition for TransferWithAuthorization.
 * This MUST match what the USDC contract expects — any deviation
 * results in signature verification failure on-chain.
 */
const TRANSFER_WITH_AUTH_TYPES = {
  TransferWithAuthorization: [
    { name: 'from', type: 'address' },
    { name: 'to', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'validAfter', type: 'uint256' },
    { name: 'validBefore', type: 'uint256' },
    { name: 'nonce', type: 'bytes32' },
  ],
} as const

/**
 * Build the EIP-712 typed data for a TransferWithAuthorization.
 * 
 * The domain MUST match what the USDC contract was deployed with:
 * - name: "USD Coin" (this is hardcoded in USDC's EIP-712 domain)
 * - version: "2" (USDC v2 contract)
 * - chainId: 5042002 (Arc Testnet)
 * - verifyingContract: the USDC contract address on Arc
 * 
 * If ANY of these are wrong, ecrecover will return a different address
 * and the on-chain call will revert with "invalid signature".
 * 
 * @param auth - The unsigned transfer authorization
 * @param usdcAddress - USDC contract address on Arc
 * @returns Complete EIP-712 typed data object
 */
export function buildTransferAuthorizationMessage(
  auth: TransferAuthorization,
  usdcAddress: string
) {
  return {
    domain: {
      name: 'USD Coin',           // USDC's canonical EIP-712 domain name
      version: '2',                // USDC v2 uses version "2"
      chainId: 5042002,            // Arc Testnet chain ID
      verifyingContract: usdcAddress as `0x${string}`,
    },
    types: TRANSFER_WITH_AUTH_TYPES,
    primaryType: 'TransferWithAuthorization' as const,
    message: {
      from: auth.from,
      to: auth.to,
      value: auth.value,
      validAfter: auth.validAfter,
      validBefore: auth.validBefore,
      nonce: auth.nonce,
    },
  }
}

// ─── Signing ─────────────────────────────────────────────────────────────────

/**
 * Sign a TransferWithAuthorization using the SESSION KEY's private key.
 * 
 * THIS IS THE CORE MAGIC of the session key pattern.
 * 
 * EIP-3009 enforces: ecrecover(signature) == from
 * Therefore `from` in the authorization MUST be the session key's address,
 * NOT the user's main wallet. This means:
 * 
 * 1. During session setup, the user transfers a small USDC budget to the
 *    session key address (one wallet popup — the only one needed)
 * 2. The session key now holds USDC in its own address
 * 3. For each micropayment, the session key signs a transferWithAuthorization
 *    where from=sessionKeyAddress — passing the on-chain ecrecover check
 * 4. The server calls transferWithAuthorization on-chain, moving USDC from
 *    the session key address to the treasury
 * 
 * This is the standard "pre-funded ephemeral wallet" pattern used in
 * production systems like Privy session keys, Biconomy, and ZeroDev.
 * 
 * @param auth - The transfer authorization to sign
 * @param sessionKey - The active session key (has the private key)
 * @param usdcAddress - USDC contract address on Arc
 * @returns The fully signed authorization with v, r, s components
 */
export async function signTransferAuthorization(
  auth: TransferAuthorization,
  sessionKey: SessionKey,
  usdcAddress: string
): Promise<SignedAuthorization> {
  // Reconstruct the viem account from the session key's private key
  // This is an in-memory signer — no external wallet interaction
  const account = privateKeyToAccount(sessionKey.privateKey)

  // Build the EIP-712 typed data
  const typedData = buildTransferAuthorizationMessage(auth, usdcAddress)

  // Sign using viem's signTypedData on the local account
  // This happens entirely in-memory — no RPC calls, no wallet popups
  const signature = await account.signTypedData({
    domain: typedData.domain,
    types: typedData.types,
    primaryType: typedData.primaryType,
    message: typedData.message,
  })

  // Decompose the 65-byte signature into v, r, s components
  // Signature format: 0x + r(64 hex chars) + s(64 hex chars) + v(2 hex chars)
  const r = `0x${signature.slice(2, 66)}` as `0x${string}`
  const s = `0x${signature.slice(66, 130)}` as `0x${string}`
  const v = parseInt(signature.slice(130, 132), 16)

  return {
    ...auth,
    v,
    r,
    s,
    signature,
  }
}

// ─── x402 Payment Header Encoding ──────────────────────────────────────────

/**
 * Encode a signed authorization as the X-PAYMENT / PAYMENT-SIGNATURE header.
 * 
 * The x402 protocol specifies that the payment payload is sent as a
 * base64-encoded JSON object in an HTTP header. This allows the server
 * to verify and settle the payment without additional round-trips.
 * 
 * Wire format:
 * base64(JSON.stringify({
 *   x402Version: 1,
 *   scheme: "exact",
 *   network: "arc-testnet-5042002",
 *   payload: { signature, from, to, value, validAfter, validBefore, nonce }
 * }))
 * 
 * @param signed - The fully signed transfer authorization
 * @returns Base64-encoded payment header string
 */
export function encodePaymentHeader(signed: SignedAuthorization): string {
  const paymentPayload = {
    x402Version: 1,
    scheme: 'exact',
    network: 'arc-testnet-5042002',
    payload: {
      signature: signed.signature,
      from: signed.from,
      to: signed.to,
      // Convert bigint to string for JSON serialization
      // (JSON.stringify cannot handle BigInt natively)
      value: signed.value.toString(),
      validAfter: signed.validAfter.toString(),
      validBefore: signed.validBefore.toString(),
      nonce: signed.nonce,
      v: signed.v,
      r: signed.r,
      s: signed.s,
    },
  }

  // Base64 encode for HTTP header transport
  // Using btoa with encodeURIComponent handles Unicode edge cases
  const jsonString = JSON.stringify(paymentPayload)

  if (typeof window !== 'undefined') {
    // Browser: use btoa
    return btoa(jsonString)
  } else {
    // Node.js / server: use Buffer
    return Buffer.from(jsonString).toString('base64')
  }
}

/**
 * Decode a payment header back into a SignedAuthorization.
 * 
 * Used server-side to extract and verify the payment from an incoming request.
 * Performs the reverse of encodePaymentHeader().
 * 
 * @param header - The base64-encoded payment header string
 * @returns The decoded SignedAuthorization (with bigints restored)
 */
export function decodePaymentHeader(header: string): SignedAuthorization {
  // Decode base64 → JSON string → object
  let jsonString: string

  if (typeof window !== 'undefined') {
    jsonString = atob(header)
  } else {
    jsonString = Buffer.from(header, 'base64').toString('utf-8')
  }

  const parsed = JSON.parse(jsonString)
  const payload = parsed.payload

  // Restore BigInt values from their string representations
  return {
    from: payload.from as `0x${string}`,
    to: payload.to as `0x${string}`,
    value: BigInt(payload.value),
    validAfter: BigInt(payload.validAfter),
    validBefore: BigInt(payload.validBefore),
    nonce: payload.nonce as `0x${string}`,
    v: payload.v,
    r: payload.r as `0x${string}`,
    s: payload.s as `0x${string}`,
    signature: payload.signature as `0x${string}`,
  }
}

// ─── Re-export for convenience ──────────────────────────────────────────────

export { generateNonce }
