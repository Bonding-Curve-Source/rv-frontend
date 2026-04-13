import { useQuery } from '@tanstack/react-query'

import { fetchRaiseConfig } from '@/services/raise-config'

export function useRaiseConfig() {
  return useQuery({
    queryKey: ['raise-config'],
    queryFn: fetchRaiseConfig,
    staleTime: 60_000,
  })
}
