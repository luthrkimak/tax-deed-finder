import { useEffect, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { useI18n, LANG_OPTIONS, type Lang } from '../lib/i18n'

export default function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const [session, setSession] = useState<Session | null>(null)
  const { lang, setLang, t } = useI18n()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
    navigate('/auth')
  }

  function navLink(path: string) {
    const active = location.pathname === path
    return `px-3 py-1.5 rounded-md text-sm transition-colors ${
      active
        ? 'bg-white/15 text-white font-medium'
        : 'text-blue-200 hover:text-white hover:bg-white/10'
    }`
  }

  return (
    <nav style={{ backgroundColor: 'var(--navy)' }} className="px-6 py-3 flex items-center gap-1">
      <Link to="/" className="font-bold text-white text-lg tracking-wide mr-4">
        ★ BidLand
      </Link>
      {session && (
        <Link to="/dashboard" className={navLink('/dashboard')}>{t.nav_dashboard}</Link>
      )}
      <Link to="/search" className={navLink('/search')}>{t.nav_search}</Link>
      <Link to="/favorites" className={navLink('/favorites')}>{t.nav_favorites}</Link>
      <Link to="/alerts" className={navLink('/alerts')}>{t.nav_alerts}</Link>
      <Link to="/counties" className={navLink('/counties')}>{t.nav_counties}</Link>
      <Link to="/estados" className={navLink('/estados')}>Guia</Link>
      <Link to="/estrategias" className={navLink('/estrategias')}>Estratégias</Link>

      <div className="ml-auto flex items-center gap-3">
        {/* Language selector */}
        <div className="flex items-center gap-1 bg-white/10 rounded px-2 py-1">
          {LANG_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setLang(opt.value as Lang)}
              title={opt.label}
              className={`text-sm px-1.5 py-0.5 rounded transition-all ${
                lang === opt.value
                  ? 'bg-white text-[#002868] font-bold'
                  : 'text-blue-200 hover:text-white'
              }`}
            >
              {opt.flag} {opt.value.toUpperCase()}
            </button>
          ))}
        </div>

        <span className="w-px h-4 bg-white/20" />

        {session ? (
          <button
            onClick={signOut}
            className="text-sm text-blue-200 hover:text-white border border-white/20 hover:border-white/40 px-3 py-1.5 rounded-md transition-colors"
          >
            {t.nav_logout}
          </button>
        ) : (
          <Link
            to="/auth"
            style={{ backgroundColor: 'var(--red)' }}
            className="text-sm text-white px-4 py-1.5 rounded font-medium hover:opacity-90 transition-opacity"
          >
            {t.nav_login}
          </Link>
        )}
      </div>
    </nav>
  )
}
