import { useCallback, useMemo, useState } from 'react'
import { toast } from 'sonner'
import type { Address, Hash } from 'viem'
import {
  useAccount,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from 'wagmi'

import { erc20Abi } from '@/abis/erc20'
import { uniswapV2RouterAbi } from '@/abis/uniswapV2Router'
import { appConfig } from '@/config'
import {
  getRouterAddress,
  getWethAddress,
  minAmountOut,
  swapDeadline,
} from '@/services/uniswap'
import { safeParseUnits } from '@/utils/format'

const ZERO = '0x0000000000000000000000000000000000000000' as Address

function isWeth(a: Address, weth: Address) {
  return a.toLowerCase() === weth.toLowerCase()
}

function isZeroAddress(a: Address) {
  return a.toLowerCase() === ZERO.toLowerCase()
}

function parseErr(e: unknown): string {
  if (e instanceof Error) {
    if (e.message.includes('User rejected')) return 'Cancelled in wallet'
    if (e.message.includes('insufficient funds')) return 'Insufficient ETH / token'
  }
  return e instanceof Error ? e.message : 'Swap failed'
}

export type UseSwapOptions = {
  /** Preset pair when the hook mounts (e.g. raise → graduated token in modal). */
  initialTokenIn?: Address
  initialTokenOut?: Address
  /** Graduated meme token (defaults to `appConfig.contracts.token`). */
  memeToken?: Address
  /**
   * Raise asset: `0x0` = native BNB/ETH side uses WBNB/WETH router address.
   * ERC20 = direct pair with meme for swaps.
   */
  raiseToken?: Address
}

export function useSwap(options?: UseSwapOptions) {
  const { address } = useAccount()
  const router = getRouterAddress()
  const weth = getWethAddress()

  const memeToken = options?.memeToken ?? appConfig.contracts.token
  const raiseTokenOpt = options?.raiseToken
  const isNativeRaise =
    raiseTokenOpt === undefined || isZeroAddress(raiseTokenOpt as Address)
  /** On-chain token used as “raise” side: WBNB for native, else the ERC20. */
  const raiseSideToken: Address = isNativeRaise ? weth : raiseTokenOpt!

  const [tokenIn, setTokenIn] = useState<Address>(() => {
    if (options?.initialTokenIn) return options.initialTokenIn
    return raiseSideToken
  })
  const [tokenOut, setTokenOut] = useState<Address>(() => {
    if (options?.initialTokenOut) return options.initialTokenOut
    return memeToken
  })
  const [amountInStr, setAmountInStr] = useState('')
  const [slippagePercent, setSlippagePercent] = useState<number>(
    appConfig.defaultSlippagePercent,
  )

  const { data: decIn = 18 } = useReadContract({
    address: tokenIn,
    abi: erc20Abi,
    functionName: 'decimals',
    query: {
      enabled: Boolean(tokenIn) && !isWeth(tokenIn, weth),
    },
  })

  const { data: decOut = 18 } = useReadContract({
    address: tokenOut,
    abi: erc20Abi,
    functionName: 'decimals',
    query: {
      enabled: Boolean(tokenOut) && !isWeth(tokenOut, weth),
    },
  })

  const amountInWei = useMemo(() => {
    const d = isWeth(tokenIn, weth) ? 18 : Number(decIn)
    return safeParseUnits(amountInStr, d)
  }, [amountInStr, decIn, tokenIn, weth])

  const path = useMemo((): Address[] => {
    if (tokenIn.toLowerCase() === tokenOut.toLowerCase()) return [tokenIn]
    return [tokenIn, tokenOut]
  }, [tokenIn, tokenOut])

  const { data: amountsOut, refetch: refetchQuote } = useReadContract({
    address: router,
    abi: uniswapV2RouterAbi,
    functionName: 'getAmountsOut',
    args: [amountInWei, path],
    query: {
      enabled:
        Boolean(router) &&
        amountInWei > 0n &&
        path.length >= 2 &&
        tokenIn.toLowerCase() !== tokenOut.toLowerCase(),
    },
  })

  const expectedOut = amountsOut?.[amountsOut.length - 1]
  const amountOutMin =
    expectedOut !== undefined
      ? minAmountOut(expectedOut, slippagePercent)
      : undefined

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: isWeth(tokenIn, weth) ? undefined : tokenIn,
    abi: erc20Abi,
    functionName: 'allowance',
    args:
      address && !isWeth(tokenIn, weth) ? [address, router] : undefined,
    query: {
      enabled: Boolean(address && tokenIn && !isWeth(tokenIn, weth)),
    },
  })

  const {
    writeContractAsync: writeApproveAsync,
    data: approveHash,
    isPending: approvePending,
    reset: resetApprove,
  } = useWriteContract()

  const {
    writeContractAsync: writeSwapAsync,
    data: swapHash,
    isPending: swapPending,
    reset: resetSwap,
  } = useWriteContract()

  const { isLoading: approveConfirming, isSuccess: approveSuccess } =
    useWaitForTransactionReceipt({
      hash: approveHash,
    })

  const { isLoading: swapConfirming, isSuccess: swapSuccess } =
    useWaitForTransactionReceipt({
      hash: swapHash,
    })

  const needsApprove =
    !isWeth(tokenIn, weth) &&
    allowance !== undefined &&
    amountInWei > allowance

  const approve = useCallback(async () => {
    if (isWeth(tokenIn, weth) || !address) return
    try {
      resetApprove()
      resetSwap()
      const h = await writeApproveAsync({
        address: tokenIn,
        abi: erc20Abi,
        functionName: 'approve',
        args: [router, 2n ** 256n - 1n],
      })
      toast.loading('Approving router allowance…', { id: h })
      return h as Hash
    } catch (e) {
      toast.error(parseErr(e))
    }
  }, [address, resetApprove, resetSwap, router, tokenIn, writeApproveAsync, weth])

  const swap = useCallback(async () => {
    if (!address) {
      toast.error('Connect your wallet')
      return
    }
    if (needsApprove) {
      toast.error('Approve the token for the router first (step 1)')
      return
    }
    if (amountInWei <= 0n) {
      toast.error('Enter an amount')
      return
    }
    if (expectedOut === undefined || amountOutMin === undefined) {
      toast.error('No quote — check pool / token addresses')
      return
    }
    const deadline = swapDeadline()
    const to = address

    try {
      resetSwap()
      resetApprove()
      if (isWeth(tokenIn, weth) && !isWeth(tokenOut, weth)) {
        const h = await writeSwapAsync({
          address: router,
          abi: uniswapV2RouterAbi,
          functionName: 'swapExactETHForTokens',
          args: [amountOutMin, path, to, deadline],
          value: amountInWei,
        })
        toast.loading('Swapping ETH → token…', { id: h })
        return h as Hash
      }
      if (!isWeth(tokenIn, weth) && isWeth(tokenOut, weth)) {
        const h = await writeSwapAsync({
          address: router,
          abi: uniswapV2RouterAbi,
          functionName: 'swapExactTokensForETH',
          args: [amountInWei, amountOutMin, path, to, deadline],
        })
        toast.loading('Swapping token → ETH…', { id: h })
        return h as Hash
      }
      const h = await writeSwapAsync({
        address: router,
        abi: uniswapV2RouterAbi,
        functionName: 'swapExactTokensForTokens',
        args: [amountInWei, amountOutMin, path, to, deadline],
      })
      toast.loading('Swapping token → token…', { id: h })
      return h as Hash
    } catch (e) {
      toast.error(parseErr(e))
    }
  }, [
    address,
    amountInWei,
    amountOutMin,
    expectedOut,
    path,
    resetApprove,
    resetSwap,
    router,
    tokenIn,
    tokenOut,
    writeSwapAsync,
    weth,
    needsApprove,
  ])

  /** Raise asset → meme (e.g. BNB/USDT → DD). */
  const setRaiseInMemeOut = useCallback(() => {
    setTokenIn(raiseSideToken)
    setTokenOut(memeToken)
  }, [memeToken, raiseSideToken])

  /** Meme → raise asset (e.g. DD → BNB/USDT). */
  const setMemeInRaiseOut = useCallback(() => {
    setTokenIn(memeToken)
    setTokenOut(raiseSideToken)
  }, [memeToken, raiseSideToken])

  /** @deprecated alias — same as setRaiseInMemeOut */
  const setEthInTokenOut = setRaiseInMemeOut

  /** @deprecated alias — same as setMemeInRaiseOut */
  const setTokenInEthOut = setMemeInRaiseOut

  return {
    router,
    weth,
    memeToken,
    raiseSideToken,
    isNativeRaise,
    tokenIn,
    tokenOut,
    setTokenIn,
    setTokenOut,
    amountInStr,
    setAmountInStr,
    slippagePercent,
    setSlippagePercent,
    amountInWei,
    path,
    expectedOut,
    amountOutMin,
    decimalsOut: isWeth(tokenOut, weth) ? 18 : Number(decOut),
    decimalsIn: isWeth(tokenIn, weth) ? 18 : Number(decIn),
    needsApprove,
    approve,
    swap,
    refetchQuote,
    refetchAllowance,
    approveHash: approveHash as Hash | undefined,
    approvePending,
    approveConfirming,
    approveSuccess,
    swapHash: swapHash as Hash | undefined,
    swapPending,
    swapConfirming,
    confirming: approveConfirming || swapConfirming,
    swapSuccess,
    setRaiseInMemeOut,
    setMemeInRaiseOut,
    setEthInTokenOut,
    setTokenInEthOut,
    isWethIn: isWeth(tokenIn, weth),
    isWethOut: isWeth(tokenOut, weth),
  }
}
