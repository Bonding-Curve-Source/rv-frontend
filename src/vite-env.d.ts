/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CHAIN_ID?: string
  readonly VITE_RPC_URL?: string
  readonly VITE_API_BASE_URL?: string
  readonly VITE_BONDING_CURVE_ADDRESS?: string
  readonly VITE_TOKEN_ADDRESS?: string
  readonly VITE_WETH_ADDRESS?: string
  readonly VITE_UNISWAP_V2_ROUTER?: string
  readonly VITE_MEME_FACTORY_ADDRESS?: string
  readonly VITE_WALLETCONNECT_PROJECT_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
