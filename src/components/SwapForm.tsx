import { useQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import type { Address } from 'viem'
import { getAddress } from 'viem'
import { useReadContract } from 'wagmi'

import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { PixelSpinner } from '@/components/PixelSpinner'
import {
  buildPickerTokens,
  SwapTokenPicker,
  trustWalletBscLogo,
  type PickerToken,
} from '@/components/SwapTokenPicker'
import { TokenInput } from '@/components/TokenInput'
import { erc20Abi } from '@/abis/erc20'
import { useSwap } from '@/hooks/useSwap'
import { fetchRaiseConfig } from '@/services/raise-config'
import { getWethAddress } from '@/services/uniswap'
import { safeFormatUnits, shortenAddress } from '@/utils/format'

type SwapApi = ReturnType<typeof useSwap>

type Props = {
  swap: SwapApi
  title?: string
  raiseLabel?: string
  memeLabel?: string
  nativeLabel?: string
  /** Meme token for this pool (graduated) — shown in picker + labels. */
  contextMeme?: {
    address: Address
    symbol: string
    name: string
    image?: string
  }
  /** Raise token for this pool (ERC20) — always listed for the active pair. */
  contextRaise?: {
    address: Address
    symbol: string
    name: string
    image?: string
  }
}

function useDisplaySymbol(
  address: Address,
  swap: SwapApi,
  raiseLabel: string,
  memeLabel: string,
  nativeLabel: string,
): string {
  const weth = getWethAddress()
  const { memeToken, raiseSideToken, isNativeRaise } = swap

  const staticLabel = useMemo(() => {
    if (address.toLowerCase() === weth.toLowerCase()) return nativeLabel
    if (address.toLowerCase() === memeToken.toLowerCase()) return memeLabel
    if (
      !isNativeRaise &&
      address.toLowerCase() === raiseSideToken.toLowerCase()
    ) {
      return raiseLabel
    }
    return null
  }, [
    address,
    weth,
    memeToken,
    raiseSideToken,
    isNativeRaise,
    raiseLabel,
    memeLabel,
    nativeLabel,
  ])

  const { data: sym } = useReadContract({
    address,
    abi: erc20Abi,
    functionName: 'symbol',
    query: { enabled: Boolean(address) && staticLabel === null },
  })

  if (staticLabel !== null) return staticLabel
  return typeof sym === 'string' ? sym : shortenAddress(address, 4)
}

function TokenSymbol({
  address,
  swap,
  raiseLabel,
  memeLabel,
  nativeLabel,
}: {
  address: Address
  swap: SwapApi
  raiseLabel: string
  memeLabel: string
  nativeLabel: string
}) {
  const text = useDisplaySymbol(
    address,
    swap,
    raiseLabel,
    memeLabel,
    nativeLabel,
  )
  return <>{text}</>
}

export function SwapForm({
  swap,
  title = 'Uniswap V2 style',
  raiseLabel = 'BNB',
  memeLabel = 'TOKEN',
  nativeLabel = 'BNB',
  contextMeme,
  contextRaise,
}: Props) {
  const weth = getWethAddress()
  const {
    tokenIn,
    tokenOut,
    setTokenIn,
    setTokenOut,
    amountInStr,
    setAmountInStr,
    slippagePercent,
    setSlippagePercent,
    expectedOut,
    amountOutMin,
    decimalsOut,
    decimalsIn,
    needsApprove,
    approve,
    swap: doSwap,
    refetchQuote,
    refetchAllowance,
    swapHash,
    swapPending,
    confirming,
    swapSuccess,
  } = swap

  const [picker, setPicker] = useState<null | 'in' | 'out'>(null)

  const { data: raiseConfig } = useQuery({
    queryKey: ['raise-config'],
    queryFn: fetchRaiseConfig,
    staleTime: 60_000,
  })

  const extras = useMemo((): PickerToken[] => {
    const out: PickerToken[] = []
    if (contextMeme) {
      out.push({
        address: contextMeme.address,
        symbol: contextMeme.symbol,
        name: contextMeme.name,
        image: contextMeme.image || trustWalletBscLogo(contextMeme.address),
      })
    }
    if (contextRaise) {
      out.push({
        address: contextRaise.address,
        symbol: contextRaise.symbol,
        name: contextRaise.name,
        image: contextRaise.image || trustWalletBscLogo(contextRaise.address),
      })
    }
    return out
  }, [contextMeme, contextRaise])

  const pickerTokens = useMemo(
    () => buildPickerTokens(weth, raiseConfig?.raiseTokens, extras),
    [weth, raiseConfig?.raiseTokens, extras],
  )

  const amountInSymbol = useDisplaySymbol(
    tokenIn,
    swap,
    raiseLabel,
    memeLabel,
    nativeLabel,
  )
  const outSymbol = useDisplaySymbol(
    tokenOut,
    swap,
    raiseLabel,
    memeLabel,
    nativeLabel,
  )

  const pickToken = useCallback(
    (side: 'in' | 'out', addr: Address) => {
      const next = getAddress(addr)
      const other = side === 'in' ? tokenOut : tokenIn
      if (next.toLowerCase() === other.toLowerCase()) {
        toast.error('Choose a different token than the other side')
        return
      }
      if (side === 'in') setTokenIn(next)
      else setTokenOut(next)
      void refetchQuote()
    },
    [refetchQuote, setTokenIn, setTokenOut, tokenIn, tokenOut],
  )

  const flipDirection = useCallback(() => {
    const prevIn = tokenIn
    setTokenIn(tokenOut)
    setTokenOut(prevIn)
    setAmountInStr('')
    void refetchQuote()
  }, [
    refetchQuote,
    setAmountInStr,
    setTokenIn,
    setTokenOut,
    tokenIn,
    tokenOut,
  ])

  useEffect(() => {
    if (swapSuccess && swapHash) {
      toast.success('Swap complete', { id: swapHash })
      void refetchQuote()
      void refetchAllowance()
    }
  }, [swapSuccess, swapHash, refetchQuote, refetchAllowance])

  const busy = swapPending || confirming

  return (
    <Card title={title}>
      <p className="mb-1 font-pixel text-[8px] text-[#a78bfa]">From</p>
      <button
        type="button"
        className="mb-3 flex w-full items-center justify-between border-4 border-black bg-[#1a0f2e] px-2 py-2 text-left font-pixel text-[9px] text-[#ffee00] shadow-[4px_4px_0_0_#000] hover:bg-[#25123a]"
        onClick={() => setPicker('in')}
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate">
            <TokenSymbol
              address={tokenIn}
              swap={swap}
              raiseLabel={raiseLabel}
              memeLabel={memeLabel}
              nativeLabel={nativeLabel}
            />
          </span>
        </span>
        <span className="shrink-0 text-[#7cff00]">▼</span>
      </button>
      <p className="mb-1 font-mono text-[7px] text-[#5c4d7a]">{tokenIn}</p>

      <div className="-my-1 flex justify-center py-1">
        <button
          type="button"
          aria-label="Reverse swap direction"
          className="flex size-9 items-center justify-center border-4 border-black bg-[#2d1b4e] font-pixel text-[12px] leading-none text-[#ffee00] shadow-[4px_4px_0_0_#000] hover:bg-[#3d2560] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_0_#000]"
          onClick={flipDirection}
        >
          ⇅
        </button>
      </div>

      <p className="mb-1 font-pixel text-[8px] text-[#a78bfa]">To</p>
      <button
        type="button"
        className="mb-3 flex w-full items-center justify-between border-4 border-black bg-[#1a0f2e] px-2 py-2 text-left font-pixel text-[9px] text-[#ffee00] shadow-[4px_4px_0_0_#000] hover:bg-[#25123a]"
        onClick={() => setPicker('out')}
      >
        <span className="truncate">
          <TokenSymbol
            address={tokenOut}
            swap={swap}
            raiseLabel={raiseLabel}
            memeLabel={memeLabel}
            nativeLabel={nativeLabel}
          />
        </span>
        <span className="shrink-0 text-[#7cff00]">▼</span>
      </button>
      <p className="mb-4 font-mono text-[7px] text-[#5c4d7a]">{tokenOut}</p>

      {picker ? (
        <SwapTokenPicker
          title={picker === 'in' ? 'Select token (in)' : 'Select token (out)'}
          tokens={pickerTokens}
          onPick={(addr) => pickToken(picker, addr)}
          onClose={() => setPicker(null)}
        />
      ) : null}

      <TokenInput
        label="Amount in"
        value={amountInStr}
        onChange={setAmountInStr}
        symbol={amountInSymbol}
        placeholder="0.0"
      />

      <div className="mt-4 grid grid-cols-2 gap-2">
        <label className="font-pixel text-[8px] text-[#c4b5fd]">
          Slippage %
          <input
            type="number"
            step="0.1"
            min="0"
            lang="en"
            inputMode="decimal"
            className="mt-1 w-full border-4 border-black bg-[#1a0f2e] px-2 py-1 text-[10px] text-[#ffee00]"
            value={slippagePercent}
            onChange={(e) =>
              setSlippagePercent(Number.parseFloat(e.target.value) || 0)
            }
          />
        </label>
      </div>

      <dl className="mt-4 space-y-1 font-pixel text-[9px] text-[#e9d5ff]">
        <div className="flex justify-between">
          <dt>Estimated out</dt>
          <dd className="text-[#7cff00]">
            {expectedOut !== undefined
              ? `${safeFormatUnits(expectedOut, decimalsOut)} ${outSymbol}`
              : '—'}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt>Min out (slippage)</dt>
          <dd className="text-[#ffee00]">
            {amountOutMin !== undefined
              ? safeFormatUnits(amountOutMin, decimalsOut)
              : '—'}
          </dd>
        </div>
        <div className="flex justify-between text-[7px] text-[#6b7280]">
          <dt>Decimals in</dt>
          <dd>{decimalsIn}</dd>
        </div>
      </dl>

      <div className="mt-6 flex flex-col gap-3">
        {needsApprove ? (
          <Button
            className="w-full py-3"
            disabled={busy}
            onClick={() => void approve()}
          >
            Approve token
          </Button>
        ) : null}
        <Button
          variant="accent"
          className="w-full py-3"
          disabled={busy}
          onClick={() => void doSwap()}
        >
          {busy ? '…' : 'Swap'}
        </Button>
      </div>

      {busy ? (
        <div className="mt-6 flex justify-center">
          <PixelSpinner label="SWAP…" />
        </div>
      ) : null}

      {swapHash ? (
        <p className="mt-4 break-all font-pixel text-[7px] text-[#86efac]">
          Tx:{' '}
          <a
            className="underline"
            href={`https://testnet.bscscan.com/tx/${swapHash}`}
            target="_blank"
            rel="noreferrer"
          >
            {swapHash}
          </a>
        </p>
      ) : null}
    </Card>
  )
}
