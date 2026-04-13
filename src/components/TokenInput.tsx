import type { ChangeEvent } from 'react'

type Props = {
  label: string
  value: string
  onChange: (v: string) => void
  symbol?: string
  balanceLabel?: string
  /** MAX button (e.g. fill remaining amount to complete the bond) — shown next to the balance row. */
  maxButton?: {
    onClick: () => void
    disabled?: boolean
    label?: string
  }
  placeholder?: string
  disabled?: boolean
}

export function TokenInput({
  label,
  value,
  onChange,
  symbol,
  balanceLabel,
  maxButton,
  placeholder = '0.0',
  disabled,
}: Props) {
  return (
    <label className="block">
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1 font-pixel text-[8px] text-[#b8a8ff]">
        <span className="min-w-0 shrink">{label}</span>
        {balanceLabel || maxButton ? (
          <span className="flex max-w-full shrink-0 flex-wrap items-center justify-end gap-2 text-right sm:max-w-[min(100%,18rem)]">
            {balanceLabel ? (
              <span className="break-all font-mono text-[11px] leading-snug text-[#7cff00]">
                bal: {balanceLabel}
              </span>
            ) : null}
            {maxButton ? (
              <button
                type="button"
                className="shrink-0 border-2 border-black bg-[#4c1d95] px-1.5 py-0.5 font-pixel text-[8px] text-[#ffee00] shadow-[2px_2px_0_0_#000] hover:bg-[#5b21b6] disabled:cursor-not-allowed disabled:opacity-40"
                disabled={maxButton.disabled}
                onClick={maxButton.onClick}
              >
                {maxButton.label ?? 'MAX'}
              </button>
            ) : null}
          </span>
        ) : null}
      </div>
      <div className="flex items-center gap-2 border-4 border-black bg-[#1a0f2e] px-2 py-2 shadow-[4px_4px_0_0_#000]">
        <input
          className="min-w-0 flex-1 bg-transparent font-pixel text-[10px] text-[#fff] outline-none placeholder:text-[#5c4d7a]"
          inputMode="decimal"
          placeholder={placeholder}
          value={value}
          disabled={disabled}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onChange(e.target.value)
          }
        />
        {symbol ? (
          <span className="shrink-0 font-pixel text-[9px] text-[#ffee00]">
            {symbol}
          </span>
        ) : null}
      </div>
    </label>
  )
}
