/**
 * Server-safe wagmi config — NO connectors (connectorsForWallets is client-only).
 * Used ONLY for cookieToInitialState() in layout.tsx (Server Component).
 * Must have identical storage + chains as the full client config so cookies parse correctly.
 */
import { createConfig, http, cookieStorage, createStorage } from 'wagmi'
import { mainnet } from 'wagmi/chains'
import { arcTestnet } from './wagmi'

export const serverConfig = createConfig({
  chains: [arcTestnet, mainnet],
  storage: createStorage({ storage: cookieStorage }),
  transports: {
    [arcTestnet.id]: http(
      process.env.NEXT_PUBLIC_ARC_RPC_URL || 'https://rpc.testnet.arc.network'
    ),
    [mainnet.id]: http(),
  },
  ssr: true,
})
