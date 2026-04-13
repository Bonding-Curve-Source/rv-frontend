import type { Address } from 'viem'

/** Chain config — override for mainnet / custom deployment */
export const appConfig = {
  chainId: Number(import.meta.env.VITE_CHAIN_ID ?? 97),
  rpcUrl:
    import.meta.env.VITE_RPC_URL ??
    'https://data-seed-prebsc-1-s1.binance.org:8545',
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000',
  /** Địa chỉ từ env — Bond / swap page dùng curve + token sau khi tạo token */
  contracts: {
    /** BondingCurve instance (sau createToken hoặc env) */
    bondingCurve: (import.meta.env.VITE_BONDING_CURVE_ADDRESS ??
      '0x1111111111111111111111111111111111111111') as Address,
    /** ERC20 meme token */
    token: (import.meta.env.VITE_TOKEN_ADDRESS ??
      '0x2222222222222222222222222222222222222222') as Address,
    /** WBNB BSC Testnet */
    weth: (import.meta.env.VITE_WETH_ADDRESS ??
      '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd') as Address,
    /** Pancake / Uniswap V2-style router (BSC testnet) */
    uniswapV2Router: (import.meta.env.VITE_UNISWAP_V2_ROUTER ??
      '0xD99D1c33F9fC3444f8101754aBC46c52416550D1') as Address,
    /** TokenFactory (contract-bonding) — createToken; curve qua BondingCurveDeployer */
    memeFactory: (import.meta.env.VITE_MEME_FACTORY_ADDRESS ??
      '0x0000000000000000000000000000000000000000') as Address,
  },
  /** Default slippage (%) */
  defaultSlippagePercent: 0.5,
} as const
