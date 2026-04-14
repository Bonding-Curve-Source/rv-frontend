import { SwapForm } from '@/components/SwapForm'
import { useSwap } from '@/hooks/useSwap'

export function SwapPage() {
  const swap = useSwap()

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <div className="mb-6 text-center">
        <h1 className="font-pixel animate-float text-sm text-[#4ecdc4] drop-shadow-[3px_3px_0_#000]">
          RAVI SWAP
        </h1>
      </div>

      <SwapForm swap={swap} />
    </div>
  )
}
