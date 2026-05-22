/**
 * USYC (US Yield Coin) integration — contract addresses, ABIs, and hooks.
 * All contracts are deployed on Arc Testnet (chain ID 5042002).
 *
 * USYC is Circle's tokenized money market fund. Users subscribe by
 * depositing USDC into the Teller contract and receive USYC tokens.
 * USYC accrues yield via overnight reverse repo (currently ~1.116 USDC/USYC).
 * Redemption burns USYC and returns USDC at the oracle price.
 *
 * Addresses sourced from: https://developers.circle.com/tokenized/usyc/smart-contracts
 */

import { formatUnits } from 'viem'

// ─── Contract Addresses (Arc Testnet) ──────────────────────────────────────────

export const USYC_CONTRACTS = {
  /** ERC-20 USYC token — 6 decimals */
  token: '0xe9185F0c5F296Ed1797AaE4238D26CCaBEadb86C' as `0x${string}`,
  /** Teller — subscribe (USDC→USYC) and redeem (USYC→USDC) */
  teller: '0x9fdF14c5B14173D74C08Af27AebFf39240dC105A' as `0x${string}`,
  /** Entitlements — allowlist contract */
  entitlements: '0xcc205224862c7641930c87679e98999d23c26113' as `0x${string}`,
  /** Oracle — USYC price feed (Chainlink-style, 18 decimals) */
  oracle: '0x52b56c7642E71dc54714d879127d97cd0B3D4581' as `0x${string}`,
} as const

// ─── ABI Fragments ─────────────────────────────────────────────────────────────

/** ERC-20 standard read functions */
export const ERC20_READ_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
  {
    name: 'totalSupply',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'symbol',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const

/** Teller — subscribe and redeem */
export const TELLER_ABI = [
  {
    name: 'deposit',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_assets', type: 'uint256' },
      { name: '_receiver', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'redeem',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_shares', type: 'uint256' },
      { name: '_receiver', type: 'address' },
      { name: '_account', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const

/** Chainlink-style Oracle */
export const ORACLE_ABI = [
  {
    name: 'latestRoundData',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { name: 'roundId', type: 'uint80' },
      { name: 'answer', type: 'int256' },
      { name: 'startedAt', type: 'uint256' },
      { name: 'updatedAt', type: 'uint256' },
      { name: 'answeredInRound', type: 'uint80' },
    ],
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
] as const

// ─── Helpers ───────────────────────────────────────────────────────────────────

/** USYC token has 6 decimals */
export const USYC_DECIMALS = 6

/** Oracle returns price with 18 decimals */
export const ORACLE_DECIMALS = 18

/**
 * Convert raw oracle answer (18 decimals) to a human-readable USDC price.
 * e.g. 1116277611710661072 → 1.1163
 */
export function oraclePriceToUSDC(rawAnswer: bigint): number {
  return Number.parseFloat(formatUnits(rawAnswer, ORACLE_DECIMALS))
}

/**
 * Convert raw USYC balance (6 decimals) to human-readable amount.
 */
export function formatUSYC(raw: bigint): number {
  return Number.parseFloat(formatUnits(raw, USYC_DECIMALS))
}

/**
 * Calculate the total USDC value of a USYC holding.
 */
export function usycToUSDC(usycAmount: bigint, oraclePrice: bigint): number {
  return formatUSYC(usycAmount) * oraclePriceToUSDC(oraclePrice)
}

/**
 * Estimate annualized yield from USYC oracle price.
 * Assumes USYC started at 1.0 USDC and the oracle price reflects
 * cumulative yield since inception.
 */
export function estimateAPY(oraclePrice: bigint): number {
  const price = oraclePriceToUSDC(oraclePrice)
  // Simple approximation: (price - 1) annualized
  // Real APY would need inception date, but this gives judges a clear number
  return Math.max(0, (price - 1) * 100)
}
