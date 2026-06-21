import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export default function Navbar() {
  const navigate = useNavigate()
  const [session, setSession] = useState<Session | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
    navigate('/')
  }

  return (
    <nav className="bg-white border-b px-6 py-3 flex items-center gap-6">
      <Link to="/" className="font-bold text-blue-700 text-lg">Tax Deed Finder</Link>
      <Link to="/" className="text-gray-600 hover:text-gray-900">Busca</Link>
      <Link to="/favorites" className="text-gray-600 hover:text-gray-900">Favoritos</Link>
      <Link to="/alerts" className="text-gray-600 hover:text-gray-900">Alertas</Link>
      <div className="ml-auto">
        {session ? (
          <button onClick={signOut} className="text-sm text-gray-500 hover:text-gray-900">
            Sair
          </button>
        ) : (
          <Link to="/auth" className="text-sm bg-blue-600 text-white px-4 py-1.5 rounded hover:bg-blue-700">
            Entrar
          </Link>
        )}
      </div>
    </nav>
  )
}
