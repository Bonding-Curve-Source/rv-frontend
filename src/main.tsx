import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { WagmiProvider } from 'wagmi'

import App from '@/App'
import { wagmiConfig } from '@/wagmi'

import '@rainbow-me/rainbowkit/styles.css'
import '@/index.css'

import { Toaster } from 'sonner'

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: '#7cff00',
            accentColorForeground: '#0f0720',
            borderRadius: 'none',
            fontStack: 'system',
          })}
        >
          <App />
          <Toaster
            theme="dark"
            position="bottom-center"
            toastOptions={{
              classNames: {
                toast:
                  'font-sans text-sm border-4 border-black bg-[#2d1b4e] text-[#ffee00]',
              },
            }}
          />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>,
)
