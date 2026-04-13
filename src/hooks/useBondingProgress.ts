import type { Address } from 'viem'
import { useReadContract } from 'wagmi'

import { bondingCurveAbi } from '@/abis/bondingCurve'

/** Progress is in basis points (10000 = 100% toward DEX listing threshold). */
export function formatBondingPercent(
  isDex: boolean | undefined,
  progressBps: bigint | undefined,
): string {
  if (isDex === true) return '100%'
  if (progressBps === undefined) return '—'
  const pct = Math.min(100, Number(progressBps) / 100)
  if (!Number.isFinite(pct)) return '—'
  return `${pct.toFixed(1)}%`
}

export function useBondingProgress(curveAddress: Address | undefined) {
  const enabled = Boolean(curveAddress)

  const { data: isDex, isLoading: loadingDex } = useReadContract({
    address: curveAddress,
    abi: bondingCurveAbi,
    functionName: 'isDex',
    query: { enabled },
  })

  const { data: progressBps, isLoading: loadingProgress } = useReadContract({
    address: curveAddress,
    abi: bondingCurveAbi,
    functionName: 'getCurveProgress',
    query: { enabled },
  })

  const isLoading = loadingDex || loadingProgress
  const label = formatBondingPercent(isDex, progressBps)

  return {
    label,
    isGraduated: isDex === true,
    isLoading,
  }
}
