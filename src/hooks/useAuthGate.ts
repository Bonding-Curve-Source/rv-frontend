import { useCallback } from 'react'
import { toast } from 'sonner'

import { useWallet } from '@/hooks/useWallet'

/**
 * Buy/sell, swap, and create-token flows require a successful sign-in message (JWT).
 */
export function useAuthGate() {
  const { isConnected, isAuthenticated, signIn } = useWallet()

  const ensureSignedIn = useCallback(async (): Promise<boolean> => {
    if (!isConnected) {
      toast.error('Connect your wallet first')
      return false
    }
    if (isAuthenticated) return true
    return await signIn()
  }, [isAuthenticated, isConnected, signIn])

  return {
    isConnected,
    isAuthenticated,
    signIn,
    ensureSignedIn,
  }
}
