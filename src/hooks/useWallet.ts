import axios from 'axios'
import { useCallback } from 'react'
import { toast } from 'sonner'
import { useAccount, useChainId, useDisconnect, useSignMessage } from 'wagmi'

import { fetchNonce, loginWithSignature } from '@/services/auth'
import { useAuthStore } from '@/store/authStore'

export function useWallet() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { disconnect } = useDisconnect()
  const { signMessageAsync } = useSignMessage()

  const accessToken = useAuthStore((s) => s.accessToken)
  const setAccessToken = useAuthStore((s) => s.setAccessToken)
  const logoutStore = useAuthStore((s) => s.logout)

  const signIn = useCallback(async () => {
    if (!address) {
      toast.error('Connect your wallet first')
      return
    }
    try {
      const { message } = await fetchNonce(address)
      const signature = await signMessageAsync({ message })
      const { accessToken: token } = await loginWithSignature(address, signature)
      setAccessToken(token)
      toast.success('Signed in successfully')
    } catch (e: unknown) {
      let msg = ''
      if (axios.isAxiosError(e)) {
        const d = e.response?.data as { message?: string | string[] } | undefined
        if (d?.message) {
          msg = Array.isArray(d.message) ? d.message.join(', ') : d.message
        }
      }
      toast.error(
        msg || (e instanceof Error ? e.message : 'Sign-in failed'),
      )
    }
  }, [address, setAccessToken, signMessageAsync])

  const logout = useCallback(() => {
    logoutStore()
    toast.message('Logged out')
  }, [logoutStore])

  const disconnectWallet = useCallback(() => {
    logoutStore()
    disconnect()
    toast.message('Wallet disconnected')
  }, [disconnect, logoutStore])

  return {
    address,
    isConnected,
    chainId,
    accessToken,
    isAuthenticated: Boolean(accessToken),
    signIn,
    logout,
    disconnectWallet,
  }
}
