/**
 * x402 Client — Automatic HTTP 402 Payment Handler
 * ==================================================
 * 
 * This module provides a drop-in fetch() wrapper that transparently handles
 * HTTP 402 "Payment Required" responses using the active session key.
 * 
 * How it works:
 * 1. You call x402.fetch(url) instead of regular fetch(url)
 * 2. If the server returns 200/201/etc, you get the response as-is
 * 3. If the server returns 402, the client:
 *    a. Parses the payment requirements from the response
 *    b. Loads the active session key
 *    c. Checks the session has enough budget
 *    d. Signs an EIP-3009 transfer authorization with the session key
 *    e. Retries the request with the X-PAYMENT header
 *    f. Records the spend against the session budget
 * 4. All of this happens without ANY user interaction (no wallet popups)
 * 
 * This is the "invisible payments" layer that makes micropayments frictionless.
 * The user authorizes a session key once, then every API call that costs money
 * just... works.
 * 
 * x402 Protocol Headers:
 * - Request:  X-PAYMENT (base64-encoded signed payment payload)
 * - Response: PAYMENT-REQUIRED (402 body with payment options)
 * - Response: X-PAYMENT-RESPONSE (200 body with settlement confirmation)
 * 
 * Compatible with the Coinbase x402 standard:
 * https://github.com/coinbase/x402
 */

// No viem imports needed — values arrive as atomic unit strings
import { loadSessionKey, hasSessionBudget, recordSpend } from './sessionKey'
import { generateNonce } from './sessionKey'
import {
  type TransferAuthorization,
  signTransferAuthorization,
  encodePaymentHeader,
} from './eip3009'

// ─── Types ───────────────────────────────────────────────────────────────────

export type X402Config = {
  /** USDC contract address on Arc (from env NEXT_PUBLIC_USDC_ARC_ADDRESS) */
  usdcAddress: string
  /** Max retry attempts after initial 402 (default: 1) */
  maxRetries?: number
  /** Called when session key is missing or expired — trigger re-auth UI */
  onSessionExpired?: () => void
  /** Called after successful payment settlement */
  onPaymentSuccess?: (txHash: string, amount: number) => void
  /** Called when payment would exceed session budget */
  onInsufficientBudget?: (required: number, available: number) => void
}

/**
 * Payment requirement as returned in a 402 response body.
 * 
 * The server tells us: "To access this resource, pay X USDC
 * to address Y on network Z within N seconds."
 */
export type PaymentRequirement = {
  /** Payment scheme (e.g. "exact" — pay exactly this amount) */
  scheme: string
  /** Blockchain network identifier */
  network: string
  /** Amount required in USDC atomic units as a string */
  maxAmountRequired: string
  /** The resource URL being paid for */
  resource: string
  /** Human-readable description of what you're paying for */
  description: string
  /** Treasury/recipient address to pay */
  payTo: string
  /** How long (seconds) the payment authorization is valid */
  maxTimeoutSeconds: number
  /** Token contract address (USDC on Arc) */
  asset: string
  /** Optional extra metadata (token name, version, etc.) */
  extra?: Record<string, unknown>
}

// ─── Custom Errors ───────────────────────────────────────────────────────────

/**
 * Thrown when x402 payment is required but no session key is active.
 * The UI should respond by showing the session key authorization modal.
 */
export class X402SessionRequired extends Error {
  constructor(public requirement: PaymentRequirement) {
    super(
      'x402: No active session key. User must authorize a session key to make payments.'
    )
    this.name = 'X402SessionRequired'
  }
}

/**
 * Thrown when the payment would exceed the session's spending budget.
 * The UI should show the user how much budget remains and offer to
 * create a new session with a higher limit.
 */
export class X402InsufficientBudget extends Error {
  constructor(
    public required: number,
    public available: number
  ) {
    super(
      `x402: Insufficient session budget. Required: $${required.toFixed(4)}, ` +
      `Available: $${available.toFixed(4)}`
    )
    this.name = 'X402InsufficientBudget'
  }
}

/**
 * Thrown when the server rejects the payment after we submitted it.
 * This could mean: invalid signature, nonce already used, transfer failed, etc.
 */
export class X402PaymentFailed extends Error {
  constructor(
    public statusCode: number,
    public serverMessage: string
  ) {
    super(`x402: Payment rejected by server (${statusCode}): ${serverMessage}`)
    this.name = 'X402PaymentFailed'
  }
}

/**
 * Thrown when the server's 402 response doesn't include any payment option
 * compatible with our setup (Arc Testnet + USDC).
 */
export class X402NoCompatiblePayment extends Error {
  constructor(public availableNetworks: string[]) {
    super(
      `x402: No compatible payment option. Server accepts: [${availableNetworks.join(', ')}], ` +
      `but we need arc-testnet with USDC.`
    )
    this.name = 'X402NoCompatiblePayment'
  }
}

// ─── Payment Requirement Parsing ─────────────────────────────────────────────

/**
 * Parse payment requirements from a 402 response.
 * 
 * The x402 protocol specifies that 402 responses include payment options
 * in the response body (JSON with an `accepts` array). We filter for
 * options compatible with Arc Testnet and USDC.
 * 
 * @param response - The HTTP 402 response
 * @returns Array of compatible payment requirements
 * @throws X402NoCompatiblePayment if no Arc+USDC option found
 */
export async function parsePaymentRequirements(
  response: Response
): Promise<PaymentRequirement[]> {
  let body: { accepts?: PaymentRequirement[]; x402Version?: string }

  try {
    body = await response.json()
  } catch {
    throw new X402NoCompatiblePayment(['(unparseable response body)'])
  }

  const accepts = body.accepts || []

  // Filter for Arc Testnet compatible options
  // Accept various network name formats the server might use
  const compatible = accepts.filter((req) => {
    const networkMatch =
      req.network === 'arc-testnet-5042002' ||
      req.network === 'arc-testnet' ||
      req.network?.includes('5042002')

    // Verify it's requesting USDC (by checking the asset address)
    const assetMatch =
      !req.asset || // If no asset specified, assume USDC (single-token chain)
      req.asset.toLowerCase() === process.env.NEXT_PUBLIC_USDC_ARC_ADDRESS?.toLowerCase()

    return networkMatch && assetMatch
  })

  if (compatible.length === 0) {
    const networks = accepts.map((r) => r.network)
    throw new X402NoCompatiblePayment(networks)
  }

  return compatible
}

// ─── Client Factory ──────────────────────────────────────────────────────────

/**
 * Create an x402-aware HTTP client.
 * 
 * Usage:
 *   const client = createX402Client({ usdcAddress: '0x...' })
 *   const response = await client.fetch('/api/premium-data')
 *   // If the endpoint requires payment, it's handled automatically!
 * 
 * @param config - Client configuration
 * @returns Object with an x402-aware fetch method
 */
export function createX402Client(config: X402Config) {
  const { usdcAddress, maxRetries = 1, onSessionExpired, onPaymentSuccess, onInsufficientBudget } = config

  // Capture reference to the global fetch to avoid shadowing issues
  // (our returned object also has a method named 'fetch')
  const httpFetch = globalThis.fetch

  return {
    /**
     * x402-aware fetch — drop-in replacement for window.fetch().
     * 
     * Makes the initial request. If 402 is returned, automatically:
     * 1. Parses payment requirements
     * 2. Signs payment with session key
     * 3. Retries with X-PAYMENT header
     * 
     * @param url - The URL to fetch
     * @param options - Standard RequestInit options
     * @returns The final Response (either original non-402, or post-payment response)
     */
    async fetch(url: string, options?: RequestInit): Promise<Response> {
      // ── Step 1: Make the initial request ──
      const initialResponse = await httpFetch(url, options)

      // ── Step 2: If not 402, return as-is (no payment needed) ──
      if (initialResponse.status !== 402) {
        return initialResponse
      }

      // ── Step 3: Parse payment requirements from 402 body ──
      const requirements = await parsePaymentRequirements(initialResponse)
      // Use the first compatible requirement (they're ordered by server preference)
      const requirement = requirements[0]

      // ── Step 4: Load active session key ──
      const sessionKey = loadSessionKey()
      if (!sessionKey) {
        // No session key — user needs to authorize one
        onSessionExpired?.()
        throw new X402SessionRequired(requirement)
      }

      // ── Step 5: Check session budget ──
      // Convert from atomic units (string) to human-readable USDC
      const requiredAmountUsdc = Number(requirement.maxAmountRequired) / 1e6

      if (!hasSessionBudget(requiredAmountUsdc)) {
        const available = sessionKey.config.maxAmountUsdc - sessionKey.spentUsdc
        onInsufficientBudget?.(requiredAmountUsdc, available)
        throw new X402InsufficientBudget(requiredAmountUsdc, available)
      }

      // ── Step 6: Build the transfer authorization ──
      // CRITICAL: EIP-3009 requires ecrecover(sig) == from.
      // Since the SESSION KEY signs, `from` MUST be the session key's address.
      // This means the session key address must hold USDC (user funds it during setup).
      // This is the standard session-key pattern: user pre-funds the ephemeral address.
      const transferAuth: TransferAuthorization = {
        // from = the session key address (which holds pre-funded USDC)
        from: sessionKey.address,
        // to = the treasury address specified in the 402 response
        to: requirement.payTo as `0x${string}`,
        // value = amount in USDC atomic units (6 decimals)
        // maxAmountRequired is already a string of atomic units (e.g. "1000" = $0.001)
        value: BigInt(requirement.maxAmountRequired),
        // validAfter = 0 (can be executed immediately)
        validAfter: BigInt(0),
        // validBefore = now + server's timeout window
        validBefore: BigInt(
          Math.floor(Date.now() / 1000) + (requirement.maxTimeoutSeconds || 300)
        ),
        // nonce = fresh random bytes32 (prevents replay)
        nonce: generateNonce(),
      }

      // ── Step 7: Sign with the session key ──
      // This is the magic — session key signs, no wallet popup!
      const signedAuth = await signTransferAuthorization(
        transferAuth,
        sessionKey,
        usdcAddress
      )

      // ── Step 8: Encode as X-PAYMENT header ──
      const paymentHeader = encodePaymentHeader(signedAuth)

      // ── Step 9: Retry the request with payment header ──
      let attempts = 0
      let finalResponse: Response | null = null

      while (attempts <= maxRetries) {
        finalResponse = await httpFetch(url, {
          ...options,
          headers: {
            ...options?.headers,
            // x402 payment header — some servers use X-PAYMENT,
            // others use PAYMENT-SIGNATURE. We send both for compatibility.
            'X-PAYMENT': paymentHeader,
            'PAYMENT-SIGNATURE': paymentHeader,
          },
        })

        // ── Step 10: Success! Record the spend ──
        if (finalResponse.status >= 200 && finalResponse.status < 300) {
          recordSpend(requiredAmountUsdc)

          // Extract tx hash from response header if available
          const txHash =
            finalResponse.headers.get('X-PAYMENT-RESPONSE') ||
            finalResponse.headers.get('x-payment-tx-hash') ||
            'unknown'

          onPaymentSuccess?.(txHash, requiredAmountUsdc)
          return finalResponse
        }

        // ── Step 11: Still 402 after payment — fail ──
        if (finalResponse.status === 402) {
          attempts++
          if (attempts > maxRetries) {
            const errorBody = await finalResponse.text().catch(() => 'Unknown error')
            throw new X402PaymentFailed(402, errorBody)
          }
          // Brief delay before retry
          await new Promise((resolve) => setTimeout(resolve, 500))
          continue
        }

        // Other error — return as-is (not a payment issue)
        return finalResponse
      }

      // Should not reach here, but TypeScript needs it
      throw new X402PaymentFailed(
        finalResponse?.status || 500,
        'Max retries exceeded'
      )
    },
  }
}

// ─── Default Client Instance ─────────────────────────────────────────────────

/**
 * Pre-configured x402 client using environment variables.
 * 
 * Usage in components:
 *   import { x402 } from '@/lib/x402Client'
 *   const res = await x402.fetch('/api/premium-endpoint')
 * 
 * The onSessionExpired callback should be connected to your
 * SessionKeyManager component to trigger the authorization modal.
 */
export const x402 = createX402Client({
  usdcAddress: process.env.NEXT_PUBLIC_USDC_ARC_ADDRESS!,
  onSessionExpired: () => {
    // Dispatch a custom event that the SessionKeyManager component listens to.
    // This decouples the payment client from React component tree.
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('x402:session-expired'))
    }
  },
  onPaymentSuccess: (_txHash, amount) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('x402:payment-success', {
          detail: { amount },
        })
      )
    }
  },
  onInsufficientBudget: (required, available) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('x402:insufficient-budget', {
          detail: { required, available },
        })
      )
    }
  },
})
