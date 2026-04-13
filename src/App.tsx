import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { Navbar } from '@/components/Navbar'
import { BondPage } from '@/pages/BondPage'
import { CreateTokenPage } from '@/pages/CreateTokenPage'
import { SwapPage } from '@/pages/SwapPage'

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#0f0720] bg-[radial-gradient(ellipse_at_top,_#2d1b4e_0%,_#0f0720_55%)]">
        <Navbar />
        <main>
          <Routes>
            <Route path="/" element={<Navigate to="/bond" replace />} />
            <Route path="/bond" element={<BondPage />} />
            <Route path="/swap" element={<SwapPage />} />
            <Route path="/create" element={<CreateTokenPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
