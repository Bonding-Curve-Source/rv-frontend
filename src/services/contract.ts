import type { Address } from 'viem'

import { bondingCurveAbi } from '@/abis/bondingCurve'
import { appConfig } from '@/config'

/** Bonding curve address (env override) */
export function getBondingCurveAddress(): Address {
  return appConfig.contracts.bondingCurve
}

/** Token address from config (or read on-chain via token() if implemented) */
export function getTokenAddress(): Address {
  return appConfig.contracts.token
}

export { bondingCurveAbi }
