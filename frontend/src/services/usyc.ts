import { createPublicClient, http, type Address } from 'viem'
import { ERC20_READ_ABI, ORACLE_ABI, USYC_CONTRACTS, formatUSYC, oraclePriceToUSDC, usycToUSDC } from '@/lib/usyc'

const ARC_RPC_URL = process.env.NEXT_PUBLIC_ARC_RPC_URL || 'https://rpc.testnet.arc.network'

/**
 * Read-only USYC helper service.
 * Write operations (deposit/redeem) are intentionally omitted until access is granted.
 */
export class USYCTreasuryService {
  private client = createPublicClient({
    transport: http(ARC_RPC_URL),
  })

  async getUsycBalanceRaw(account: Address): Promise<bigint> {
    return this.client.readContract({
      address: USYC_CONTRACTS.token,
      abi: ERC20_READ_ABI,
      functionName: 'balanceOf',
      args: [account],
    })
  }

  async getUsycBalance(account: Address): Promise<number> {
    const raw = await this.getUsycBalanceRaw(account)
    return formatUSYC(raw)
  }

  async getOraclePriceRaw(): Promise<bigint> {
    const [, answer] = await this.client.readContract({
      address: USYC_CONTRACTS.oracle,
      abi: ORACLE_ABI,
      functionName: 'latestRoundData',
    })

    if (answer <= BigInt(0)) {
      throw new Error('Invalid USYC oracle price')
    }

    return answer
  }

  async getOraclePriceUSDC(): Promise<number> {
    const raw = await this.getOraclePriceRaw()
    return oraclePriceToUSDC(raw)
  }

  async getPortfolioValueUSDC(account: Address): Promise<number> {
    const [usycRaw, oracleRaw] = await Promise.all([
      this.getUsycBalanceRaw(account),
      this.getOraclePriceRaw(),
    ])

    return usycToUSDC(usycRaw, oracleRaw)
  }
}
