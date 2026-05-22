import { createPublicClient, http, isAddress, type Address } from 'viem'

export const ARC_CHAIN_ID = 5042002
export const ARC_RPC_URL = process.env.NEXT_PUBLIC_ARC_RPC_URL || 'https://rpc.testnet.arc.network'

export const ERC8004_CONTRACTS = {
  identityRegistry: '0x8004A818BFB912233c491871b3d84c89A494BD9e' as Address,
  reputationRegistry: '0x8004B663056A597Dffe9eCcC1965A193B7388713' as Address,
  validationRegistry: '0x8004Cb1BF31DAf7788923b405b754f57acEB4272' as Address,
} as const

export const ERC721_MIN_ABI = [
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const

function envAddress(value: string | undefined): Address | null {
  if (!value) return null
  return isAddress(value) ? (value as Address) : null
}

export const ERC8004_DESK_WALLETS: Array<{ desk: string; wallet: Address | null }> = [
  { desk: 'US', wallet: envAddress(process.env.NEXT_PUBLIC_AGENT_US_WALLET) },
  { desk: 'CHINA', wallet: envAddress(process.env.NEXT_PUBLIC_AGENT_CHINA_WALLET) },
  { desk: 'EU', wallet: envAddress(process.env.NEXT_PUBLIC_AGENT_EU_WALLET) },
  { desk: 'JAPAN', wallet: envAddress(process.env.NEXT_PUBLIC_AGENT_JAPAN_WALLET) },
  { desk: 'CRYPTO', wallet: envAddress(process.env.NEXT_PUBLIC_AGENT_CRYPTO_WALLET) },
]

export function createArcPublicClient() {
  return createPublicClient({ transport: http(ARC_RPC_URL) })
}
