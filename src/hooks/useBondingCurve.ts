import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import type { Address, Hash } from 'viem'
import { isAddressEqual, zeroAddress } from 'viem'
import { getPublicClient, waitForTransactionReceipt } from '@wagmi/core'
import {
  useAccount,
  useBalance,
  useBlock,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from 'wagmi'

import { bondingCurveAbi } from '@/abis/bondingCurve'
import { erc20Abi } from '@/abis/erc20'
import { memeCoinFactoryAbi } from '@/abis/memeCoinFactory'
import { uniswapV2RouterAbi } from '@/abis/uniswapV2Router'
import { appConfig } from '@/config'
import { getBondingCurveAddress, getTokenAddress } from '@/services/contract'
import {
  getRouterAddress,
  getWethAddress,
  minAmountOut,
} from '@/services/uniswap'
import { safeFormatUnits, safeParseUnits } from '@/utils/format'
import { wagmiConfig } from '@/wagmi'

/** WBNB `deposit()` — wrap native BNB when raise token is WBNB */
const wbnbDepositAbi = [
  {
    type: 'function',
    name: 'deposit',
    stateMutability: 'payable',
    inputs: [],
    outputs: [],
  },
] as const

/** Input string: enough precision so `parseUnits` round-trips to the same `raw` (clipping decimals skews wei / bond progress). */
function formatRaiseInputString(raw: bigint, decimals: number): string {
  const s = safeFormatUnits(raw, decimals)
  if (!s.includes('.')) return s
  const [intPart, decPart] = s.split('.')
  const clipped = decPart.slice(0, decimals).replace(/0+$/, '')
  return clipped.length > 0 ? `${intPart}.${clipped}` : intPart
}

function parseContractError(e: unknown): string {
  if (e instanceof Error) {
    const m = e.message
    if (m.includes('User rejected')) return 'Transaction rejected in wallet'
    if (m.includes('insufficient funds')) return 'Insufficient balance for gas / trade'
  }
  return e instanceof Error ? e.message : 'Transaction failed'
}

function raiseQuoteExceedsPerOrderLimit(quoteWei: bigint, maxRaw: bigint): boolean {
  if (quoteWei <= 0n || maxRaw <= 0n) return false
  if (quoteWei <= maxRaw) return false
  const overshoot = quoteWei - maxRaw
  const slack = maxRaw / 10000n > 0n ? maxRaw / 10000n : 1n
  return overshoot > slack
}

export type BondingCurveOverrides = {
  tokenAddress: Address
  bondingCurveAddress: Address
}

export function useBondingCurve(overrides?: BondingCurveOverrides) {
  const { address } = useAccount()
  const curve = overrides?.bondingCurveAddress ?? getBondingCurveAddress()
  const token = overrides?.tokenAddress ?? getTokenAddress()
  const factory = appConfig.contracts.memeFactory

  const { data: decimals = 18 } = useReadContract({
    address: token,
    abi: erc20Abi,
    functionName: 'decimals',
    query: { enabled: Boolean(token) },
  })

  const { data: symbol = 'TKN' } = useReadContract({
    address: token,
    abi: erc20Abi,
    functionName: 'symbol',
    query: { enabled: Boolean(token) },
  })

  const { data: totalSupply, refetch: refetchSupply } = useReadContract({
    address: token,
    abi: erc20Abi,
    functionName: 'totalSupply',
    query: { enabled: Boolean(token) },
  })

  const { data: isDex, refetch: refetchIsDex } = useReadContract({
    address: curve,
    abi: bondingCurveAbi,
    functionName: 'isDex',
    query: { enabled: Boolean(curve) },
  })

  const { data: targetRaiseBalance, refetch: refetchTargetRaiseBalance } =
    useReadContract({
      address: curve,
      abi: bondingCurveAbi,
      functionName: 'TARGET_TOKEN_BALANCE',
      query: { enabled: Boolean(curve) },
    })

  const { data: curveTotalRaiseIn, refetch: refetchCurveTotalRaiseIn } =
    useReadContract({
      address: curve,
      abi: bondingCurveAbi,
      functionName: 'totalTokenIn',
      query: { enabled: Boolean(curve) },
    })

  const { data: tokenRaise, refetch: refetchTokenRaise } = useReadContract({
    address: curve,
    abi: bondingCurveAbi,
    functionName: 'tokenRaise',
    query: { enabled: Boolean(curve) },
  })

  const { data: raiseDecimals = 18 } = useReadContract({
    address: curve,
    abi: bondingCurveAbi,
    functionName: 'raiseDecimals',
    query: { enabled: Boolean(curve) },
  })

  const isNativeRaise =
    tokenRaise !== undefined && isAddressEqual(tokenRaise as Address, zeroAddress)

  const raiseTokenAddr =
    tokenRaise !== undefined && !isNativeRaise ? (tokenRaise as Address) : undefined

  const router = getRouterAddress()
  const weth = getWethAddress()
  const isRaiseSameAsWeth = Boolean(
    raiseTokenAddr &&
      raiseTokenAddr.toLowerCase() === weth.toLowerCase(),
  )

  const [buyPaymentMode, setBuyPaymentModeState] = useState<'raise' | 'bnb'>(
    'raise',
  )
  const [buyBnbStr, setBuyBnbStr] = useState('')

  const { data: raiseSymbol = 'RAISE' } = useReadContract({
    address: raiseTokenAddr,
    abi: erc20Abi,
    functionName: 'symbol',
    query: { enabled: Boolean(raiseTokenAddr) },
  })

  const raiseKindReadyEarly = tokenRaise !== undefined

  const { data: nativeBalance } = useBalance({
    address,
    query: {
      enabled: Boolean(
        address &&
          raiseKindReadyEarly &&
          (isNativeRaise || buyPaymentMode === 'bnb'),
      ),
    },
  })

  const { data: price, refetch: refetchPrice } = useReadContract({
    address: curve,
    abi: bondingCurveAbi,
    functionName: 'getCurrentPriceInToken',
    query: { enabled: Boolean(curve) },
  })

  const { data: launchTime, refetch: refetchLaunchTime } = useReadContract({
    address: curve,
    abi: bondingCurveAbi,
    functionName: 'launchTime',
    query: { enabled: Boolean(curve) },
  })

  const { data: maxBuyAmountRaw, refetch: refetchMaxBuyAmount } = useReadContract({
    address: curve,
    abi: bondingCurveAbi,
    functionName: 'maxBuyAmount',
    query: { enabled: Boolean(curve) },
  })

  const { data: maxBuyInitialAntiBotRaw, refetch: refetchMaxBuyAnti } =
    useReadContract({
      address: curve,
      abi: bondingCurveAbi,
      functionName: 'maxBuyInitialAntiBot',
      query: { enabled: Boolean(curve) },
    })

  const { data: antiBotDurationSec, refetch: refetchAntiBotDuration } =
    useReadContract({
      address: curve,
      abi: bondingCurveAbi,
      functionName: 'ANTI_BOT_DURATION',
      query: { enabled: Boolean(curve) },
    })

  const { data: block } = useBlock({ watch: true })

  const [buyRaiseStr, setBuyRaiseStr] = useState('')
  const [sellTokenStr, setSellTokenStr] = useState('')

  const setBuyPaymentMode = useCallback((m: 'raise' | 'bnb') => {
    setBuyPaymentModeState(m)
    if (m === 'raise') setBuyBnbStr('')
    else setBuyRaiseStr('')
  }, [])

  useEffect(() => {
    setBuyRaiseStr('')
    setSellTokenStr('')
    setBuyBnbStr('')
    setBuyPaymentModeState('raise')
  }, [token, curve, tokenRaise])

  const raiseUnitDecimals = isNativeRaise ? 18 : Number(raiseDecimals)

  const buyRaiseWei = useMemo(
    () => safeParseUnits(buyRaiseStr, raiseUnitDecimals),
    [buyRaiseStr, raiseUnitDecimals],
  )

  const buyBnbWei = useMemo(
    () => safeParseUnits(buyBnbStr, 18),
    [buyBnbStr],
  )

  const swapPathBnbToRaise = useMemo((): Address[] | undefined => {
    if (!raiseTokenAddr || isNativeRaise) return undefined
    if (isRaiseSameAsWeth) return undefined
    return [weth, raiseTokenAddr]
  }, [isNativeRaise, isRaiseSameAsWeth, raiseTokenAddr, weth])

  const { data: amountsOutBnb } = useReadContract({
    address: router,
    abi: uniswapV2RouterAbi,
    functionName: 'getAmountsOut',
    args:
      buyBnbWei > 0n && swapPathBnbToRaise
        ? [buyBnbWei, swapPathBnbToRaise]
        : undefined,
    query: {
      enabled: Boolean(
        router &&
          !isNativeRaise &&
          buyPaymentMode === 'bnb' &&
          buyBnbWei > 0n &&
          swapPathBnbToRaise &&
          swapPathBnbToRaise.length >= 2,
      ),
    },
  })

  const quotedRaiseFromBnb = useMemo(() => {
    if (isNativeRaise || buyPaymentMode !== 'bnb') return undefined
    if (buyBnbWei <= 0n) return undefined
    if (isRaiseSameAsWeth) return buyBnbWei
    return amountsOutBnb?.[amountsOutBnb.length - 1]
  }, [
    amountsOutBnb,
    buyBnbWei,
    buyPaymentMode,
    isNativeRaise,
    isRaiseSameAsWeth,
  ])

  const buyQuoteWei = useMemo(() => {
    if (isNativeRaise) return buyRaiseWei
    if (buyPaymentMode === 'raise') return buyRaiseWei
    return quotedRaiseFromBnb ?? 0n
  }, [
    buyPaymentMode,
    buyRaiseWei,
    isNativeRaise,
    quotedRaiseFromBnb,
  ])

  const chainNow = block?.timestamp

  const buyPerTxLimits = useMemo(() => {
    const duration = antiBotDurationSec ?? 60n
    const maxNorm = maxBuyAmountRaw ?? 0n
    const maxAnti = maxBuyInitialAntiBotRaw ?? 0n
    const launchedAt = launchTime ?? 0n
    const maxDuringAnti =
      maxNorm > 0n && maxAnti > 0n
        ? (maxAnti < maxNorm ? maxAnti : maxNorm)
        : maxNorm > 0n
          ? maxNorm
          : maxAnti
    const inAnti =
      chainNow !== undefined &&
      launchedAt > 0n &&
      chainNow <= launchedAt + duration
    const effectiveMaxRaw = inAnti ? maxDuringAnti : maxNorm > 0n ? maxNorm : maxAnti
    const antiBotEndsAt =
      launchedAt > 0n ? launchedAt + duration : undefined
    let secondsLeftInAntiBot: bigint | undefined
    if (inAnti && antiBotEndsAt !== undefined && chainNow !== undefined) {
      const left = antiBotEndsAt - chainNow
      secondsLeftInAntiBot = left > 0n ? left : 0n
    }
    return {
      effectiveMaxRaw,
      isAntiBotPhase: Boolean(inAnti),
      antiBotEndsAt,
      secondsLeftInAntiBot,
      maxAfterAntiRaw: maxNorm,
      maxDuringAntiRaw: maxDuringAnti,
      antiBotDurationSec: duration,
    }
  }, [
    antiBotDurationSec,
    chainNow,
    launchTime,
    maxBuyAmountRaw,
    maxBuyInitialAntiBotRaw,
  ])

  /** Raise (raw) still needed for `totalTokenIn` to reach `TARGET_TOKEN_BALANCE` (listing). */
  const remainingRaiseToGraduationRaw = useMemo(() => {
    if (isDex === true) return 0n
    if (
      isDex === undefined ||
      targetRaiseBalance === undefined ||
      curveTotalRaiseIn === undefined
    ) {
      return undefined
    }
    if (curveTotalRaiseIn >= targetRaiseBalance) return 0n
    return targetRaiseBalance - curveTotalRaiseIn
  }, [isDex, targetRaiseBalance, curveTotalRaiseIn])

  const buyQuoteExceedsMax =
    buyQuoteWei > 0n &&
    buyPerTxLimits.effectiveMaxRaw > 0n &&
    raiseQuoteExceedsPerOrderLimit(buyQuoteWei, buyPerTxLimits.effectiveMaxRaw)

  const tokenSellWei = useMemo(
    () => safeParseUnits(sellTokenStr, Number(decimals)),
    [decimals, sellTokenStr],
  )

  const { data: estBuyTokens, refetch: refetchEstBuy } = useReadContract({
    address: curve,
    abi: bondingCurveAbi,
    functionName: 'calculateBuyAmount',
    args: [buyQuoteWei],
    query: {
      enabled: Boolean(curve) && buyQuoteWei > 0n,
    },
  })

  const { data: estSellRaise, refetch: refetchEstSell } = useReadContract({
    address: curve,
    abi: bondingCurveAbi,
    functionName: 'calculateSellAmount',
    args: [tokenSellWei],
    query: {
      enabled: Boolean(curve) && tokenSellWei > 0n,
    },
  })

  const {
    data: tokenBalance,
    refetch: refetchTokenBal,
  } = useReadContract({
    address: token,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: Boolean(token && address) },
  })

  const {
    data: raiseTokenBalance,
    refetch: refetchRaiseBal,
  } = useReadContract({
    address: raiseTokenAddr,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address && raiseTokenAddr ? [address] : undefined,
    query: { enabled: Boolean(raiseTokenAddr && address) },
  })

  const { data: sellAllowance, refetch: refetchSellAllowance } = useReadContract({
    address: token,
    abi: erc20Abi,
    functionName: 'allowance',
    args: address ? [address, curve] : undefined,
    query: { enabled: Boolean(token && curve && address) },
  })

  const {
    data: buyRaiseAllowance,
    refetch: refetchBuyRaiseAllowance,
    isError: buyRaiseAllowanceError,
  } = useReadContract({
    address: raiseTokenAddr,
    abi: erc20Abi,
    functionName: 'allowance',
    args: address && raiseTokenAddr ? [address, curve] : undefined,
    query: { enabled: Boolean(raiseTokenAddr && curve && address) },
  })

  const {
    writeContractAsync,
    data: buySellHash,
    isPending: isWritePending,
    error: writeError,
    reset: resetWrite,
  } = useWriteContract()

  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    data: receipt,
  } = useWaitForTransactionReceipt({
    hash: buySellHash,
  })

  const nativeBalanceWei = nativeBalance?.value

  const fillMaxBuyTowardFullBond = useCallback(async () => {
    if (remainingRaiseToGraduationRaw === undefined) {
      toast.error('Still loading curve data')
      return
    }
    if (remainingRaiseToGraduationRaw <= 0n) {
      toast.error('Bonding target already reached')
      return
    }
    let raiseRaw = remainingRaiseToGraduationRaw
    const maxPerTx = buyPerTxLimits.effectiveMaxRaw
    if (maxPerTx > 0n && raiseRaw > maxPerTx) raiseRaw = maxPerTx

    if (isNativeRaise) {
      if (nativeBalanceWei === undefined) {
        toast.error('Balance not loaded')
        return
      }
      if (raiseRaw > nativeBalanceWei) raiseRaw = nativeBalanceWei
      if (raiseRaw <= 0n) {
        toast.error('Insufficient balance')
        return
      }
      setBuyRaiseStr(formatRaiseInputString(raiseRaw, 18))
      return
    }

    if (buyPaymentMode === 'raise') {
      if (raiseTokenBalance === undefined) {
        toast.error('Balance not loaded')
        return
      }
      if (raiseRaw > raiseTokenBalance) raiseRaw = raiseTokenBalance
      if (raiseRaw <= 0n) {
        toast.error('Insufficient balance')
        return
      }
      setBuyRaiseStr(formatRaiseInputString(raiseRaw, raiseUnitDecimals))
      return
    }

    if (!raiseTokenAddr || nativeBalanceWei === undefined) {
      toast.error('Cannot compute BNB amount')
      return
    }
    if (isRaiseSameAsWeth) {
      let w = raiseRaw
      if (w > nativeBalanceWei) w = nativeBalanceWei
      if (w <= 0n) {
        toast.error('Insufficient balance')
        return
      }
      setBuyBnbStr(formatRaiseInputString(w, 18))
      return
    }

    const pc = getPublicClient(wagmiConfig)
    try {
      const amountsOut = await pc.readContract({
        address: router,
        abi: uniswapV2RouterAbi,
        functionName: 'getAmountsOut',
        args: [nativeBalanceWei, [weth, raiseTokenAddr]],
      })
      const maxRaiseFromWallet = amountsOut[amountsOut.length - 1]
      if (maxRaiseFromWallet <= 0n) {
        toast.error('Could not quote BNB → raise (no pool?)')
        return
      }
      if (raiseRaw > maxRaiseFromWallet) raiseRaw = maxRaiseFromWallet
      if (raiseRaw <= 0n) {
        toast.error('Insufficient BNB toward target')
        return
      }
      const amountsIn = await pc.readContract({
        address: router,
        abi: uniswapV2RouterAbi,
        functionName: 'getAmountsIn',
        args: [raiseRaw, [weth, raiseTokenAddr]],
      })
      const bnbIn = amountsIn[0]
      const bnbToUse = bnbIn > nativeBalanceWei ? nativeBalanceWei : bnbIn
      if (bnbToUse <= 0n) {
        toast.error('Insufficient BNB')
        return
      }
      setBuyBnbStr(formatRaiseInputString(bnbToUse, 18))
    } catch (e) {
      toast.error(parseContractError(e))
    }
  }, [
    remainingRaiseToGraduationRaw,
    buyPerTxLimits.effectiveMaxRaw,
    isNativeRaise,
    nativeBalanceWei,
    buyPaymentMode,
    raiseTokenBalance,
    raiseUnitDecimals,
    raiseTokenAddr,
    isRaiseSameAsWeth,
    router,
    weth,
  ])

  const refetchAll = useCallback(async () => {
    await Promise.all([
      refetchSupply(),
      refetchPrice(),
      refetchEstBuy(),
      refetchEstSell(),
      refetchTokenBal(),
      refetchSellAllowance(),
      refetchRaiseBal(),
      refetchBuyRaiseAllowance(),
      refetchTokenRaise(),
      refetchLaunchTime(),
      refetchMaxBuyAmount(),
      refetchMaxBuyAnti(),
      refetchAntiBotDuration(),
      refetchIsDex(),
      refetchTargetRaiseBalance(),
      refetchCurveTotalRaiseIn(),
    ])
  }, [
    refetchAntiBotDuration,
    refetchBuyRaiseAllowance,
    refetchCurveTotalRaiseIn,
    refetchEstBuy,
    refetchEstSell,
    refetchIsDex,
    refetchLaunchTime,
    refetchMaxBuyAmount,
    refetchMaxBuyAnti,
    refetchPrice,
    refetchRaiseBal,
    refetchSellAllowance,
    refetchSupply,
    refetchTargetRaiseBalance,
    refetchTokenBal,
    refetchTokenRaise,
  ])

  const buyWithBnb = useCallback(async () => {
    if (!address || !raiseTokenAddr) return
    if (buyBnbWei <= 0n) {
      toast.error('Enter an amount of BNB greater than 0')
      return
    }
    const slip = appConfig.defaultSlippagePercent
    const routerAddr = getRouterAddress()
    const wethAddr = getWethAddress()

    try {
      resetWrite()
      const pc = getPublicClient(wagmiConfig)

      /** Raise = WBNB: do not use `buyTokenWithBNB` (no WBNB→WBNB path on router). Wrap then buy like other ERC20 raises from the wallet. */
      if (isRaiseSameAsWeth) {
        const beforeBal = await pc.readContract({
          address: raiseTokenAddr,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [address],
        })

        const swapHash = (await writeContractAsync({
          address: wethAddr,
          abi: wbnbDepositAbi,
          functionName: 'deposit',
          value: buyBnbWei,
        })) as Hash
        toast.loading('Wrapping BNB → WBNB…', { id: swapHash })
        await waitForTransactionReceipt(wagmiConfig, { hash: swapHash })

        const afterBal = await pc.readContract({
          address: raiseTokenAddr,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [address],
        })
        const received = afterBal - beforeBal
        if (received <= 0n) {
          toast.error('No WBNB received after wrap')
          return
        }

        const allowanceNow = await pc.readContract({
          address: raiseTokenAddr,
          abi: erc20Abi,
          functionName: 'allowance',
          args: [address, curve],
        })

        if (received > allowanceNow) {
          const apprHash = (await writeContractAsync({
            address: raiseTokenAddr,
            abi: erc20Abi,
            functionName: 'approve',
            args: [curve, 2n ** 256n - 1n],
          })) as Hash
          toast.loading('Approving curve…', { id: apprHash })
          await waitForTransactionReceipt(wagmiConfig, { hash: apprHash })
        }

        const buyHash = (await writeContractAsync({
          address: factory,
          abi: memeCoinFactoryAbi,
          functionName: 'buyToken',
          args: [token, 0n, received],
          value: 0n,
        })) as Hash
        toast.loading('Buying token…', { id: buyHash })
        return buyHash
      }

      /** CAKE / non-WBNB ERC20 raise: one tx — TokenFactory swaps BNB→raise then bonding curve. */
      const amounts = await pc.readContract({
        address: routerAddr,
        abi: uniswapV2RouterAbi,
        functionName: 'getAmountsOut',
        args: [buyBnbWei, [wethAddr, raiseTokenAddr]],
      })
      const expectedRaise = amounts[amounts.length - 1]
      const minCakeFromSwap = minAmountOut(expectedRaise, slip)

      const estMeme = await pc.readContract({
        address: curve,
        abi: bondingCurveAbi,
        functionName: 'calculateBuyAmount',
        args: [expectedRaise],
      })
      const minTokensExpected = minAmountOut(estMeme, slip)

      const buyHash = (await writeContractAsync({
        address: factory,
        abi: memeCoinFactoryAbi,
        functionName: 'buyTokenWithBNB',
        args: [token, minTokensExpected, minCakeFromSwap],
        value: buyBnbWei,
      })) as Hash
      toast.loading('Swap BNB → raise & buy…', { id: buyHash })
      return buyHash
    } catch (e) {
      toast.error(parseContractError(e))
    }
  }, [
    address,
    buyBnbWei,
    curve,
    factory,
    isRaiseSameAsWeth,
    raiseTokenAddr,
    resetWrite,
    token,
    writeContractAsync,
  ])

  const buy = useCallback(async () => {
    if (isNativeRaise) {
      if (buyRaiseWei <= 0n) {
        toast.error('Enter an amount of BNB greater than 0')
        return
      }
      try {
        resetWrite()
        const h = await writeContractAsync({
          address: factory,
          abi: memeCoinFactoryAbi,
          functionName: 'buyToken',
          args: [token, 0n],
          value: buyRaiseWei,
        })
        toast.loading('Sending buy transaction…', { id: h })
        return h
      } catch (e) {
        toast.error(parseContractError(e))
      }
      return
    }

    if (buyPaymentMode === 'bnb') {
      return buyWithBnb()
    }

    if (buyRaiseWei <= 0n) {
      toast.error(`Enter an amount greater than 0 (${raiseSymbol})`)
      return
    }
    const insufficientRaiseAllowance =
      !isNativeRaise &&
      buyPaymentMode === 'raise' &&
      raiseTokenAddr !== undefined &&
      buyRaiseWei > 0n &&
      buyRaiseAllowance !== undefined &&
      buyRaiseWei > buyRaiseAllowance
    if (insufficientRaiseAllowance) {
      toast.error(
        `Approve ${raiseSymbol} for the bonding curve first (max allowance)`,
      )
      return
    }
    if (
      !isNativeRaise &&
      buyPaymentMode === 'raise' &&
      buyRaiseWei > 0n &&
      buyRaiseAllowance === undefined
    ) {
      if (buyRaiseAllowanceError) {
        toast.error('Could not read raise token allowance — check RPC and retry')
      } else {
        toast.error('Still checking raise token allowance — wait a moment')
      }
      return
    }
    try {
      resetWrite()
      const h = await writeContractAsync({
        address: factory,
        abi: memeCoinFactoryAbi,
        functionName: 'buyToken',
        args: [token, 0n, buyRaiseWei],
        value: 0n,
      })
      toast.loading('Sending buy transaction…', { id: h })
      return h
    } catch (e) {
      toast.error(parseContractError(e))
    }
  }, [
    buyPaymentMode,
    buyRaiseAllowance,
    buyRaiseAllowanceError,
    buyRaiseWei,
    buyWithBnb,
    factory,
    isNativeRaise,
    raiseSymbol,
    raiseTokenAddr,
    resetWrite,
    token,
    writeContractAsync,
  ])

  const approveBuyRaise = useCallback(async () => {
    if (!raiseTokenAddr) return
    try {
      resetWrite()
      const h = await writeContractAsync({
        address: raiseTokenAddr,
        abi: erc20Abi,
        functionName: 'approve',
        args: [curve, 2n ** 256n - 1n],
      })
      toast.loading('Approving max spend for bonding curve…', { id: h })
      return h
    } catch (e) {
      toast.error(parseContractError(e))
    }
  }, [curve, raiseTokenAddr, resetWrite, writeContractAsync])

  const approveSell = useCallback(async () => {
    try {
      resetWrite()
      const h = await writeContractAsync({
        address: token,
        abi: erc20Abi,
        functionName: 'approve',
        args: [curve, 2n ** 256n - 1n],
      })
      toast.loading('Sending approve transaction…', { id: h })
      return h
    } catch (e) {
      toast.error(parseContractError(e))
    }
  }, [curve, resetWrite, token, writeContractAsync])

  const sell = useCallback(async () => {
    if (tokenSellWei <= 0n) {
      toast.error('Enter a token amount greater than 0')
      return
    }
    if (tokenBalance !== undefined && tokenSellWei > tokenBalance) {
      toast.error('Insufficient token balance to sell')
      return
    }
    try {
      resetWrite()
      const h = await writeContractAsync({
        address: factory,
        abi: memeCoinFactoryAbi,
        functionName: 'sellToken',
        args: [token, tokenSellWei, 0n],
      })
      toast.loading('Sending sell transaction…', { id: h })
      return h
    } catch (e) {
      toast.error(parseContractError(e))
    }
  }, [factory, resetWrite, token, tokenBalance, tokenSellWei, writeContractAsync])

  const lastHash = buySellHash as Hash | undefined
  const needsApproveForSell =
    tokenSellWei > 0n &&
    sellAllowance !== undefined &&
    tokenSellWei > sellAllowance

  const needsApproveForBuy =
    !isNativeRaise &&
    buyPaymentMode === 'raise' &&
    raiseTokenAddr !== undefined &&
    buyRaiseWei > 0n &&
    buyRaiseAllowance !== undefined &&
    buyRaiseWei > buyRaiseAllowance

  /** ERC20 direct buy: allowance not yet known (never show Buy until we have a value). */
  const buyRaiseAllowanceLoading =
    !isNativeRaise &&
    buyPaymentMode === 'raise' &&
    raiseTokenAddr !== undefined &&
    buyRaiseWei > 0n &&
    buyRaiseAllowance === undefined &&
    !buyRaiseAllowanceError

  const bnbBuyQuoteReady =
    !isNativeRaise &&
    buyPaymentMode === 'bnb' &&
    buyBnbWei > 0n &&
    (isRaiseSameAsWeth || quotedRaiseFromBnb !== undefined)

  const canFillMaxBuyTowardFullBond =
    raiseKindReadyEarly &&
    isDex === false &&
    remainingRaiseToGraduationRaw !== undefined &&
    remainingRaiseToGraduationRaw > 0n

  return {
    curveAddress: curve as Address,
    tokenAddress: token as Address,
    decimals: Number(decimals),
    symbol,
    totalSupply,
    price,
    tokenBalance,
    buyPaymentMode,
    setBuyPaymentMode,
    buyBnbStr,
    setBuyBnbStr,
    buyBnbWei,
    bnbBuyQuoteReady,
    quotedRaiseFromBnb,
    buyRaiseStr,
    setBuyRaiseStr,
    sellTokenStr,
    setSellTokenStr,
    buyRaiseWei,
    tokenSellWei,
    estBuyTokens,
    estSellRaise,
    sellAllowance,
    needsApproveForSell,
    needsApproveForBuy,
    buyRaiseAllowanceLoading,
    buyRaiseAllowanceError,
    approveSell,
    approveBuyRaise,
    buy,
    sell,
    isWritePending,
    isConfirming,
    isConfirmed,
    receipt,
    txHash: lastHash,
    writeError,
    refetchAll,
    chainId: appConfig.chainId,
    isNativeRaise,
    raiseSymbol: isNativeRaise ? 'BNB' : raiseSymbol,
    raiseUnitDecimals,
    raiseTokenBalance,
    nativeBalanceWei,
    /** Finished reading `tokenRaise` on-chain — avoids flashing wrong native/ERC20 UI */
    raiseKindReady: raiseKindReadyEarly,
    buyPerTxLimits,
    buyQuoteExceedsMax,
    remainingRaiseToGraduationRaw,
    canFillMaxBuyTowardFullBond,
    fillMaxBuyTowardFullBond,
  }
}
