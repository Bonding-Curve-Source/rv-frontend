import { useMemo } from 'react'
import type { Address } from 'viem'
import { isAddress, isAddressEqual, zeroAddress } from 'viem'
import { useReadContract } from 'wagmi'

import { erc20Abi } from '@/abis/erc20'
import type { RaiseTokenInfo } from '@/services/token'

/** BSC testnet WBNB — common stand-in icon for native BNB raise in UI */
const WBNB_BSC_TESTNET =
  '0xae13d989dac2f0debff460ac112a837c89baa7cd' as Address

function trustWalletBscLogo(tokenAddress: string): string {
  const lower = tokenAddress.toLowerCase()
  return `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/smartchain/assets/${lower}/logo.png`
}

function apiSymbolLooksValid(s: string | undefined): boolean {
  if (!s) return false
  const t = s.trim()
  return t !== '' && t !== '???'
}

/**
 * Merge API `raiseAsset` with on-chain ERC20 `symbol` and a logo fallback
 * when the indexer created placeholder `???` / empty image rows.
 */
export function useRaiseTokenDisplay(
  raiseToken: string | undefined,
  raiseAsset?: RaiseTokenInfo,
) {
  const validAddr = raiseToken && isAddress(raiseToken)
  const raiseAddr = (validAddr ? raiseToken : undefined) as Address | undefined
  const isNative = Boolean(raiseAddr && isAddressEqual(raiseAddr, zeroAddress))

  const { data: chainSymbol, isLoading: symbolLoading } = useReadContract({
    address: isNative ? undefined : raiseAddr,
    abi: erc20Abi,
    functionName: 'symbol',
    query: { enabled: Boolean(!isNative && raiseAddr) },
  })

  const displaySymbol = useMemo(() => {
    if (apiSymbolLooksValid(raiseAsset?.symbol)) {
      return String(raiseAsset?.symbol).trim()
    }
    if (isNative) return 'BNB'
    const fromChain =
      typeof chainSymbol === 'string' ? chainSymbol.trim() : ''
    if (fromChain) return fromChain
    return symbolLoading ? '…' : '—'
  }, [chainSymbol, isNative, raiseAsset?.symbol, symbolLoading])

  const displayImage = useMemo(() => {
    const img = raiseAsset?.image?.trim()
    if (img) return img
    if (isNative) return trustWalletBscLogo(WBNB_BSC_TESTNET)
    if (raiseAddr) return trustWalletBscLogo(raiseAddr)
    return undefined
  }, [isNative, raiseAddr, raiseAsset?.image])

  return {
    displaySymbol,
    displayImage,
    isNativeRaise: isNative,
    symbolLoading: !isNative && symbolLoading && !apiSymbolLooksValid(raiseAsset?.symbol),
  }
}
