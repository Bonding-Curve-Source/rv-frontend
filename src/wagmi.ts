import { createConfig, http } from 'wagmi'
import { bscTestnet } from 'wagmi/chains'
import { injected, walletConnect } from 'wagmi/connectors'

import { appConfig } from '@/config'

/**
 * RainbowKit getDefaultConfig requires a valid WalletConnect projectId.
 * For local dev without one: createConfig + injected only; add WC when VITE_WALLETCONNECT_PROJECT_ID is set.
 */
const wcId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID?.trim() ?? ''

const connectors = [
  injected({ shimDisconnect: true }),
  ...(wcId
    ? [
        walletConnect({
          projectId: wcId,
          showQrModal: true,
        }),
      ]
    : []),
]

export const wagmiConfig = createConfig({
  chains: [bscTestnet],
  connectors,
  transports: {
    [bscTestnet.id]: http(appConfig.rpcUrl),
  },
  ssr: false,
})
