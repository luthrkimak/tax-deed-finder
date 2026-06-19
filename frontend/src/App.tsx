import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import Auth from './pages/Auth'
import Search from './pages/Search'
import AuctionDetail from './pages/AuctionDetail'
import Favorites from './pages/Favorites'
import Alerts from './pages/Alerts'
import Navbar from './components/Navbar'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])
  if (session === undefined) return null
  if (!session) return <Navigate to="/auth" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/*" element={
          <ProtectedRoute>
            <Navbar />
            <Routes>
              <Route path="/" element={<Search />} />
              <Route path="/auctions/:id" element={<AuctionDetail />} />
              <Route path="/favorites" element={<Favorites />} />
              <Route path="/alerts" element={<Alerts />} />
            </Routes>
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  )
}
