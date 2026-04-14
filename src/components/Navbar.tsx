import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { ConnectButton } from '@rainbow-me/rainbowkit'

import { useWallet } from '@/hooks/useWallet'
import { shortenAddress } from '@/utils/format'

import { Button } from './Button'
import { WalletModal } from './WalletModal'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `font-pixel text-[9px] uppercase tracking-wider px-2 py-1 border-4 border-transparent ${
    isActive
      ? 'border-black bg-[#ffee00] text-black shadow-[3px_3px_0_0_#000]'
      : 'text-[#c4b5fd] hover:text-[#ffee00]'
  }`

export function Navbar() {
  const [walletOpen, setWalletOpen] = useState(false)
  const { address, isConnected, isAuthenticated, signIn } = useWallet()

  return (
    <>
      <header className="sticky top-0 z-40 border-b-4 border-black bg-[#2d1b4e] shadow-[0_4px_0_0_#000]">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link
            to="/bond"
            className="font-pixel text-[10px] text-[#7cff00] drop-shadow-[2px_2px_0_#000]"
          >
            RV BONDING
          </Link>
          <nav className="flex flex-wrap items-center gap-2">
            <NavLink to="/bond" className={linkClass}>
              Bond
            </NavLink>
            <NavLink to="/swap" className={linkClass}>
              Swap
            </NavLink>
            <NavLink to="/create" className={linkClass}>
              Launch
            </NavLink>
          </nav>
          <div className="flex flex-wrap items-center gap-2">
            {isConnected && address ? (
              <button
                type="button"
                className="pixel-btn bg-[#1a0f2e] px-2 py-1 font-pixel text-[8px] text-[#ffee00]"
                onClick={() => setWalletOpen(true)}
              >
                {shortenAddress(address)}
                {isAuthenticated ? ' ✓' : ''}
              </button>
            ) : null}
            {isConnected && !isAuthenticated ? (
              <Button
                className="px-2 py-1 text-[8px]"
                onClick={() => void signIn()}
              >
                Sign & login
              </Button>
            ) : null}
            <ConnectButton showBalance={false} chainStatus="icon" />
          </div>
        </div>
      </header>
      <WalletModal open={walletOpen} onClose={() => setWalletOpen(false)} />
    </>
  )
}
