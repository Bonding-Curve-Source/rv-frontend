import { formatUnits, parseUnits } from 'ethers'

export function safeFormatUnits(
  value: bigint | undefined,
  decimals: number,
  fallback = '—',
): string {
  if (value === undefined) return fallback
  try {
    return formatUnits(value, decimals)
  } catch {
    return fallback
  }
}

export function safeParseUnits(amount: string, decimals: number): bigint {
  const trimmed = amount.trim()
  if (!trimmed || Number.isNaN(Number.parseFloat(trimmed))) return 0n
  try {
    return parseUnits(trimmed, decimals)
  } catch {
    return 0n
  }
}

export function shortenAddress(addr: string, chars = 4): string {
  if (!addr || addr.length < 10) return addr
  return `${addr.slice(0, 2 + chars)}…${addr.slice(-chars)}`
}

/** Thousands separators on the integer part; keeps fractional digits as-is. */
export function formatDecimalStringWithGrouping(value: string): string {
  if (!value || value === '—') return value
  const negative = value.startsWith('-')
  const raw = negative ? value.slice(1) : value
  const [intPart, decPart] = raw.split('.')
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  const out = decPart !== undefined ? `${grouped}.${decPart}` : grouped
  return negative ? `-${out}` : out
}

function clampDecimalPlaces(value: string, maxDecimals: number): string {
  if (!value.includes('.')) return value
  const [intPart, decPart] = value.split('.')
  const clipped = decPart.slice(0, maxDecimals).replace(/0+$/, '')
  return clipped.length > 0 ? `${intPart}.${clipped}` : intPart
}

/**
 * `targetValue` from the API (uint256 string) — same 1e18 scale as createToken (USD target on-chain).
 */
export function formatUsdTargetFromApi(
  raw: string | undefined,
  maxDecimals = 4,
): string {
  if (raw === undefined || raw.trim() === '') return '—'
  try {
    const bi = BigInt(raw.trim())
    if (bi === 0n) return '—'
    const s = formatUnits(bi, 18)
    return clampDecimalPlaces(s, maxDecimals)
  } catch {
    return raw.length > 36
      ? `${raw.slice(0, 14)}…${raw.slice(-12)}`
      : raw
  }
}
