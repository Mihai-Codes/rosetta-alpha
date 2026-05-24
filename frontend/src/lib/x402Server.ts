/**
 * x402 Server Middleware — Payment Verification & Settlement for Next.js
 * ========================================================================
 * 
 * This module provides server-side middleware for Next.js App Router API routes
 * that gates access behind x402 micropayments. It handles the full server-side
 * flow:
 * 
 * 1. Check for X-PAYMENT header on incoming request
 * 2. If missing → respond with 402 + payment requirements
 * 3. If present → decode, verify, and settle the payment on-chain
 * 4. If settlement succeeds → call the actual route handler
 * 
 * Settlement uses USDC's EIP-3009 transferWithAuthorization:
 * - The server has a "settler" wallet with gas (USDC on Arc)
 * - It calls transferWithAuthorization(from, to, value, ..., v, r, s)
 * - This moves USDC from the user's wallet to the treasury
 * - The user never sends a transaction — only a signature
 * 
 * Architecture:
 * ┌─────────┐   402 + requirements    ┌──────────────┐
 * │  Client │ ◄──────────────────────  │  API Route   │
 * │         │ ──── X-PAYMENT ────────► │  (withX402)  │
 * └─────────┘                          └──────┬───────┘
 *                                             │ verify + settle
 *                                             ▼
 *                                      ┌──────────────┐
 *                                      │  Arc Chain   │
 *                                      │  (USDC EIP-  │
 *                                      │   3009)      │
 *                                      └──────────────┘
 * 
 * Usage in Next.js App Router:
 *   // app/api/premium/route.ts
 *   import { withX402 } from '@/lib/x402Server'
 *   
 *   export const GET = withX402({
 *     resource: '/api/premium',
 *     priceUsdc: 0.001,
 *     description: 'Premium data access',
 *     treasuryAddress: process.env.ROSETTA_TREASURY_ADDRESS!,
 *     arcRpcUrl: process.env.ARC_RPC_URL!,
 *     usdcAddress: process.env.NEXT_PUBLIC_USDC_ARC_ADDRESS!,
 *     settlerPrivateKey: process.env.ARC_SETTLER_PRIVATE_KEY!,
 *   }, async (req) => {
 *     return Response.json({ data: 'premium content' })
 *   })
 */

import {
  createPublicClient,
  createWalletClient,
  http,
  recoverTypedDataAddress,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { decodePaymentHeader, buildTransferAuthorizationMessage } from './eip3009'
import type { SignedAuthorization } from './eip3009'

// ─── Arc Testnet Chain Definition (server-safe, no process.env at module level) ──

/**
 * Arc Testnet chain config for viem.
 * Defined inline to avoid importing from chains.ts which may use
 * NEXT_PUBLIC_ env vars that aren't available in server context.
 */
const arcTestnet = {
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: {
    name: 'USDC',
    symbol: 'USDC',
    decimals: 6, // USDC has 6 decimals (not 18)
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.testnet.arc.network'],
    },
  },
} as const

// ─── USDC ABI (minimal — only transferWithAuthorization) ─────────────────────

/**
 * Minimal ABI for USDC's transferWithAuthorization function.
 * 
 * This is the on-chain function the settler wallet calls to execute
 * the payment. The signature (v, r, s) was created by the session key,
 * and the contract verifies it matches the `from` address.
 * 
 * Full function signature:
 * transferWithAuthorization(
 *   address from,     — who is sending USDC
 *   address to,       — who receives USDC (treasury)
 *   uint256 value,    — amount in 6-decimal units
 *   uint256 validAfter,  — earliest valid time (usually 0)
 *   uint256 validBefore, — latest valid time (timeout)
 *   bytes32 nonce,    — unique nonce (prevents replay)
 *   uint8 v,          — signature component
 *   bytes32 r,        — signature component
 *   bytes32 s         — signature component
 * )
 */
const USDC_ABI = [
  {
    name: 'transferWithAuthorization',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'validAfter', type: 'uint256' },
      { name: 'validBefore', type: 'uint256' },
      { name: 'nonce', type: 'bytes32' },
      { name: 'v', type: 'uint8' },
      { name: 'r', type: 'bytes32' },
      { name: 's', type: 'bytes32' },
    ],
    outputs: [],
  },
] as const

// ─── Types ───────────────────────────────────────────────────────────────────

export type X402ServerConfig = {
  /** The API route path being protected (e.g. '/api/premium') */
  resource: string
  /** Price in human-readable USDC (e.g. 0.001 = $0.001) */
  priceUsdc: number
  /** Human-readable description shown to client in 402 response */
  description: string
  /** Treasury address where payments are received */
  treasuryAddress: string
  /** Arc Testnet RPC URL for on-chain settlement */
  arcRpcUrl: string
  /** USDC contract address on Arc */
  usdcAddress: string
  /** Private key of the settler wallet (calls transferWithAuthorization) */
  settlerPrivateKey: string
}

// ─── Middleware ──────────────────────────────────────────────────────────────

/**
 * Wrap a Next.js App Router route handler with x402 payment gating.
 * 
 * This is the main export. It returns a new handler that:
 * 1. Checks for payment header
 * 2. Returns 402 if missing
 * 3. Verifies and settles if present
 * 4. Calls your handler if payment is valid
 * 
 * @param config - Payment configuration for this route
 * @param handler - Your actual route handler (called after successful payment)
 * @returns A new route handler with x402 payment gating
 */
export function withX402(
  config: X402ServerConfig,
  handler: (req: Request) => Promise<Response>
): (req: Request) => Promise<Response> {
  return async (req: Request): Promise<Response> => {
    // ── Step 1: Check for payment header ──
    // Support multiple header names for compatibility with different x402 clients
    // x402 V2 uses PAYMENT-SIGNATURE as the canonical header (X-PAYMENT is deprecated)
    const paymentHeader =
      req.headers.get('PAYMENT-SIGNATURE') ||
      req.headers.get('payment-signature') ||
      req.headers.get('X-PAYMENT') ||
      req.headers.get('x-payment')

    // ── Step 2: If no payment header, return 402 with requirements ──
    if (!paymentHeader) {
      return buildPaymentRequiredResponse(config)
    }

    // ── Step 3: Decode the payment header ──
    let signedAuth: SignedAuthorization
    try {
      signedAuth = decodePaymentHeader(paymentHeader)
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: 'Invalid payment header',
          detail: 'Could not decode X-PAYMENT header. Expected base64-encoded JSON.',
          code: 'INVALID_PAYMENT_HEADER',
        }),
        {
          status: 402,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // ── Step 4: Verify the payment ──
    const verification = await verifyPayment(signedAuth, config)
    if (!verification.valid) {
      return new Response(
        JSON.stringify({
          error: 'Payment verification failed',
          detail: verification.reason,
          code: 'PAYMENT_VERIFICATION_FAILED',
        }),
        {
          status: 402,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // ── Step 5: Settle the payment on-chain ──
    let txHash: string
    try {
      txHash = await settlePayment(signedAuth, config)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown settlement error'
      return new Response(
        JSON.stringify({
          error: 'Payment settlement failed',
          detail: message,
          code: 'SETTLEMENT_FAILED',
        }),
        {
          status: 402,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // ── Step 6: Payment settled! Call the actual handler ──
    const response = await handler(req)

    // Clone the response to add payment confirmation headers
    const headers = new Headers(response.headers)
    headers.set('X-PAYMENT-RESPONSE', txHash)
    headers.set('X-PAYMENT-TX-HASH', txHash)

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    })
  }
}

// ─── Payment Required Response ───────────────────────────────────────────────

/**
 * Build the 402 response body that tells the client how to pay.
 * 
 * Follows the x402 standard format:
 * - x402Version: protocol version
 * - accepts: array of payment options (network, amount, recipient, etc.)
 * 
 * The client reads this, picks a compatible option, signs a payment,
 * and retries with the X-PAYMENT header.
 */
function buildPaymentRequiredResponse(config: X402ServerConfig): Response {
  const body = {
    x402Version: '1',
    accepts: [
      {
        scheme: 'exact',
        network: 'arc-testnet-5042002',
        // Amount in atomic units (6 decimals for USDC)
        // e.g. priceUsdc=0.001 → maxAmountRequired="1000"
        maxAmountRequired: String(Math.round(config.priceUsdc * 1e6)),
        resource: config.resource,
        description: config.description,
        mimeType: 'application/json',
        payTo: config.treasuryAddress,
        maxTimeoutSeconds: 300, // 5 minutes to submit payment
        asset: config.usdcAddress,
        extra: {
          // These help the client build the correct EIP-712 domain
          name: 'USD Coin',
          version: '2',
        },
      },
    ],
  }

  return new Response(JSON.stringify(body), {
    status: 402,
    statusText: 'Payment Required',
    headers: {
      'Content-Type': 'application/json',
      // Also set the PAYMENT-REQUIRED header (base64) per newer x402 spec
      'PAYMENT-REQUIRED': Buffer.from(JSON.stringify(body)).toString('base64'),
    },
  })
}

// ─── Payment Verification ────────────────────────────────────────────────────

/**
 * Verify the signed payment authorization without executing it.
 * 
 * Checks:
 * a. validBefore > now (not expired)
 * b. value >= required amount (paying enough)
 * c. to === treasuryAddress (paying the right recipient)
 * d. Recover signer from EIP-712 signature (valid signature)
 * 
 * NOTE: In a full production system, step (d) would also verify that
 * the recovered signer is a known session key authorized by the user.
 * For the hackathon prototype, we verify the signature is valid and
 * trust the session key system.
 */
async function verifyPayment(
  signedAuth: SignedAuthorization,
  config: X402ServerConfig
): Promise<{ valid: boolean; reason?: string; signer?: `0x${string}` }> {
  // ── Check (a): Not expired ──
  const nowSeconds = BigInt(Math.floor(Date.now() / 1000))
  if (signedAuth.validBefore <= nowSeconds) {
    return {
      valid: false,
      reason: `Payment authorization expired. validBefore=${signedAuth.validBefore}, now=${nowSeconds}`,
    }
  }

  // ── Check (b): Sufficient amount ──
  const requiredAmount = BigInt(Math.round(config.priceUsdc * 1e6))
  if (signedAuth.value < requiredAmount) {
    return {
      valid: false,
      reason: `Insufficient payment. Required: ${requiredAmount}, received: ${signedAuth.value}`,
    }
  }

  // ── Check (c): Correct recipient ──
  if (signedAuth.to.toLowerCase() !== config.treasuryAddress.toLowerCase()) {
    return {
      valid: false,
      reason: `Wrong recipient. Expected: ${config.treasuryAddress}, got: ${signedAuth.to}`,
    }
  }

  // ── Check (d): Recover and verify signer ──
  try {
    // Build the typed data that was supposedly signed
    const typedData = buildTransferAuthorizationMessage(
      {
        from: signedAuth.from,
        to: signedAuth.to,
        value: signedAuth.value,
        validAfter: signedAuth.validAfter,
        validBefore: signedAuth.validBefore,
        nonce: signedAuth.nonce,
      },
      config.usdcAddress
    )

    // Recover the address that produced this signature
    const recoveredAddress = await recoverTypedDataAddress({
      domain: typedData.domain,
      types: typedData.types,
      primaryType: typedData.primaryType,
      message: typedData.message,
      signature: signedAuth.signature,
    })

    // EIP-3009 requires: ecrecover(sig) == from
    // We replicate this check server-side to fail fast before sending the tx.
    // If this doesn't match, the on-chain call would revert anyway.
    if (!recoveredAddress) {
      return { valid: false, reason: 'Could not recover signer from signature' }
    }

    if (recoveredAddress.toLowerCase() !== signedAuth.from.toLowerCase()) {
      return {
        valid: false,
        reason: `Signer mismatch. Recovered: ${recoveredAddress}, expected (from): ${signedAuth.from}. ` +
          `EIP-3009 requires the signer to be the 'from' address.`,
      }
    }

    return { valid: true, signer: recoveredAddress }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Signature verification error'
    return { valid: false, reason: `Signature verification failed: ${message}` }
  }
}

// ─── On-Chain Settlement ─────────────────────────────────────────────────────

/**
 * Execute the transferWithAuthorization on Arc to settle the payment.
 * 
 * This is where the actual USDC transfer happens:
 * 1. The settler wallet (server-controlled) submits the tx
 * 2. The USDC contract verifies the EIP-712 signature matches `from`
 * 3. If valid, USDC moves from `from` to `to`
 * 4. The settler pays the gas (USDC on Arc)
 * 
 * The settler wallet needs:
 * - A small USDC balance for gas on Arc
 * - The private key in settlerPrivateKey env var
 * - It does NOT need to hold the user's USDC
 * 
 * @param signedAuth - The verified signed authorization
 * @param config - Server config with RPC URL and settler key
 * @returns Transaction hash of the settlement
 */
async function settlePayment(
  signedAuth: SignedAuthorization,
  config: X402ServerConfig
): Promise<string> {
  // Create viem clients for Arc Testnet
  const chain = {
    ...arcTestnet,
    rpcUrls: {
      default: { http: [config.arcRpcUrl] },
    },
  }

  const publicClient = createPublicClient({
    chain,
    transport: http(config.arcRpcUrl),
  })

  const settlerAccount = privateKeyToAccount(config.settlerPrivateKey as `0x${string}`)

  const walletClient = createWalletClient({
    account: settlerAccount,
    chain,
    transport: http(config.arcRpcUrl),
  })

  // Execute transferWithAuthorization on the USDC contract
  // This is the EIP-3009 call that moves USDC using the signed authorization
  const txHash = await walletClient.writeContract({
    address: config.usdcAddress as `0x${string}`,
    abi: USDC_ABI,
    functionName: 'transferWithAuthorization',
    args: [
      signedAuth.from,          // from: address that holds USDC
      signedAuth.to,            // to: treasury address
      signedAuth.value,         // value: amount in 6-decimal units
      signedAuth.validAfter,    // validAfter: earliest valid time
      signedAuth.validBefore,   // validBefore: latest valid time
      signedAuth.nonce,         // nonce: unique bytes32
      signedAuth.v,             // v: signature recovery param
      signedAuth.r,             // r: ECDSA r component
      signedAuth.s,             // s: ECDSA s component
    ],
  })

  // Wait for transaction confirmation (1 block)
  // This ensures the payment is settled before returning the resource
  await publicClient.waitForTransactionReceipt({
    hash: txHash,
    confirmations: 1,
  })

  return txHash
}

// ─── Exports ─────────────────────────────────────────────────────────────────

export { USDC_ABI }
export type { SignedAuthorization }
