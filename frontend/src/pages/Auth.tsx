import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const parcelGridStyle: React.CSSProperties = {
  backgroundImage: [
    'linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)',
    'linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px)',
    'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)',
    'linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
  ].join(', '),
  backgroundSize: '72px 72px, 72px 72px, 18px 18px, 18px 18px',
}

export default function Auth() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignup, setIsSignup] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    if (isSignup) {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setError(error.message)
      } else {
        setMessage('Verifique seu email para confirmar o cadastro.')
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(
          error.message === 'Invalid login credentials'
            ? 'Email ou senha incorretos.'
            : error.message
        )
      } else {
        navigate('/')
      }
    }

    setLoading(false)
  }

  function toggleMode() {
    setIsSignup(!isSignup)
    setError('')
    setMessage('')
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
        {/* Top: brand */}
        <div>
          <span style={{
            color: 'rgba(255,255,255,0.5)',
            fontSize: '11px',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            fontWeight: 600,
          }}>
            ★ Tax Deed Finder
          </span>
        </div>

        {/* Middle: headline */}
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
          <p style={{
            color: 'rgba(255,255,255,0.55)',
            fontSize: '0.95rem',
            lineHeight: 1.65,
            maxWidth: '30ch',
          }}>
            Property auctions across Florida, Texas and Georgia — tracked daily, geocoded, and filtered so you can act first.
          </p>
        </div>

        {/* Bottom: stats */}
        <div style={{ display: 'flex', gap: '2.5rem' }}>
          {[
            { value: 'FL · TX · GA', label: 'Estados' },
            { value: 'Diário', label: 'Atualização' },
          ].map(({ value, label }) => (
            <div key={label}>
              <div style={{ color: '#ffffff', fontWeight: 700, fontSize: '1rem', letterSpacing: '-0.01em' }}>
                {value}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.15em', marginTop: '2px' }}>
                {label}
              </div>
            </div>
          ))}
        </div>

        {/* Red accent bar */}
        <div style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '4px',
          height: '100%',
          backgroundColor: 'var(--red)',
        }} />
      </div>

      {/* ── Right panel (form) ── */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        padding: '3rem 2rem',
      }}>

        {/* Mobile logo */}
        <div className="lg:hidden" style={{
          marginBottom: '2rem',
          color: 'var(--navy)',
          fontWeight: 700,
          fontSize: '1.1rem',
          letterSpacing: '0.02em',
        }}>
          ★ Tax Deed Finder
        </div>

        <div style={{ width: '100%', maxWidth: '22rem' }}>

          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: '#0f172a',
            marginBottom: '0.25rem',
            letterSpacing: '-0.02em',
          }}>
            {isSignup ? 'Criar conta' : 'Bem-vindo de volta'}
          </h2>
          <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '2rem' }}>
            {isSignup ? 'Comece a acompanhar leilões hoje.' : 'Entre na sua conta.'}
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>
                Email
              </label>
              <input
                type="email"
                placeholder="voce@exemplo.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                style={{
                  width: '100%',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '0.7rem 1rem',
                  fontSize: '0.9rem',
                  outline: 'none',
                  transition: 'border-color 0.15s',
                  boxSizing: 'border-box',
                }}
                onFocus={e => (e.target.style.borderColor = 'var(--navy)')}
                onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>
                Senha
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '0.7rem 1rem',
                  fontSize: '0.9rem',
                  outline: 'none',
                  transition: 'border-color 0.15s',
                  boxSizing: 'border-box',
                }}
                onFocus={e => (e.target.style.borderColor = 'var(--navy)')}
                onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
              />
            </div>

            {error && (
              <p style={{ fontSize: '0.8125rem', color: '#dc2626', margin: 0 }}>{error}</p>
            )}
            {message && (
              <p style={{ fontSize: '0.8125rem', color: '#16a34a', margin: 0 }}>{message}</p>
            )}

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
              onMouseEnter={e => { if (!loading) (e.currentTarget.style.backgroundColor = '#001a4a') }}
              onMouseLeave={e => { (e.currentTarget.style.backgroundColor = 'var(--navy)') }}
            >
              {loading ? 'Aguarde…' : isSignup ? 'Criar conta' : 'Entrar'}
            </button>
          </form>

          <button
            onClick={toggleMode}
            style={{
              marginTop: '1.25rem',
              fontSize: '0.8125rem',
              color: '#64748b',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              width: '100%',
              textAlign: 'center',
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--navy)')}
            onMouseLeave={e => (e.currentTarget.style.color = '#64748b')}
          >
            {isSignup ? 'Já tem conta? Entrar' : 'Não tem conta? Criar conta'}
          </button>

        </div>
      </div>
    </div>
  )
}
