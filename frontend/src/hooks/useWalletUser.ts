'use client'

import { useSession } from 'next-auth/react'
import { useAccount } from 'wagmi'
import type { RosettaUser } from '@/lib/types'

/** Returns a unified RosettaUser combining Auth.js session + wallet state */
export function useWalletUser(): RosettaUser {
  const { data: session } = useSession()
  const { address, isConnected } = useAccount()

  const isSignedIn = !!session?.user
  const isWalletConnected = isConnected && !!address

  return {
    name: session?.user?.name ?? null,
    email: session?.user?.email ?? null,
    image: session?.user?.image ?? null,
    address: address ?? null,
    isSignedIn,
    isWalletConnected,
    isFullyOnboarded: isSignedIn && isWalletConnected,
  }
}
