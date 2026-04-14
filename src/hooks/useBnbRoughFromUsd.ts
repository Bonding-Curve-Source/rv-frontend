import { useMemo } from 'react'
import { formatEther } from 'viem'
import { useReadContract } from 'wagmi'

import { chainlinkAggregatorV3Abi } from '@/abis/chainlinkAggregatorV3'
import { appConfig } from '@/config'

function formatBnbApprox(wei: bigint): string {
  const s = formatEther(wei)
  const n = Number(s)
  if (!Number.isFinite(n)) return s
  if (n >= 10_000) return n.toLocaleString('en-US', { maximumFractionDigits: 0 })
  if (n >= 100) return n.toLocaleString('en-US', { maximumFractionDigits: 2 })
  if (n >= 1) return n.toLocaleString('en-US', { maximumFractionDigits: 4 })
  return n.toLocaleString('en-US', { maximumFractionDigits: 6 })
}

/**
 * ~BNB cho mức cap USD: giá BNB/USD từ Chainlink Aggregator (`answer` = USD mỗi 1 BNB, scale `decimals`).
 * Chỉ để hiển thị; không thay cho oracle trong BondingCurve.
 */
export function useBnbRoughFromUsd(usdCap: number) {
  const feed = appConfig.contracts.chainlinkBnbUsdFeed

  const { data: decimals, isLoading: decLoading, isError: decError } =
    useReadContract({
      address: feed,
      abi: chainlinkAggregatorV3Abi,
      functionName: 'decimals',
      query: { enabled: Boolean(feed) },
    })

  const { data: roundData, isLoading: roundLoading, isError: roundError } =
    useReadContract({
      address: feed,
      abi: chainlinkAggregatorV3Abi,
      functionName: 'latestRoundData',
      query: { enabled: Boolean(feed) },
    })

  const answer = roundData?.[1]

  const bnbApproxLabel = useMemo(() => {
    if (!feed || decimals === undefined || answer === undefined) return null
    if (answer <= 0n) return null
    const cap = Math.trunc(usdCap)
    if (!Number.isFinite(cap) || cap <= 0) return null
    const d = BigInt(decimals)
    const bnbWei = (BigInt(cap) * 10n ** 18n * 10n ** d) / answer
    return formatBnbApprox(bnbWei)
  }, [feed, decimals, answer, usdCap])

  const missingFeed = !feed

  return {
    bnbApproxLabel,
    /** Chưa cấu hình feed (vd. BSC testnet cần `VITE_CHAINLINK_BNB_USD_FEED`) */
    missingFeed,
    isLoading: Boolean(feed) && (decLoading || roundLoading),
    isError: Boolean(feed) && (decError || roundError),
  }
}
