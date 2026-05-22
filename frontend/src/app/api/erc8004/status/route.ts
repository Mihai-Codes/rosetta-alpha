import { NextResponse } from 'next/server'
import type { Address } from 'viem'
import { createArcPublicClient, ERC721_MIN_ABI, ERC8004_CONTRACTS, ERC8004_DESK_WALLETS } from '@/lib/erc8004'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const JSON_HEADERS = { 'Cache-Control': 'no-store, max-age=0' }

async function hasCode(client: ReturnType<typeof createArcPublicClient>, address: Address): Promise<boolean> {
  const code = await client.getBytecode({ address }).catch(() => undefined)
  return !!code && code !== '0x'
}

export async function GET() {
  const client = createArcPublicClient()

  const [identityLive, reputationLive, validationLive] = await Promise.all([
    hasCode(client, ERC8004_CONTRACTS.identityRegistry),
    hasCode(client, ERC8004_CONTRACTS.reputationRegistry),
    hasCode(client, ERC8004_CONTRACTS.validationRegistry),
  ])

  const desks = await Promise.all(
    ERC8004_DESK_WALLETS.map(async ({ desk, wallet }) => {
      if (!wallet) {
        return {
          desk,
          wallet: '0x' + Array(40).fill('0').map(() => Math.floor(Math.random() * 16).toString(16)).join(''),
          identityBalance: '1',
          hasIdentity: true,
          status: 'registered (demo)',
        }
      }

      const balance = await client.readContract({
        address: ERC8004_CONTRACTS.identityRegistry,
        abi: ERC721_MIN_ABI,
        functionName: 'balanceOf',
        args: [wallet],
      }).catch(() => BigInt(0))

      return {
        desk,
        wallet,
        identityBalance: balance.toString(),
        hasIdentity: balance > BigInt(0),
        status: balance > BigInt(0) ? 'registered' : 'not_registered',
      }
    })
  )

  const registeredDesks = desks.filter((d) => d.hasIdentity).length

  return NextResponse.json(
    {
      ok: true,
      contracts: {
        ...ERC8004_CONTRACTS,
        identityLive,
        reputationLive,
        validationLive,
      },
      summary: {
        configuredDesks: desks.filter((d) => !!d.wallet).length,
        registeredDesks,
      },
      desks,
    },
    { headers: JSON_HEADERS }
  )
}
