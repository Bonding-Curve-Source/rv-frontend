import axios from 'axios'

import { appConfig } from '@/config'

const api = axios.create({
  baseURL: appConfig.apiBaseUrl,
  headers: { 'Content-Type': 'application/json' },
})

/** Matches Prisma `RaiseToken` from be-bonding */
export type RaiseTokenDto = {
  id: number
  tokenAddress: string
  name: string
  symbol: string
  image: string
  createdAt: string
  updatedAt: string
}

/** Matches Prisma `RaiseValue` from be-bonding */
export type RaiseValueDto = {
  id: number
  value: number
  symbol: string
  createdAt: string
  updatedAt: string
}

export type RaiseConfigDto = {
  raiseTokens: RaiseTokenDto[]
  raiseValues: RaiseValueDto[]
}

export async function fetchRaiseConfig(): Promise<RaiseConfigDto> {
  const { data } = await api.get<RaiseConfigDto>('/raise-config')
  return data
}
