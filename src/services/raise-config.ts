import axios from 'axios'

import { appConfig } from '@/config'

const api = axios.create({
  baseURL: appConfig.apiBaseUrl,
  headers: { 'Content-Type': 'application/json' },
})

/** Khớp Prisma `RaiseToken` từ be-bonding */
export type RaiseTokenDto = {
  id: number
  tokenAddress: string
  name: string
  symbol: string
  image: string
  createdAt: string
  updatedAt: string
}

/** Khớp Prisma `RaiseValue` từ be-bonding */
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
