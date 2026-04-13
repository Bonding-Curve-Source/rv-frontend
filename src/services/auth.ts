import axios from 'axios'

import { appConfig } from '@/config'

const api = axios.create({
  baseURL: appConfig.apiBaseUrl,
  headers: { 'Content-Type': 'application/json' },
})

export type NonceResponse = {
  nonce: string
  message: string
}

export type LoginResponse = {
  accessToken: string
  user: unknown
  isFirstTimeLogin: boolean
}

export async function fetchNonce(walletAddress: string) {
  const { data } = await api.get<NonceResponse>('/auth/nonce', {
    params: { walletAddress },
  })
  return data
}

export async function loginWithSignature(
  walletAddress: string,
  signature: string,
) {
  const { data } = await api.post<LoginResponse>('/auth/login', {
    walletAddress,
    signature,
  })
  return data
}
