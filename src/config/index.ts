import type { Address } from 'viem'

function telegramHrefFromEnv(raw: string | undefined): string | undefined {
  const t = raw?.trim()
  if (!t) return undefined
  if (t.startsWith('http://') || t.startsWith('https://')) return t
  return `https://t.me/${t.replace(/^@/, '')}`
}

/** Chain config — override for mainnet / custom deployment */
export const appConfig = {
  chainId: Number(import.meta.env.VITE_CHAIN_ID ?? 97),
  rpcUrl:
    import.meta.env.VITE_RPC_URL ??
    'https://data-seed-prebsc-1-s1.binance.org:8545',
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000',
  /** Addresses from env — Bond / swap use curve + token after token creation */
  contracts: {
    /** BondingCurve instance (after createToken or from env) */
    bondingCurve: (import.meta.env.VITE_BONDING_CURVE_ADDRESS ??
      '0x1111111111111111111111111111111111111111') as Address,
    /** ERC20 meme token */
    token: (import.meta.env.VITE_TOKEN_ADDRESS ??
      '0x2222222222222222222222222222222222222222') as Address,
    /** WBNB BSC Testnet */
    weth: (import.meta.env.VITE_WETH_ADDRESS ??
      '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd') as Address,
    /**
     * Chainlink BNB/USD feed — chú thích ~BNB cho cap USD.
     * BSC mainnet: mặc định feed chính thức; testnet: bắt buộc set `VITE_CHAINLINK_BNB_USD_FEED`.
     * @see https://docs.chain.link/data-feeds/price-feeds/addresses?network=bnb-chain
     */
    chainlinkBnbUsdFeed: (() => {
      const fromEnv = import.meta.env.VITE_CHAINLINK_BNB_USD_FEED?.trim()
      if (fromEnv) return fromEnv as Address
      if (Number(import.meta.env.VITE_CHAIN_ID ?? 97) === 56) {
        return '0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE' as Address
      }
      return undefined
    })(),
    /** Pancake / Uniswap V2-style router (BSC testnet) */
    uniswapV2Router: (import.meta.env.VITE_UNISWAP_V2_ROUTER ??
      '0x0D34BCe358Ec89099466e63f8766D047c8007ba5') as Address,
    /** TokenFactory (contract-bonding) — createToken; curve via BondingCurveDeployer */
    memeFactory: (import.meta.env.VITE_MEME_FACTORY_ADDRESS ??
      '0x0000000000000000000000000000000000000000') as Address,
  },
  /** Default slippage (%) */
  defaultSlippagePercent: 0.5,
  /** Footer — `VITE_CONTACT_EMAIL`, `VITE_CONTACT_TELEGRAM` (username or full t.me URL) */
  contact: {
    email: import.meta.env.VITE_CONTACT_EMAIL?.trim() || undefined,
    telegramUrl: telegramHrefFromEnv(import.meta.env.VITE_CONTACT_TELEGRAM),
  },
} as const
