type Props = {
  className?: string
  label?: string
}

export function PixelSpinner({ className = '', label }: Props) {
  return (
    <div
      className={`inline-flex items-center gap-3 font-pixel text-[10px] text-[#ffee00] ${className}`}
      role="status"
      aria-live="polite"
    >
      <div className="pixel-spin flex gap-0.5">
        <span className="h-3 w-3 bg-[#ff6b6b] pixel-box" />
        <span className="h-3 w-3 bg-[#4ecdc4] pixel-box animation-delay-100" />
        <span className="h-3 w-3 bg-[#ffe66d] pixel-box animation-delay-200" />
      </div>
      {label ? <span>{label}</span> : null}
    </div>
  )
}
