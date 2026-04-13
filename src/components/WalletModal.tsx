import { useEffect } from 'react'

import { useWallet } from '@/hooks/useWallet'
import { shortenAddress } from '@/utils/format'

import { Button } from './Button'

type Props = {
  open: boolean
  onClose: () => void
}

export function WalletModal({ open, onClose }: Props) {
  const {
    address,
    isConnected,
    isAuthenticated,
    signIn,
    logout,
    disconnectWallet,
  } = useWallet()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="retro-card max-w-sm p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-pixel mb-4 text-center text-xs text-[#ffee00]">
          WALLET
        </h3>
        {!isConnected ? (
          <p className="font-pixel mb-4 text-center text-[10px] text-[#c4b5fd]">
            Connect a wallet from the bar above.
          </p>
        ) : (
          <div className="space-y-3 font-pixel text-[9px] text-[#e9d5ff]">
            <p>
              <span className="text-[#7cff00]">Address:</span>{' '}
              {address ? shortenAddress(address, 6) : '—'}
            </p>
            <p>
              <span className="text-[#7cff00]">JWT:</span>{' '}
              {isAuthenticated ? 'stored' : 'not signed in'}
            </p>
            <div className="flex flex-col gap-2 pt-2">
              {!isAuthenticated ? (
                <Button className="w-full py-3" onClick={() => void signIn()}>
                  Sign in
                </Button>
              ) : (
                <Button
                  variant="accent"
                  className="w-full py-3"
                  onClick={logout}
                >
                  Log out (clear JWT)
                </Button>
              )}
              <Button
                variant="ghost"
                className="w-full py-3"
                onClick={disconnectWallet}
              >
                Disconnect
              </Button>
            </div>
          </div>
        )}
        <Button variant="ghost" className="mt-4 w-full py-2" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  )
}
