import { useEffect, useMemo } from 'react'
import type { Address } from 'viem'
import { isAddressEqual, zeroAddress } from 'viem'

import { Button } from '@/components/Button'
import { SwapForm } from '@/components/SwapForm'
import { trustWalletBscLogo } from '@/components/SwapTokenPicker'
import { useSwap } from '@/hooks/useSwap'
import type { BondToken } from '@/services/token'
import { getWethAddress } from '@/services/uniswap'
import { formatUsdTargetFromApi, shortenAddress } from '@/utils/format'

type Props = {
  token: BondToken
  onClose: () => void
}

export function SwapModal({ token, onClose }: Props) {
  const weth = getWethAddress()
  const raiseAddr = token.raiseToken as Address
  const isNativeRaise = isAddressEqual(raiseAddr, zeroAddress)

  const raiseLabel = useMemo(() => {
    if (isNativeRaise) return 'BNB'
    const s = token.raiseAsset?.symbol?.trim()
    if (s && s !== '???') return s
    return 'RAISE'
  }, [isNativeRaise, token.raiseAsset?.symbol])

  const swap = useSwap({
    memeToken: token.tokenAddress as Address,
    raiseToken: raiseAddr,
    initialTokenIn: isNativeRaise ? weth : raiseAddr,
    initialTokenOut: token.tokenAddress as Address,
  })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const poolHint = isNativeRaise
    ? 'BNB ↔ pool'
    : `${raiseLabel} ↔ pool`

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="swap-modal-title"
      onClick={onClose}
    >
      <div
        className="my-8 w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 text-center">
          <h2
            id="swap-modal-title"
            className="font-pixel text-xs text-[#4ecdc4] drop-shadow-[3px_3px_0_#000]"
          >
            DEX SWAP — {token.name}{' '}
            <span className="text-[#ffee00]">({token.symbol})</span>
          </h2>
          <p className="mt-1 font-pixel text-[7px] text-[#a78bfa]">
            Token {shortenAddress(token.tokenAddress, 6)} · {poolHint} · target{' '}
            <span className="text-[#ffee00]">
              {formatUsdTargetFromApi(token.targetValue)} USD
            </span>
          </p>
        </div>

        <SwapForm
          swap={swap}
          raiseLabel={raiseLabel}
          memeLabel={token.symbol}
          nativeLabel="BNB"
          contextMeme={{
            address: token.tokenAddress as Address,
            symbol: token.symbol,
            name: token.name,
            image: trustWalletBscLogo(token.tokenAddress),
          }}
          contextRaise={
            !isNativeRaise
              ? {
                  address: raiseAddr,
                  symbol: raiseLabel,
                  name: token.raiseAsset?.name?.trim() || raiseLabel,
                  image: token.raiseAsset?.image?.trim(),
                }
              : undefined
          }
        />

        <Button
          variant="ghost"
          className="mt-4 w-full py-3"
          onClick={onClose}
        >
          Close
        </Button>
      </div>
    </div>
  )
}
