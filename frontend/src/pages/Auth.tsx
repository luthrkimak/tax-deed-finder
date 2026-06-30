import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useI18n, LANG_OPTIONS, type Lang } from '../lib/i18n'

const parcelGridStyle: React.CSSProperties = {
  backgroundImage: [
    'linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)',
    'linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px)',
    'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)',
    'linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
  ].join(', '),
  backgroundSize: '72px 72px, 72px 72px, 18px 18px, 18px 18px',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  border: '1.5px solid #e2e8f0',
  borderRadius: '8px',
  padding: '0.7rem 1rem',
  fontSize: '0.9rem',
  outline: 'none',
  transition: 'border-color 0.15s',
  boxSizing: 'border-box',
}

export default function Auth() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { lang, setLang, t } = useI18n()

  function switchMode(next: 'login' | 'signup') {
    setMode(next)
    setError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (mode === 'signup') {
      const { data: valid, error: rpcError } = await supabase.rpc('use_invite_code', {
        p_code: inviteCode.trim(),
        p_email: email.trim(),
      })
      if (rpcError || !valid) {
        setError(t.auth_invalid_code)
        setLoading(false)
        return
      }

      const { error: signupError } = await supabase.auth.signUp({ email, password })
      if (signupError) {
        setError(signupError.message)
        setLoading(false)
        return
      }
      navigate('/')
    } else {
      const { error: loginError } = await supabase.auth.signInWithPassword({ email, password })
      if (loginError) {
        setError(
          loginError.message === 'Invalid login credentials'
            ? 'Email ou senha incorretos.'
            : loginError.message
        )
        setLoading(false)
        return
      }
      navigate('/')
    }

    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100svh', display: 'flex' }}>

      {/* ── Left panel ── */}
      <div
        style={{
          backgroundColor: 'var(--navy)',
          ...parcelGridStyle,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '3rem 3.5rem',
          width: '55%',
          position: 'relative',
          overflow: 'hidden',
        }}
        className="hidden lg:flex"
      >
        <div>
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 600 }}>
            ★ BidLand
          </span>
        </div>

        <div>
          <h1 style={{
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: 'clamp(2.2rem, 3.5vw, 3.2rem)',
            fontWeight: 700,
            color: '#ffffff',
            lineHeight: 1.15,
            letterSpacing: '-0.02em',
            marginBottom: '1.25rem',
          }}>
            Find your next<br />
            investment<br />
            before the crowd.
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.95rem', lineHeight: 1.65, maxWidth: '30ch' }}>
            Property auctions across Florida, Mississippi and Georgia — tracked daily, geocoded, and filtered so you can act first.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '2.5rem' }}>
          {[{ value: 'FL · MS · GA', label: 'States' }, { value: 'Daily', label: 'Updates' }].map(({ value, label }) => (
            <div key={label}>
              <div style={{ color: '#ffffff', fontWeight: 700, fontSize: '1rem' }}>{value}</div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.15em', marginTop: '2px' }}>{label}</div>
            </div>
          ))}
        </div>

        <div style={{ position: 'absolute', top: 0, right: 0, width: '4px', height: '100%', backgroundColor: 'var(--red)' }} />
      </div>

      {/* ── Right panel ── */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        padding: '3rem 2rem',
        position: 'relative',
      }}>

        {/* Language selector */}
        <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', display: 'flex', gap: '2px', backgroundColor: '#f1f5f9', borderRadius: '8px', padding: '3px' }}>
          {LANG_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setLang(opt.value as Lang)}
              title={opt.label}
              style={{
                background: lang === opt.value ? '#ffffff' : 'transparent',
                border: 'none',
                borderRadius: '6px',
                padding: '4px 8px',
                fontSize: '12px',
                fontWeight: lang === opt.value ? 700 : 400,
                color: lang === opt.value ? 'var(--navy)' : '#94a3b8',
                cursor: 'pointer',
                transition: 'all 0.15s',
                boxShadow: lang === opt.value ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                lineHeight: 1.4,
              }}
            >
              {opt.flag} {opt.value.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Mobile logo */}
        <div className="lg:hidden" style={{ marginBottom: '2rem', color: 'var(--navy)', fontWeight: 700, fontSize: '1.1rem' }}>
          ★ BidLand
        </div>

        <div style={{ width: '100%', maxWidth: '22rem' }}>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '0', marginBottom: '2rem', borderBottom: '2px solid #f1f5f9' }}>
            {(['login', 'signup'] as const).map(m => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                style={{
                  flex: 1,
                  background: 'none',
                  border: 'none',
                  borderBottom: mode === m ? '2px solid var(--navy)' : '2px solid transparent',
                  marginBottom: '-2px',
                  padding: '0.6rem 0',
                  fontSize: '0.875rem',
                  fontWeight: mode === m ? 700 : 400,
                  color: mode === m ? 'var(--navy)' : '#94a3b8',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {m === 'login' ? t.auth_login_btn : t.auth_signup_btn}
              </button>
            ))}
          </div>

          <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1.5rem' }}>
            {mode === 'login' ? t.auth_login_sub : t.auth_signup_sub}
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>Email</label>
              <input
                type="email"
                placeholder="voce@exemplo.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                style={inputStyle}
                onFocus={e => (e.target.style.borderColor = 'var(--navy)')}
                onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>{t.auth_password}</label>
              <input
                type="password"
                placeholder="••••••••"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={inputStyle}
                onFocus={e => (e.target.style.borderColor = 'var(--navy)')}
                onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
              />
            </div>

            {mode === 'signup' && (
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>{t.auth_invite_code}</label>
                <input
                  type="text"
                  placeholder={t.auth_invite_placeholder}
                  value={inviteCode}
                  onChange={e => setInviteCode(e.target.value)}
                  required
                  style={{ ...inputStyle, textTransform: 'uppercase', letterSpacing: '0.05em' }}
                  onFocus={e => (e.target.style.borderColor = 'var(--navy)')}
                  onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
                />
              </div>
            )}

            {error && <p style={{ fontSize: '0.8125rem', color: '#dc2626', margin: 0 }}>{error}</p>}

            <button
              type="submit"
              disabled={loading}
              style={{
                backgroundColor: 'var(--navy)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '0.8rem',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
                transition: 'opacity 0.15s, background-color 0.15s',
                marginTop: '0.25rem',
              }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.backgroundColor = '#001a4a' }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'var(--navy)' }}
            >
              {loading ? t.auth_loading : mode === 'login' ? t.auth_login_btn : t.auth_signup_btn}
            </button>
          </form>

        </div>
      </div>
    </div>
  )
}
