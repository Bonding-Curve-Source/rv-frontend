import { useEffect, useMemo, useState } from 'react'
import type { Address } from 'viem'
import { getAddress, isAddress, isAddressEqual, zeroAddress } from 'viem'

import { Button } from '@/components/Button'
import type { RaiseTokenDto } from '@/services/raise-config'
import { shortenAddress } from '@/utils/format'

export type PickerToken = {
  address: Address
  symbol: string
  name: string
  image?: string
}

type Props = {
  title: string
  tokens: PickerToken[]
  onPick: (address: Address) => void
  onClose: () => void
}

export function trustWalletBscLogo(addr: string): string {
  const lower = addr.toLowerCase()
  return `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/smartchain/assets/${lower}/logo.png`
}

export function buildPickerTokens(
  wethAddress: Address,
  raiseTokens: RaiseTokenDto[] | undefined,
  extras: PickerToken[],
): PickerToken[] {
  const bnb: PickerToken = {
    address: wethAddress,
    symbol: 'BNB',
    name: 'BNB (via WBNB)',
    image: trustWalletBscLogo(wethAddress),
  }
  const fromApi: PickerToken[] = (raiseTokens ?? []).map((t) => ({
    address: getAddress(t.tokenAddress as Address),
    symbol: t.symbol.trim() || '?',
    name: t.name?.trim() || t.symbol,
    image: t.image?.trim() || trustWalletBscLogo(t.tokenAddress),
  }))
  const merged = [bnb, ...extras, ...fromApi]
  const seen = new Set<string>()
  const out: PickerToken[] = []
  for (const t of merged) {
    if (isAddressEqual(t.address, zeroAddress)) continue
    const k = t.address.toLowerCase()
    if (seen.has(k)) continue
    seen.add(k)
    out.push(t)
  }
  return out
}

export function SwapTokenPicker({ title, tokens, onPick, onClose }: Props) {
  const [search, setSearch] = useState('')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return tokens
    return tokens.filter((t) => {
      if (t.symbol.toLowerCase().includes(q)) return true
      if (t.name.toLowerCase().includes(q)) return true
      if (t.address.toLowerCase().includes(q)) return true
      return false
    })
  }, [search, tokens])

  const importAddress = useMemo(() => {
    const raw = search.trim()
    if (!raw.startsWith('0x') || raw.length < 42) return null
    if (!isAddress(raw)) return null
    return getAddress(raw)
  }, [search])

  const importAlreadyListed =
    importAddress !== null &&
    tokens.some((t) => t.address.toLowerCase() === importAddress.toLowerCase())

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className="flex max-h-[min(85vh,520px)] w-full max-w-md flex-col border-4 border-black bg-[#2d1b4e] shadow-[8px_8px_0_0_#000]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b-4 border-black px-3 py-2">
          <h3 className="font-pixel text-[9px] text-[#ffee00]">{title}</h3>
          <button
            type="button"
            className="font-pixel text-[10px] text-[#a78bfa] hover:text-[#fff]"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        <div className="border-b-4 border-black p-2">
          <input
            className="w-full border-4 border-black bg-[#1a0f2e] px-2 py-2 font-mono text-[10px] text-[#fff] outline-none placeholder:text-[#5c4d7a]"
            placeholder="Search name / symbol / address"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
          {importAddress && !importAlreadyListed ? (
            <button
              type="button"
              className="mt-2 w-full border-4 border-[#7cff00] bg-[#1e1035] px-2 py-2 text-left font-pixel text-[8px] text-[#7cff00] hover:bg-[#2a1848]"
              onClick={() => {
                onPick(importAddress)
                onClose()
              }}
            >
              Use address {shortenAddress(importAddress, 6)} (not in list)
            </button>
          ) : null}
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <li className="px-2 py-4 text-center font-pixel text-[8px] text-[#6b7280]">
              No matches — paste a token contract to import
            </li>
          ) : (
            filtered.map((t) => (
              <li key={t.address}>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded border border-transparent px-2 py-2 text-left font-pixel text-[8px] hover:border-[#4c1d95] hover:bg-[#1a0f2e]"
                  onClick={() => {
                    onPick(t.address)
                    onClose()
                  }}
                >
                  {t.image ? (
                    <img
                      src={t.image}
                      alt=""
                      className="size-7 shrink-0 rounded-full border border-[#4c1d95] bg-black/40 object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  ) : (
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-[#4c1d95] bg-[#1a0f2e] text-[10px] text-[#ffee00]">
                      {t.symbol.slice(0, 2)}
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block text-[#ffee00]">{t.symbol}</span>
                    <span className="block truncate text-[#6b7280]">{t.name}</span>
                    <span className="block truncate font-mono text-[7px] text-[#5c4d7a]">
                      {t.address}
                    </span>
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
        <div className="border-t-4 border-black p-2">
          <Button variant="ghost" className="w-full py-2 text-[8px]" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}
