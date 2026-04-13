import type { ButtonHTMLAttributes, ReactNode } from 'react'

import { playPixelClick } from '@/utils/sound'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
  variant?: 'primary' | 'accent' | 'ghost'
  sound?: boolean
}

export function Button({
  children,
  className = '',
  variant = 'primary',
  sound = true,
  onClick,
  type = 'button',
  disabled,
  ...rest
}: Props) {
  const palette =
    variant === 'primary'
      ? 'bg-[#7cff00] text-black hover:bg-[#9fff50]'
      : variant === 'accent'
        ? 'bg-[#ff6b6b] text-white hover:bg-[#ff8585]'
        : 'bg-[#2d1b4e] text-[#e0d7ff] hover:bg-[#3d2b6e]'

  return (
    <button
      type={type}
      disabled={disabled}
      className={`pixel-btn font-pixel text-[10px] uppercase tracking-wide ${palette} ${disabled ? 'cursor-not-allowed opacity-50' : 'active:translate-x-0.5 active:translate-y-0.5'} ${className}`}
      onClick={(e) => {
        if (sound && !disabled) playPixelClick()
        onClick?.(e)
      }}
      {...rest}
    >
      {children}
    </button>
  )
}
