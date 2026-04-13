import type { Address } from 'viem'

import { appConfig } from '@/config'

export function getRouterAddress(): Address {
  return appConfig.contracts.uniswapV2Router
}

export function getWethAddress(): Address {
  return appConfig.contracts.weth
}

/** Slippage in bps: 0.5% => 50 */
export function slippagePercentToBps(percent: number): number {
  return Math.round(percent * 100)
}

export function minAmountOut(
  expectedOut: bigint,
  slippagePercent: number,
): bigint {
  const bps = Math.min(10_000, Math.max(0, slippagePercentToBps(slippagePercent)))
  return (expectedOut * BigInt(10_000 - bps)) / 10_000n
}

export function swapDeadline(secondsFromNow = 1200): bigint {
  return BigInt(Math.floor(Date.now() / 1000) + secondsFromNow)
}
