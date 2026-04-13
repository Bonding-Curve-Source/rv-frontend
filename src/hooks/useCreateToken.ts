import { useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import type { Address, Hash } from 'viem'
import { isAddressEqual, parseEventLogs, parseUnits, zeroAddress } from 'viem'
import {
  useAccount,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from 'wagmi'

import { memeCoinFactoryAbi } from '@/abis/memeCoinFactory'
import { appConfig } from '@/config'

export type CreateTokenForm = {
  name: string
  symbol: string
  description: string
  imageUrl: string
  twitter: string
  telegram: string
  website: string
  /** Mục tiêu raise theo USD (hiển thị cho user) — gửi on-chain dạng 1e18 */
  targetMarketCapUsd: string
  /** Token dùng để raise (0x0 = native BNB/ETH) */
  tokenRaise: Address
}

function parseErr(e: unknown): string {
  if (e instanceof Error) {
    if (e.message.includes('User rejected')) return 'Cancelled in wallet'
    if (e.message.includes('insufficient funds')) return 'Insufficient ETH for fee + gas'
  }
  return e instanceof Error ? e.message : 'Transaction failed'
}

/** @param symbolDraft — used for `isSymbolTaken` check (trimmed) */
export function useCreateToken(symbolDraft: string, tokenRaiseDraft: Address) {
  const { address } = useAccount()
  const factory = appConfig.contracts.memeFactory

  const factoryReady = !isAddressEqual(factory, zeroAddress)
  const symbolTrim = symbolDraft.trim()

  const { data: creationFeeWei, refetch: refetchFee } = useReadContract({
    address: factory,
    abi: memeCoinFactoryAbi,
    functionName: 'creationFee',
    query: { enabled: factoryReady },
  })

  /** TokenFactory tách `new BondingCurve` sang BondingCurveDeployer — phải set on-chain (deploy script). */
  const {
    data: curveDeployerAddress,
    isPending: curveDeployerPending,
    isFetching: curveDeployerFetching,
  } = useReadContract({
    address: factory,
    abi: memeCoinFactoryAbi,
    functionName: 'curveDeployer',
    query: { enabled: factoryReady },
  })

  const curveDeployerLoading = curveDeployerPending || curveDeployerFetching

  const curveDeployerReady =
    !curveDeployerLoading &&
    curveDeployerAddress !== undefined &&
    !isAddressEqual(curveDeployerAddress as Address, zeroAddress)

  const { data: symbolTaken } = useReadContract({
    address: factory,
    abi: memeCoinFactoryAbi,
    functionName: 'isSymbolTaken',
    args: [symbolTrim],
    query: {
      enabled: factoryReady && symbolTrim.length > 0,
    },
  })

  const erc20Raise = !isAddressEqual(tokenRaiseDraft, zeroAddress)
  /** On-chain whitelist: `mapping(address => bool) public raiseAllowedTokens` (getter cùng tên). */
  const {
    data: raiseTokenAllowed,
    isPending: raiseTokenCheckPending,
    isFetching: raiseTokenCheckFetching,
    isError: raiseTokenCheckError,
    refetch: refetchRaiseTokenAllowed,
  } = useReadContract({
    address: factory,
    abi: memeCoinFactoryAbi,
    functionName: 'raiseAllowedTokens',
    args: [tokenRaiseDraft],
    query: {
      enabled: factoryReady && erc20Raise,
    },
  })

  const {
    writeContractAsync,
    data: txHash,
    isPending: isWritePending,
    reset,
  } = useWriteContract()

  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    data: receipt,
  } = useWaitForTransactionReceipt({
    hash: txHash,
  })

  const createdTokenAddress = useMemo((): Address | undefined => {
    if (!receipt?.logs?.length) return undefined
    try {
      const parsed = parseEventLogs({
        abi: memeCoinFactoryAbi,
        logs: receipt.logs,
        eventName: 'TokenCreated',
      })
      const first = parsed[0]
      if (first && first.args.tokenAddress) {
        return first.args.tokenAddress as Address
      }
    } catch {
      return undefined
    }
    return undefined
  }, [receipt])

  const createdBondingCurveAddress = useMemo((): Address | undefined => {
    if (!receipt?.logs?.length) return undefined
    try {
      const parsed = parseEventLogs({
        abi: memeCoinFactoryAbi,
        logs: receipt.logs,
        eventName: 'TokenCreated',
      })
      const first = parsed[0]
      if (first && first.args.bondingCurve) {
        return first.args.bondingCurve as Address
      }
    } catch {
      return undefined
    }
    return undefined
  }, [receipt])

  const { data: tokenInfo } = useReadContract({
    address: factory,
    abi: memeCoinFactoryAbi,
    functionName: 'getTokenInfo',
    args: createdTokenAddress ? [createdTokenAddress] : undefined,
    query: {
      enabled: Boolean(factoryReady && createdTokenAddress && isConfirmed),
    },
  })

  const createToken = useCallback(
    async (form: CreateTokenForm) => {
      if (!address) {
        toast.error('Connect your wallet')
        return
      }
      if (!factoryReady) {
        toast.error('Set VITE_MEME_FACTORY_ADDRESS to your deployed TokenFactory')
        return
      }
      if (!curveDeployerReady) {
        toast.error(
          'TokenFactory.curveDeployer is zero — deploy BondingCurveDeployer(factory) and call setCurveDeployer on-chain',
        )
        return
      }
      if (!form.name.trim() || !form.symbol.trim()) {
        toast.error('Name and symbol are required')
        return
      }
      const capRaw = form.targetMarketCapUsd.trim().replace(/,/g, '')
      if (!capRaw || Number.isNaN(Number(capRaw)) || Number(capRaw) <= 0) {
        toast.error('Nhập market cap raise (USD) hợp lệ')
        return
      }
      let targetValue: bigint
      try {
        targetValue = parseUnits(capRaw, 18)
      } catch {
        toast.error('Market cap raise (USD) không hợp lệ')
        return
      }
      if (creationFeeWei === undefined) {
        toast.error('Could not read creation fee from factory')
        return
      }

      try {
        reset()
        const h = await writeContractAsync({
          address: factory,
          abi: memeCoinFactoryAbi,
          functionName: 'createToken',
          args: [
            form.name.trim(),
            form.symbol.trim(),
            form.description.trim(),
            form.imageUrl.trim(),
            form.twitter.trim(),
            form.telegram.trim(),
            form.website.trim(),
            targetValue,
            form.tokenRaise,
          ],
          value: creationFeeWei,
        })
        toast.loading('Creating token & bonding curve…', { id: h })
        return h as Hash
      } catch (e) {
        toast.error(parseErr(e))
      }
    },
    [
      address,
      creationFeeWei,
      curveDeployerReady,
      factory,
      factoryReady,
      reset,
      writeContractAsync,
    ],
  )

  const raiseTokenCheckLoading =
    erc20Raise && factoryReady && (raiseTokenCheckPending || raiseTokenCheckFetching)

  return {
    factoryAddress: factory,
    factoryReady,
    curveDeployerAddress: curveDeployerAddress as Address | undefined,
    curveDeployerLoading,
    curveDeployerReady,
    creationFeeWei,
    refetchFee,
    symbolTaken,
    /** `true` | `false` từ contract; `undefined` khi chưa load hoặc không phải ERC20 raise */
    raiseTokenAllowed: erc20Raise ? raiseTokenAllowed : true,
    raiseTokenCheckLoading,
    raiseTokenCheckError,
    refetchRaiseTokenAllowed,
    createToken,
    txHash: txHash as Hash | undefined,
    isWritePending,
    isConfirming,
    isConfirmed,
    receipt,
    createdTokenAddress,
    createdBondingCurveAddress,
    tokenInfo,
  }
}
