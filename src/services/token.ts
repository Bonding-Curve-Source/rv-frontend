import axios from 'axios'

import { appConfig } from '@/config'

const api = axios.create({
  baseURL: appConfig.apiBaseUrl,
  headers: { 'Content-Type': 'application/json' },
})

/** RaiseToken catalog row (image, display symbol) — joined by raiseToken */
export type RaiseTokenInfo = {
  id: number
  tokenAddress: string
  name: string
  symbol: string
  image: string
  createdAt: string
  updatedAt: string
}

export type BondToken = {
  id: number
  tokenAddress: string
  bondingCurve: string
  creatorAddress: string
  /** On-chain address — matches raiseAsset.tokenAddress when catalog exists */
  raiseToken: string
  /** uint256 on-chain — full decimal string from the API */
  targetValue?: string
  raiseAsset?: RaiseTokenInfo
  name: string
  symbol: string
  createdAt: string
  updatedAt: string
}

export async function fetchTokens(): Promise<BondToken[]> {
  const { data } = await api.get<BondToken[]>('/token')
  return data
}
