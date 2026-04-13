import type { ReactNode } from 'react'

type Props = {
  title?: string
  children: ReactNode
  className?: string
}

export function Card({ title, children, className = '' }: Props) {
  return (
    <section
      className={`retro-card p-4 sm:p-6 ${className}`}
    >
      {title ? (
        <h2 className="font-pixel mb-4 text-xs text-[#ffee00] drop-shadow-[2px_2px_0_#000]">
          {title}
        </h2>
      ) : null}
      {children}
    </section>
  )
}
