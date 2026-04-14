import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { isAddressEqual, zeroAddress, type Address } from 'viem'

import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { PixelSpinner } from '@/components/PixelSpinner'
import type { CreateTokenForm } from '@/hooks/useCreateToken'
import { useAuthGate } from '@/hooks/useAuthGate'
import { useBnbRoughFromUsd } from '@/hooks/useBnbRoughFromUsd'
import { useCreateToken } from '@/hooks/useCreateToken'
import { useRaiseConfig } from '@/hooks/useRaiseConfig'
import type { RaiseTokenDto, RaiseValueDto } from '@/services/raise-config'
import { safeFormatUnits, shortenAddress } from '@/utils/format'

function fmtAmount(n: number) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n)
}

function addrKey(a: string) {
  return a.toLowerCase()
}

function isSameRaiseToken(selected: Address, row: RaiseTokenDto) {
  return addrKey(selected) === addrKey(row.tokenAddress)
}

/** Shared cap table: sort by value, dedupe by number (not filtered by raise token). */
function sortDedupeRaiseValues(rows: RaiseValueDto[]): RaiseValueDto[] {
  const seen = new Set<number>()
  const out: RaiseValueDto[] = []
  for (const v of [...rows].sort((a, b) => a.value - b.value)) {
    const k = Math.trunc(v.value)
    if (seen.has(k)) continue
    seen.add(k)
    out.push(v)
  }
  return out
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  multiline,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  multiline?: boolean
}) {
  const inputClass =
    'mt-1 w-full border-4 border-black bg-[#1a0f2e] px-2 py-2 font-pixel text-[9px] text-white outline-none placeholder:text-[#5c4d7a]'
  return (
    <label className="block font-pixel text-[8px] text-[#c4b5fd]">
      {label}
      {multiline ? (
        <textarea
          className={`${inputClass} min-h-[72px] resize-y`}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          className={inputClass}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </label>
  )
}

export function CreateTokenPage() {
  const queryClient = useQueryClient()
  const { ensureSignedIn, isConnected, isAuthenticated } = useAuthGate()

  const [form, setForm] = useState<CreateTokenForm>({
    name: '',
    symbol: '',
    description: '',
    imageUrl: '',
    twitter: '',
    telegram: '',
    website: '',
    targetMarketCapUsd: '',
    tokenRaise: zeroAddress,
  })

  const {
    data: raiseConfig,
    isLoading: raiseLoading,
    isError: raiseError,
  } = useRaiseConfig()

  const raiseTokens = raiseConfig?.raiseTokens ?? []
  const raiseValues = raiseConfig?.raiseValues ?? []

  const valuePresets = useMemo(
    () => sortDedupeRaiseValues(raiseValues),
    [raiseValues],
  )

  const tokenInitDone = useRef(false)
  const capInitDone = useRef(false)

  useEffect(() => {
    if (!raiseTokens.length || tokenInitDone.current) return
    tokenInitDone.current = true
    setForm((f) => ({
      ...f,
      tokenRaise: raiseTokens[0].tokenAddress as Address,
    }))
  }, [raiseTokens])

  useEffect(() => {
    if (!valuePresets.length || capInitDone.current) return
    capInitDone.current = true
    setForm((f) => ({
      ...f,
      targetMarketCapUsd: String(Math.trunc(valuePresets[0].value)),
    }))
  }, [valuePresets])

  const pickTokenRaise = (row: RaiseTokenDto) => {
    setForm((f) => ({
      ...f,
      tokenRaise: row.tokenAddress as Address,
    }))
  }

  const pickValuePreset = (v: RaiseValueDto) => {
    setForm((f) => ({
      ...f,
      targetMarketCapUsd: String(Math.trunc(v.value)),
    }))
  }

  const capNum = Number(form.targetMarketCapUsd.trim().replace(/,/g, ''))

  const { bnbApproxLabel } = useBnbRoughFromUsd(capNum)

  const {
    factoryAddress,
    factoryReady,
    curveDeployerAddress,
    curveDeployerLoading,
    curveDeployerReady,
    creationFeeWei,
    symbolTaken,
    raiseTokenAllowed,
    raiseTokenCheckLoading,
    raiseTokenCheckError,
    refetchRaiseTokenAllowed,
    createToken,
    txHash,
    isWritePending,
    isConfirming,
    isConfirmed,
    createdTokenAddress,
    tokenInfo,
  } = useCreateToken(form.symbol, form.tokenRaise)

  useEffect(() => {
    if (isConfirmed && txHash) {
      toast.success('Token created — bonding curve deployed', { id: txHash })
      void queryClient.invalidateQueries({ queryKey: ['bond-tokens'] })
      const t = window.setTimeout(() => {
        void queryClient.invalidateQueries({ queryKey: ['bond-tokens'] })
      }, 5000)
      return () => window.clearTimeout(t)
    }
  }, [isConfirmed, queryClient, txHash])

  const busy = isWritePending || isConfirming

  const set =
    (key: keyof CreateTokenForm) => (v: string) =>
      setForm((f) => ({ ...f, [key]: v }))

  const erc20Raise = !isAddressEqual(form.tokenRaise, zeroAddress)
  const raiseOk = raiseTokenAllowed === true
  const hasCapPreset =
    valuePresets.length > 0 && form.targetMarketCapUsd.trim().length > 0

  const createDisabled =
    busy ||
    symbolTaken === true ||
    (erc20Raise && !raiseOk) ||
    !hasCapPreset ||
    curveDeployerLoading ||
    !curveDeployerReady ||
    !isConnected

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <div className="mb-6 text-center">
        <h1 className="font-pixel animate-float text-sm text-[#ffe66d] drop-shadow-[3px_3px_0_#000]">
          LAUNCH TOKEN
        </h1>
        <p className="mt-2 font-pixel text-[8px] text-[#a78bfa]">
          TokenFactory → Token + BondingCurve (BondingCurveDeployer on-chain)
        </p>
      </div>

      <Card title="Create & bond">
        {!factoryReady ? (
          <p className="font-pixel text-[9px] leading-relaxed text-[#ff6b6b]">
            Set{' '}
            <code className="text-[#ffee00]">VITE_MEME_FACTORY_ADDRESS</code> in
            .env to your deployed TokenFactory address.
          </p>
        ) : curveDeployerLoading ? (
          <div className="flex justify-center py-6">
            <PixelSpinner label="Reading curveDeployer…" />
          </div>
        ) : !curveDeployerReady ? (
          <div className="space-y-2 font-pixel text-[9px] leading-relaxed text-[#ff6b6b]">
            <p>
              On-chain <code className="text-[#ffee00]">curveDeployer</code> ={' '}
              <strong>0x0</strong>. After deploy, run{' '}
              <code className="text-[#a78bfa]">BondingCurveDeployer(TokenFactory)</code>{' '}
              then <code className="text-[#a78bfa]">setCurveDeployer</code> (see{' '}
              <code className="text-[#e9d5ff]">contract-bonding/scripts/deploy.js</code>
              ).
            </p>
            <p className="text-[7px] text-[#fbbf24]">
              Factory:{' '}
              <code className="break-all text-[#e9d5ff]">
                {shortenAddress(factoryAddress, 6)}
              </code>
            </p>
          </div>
        ) : (
          <>
            <p className="mb-4 font-pixel text-[8px] text-[#a78bfa]">
              Creation fee:{' '}
              <span className="text-[#7cff00]">
                {creationFeeWei !== undefined
                  ? `${safeFormatUnits(creationFeeWei, 18)} ETH`
                  : '—'}
              </span>
            </p>
            {curveDeployerAddress ? (
              <p className="mb-4 font-pixel text-[7px] text-[#6b7280]">
                BondingCurveDeployer (on-chain):{' '}
                <code className="text-[#a78bfa]">
                  {shortenAddress(curveDeployerAddress, 6)}
                </code>
              </p>
            ) : null}

            <div className="space-y-3">
              <div>
                <p className="font-pixel text-[10px] font-normal tracking-wide text-[#d1d5db]">
                  Raised Token
                </p>
                {raiseLoading ? (
                  <div className="mt-3 flex justify-center py-6">
                    <PixelSpinner label="Loading raise config…" />
                  </div>
                ) : raiseError ? (
                  <p className="mt-2 font-pixel text-[8px] text-[#ff6b6b]">
                    Could not load raise config — check{' '}
                    <code className="text-[#ffee00]">VITE_API_BASE_URL</code> and
                    the <code className="text-[#a78bfa]">GET /raise-config</code>{' '}
                    API.
                  </p>
                ) : raiseTokens.length === 0 ? (
                  <p className="mt-2 font-pixel text-[8px] text-[#a78bfa]">
                    No RaiseToken rows on the server — seed the DB or add records.
                  </p>
                ) : (
                  <div className="mt-3 flex flex-wrap gap-x-2 gap-y-4">
                    {raiseTokens.map((t) => {
                      const selected = isSameRaiseToken(form.tokenRaise, t)
                      return (
                        <button
                          key={`${t.id}-${t.tokenAddress}`}
                          type="button"
                          onClick={() => pickTokenRaise(t)}
                          className={`inline-flex min-w-[100px] items-center justify-center gap-2 rounded-full border-2 px-3 py-2 font-pixel text-[9px] uppercase transition-colors ${
                            selected
                              ? 'border-[#7cff00] text-[#7cff00]'
                              : 'border-white/55 text-white hover:border-white/80'
                          }`}
                        >
                          <img
                            src={t.image}
                            alt=""
                            className="size-5 shrink-0 rounded-full bg-black/30 object-cover"
                          />
                          <span className="truncate font-semibold">
                            {t.symbol}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {erc20Raise && raiseTokenCheckLoading ? (
                <p className="font-pixel text-[8px] text-[#a78bfa]">
                  Reading on-chain{' '}
                  <code className="text-[#ffee00]">raiseAllowedTokens(…)</code> on
                  the factory…
                </p>
              ) : null}
              {erc20Raise && raiseTokenCheckError ? (
                <p className="font-pixel text-[8px] text-[#ff6b6b]">
                  Could not call the contract (RPC). Check the network /{' '}
                  <code className="text-[#ffee00]">VITE_RPC_URL</code>.{' '}
                  <button
                    type="button"
                    className="underline text-[#ffee00]"
                    onClick={() => void refetchRaiseTokenAllowed()}
                  >
                    Retry
                  </button>
                </p>
              ) : null}
              {erc20Raise &&
              !raiseTokenCheckLoading &&
              !raiseTokenCheckError &&
              raiseTokenAllowed === false ? (
                <div className="space-y-1 font-pixel text-[8px] text-[#ff6b6b]">
                  <p>
                    On-chain{' '}
                    <code className="text-[#ffee00]">raiseAllowedTokens</code>
                    (ERC20 token address) = <strong>false</strong>. The buttons
                    above are API-only — the owner must still call{' '}
                    <code className="text-[#ffee00]">setRaiseAllowedToken</code>{' '}
                    on the factory this frontend points to.
                  </p>
                  <p className="text-[7px] text-[#fbbf24]">
                    Factory in use (env{' '}
                    <code className="text-[#a78bfa]">VITE_MEME_FACTORY_ADDRESS</code>
                    ):{' '}
                    <code className="break-all text-[#e9d5ff]">
                      {shortenAddress(factoryAddress, 6)}
                    </code>
                  </p>
                  <p>
                    Pick BNB (native) or ask the owner to whitelist this token on
                    that factory.
                  </p>
                </div>
              ) : null}

              <div>
                <p className="font-pixel text-[10px] font-normal tracking-wide text-[#d1d5db]">
                  Market cap raise (USD)
                </p>
                {valuePresets.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {valuePresets.map((v) => {
                      const active =
                        !Number.isNaN(capNum) &&
                        Math.trunc(v.value) === Math.trunc(capNum)
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => pickValuePreset(v)}
                          className={`rounded-full border-2 px-3 py-1.5 font-pixel text-[8px] transition-colors ${
                            active
                              ? 'border-[#7cff00] text-[#7cff00]'
                              : 'border-white/45 text-[#e9d5ff] hover:border-white/70'
                          }`}
                        >
                          {fmtAmount(v.value)} {v.symbol}
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <p className="mt-2 font-pixel text-[8px] text-[#a78bfa]">
                    No cap presets in RaiseValue — seed the DB.
                  </p>
                )}
                {!Number.isNaN(capNum) && capNum > 0 && bnbApproxLabel ? (
                  <p className="mt-2 font-pixel text-[8px] font-normal tracking-wide text-[#7cff00] drop-shadow-[0_0_6px_rgba(124,255,0,0.55)]">
                    ~{bnbApproxLabel} BNB
                  </p>
                ) : null}
              </div>

              <Field
                label="Token name *"
                value={form.name}
                onChange={set('name')}
                placeholder="My Meme"
              />
              <Field
                label="Symbol *"
                value={form.symbol}
                onChange={set('symbol')}
                placeholder="MEME"
              />
              {form.symbol.trim().length > 0 && symbolTaken === true ? (
                <p className="font-pixel text-[8px] text-[#ff6b6b]">
                  This symbol is already taken on-chain.
                </p>
              ) : null}
              <Field
                label="Description"
                value={form.description}
                onChange={set('description')}
                placeholder="One-liner for the community"
                multiline
              />
              <Field
                label="Image URL"
                value={form.imageUrl}
                onChange={set('imageUrl')}
                placeholder="https://..."
              />
              <Field
                label="Twitter"
                value={form.twitter}
                onChange={set('twitter')}
                placeholder="https://x.com/..."
              />
              <Field
                label="Telegram"
                value={form.telegram}
                onChange={set('telegram')}
                placeholder="https://t.me/..."
              />
              <Field
                label="Website"
                value={form.website}
                onChange={set('website')}
                placeholder="https://..."
              />
            </div>

            <Button
              className="mt-6 w-full py-3"
              disabled={createDisabled}
              onClick={async () => {
                if (createDisabled) return
                if (!(await ensureSignedIn())) return
                void createToken(form)
              }}
            >
              {busy ? 'Processing…' : 'Pay fee & create token'}
            </Button>

            {isConnected && !isAuthenticated ? (
              <p className="mt-3 font-pixel text-[7px] leading-relaxed text-[#fbbf24]">
                Creating a token requires a sign-in message — the button opens
                signing before sending the transaction.
              </p>
            ) : null}

            {busy ? (
              <div className="mt-6 flex justify-center">
                <PixelSpinner label="Deploying…" />
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

            {createdTokenAddress ? (
              <div className="mt-4 space-y-2 border-t-4 border-dashed border-[#4c1d95] pt-4 font-pixel text-[8px] text-[#e9d5ff]">
                <p>
                  <span className="text-[#7cff00]">Token:</span>{' '}
                  <span className="break-all text-[#ffee00]">
                    {createdTokenAddress}
                  </span>
                </p>
                {tokenInfo?.bondingCurve ? (
                  <p>
                    <span className="text-[#7cff00]">Bonding curve:</span>{' '}
                    <span className="break-all text-[#ffee00]">
                      {tokenInfo.bondingCurve}
                    </span>
                  </p>
                ) : null}
                <p className="text-[7px] text-[#6b7280]">
                  Use these addresses in Bond page env or paste into your
                  session.
                </p>
              </div>
            ) : null}
          </>
        )}
      </Card>
    </div>
  )
}
