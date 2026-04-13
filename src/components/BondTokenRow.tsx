import { useEffect, useState } from 'react'
import type { Address } from 'viem'

import { useBondingProgress } from '@/hooks/useBondingProgress'
import { useRaiseTokenDisplay } from '@/hooks/useRaiseTokenDisplay'
import type { BondToken } from '@/services/token'
import { formatUsdTargetFromApi, shortenAddress } from '@/utils/format'

type Props = {
  token: BondToken
  onSelect: () => void
}

export function BondTokenRow({ token, onSelect }: Props) {
  const { label, isLoading } = useBondingProgress(
    token.bondingCurve as Address,
  )
  const { displaySymbol, displayImage, symbolLoading } = useRaiseTokenDisplay(
    token.raiseToken,
    token.raiseAsset,
  )
  const [imgFailed, setImgFailed] = useState(false)

  useEffect(() => {
    setImgFailed(false)
  }, [displayImage])

  const showRaiseIcon = Boolean(displayImage) && !imgFailed

  return (
    <button
      type="button"
      className="retro-card w-full cursor-pointer px-4 py-3 text-left font-pixel text-[9px] text-[#e9d5ff] transition hover:ring-2 hover:ring-[#7cff00]"
      onClick={onSelect}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2">
          {showRaiseIcon ? (
            <img
              src={displayImage}
              alt=""
              className="size-7 shrink-0 rounded-full border border-[#4c1d95] bg-black/30 object-cover"
              onError={() => setImgFailed(true)}
            />
          ) : null}
          <span className="min-w-0 text-[#ffee00]">
            {token.name}{' '}
            <span className="text-[#4ecdc4]">({token.symbol})</span>
          </span>
        </span>
        <span
          className="shrink-0 font-pixel text-[9px] text-[#7cff00]"
          title="Progress toward DEX listing (on-chain)"
        >
          {isLoading ? '…' : label}
        </span>
      </div>
      <p className="mt-1 flex flex-wrap items-baseline gap-x-1 gap-y-0.5 text-[7px] leading-relaxed text-[#6b7280] [word-break:break-word]">
        <span className="shrink-0">{shortenAddress(token.tokenAddress, 6)}</span>
        <span className="text-[#4c1d95]">·</span>
        <span className="min-w-0">
          curve {shortenAddress(token.bondingCurve, 4)}
        </span>
        <span className="text-[#4c1d95]">·</span>
        <span className="min-w-0">
          raise{' '}
          <span className="text-[#a78bfa]">
            {symbolLoading ? '…' : displaySymbol}
          </span>
        </span>
        <span className="text-[#4c1d95]">·</span>
        <span className="min-w-0">
          target{' '}
          <span
            className="text-[#ffee00]"
            title="USD — targetValue on-chain (scale 1e18)"
          >
            {formatUsdTargetFromApi(token.targetValue)} USD
          </span>
        </span>
      </p>
    </button>
  )
}
