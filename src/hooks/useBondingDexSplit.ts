import { useMemo } from 'react'
import type { Address } from 'viem'
import { useReadContracts } from 'wagmi'

import { bondingCurveAbi } from '@/abis/bondingCurve'
import type { BondToken } from '@/services/token'

export function useBondingDexSplit(tokens: BondToken[] | undefined) {
  const contracts = useMemo(
    () =>
      (tokens ?? []).map((t) => ({
        address: t.bondingCurve as Address,
        abi: bondingCurveAbi,
        functionName: 'isDex' as const,
      })),
    [tokens],
  )

  const {
    data: dexReads,
    isPending,
    isFetching,
    isError,
  } = useReadContracts({
    contracts,
    query: {
      enabled: Boolean(tokens?.length),
      /** Bonding → graduated (`isDex`) flips on-chain; poll so columns update without reload. */
      refetchInterval: 8_000,
    },
  })

  const { active, graduated } = useMemo(() => {
    const activeList: BondToken[] = []
    const graduatedList: BondToken[] = []
    if (!tokens?.length) {
      return { active: activeList, graduated: graduatedList }
    }
    if (isError) {
      return { active: [...tokens], graduated: graduatedList }
    }
    if (!dexReads) {
      return { active: activeList, graduated: graduatedList }
    }
    tokens.forEach((t, i) => {
      const r = dexReads[i]
      const isDex =
        r?.status === 'success' ? (r.result as boolean) : false
      if (isDex) graduatedList.push(t)
      else activeList.push(t)
    })
    return { active: activeList, graduated: graduatedList }
  }, [tokens, dexReads, isError])

  const isLoading =
    Boolean(tokens?.length) &&
    !isError &&
    dexReads === undefined &&
    (isPending || isFetching)

  return {
    active,
    graduated,
    isLoading,
    dexReadError: isError,
  }
}
