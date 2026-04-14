import { useEffect } from 'react'
import { toast } from 'sonner'
import type { Address } from 'viem'
import { useAccount, useWaitForTransactionReceipt, useWriteContract } from 'wagmi'

import { faucetAbi } from '@/abis/faucet'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'

const FAUCET_ADDRESS =
  '0x4e8828DC535EF3D78290C4516852976C0eE9eF3f' as Address

export function FaucetPage() {
  const { isConnected } = useAccount()
  const { writeContractAsync, data: txHash, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  })
  const busy = isPending || isConfirming

  const claim = async (fn: 'claimBNB' | 'claimUSDT') => {
    if (!isConnected) {
      toast.error('Connect wallet first')
      return
    }
    try {
      const hash = await writeContractAsync({
        address: FAUCET_ADDRESS,
        abi: faucetAbi,
        functionName: fn,
      })
      toast.loading(`Submitting ${fn}...`, { id: hash })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Faucet tx failed')
    }
  }

  useEffect(() => {
    if (isSuccess && txHash) {
      toast.success('Faucet claimed', { id: txHash })
    }
  }, [isSuccess, txHash])

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <div className="mb-6 text-center">
        <h1 className="font-pixel animate-float text-sm text-[#4ecdc4] drop-shadow-[3px_3px_0_#000]">
          FAUCET
        </h1>
        <p className="mt-2 font-pixel text-[8px] text-[#a78bfa]">
          Claim test BNB and USDT
        </p>
      </div>

      <Card title="Faucet Actions">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Button
            className="w-full py-3"
            disabled={!isConnected || busy}
            onClick={() => void claim('claimBNB')}
          >
            {busy ? 'Processing…' : 'Faucet BNB'}
          </Button>
          <Button
            className="w-full py-3"
            disabled={!isConnected || busy}
            onClick={() => void claim('claimUSDT')}
          >
            {busy ? 'Processing…' : 'Faucet USDT'}
          </Button>
        </div>
      </Card>
    </div>
  )
}
