import axios from 'axios'

import { appConfig } from '@/config'

const api = axios.create({
  baseURL: appConfig.apiBaseUrl,
  headers: { 'Content-Type': 'application/json' },
})

/** Bản ghi catalog RaiseToken (ảnh, symbol hiển thị) — join theo raiseToken */
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
  /** Địa chỉ on-chain — trùng raiseAsset.tokenAddress khi có catalog */
  raiseToken: string
  /** uint256 on-chain — chuỗi thập phân đầy đủ từ API */
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
