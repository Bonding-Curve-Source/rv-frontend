import { useEffect } from 'react'
import { toast } from 'sonner'
import type { Address } from 'viem'

import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { PixelSpinner } from '@/components/PixelSpinner'
import { TokenInput } from '@/components/TokenInput'
import { useAuthGate } from '@/hooks/useAuthGate'
import { useBondingCurve } from '@/hooks/useBondingCurve'
import { useBondingProgress } from '@/hooks/useBondingProgress'
import type { BondToken } from '@/services/token'
import {
  formatDecimalStringWithGrouping,
  formatUsdTargetFromApi,
  safeFormatUnits,
  shortenAddress,
} from '@/utils/format'

function clampDecimals(value: string, maxDecimals = 6): string {
  if (!value.includes('.')) return value
  const [intPart, decPart] = value.split('.')
  const clipped = decPart.slice(0, maxDecimals).replace(/0+$/, '')
  return clipped.length > 0 ? `${intPart}.${clipped}` : intPart
}

function formatRemainingAntiBot(sec: bigint): string {
  const s = Number(sec)
  if (!Number.isFinite(s) || s <= 0) return '0s'
  if (s >= 3600) {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    return `${h}h ${m}m`
  }
  if (s >= 60) {
    const m = Math.floor(s / 60)
    const rs = Math.floor(s % 60)
    return `${m}m ${rs}s`
  }
  return `${s}s`
}

type Props = {
  token: BondToken
  onClose: () => void
}

export function BondTradeModal({ token, onClose }: Props) {
  const overrides = {
    tokenAddress: token.tokenAddress as Address,
    bondingCurveAddress: token.bondingCurve as Address,
  }

  const { label: bondingPctLabel, isLoading: bondingPctLoading } =
    useBondingProgress(overrides.bondingCurveAddress)

  const {
    symbol,
    decimals,
    totalSupply,
    price,
    tokenBalance,
    buyPaymentMode,
    setBuyPaymentMode,
    buyBnbStr,
    setBuyBnbStr,
    buyBnbWei,
    bnbBuyQuoteReady,
    quotedRaiseFromBnb,
    buyRaiseStr,
    setBuyRaiseStr,
    sellTokenStr,
    setSellTokenStr,
    estBuyTokens,
    estSellRaise,
    needsApproveForSell,
    needsApproveForBuy,
    buyRaiseAllowanceLoading,
    buyRaiseAllowanceError,
    buyRaiseWei,
    approveSell,
    approveBuyRaise,
    buy,
    sell,
    isWritePending,
    isConfirming,
    isConfirmed,
    receipt,
    txHash,
    refetchAll,
    curveAddress,
    isNativeRaise,
    raiseSymbol,
    raiseUnitDecimals,
    raiseTokenBalance,
    nativeBalanceWei,
    raiseKindReady,
    buyPerTxLimits,
    buyQuoteExceedsMax,
    canFillMaxBuyTowardFullBond,
    fillMaxBuyTowardFullBond,
  } = useBondingCurve(overrides)

  const { ensureSignedIn, isConnected, isAuthenticated } = useAuthGate()

  const raiseLabelSymbol =
    token.raiseAsset?.symbol &&
    token.raiseAsset.symbol !== '???' &&
    token.raiseAsset.symbol.trim() !== ''
      ? token.raiseAsset.symbol
      : raiseSymbol

  useEffect(() => {
    if (isConfirmed && receipt) {
      toast.success('Transaction confirmed on-chain', { id: String(txHash) })
      void refetchAll()
    }
  }, [isConfirmed, receipt, refetchAll, txHash])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const busy = isWritePending || isConfirming
  const priceText =
    price !== undefined
      ? `${formatDecimalStringWithGrouping(
          clampDecimals(safeFormatUnits(price, raiseUnitDecimals), 12),
        )} ${raiseLabelSymbol} per 1 ${symbol}`
      : '—'
  const totalSupplyText =
    totalSupply !== undefined
      ? `${formatDecimalStringWithGrouping(
          clampDecimals(safeFormatUnits(totalSupply, decimals), 4),
        )} ${symbol}`
      : '—'

  const raiseImg = token.raiseAsset?.image

  const maxAntiFmt =
    raiseKindReady && buyPerTxLimits.maxDuringAntiRaw > 0n
      ? formatDecimalStringWithGrouping(
          clampDecimals(
            safeFormatUnits(
              buyPerTxLimits.maxDuringAntiRaw,
              raiseUnitDecimals,
            ),
            8,
          ),
        )
      : null
  const maxAfterFmt =
    raiseKindReady && buyPerTxLimits.maxAfterAntiRaw > 0n
      ? formatDecimalStringWithGrouping(
          clampDecimals(
            safeFormatUnits(
              buyPerTxLimits.maxAfterAntiRaw,
              raiseUnitDecimals,
            ),
            8,
          ),
        )
      : null
  const antiBotLeft =
    buyPerTxLimits.secondsLeftInAntiBot !== undefined
      ? formatRemainingAntiBot(buyPerTxLimits.secondsLeftInAntiBot)
      : null
  const antiBotMinutesLabel = (() => {
    const d = Number(buyPerTxLimits.antiBotDurationSec)
    if (!Number.isFinite(d) || d <= 0) return '5'
    const m = d / 60
    return m >= 1 && d % 60 === 0 ? String(Math.round(m)) : String(d / 60)
  })()

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bond-modal-title"
      onClick={onClose}
    >
      <div
        className="my-8 w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 text-center">
          <h2
            id="bond-modal-title"
            className="font-pixel text-xs text-[#ff6b6b] drop-shadow-[3px_3px_0_#000]"
          >
            {token.name}{' '}
            <span className="text-[#ffee00]">({token.symbol})</span>
          </h2>
          <p className="mt-1 font-pixel text-[7px] text-[#a78bfa]">
            Token {shortenAddress(token.tokenAddress, 6)} · Curve{' '}
            {shortenAddress(token.bondingCurve, 6)}
          </p>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
            {raiseImg ? (
              <img
                src={raiseImg}
                alt=""
                className="size-6 rounded-full border-2 border-[#7cff00] bg-black/40 object-cover"
              />
            ) : null}
            <span className="font-pixel text-[8px] text-[#c4b5fd]">
              Raise asset:{' '}
              <span className="text-[#ffee00]">
                {!raiseKindReady ? '…' : raiseLabelSymbol}
              </span>
              {raiseKindReady ? (
                isNativeRaise ? (
                  <span className="text-[#6b7280]"> (native — BNB only)</span>
                ) : (
                  <span className="text-[#6b7280]">
                    {' '}
                    (ERC20 — pay with {raiseLabelSymbol} or BNB via factory swap)
                  </span>
                )
              ) : (
                <span className="text-[#6b7280]"> (reading curve…)</span>
              )}
            </span>
          </div>
        </div>

        <Card title="Market">
          <dl className="mb-6 space-y-4 font-pixel text-[9px] text-[#e9d5ff]">
            <div className="border-b border-[#4c1d95] pb-3">
              <dt className="text-[#c4b5fd]">Spot price</dt>
              <dd className="mt-1 text-[#7cff00] wrap-anywhere">
                {priceText}
              </dd>
            </div>
            <div className="border-b border-[#4c1d95] pb-3">
              <dt className="text-[#c4b5fd]">Total supply</dt>
              <dd className="mt-1 text-[#4ecdc4] wrap-anywhere">
                {totalSupplyText}
              </dd>
            </div>
            <div className="border-b border-[#4c1d95] pb-3">
              <dt className="text-[#c4b5fd]">Raise target (USD)</dt>
              <dd className="mt-1 text-[#f472b6] wrap-anywhere">
                {formatUsdTargetFromApi(token.targetValue)}{' '}
                <span className="text-[#6b7280]">USD</span>
              </dd>
            </div>
            <div className="border-b border-[#4c1d95] pb-3">
              <dt className="text-[#c4b5fd]">
                Bonding progress (to DEX listing)
              </dt>
              <dd className="mt-1 text-[#ffee00]">
                {bondingPctLoading ? '…' : bondingPctLabel}
              </dd>
            </div>
            <div>
              <p className="break-all text-[7px] leading-relaxed text-[#6b7280]">
                Curve: {curveAddress}
              </p>
            </div>
          </dl>

          <div className="space-y-6">
            <div>
              <p className="mb-2 font-pixel text-[8px] leading-relaxed text-[#a78bfa]">
                {!raiseKindReady
                  ? 'Reading raise asset from curve…'
                  : isNativeRaise
                    ? 'Buy with BNB (native) — this curve only accepts BNB.'
                    : buyPaymentMode === 'raise'
                      ? `Pay directly with ${raiseLabelSymbol} from your wallet.`
                      : `Pay with BNB: one transaction on the factory swaps BNB → ${raiseLabelSymbol} (Pancake V2) then buys on the curve — except if raise is WBNB (wrap + buy in separate steps).`}
              </p>
              {!isNativeRaise && raiseKindReady ? (
                <div className="mb-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant={buyPaymentMode === 'raise' ? 'primary' : 'ghost'}
                    className="flex-1 min-w-[120px] py-2 font-pixel text-[8px]"
                    disabled={busy}
                    onClick={() => setBuyPaymentMode('raise')}
                  >
                    {raiseLabelSymbol}
                  </Button>
                  <Button
                    type="button"
                    variant={buyPaymentMode === 'bnb' ? 'primary' : 'ghost'}
                    className="flex-1 min-w-[120px] py-2 font-pixel text-[8px]"
                    disabled={busy}
                    onClick={() => setBuyPaymentMode('bnb')}
                  >
                    BNB (swap)
                  </Button>
                </div>
              ) : null}
              {isNativeRaise || buyPaymentMode === 'raise' ? (
                <TokenInput
                  label={`Buy — amount in ${raiseKindReady ? raiseLabelSymbol : '…'}`}
                  value={buyRaiseStr}
                  onChange={setBuyRaiseStr}
                  symbol={raiseKindReady ? raiseLabelSymbol : '…'}
                  placeholder="0.01"
                  disabled={
                    !raiseKindReady ||
                    (!isNativeRaise && buyPaymentMode !== 'raise')
                  }
                  balanceLabel={
                    raiseKindReady &&
                    isNativeRaise &&
                    nativeBalanceWei !== undefined
                      ? safeFormatUnits(nativeBalanceWei, 18)
                      : raiseKindReady &&
                          !isNativeRaise &&
                          buyPaymentMode === 'raise' &&
                          raiseTokenBalance !== undefined
                        ? safeFormatUnits(
                            raiseTokenBalance,
                            raiseUnitDecimals,
                          )
                        : undefined
                  }
                  maxButton={
                    raiseKindReady &&
                    (isNativeRaise || buyPaymentMode === 'raise')
                      ? {
                          onClick: () => void fillMaxBuyTowardFullBond(),
                          disabled: busy || !canFillMaxBuyTowardFullBond,
                        }
                      : undefined
                  }
                />
              ) : (
                <TokenInput
                  label="Buy — BNB (factory swaps then buys)"
                  value={buyBnbStr}
                  onChange={setBuyBnbStr}
                  symbol="BNB"
                  placeholder="0.01"
                  disabled={!raiseKindReady}
                  balanceLabel={
                    nativeBalanceWei !== undefined
                      ? safeFormatUnits(nativeBalanceWei, 18)
                      : undefined
                  }
                  maxButton={
                    raiseKindReady
                      ? {
                          onClick: () => void fillMaxBuyTowardFullBond(),
                          disabled: busy || !canFillMaxBuyTowardFullBond,
                        }
                      : undefined
                  }
                />
              )}
              {!isNativeRaise &&
              raiseKindReady &&
              buyPaymentMode === 'bnb' &&
              buyBnbWei > 0n &&
              !bnbBuyQuoteReady ? (
                <p className="mt-2 font-pixel text-[8px] leading-relaxed text-[#fb7185]">
                  Could not quote BNB → {raiseLabelSymbol} swap (no pool on router
                  or RPC error).
                </p>
              ) : null}
              {!isNativeRaise &&
              raiseKindReady &&
              buyPaymentMode === 'bnb' &&
              quotedRaiseFromBnb !== undefined &&
              buyBnbWei > 0n ? (
                <p className="mt-1 font-pixel text-[7px] leading-relaxed text-[#6b7280]">
                  Est. after swap ~{' '}
                  {formatDecimalStringWithGrouping(
                    clampDecimals(
                      safeFormatUnits(quotedRaiseFromBnb, raiseUnitDecimals),
                      6,
                    ),
                  )}{' '}
                  {raiseLabelSymbol} (before real slippage)
                </p>
              ) : null}
              {raiseKindReady && (maxAntiFmt || maxAfterFmt) ? (
                <div className="mt-2 rounded border border-[#4c1d95] bg-[#1e1035]/80 px-2 py-2 font-pixel text-[7px] leading-relaxed text-[#c4b5fd]">
                  <p className="text-[#a78bfa]">Per-order limits (raise)</p>
                  {buyPerTxLimits.isAntiBotPhase && maxAntiFmt ? (
                    <p className="mt-1 text-[#ffee00]">
                      Anti-bot (~{antiBotMinutesLabel} min): max{' '}
                      <span className="text-[#7cff00]">{maxAntiFmt}</span>{' '}
                      {raiseLabelSymbol}
                      /order
                      {antiBotLeft ? (
                        <span className="text-[#6b7280]">
                          {' '}
                          · ~{antiBotLeft} left
                        </span>
                      ) : null}
                    </p>
                  ) : null}
                  {maxAfterFmt ? (
                    <p
                      className={
                        buyPerTxLimits.isAntiBotPhase ? 'mt-1' : 'mt-0'
                      }
                    >
                      {buyPerTxLimits.isAntiBotPhase ? 'After that: ' : ''}max{' '}
                      <span className="text-[#7cff00]">{maxAfterFmt}</span>{' '}
                      {raiseLabelSymbol}/order
                    </p>
                  ) : null}
                  {!isNativeRaise && buyPaymentMode === 'bnb' ? (
                    <p className="mt-1 text-[#6b7280]">
                      (Pay with BNB: limit applies to {raiseLabelSymbol} after
                      swap into the curve.)
                    </p>
                  ) : null}
                </div>
              ) : null}
              {raiseKindReady && buyQuoteExceedsMax ? (
                <p className="mt-2 font-pixel text-[8px] leading-relaxed text-[#fb7185]">
                  Exceeds per-order limit — reduce amount (raise or matching BNB).
                </p>
              ) : null}
              <p className="mt-2 font-pixel text-[8px] text-[#a78bfa]">
                Est. received:{' '}
                <span className="text-[#ffee00]">
                  {estBuyTokens !== undefined
                    ? `${safeFormatUnits(estBuyTokens, decimals)} ${symbol}`
                    : '—'}
                </span>
              </p>
              {!isNativeRaise &&
              buyPaymentMode === 'raise' &&
              raiseKindReady &&
              buyRaiseWei > 0n &&
              (needsApproveForBuy || buyRaiseAllowanceLoading) ? (
                <p className="mt-3 rounded border border-[#4c1d95] bg-[#1e1035]/80 px-2 py-2 font-pixel text-[7px] leading-relaxed text-[#c4b5fd]">
                  <span className="text-[#ffee00]">ERC20 raise:</span> the bonding
                  curve pulls {raiseLabelSymbol} via{' '}
                  <code className="text-[#a78bfa]">transferFrom</code>.{' '}
                  <strong>Step 1</strong> — approve <strong>max</strong> allowance
                  for the curve; <strong>Step 2</strong> — buy tokens.
                </p>
              ) : null}
              {buyRaiseAllowanceError &&
              !isNativeRaise &&
              buyPaymentMode === 'raise' &&
              buyRaiseWei > 0n ? (
                <p className="mt-3 font-pixel text-[8px] leading-relaxed text-[#fb7185]">
                  Could not read {raiseLabelSymbol} allowance. Check the RPC, then{' '}
                  <button
                    type="button"
                    className="underline text-[#ffee00]"
                    onClick={() => void refetchAll()}
                  >
                    retry
                  </button>
                  .
                </p>
              ) : null}
              {buyRaiseAllowanceLoading ? (
                <Button
                  className="mt-3 w-full py-3"
                  disabled
                >
                  Checking allowance…
                </Button>
              ) : needsApproveForBuy ? (
                <Button
                  className="mt-3 w-full py-3"
                  disabled={busy || !raiseKindReady || !isConnected}
                  onClick={async () => {
                    if (!(await ensureSignedIn())) return
                    void approveBuyRaise()
                  }}
                >
                  {busy
                    ? 'Processing…'
                    : `Approve ${raiseLabelSymbol} (max)`}
                </Button>
              ) : (
                <Button
                  className="mt-3 w-full py-3"
                  disabled={
                    busy ||
                    !raiseKindReady ||
                    !isConnected ||
                    buyQuoteExceedsMax ||
                    (!isNativeRaise &&
                      buyPaymentMode === 'raise' &&
                      buyRaiseWei > 0n &&
                      buyRaiseAllowanceError) ||
                    (!isNativeRaise &&
                      buyPaymentMode === 'bnb' &&
                      (buyBnbWei <= 0n || !bnbBuyQuoteReady))
                  }
                  onClick={async () => {
                    if (!(await ensureSignedIn())) return
                    void buy()
                  }}
                >
                  {busy ? 'Processing…' : 'Buy tokens'}
                </Button>
              )}
            </div>

            <div className="border-t-4 border-dashed border-[#4c1d95] pt-6">
              <TokenInput
                label="Sell — token amount"
                value={sellTokenStr}
                onChange={setSellTokenStr}
                symbol={symbol}
                balanceLabel={
                  tokenBalance !== undefined
                    ? safeFormatUnits(tokenBalance, decimals)
                    : undefined
                }
              />
              <p className="mt-2 font-pixel text-[8px] leading-relaxed text-[#a78bfa]">
                Est. {raiseLabelSymbol} received (curve):{' '}
                <span className="text-[#ffee00]">
                  {estSellRaise !== undefined
                    ? `${formatDecimalStringWithGrouping(
                        clampDecimals(
                          safeFormatUnits(estSellRaise, raiseUnitDecimals),
                          8,
                        ),
                      )} ${raiseLabelSymbol}`
                    : '—'}
                </span>
              </p>
              <Button
                variant="accent"
                className="mt-3 w-full py-3"
                disabled={busy || !isConnected}
                onClick={async () => {
                  if (!(await ensureSignedIn())) return
                  void (needsApproveForSell ? approveSell() : sell())
                }}
              >
                {busy
                  ? 'Processing…'
                  : needsApproveForSell
                    ? 'Approve token'
                    : 'Sell tokens'}
              </Button>
            </div>
          </div>

          {isConnected && !isAuthenticated ? (
            <p className="mt-4 rounded border border-[#4c1d95] bg-[#1e1035]/80 px-2 py-2 font-pixel text-[7px] leading-relaxed text-[#fbbf24]">
              Buy/sell requires a sign-in message — the first tap opens signing,
              then the transaction is sent.
            </p>
          ) : null}

          {busy ? (
            <div className="mt-6 flex justify-center">
              <PixelSpinner label="TX pending…" />
            </div>
          ) : null}

          {txHash ? (
            <p className="mt-4 break-all font-pixel text-[7px] text-[#86efac]">
              Tx:{' '}
              <a
                className="underline"
                href={`https://testnet.bscscan.com/tx/${txHash}`}
                target="_blank"
                rel="noreferrer"
              >
                {txHash}
              </a>
            </p>
          ) : null}

          <Button
            variant="ghost"
            className="mt-6 w-full py-3"
            onClick={onClose}
          >
            Close
          </Button>
        </Card>
      </div>
    </div>
  )
}
