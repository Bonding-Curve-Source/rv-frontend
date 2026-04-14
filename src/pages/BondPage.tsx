import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { BondTokenRow } from '@/components/BondTokenRow'
import { BondTradeModal } from '@/components/BondTradeModal'
import { Card } from '@/components/Card'
import { SwapModal } from '@/components/SwapModal'
import { PixelSpinner } from '@/components/PixelSpinner'
import { useBondingDexSplit } from '@/hooks/useBondingDexSplit'
import { fetchTokens, type BondToken } from '@/services/token'

function TokenColumn({
  title,
  items,
  onSelect,
  emptyLabel,
}: {
  title: string
  items: BondToken[]
  onSelect: (t: BondToken) => void
  emptyLabel: string
}) {
  return (
    <Card title={title}>
      {items.length === 0 ? (
        <p className="font-pixel text-[9px] text-[#6b7280]">{emptyLabel}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((t) => (
            <li key={t.id}>
              <BondTokenRow token={t} onSelect={() => onSelect(t)} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

type BondModalState =
  | { kind: 'curve'; token: BondToken }
  | { kind: 'swap'; token: BondToken }

export function BondPage() {
  const [modal, setModal] = useState<BondModalState | null>(null)

  const { data: tokens, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['bond-tokens'],
    queryFn: fetchTokens,
    staleTime: 0,
    refetchOnMount: 'always',
    /** Keep the list in sync with the backend when new tokens or indexer updates arrive. */
    refetchInterval: 15_000,
  })

  const { active, graduated, isLoading: dexLoading, dexReadError } =
    useBondingDexSplit(tokens)

  const showDexSpinner =
    !isLoading && !isError && Boolean(tokens?.length) && dexLoading

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 text-center">
        <h1 className="font-pixel animate-float text-sm text-[#ff6b6b] drop-shadow-[3px_3px_0_#000]">
          BONDING CURVE
        </h1>
        <p className="mt-2 font-pixel text-[8px] text-[#a78bfa]">
          Bonding vs graduated
        </p>
      </div>


      {isLoading ? (
        <div className="flex justify-center py-12">
          <PixelSpinner label="Loading…" />
        </div>
      ) : null}

      {isError ? (
        <Card title="Bonding tokens">
          <p className="font-pixel text-[9px] text-[#f87171]">
            Could not load the list:{' '}
            {error instanceof Error ? error.message : 'Unknown error'}
            <button
              type="button"
              className="ml-2 underline text-[#ffee00]"
              onClick={() => void refetch()}
            >
              Retry
            </button>
          </p>
        </Card>
      ) : null}

      {!isLoading && !isError && tokens && tokens.length === 0 ? (
        <Card title="Bonding tokens">
          <p className="font-pixel text-[9px] text-[#a78bfa]">
            No tokens yet. Create one first; the backend records them when
            on-chain events occur.
          </p>
        </Card>
      ) : null}

      {dexReadError ? (
        <p className="mb-4 font-pixel text-[8px] text-[#fbbf24]">
          Could not read DEX status on-chain; showing all tokens under Bonding.
        </p>
      ) : null}

      {showDexSpinner ? (
        <div className="flex justify-center py-12">
          <PixelSpinner label="Reading bonding status…" />
        </div>
      ) : null}

      {!isLoading &&
      !isError &&
      tokens &&
      tokens.length > 0 &&
      !dexLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:items-start">
          <TokenColumn
            title="Bonding"
            items={active}
            onSelect={(t) => setModal({ kind: 'curve', token: t })}
            emptyLabel="No tokens bonding."
          />
          <TokenColumn
            title="Graduated"
            items={graduated}
            onSelect={(t) => setModal({ kind: 'swap', token: t })}
            emptyLabel="No graduated tokens yet."
          />
        </div>
      ) : null}

      {modal?.kind === 'curve' ? (
        <BondTradeModal
          token={modal.token}
          onClose={() => setModal(null)}
        />
      ) : null}
      {modal?.kind === 'swap' ? (
        <SwapModal
          key={modal.token.id}
          token={modal.token}
          onClose={() => setModal(null)}
        />
      ) : null}
    </div>
  )
}
