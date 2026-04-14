export function DesignPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 text-center">
        <h1 className="font-pixel animate-float text-sm text-[#4ecdc4] drop-shadow-[3px_3px_0_#000]">
          SYSTEM DESIGN
        </h1>
        <p className="mt-2 font-pixel text-[8px] text-[#a78bfa]">
          High-level flow: Launch token → Bonding trade → Graduation → Swap
        </p>
      </div>

      <section className="mb-4 rounded border-4 border-black bg-[#1a0f2e] p-4 shadow-[4px_4px_0_0_#000]">
        <h2 className="font-pixel text-[10px] text-[#ffee00]">Components</h2>
        <p className="mt-2 font-pixel text-[8px] leading-relaxed text-[#e9d5ff]">
          <span className="text-[#7cff00]">Frontend:</span> Launch/Bond/Swap UI,
          wallet connection, sign-in.
          <br />
          <span className="text-[#7cff00]">Backend:</span> API token list, event
          indexer TokenCreated, DB metadata.
          <br />
          <span className="text-[#7cff00]">Contracts:</span> TokenFactory,
          BondingCurve, PancakeSwap-fork router/pair.
          <br />
          <span className="text-[#7cff00]">Infra:</span> Primary RPC + backup RPC
          failover.
        </p>
      </section>

      <section className="mb-4 rounded border-4 border-black bg-[#1a0f2e] p-4 shadow-[4px_4px_0_0_#000]">
        <h2 className="font-pixel text-[10px] text-[#ffee00]">Runtime Diagram</h2>
        <div className="mt-3 grid gap-2">
          <div className="rounded border-2 border-[#4ecdc4] bg-[#120a22] px-3 py-2 font-pixel text-[8px] text-[#e9d5ff]">
            1) Launch token + target cap
          </div>
          <p className="text-center font-pixel text-[8px] text-[#7cff00]">↓</p>
          <div className="rounded border-2 border-[#4ecdc4] bg-[#120a22] px-3 py-2 font-pixel text-[8px] text-[#e9d5ff]">
            2) TokenFactory `createToken`
          </div>
          <p className="text-center font-pixel text-[8px] text-[#7cff00]">↓</p>
          <div className="rounded border-2 border-[#4ecdc4] bg-[#120a22] px-3 py-2 font-pixel text-[8px] text-[#e9d5ff]">
            3) Event `TokenCreated` → backend indexer → DB
          </div>
          <p className="text-center font-pixel text-[8px] text-[#7cff00]">↓</p>
          <div className="rounded border-2 border-[#4ecdc4] bg-[#120a22] px-3 py-2 font-pixel text-[8px] text-[#e9d5ff]">
            4) Bonding buy/sell on BondingCurve
          </div>
          <p className="text-center font-pixel text-[8px] text-[#7cff00]">↓</p>
          <div className="rounded border-2 border-[#ffee00] bg-[#120a22] px-3 py-2 font-pixel text-[8px] text-[#e9d5ff]">
            5) Graduation → liquidity on DEX
          </div>
          <p className="text-center font-pixel text-[8px] text-[#7cff00]">↓</p>
          <div className="rounded border-2 border-[#7cff00] bg-[#120a22] px-3 py-2 font-pixel text-[8px] text-[#e9d5ff]">
            6) RAVI SWAP (approve first for ERC20)
          </div>
        </div>
      </section>

      <section className="rounded border-4 border-black bg-[#1a0f2e] p-4 shadow-[4px_4px_0_0_#000]">
        <h2 className="font-pixel text-[10px] text-[#ffee00]">
          Cap → Add Liquidity Flow
        </h2>
        <div className="mt-3 grid gap-2">
          <div className="rounded border-2 border-[#a78bfa] bg-[#120a22] px-3 py-2 font-pixel text-[8px] text-[#e9d5ff]">
            A) Set `targetValue` (USD, 1e18 scale) during launch
          </div>
          <p className="text-center font-pixel text-[8px] text-[#7cff00]">↓</p>
          <div className="rounded border-2 border-[#a78bfa] bg-[#120a22] px-3 py-2 font-pixel text-[8px] text-[#e9d5ff]">
            B) Each buy increases total raised amount (in raise token) inside
            BondingCurve
          </div>
          <p className="text-center font-pixel text-[8px] text-[#7cff00]">↓</p>
          <div className="rounded border-2 border-[#a78bfa] bg-[#120a22] px-3 py-2 font-pixel text-[8px] text-[#e9d5ff]">
            C) Use Chainlink Aggregator to convert raise token → USD (1e18) and
            compute `totalRaisedUsd`
          </div>
          <p className="text-center font-pixel text-[8px] text-[#7cff00]">↓</p>
          <div className="rounded border-2 border-[#a78bfa] bg-[#120a22] px-3 py-2 font-pixel text-[8px] text-[#e9d5ff]">
            D) Check condition: `totalRaisedUsd &gt;= targetValue`
          </div>
          <p className="text-center font-pixel text-[8px] text-[#7cff00]">↓</p>
          <div className="rounded border-2 border-[#ffee00] bg-[#120a22] px-3 py-2 font-pixel text-[8px] text-[#e9d5ff]">
            E) Trigger graduation / add liquidity into Pancake-fork pair
          </div>
          <p className="text-center font-pixel text-[8px] text-[#7cff00]">↓</p>
          <div className="rounded border-2 border-[#7cff00] bg-[#120a22] px-3 py-2 font-pixel text-[8px] text-[#e9d5ff]">
            F) Token state changes: Bonding → Graduated (swap on DEX)
          </div>
        </div>
      </section>
    </div>
  )
}
