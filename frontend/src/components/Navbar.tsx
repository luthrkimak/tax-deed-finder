import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { useI18n, LANG_OPTIONS, type Lang } from '../lib/i18n'

export default function Navbar() {
  const navigate = useNavigate()
  const [session, setSession] = useState<Session | null>(null)
  const { lang, setLang, t } = useI18n()

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
    <nav style={{ backgroundColor: 'var(--navy)' }} className="px-6 py-3 flex items-center gap-6">
      <Link to="/" className="font-bold text-white text-lg tracking-wide">
        ★ Tax Deed Finder
      </Link>
      <Link to="/" className="text-blue-200 hover:text-white text-sm transition-colors">{t.nav_search}</Link>
      <Link to="/favorites" className="text-blue-200 hover:text-white text-sm transition-colors">{t.nav_favorites}</Link>
      <Link to="/alerts" className="text-blue-200 hover:text-white text-sm transition-colors">{t.nav_alerts}</Link>
      <Link to="/counties" className="text-blue-200 hover:text-white text-sm transition-colors">{t.nav_counties}</Link>

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

        {session ? (
          <button onClick={signOut} className="text-sm text-blue-200 hover:text-white transition-colors">
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
