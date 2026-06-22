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

export default function Auth() {
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { lang, setLang, t } = useI18n()

  async function sendCode(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    })
    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      setStep('code')
    }
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: 'email',
    })
    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      navigate('/')
    }
  }

  async function resend() {
    setError('')
    setCode('')
    await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } })
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
          <span style={{
            color: 'rgba(255,255,255,0.5)',
            fontSize: '11px',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            fontWeight: 600,
          }}>
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
          <p style={{
            color: 'rgba(255,255,255,0.55)',
            fontSize: '0.95rem',
            lineHeight: 1.65,
            maxWidth: '30ch',
          }}>
            Property auctions across Florida, Texas and Georgia — tracked daily, geocoded, and filtered so you can act first.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '2.5rem' }}>
          {[
            { value: 'FL · TX · GA', label: 'States' },
            { value: 'Daily', label: 'Updates' },
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

        <div style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '4px',
          height: '100%',
          backgroundColor: 'var(--red)',
        }} />
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
        <div style={{
          position: 'absolute',
          top: '1.5rem',
          right: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '2px',
          backgroundColor: '#f1f5f9',
          borderRadius: '8px',
          padding: '3px',
        }}>
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
        <div className="lg:hidden" style={{
          marginBottom: '2rem',
          color: 'var(--navy)',
          fontWeight: 700,
          fontSize: '1.1rem',
          letterSpacing: '0.02em',
        }}>
          ★ BidLand
        </div>

        <div style={{ width: '100%', maxWidth: '22rem' }}>

          {step === 'email' ? (
            <>
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: 700,
                color: '#0f172a',
                marginBottom: '0.25rem',
                letterSpacing: '-0.02em',
              }}>
                {t.auth_welcome_back}
              </h2>
              <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '2rem' }}>
                {t.auth_sign_in_sub}
              </p>

              <form onSubmit={sendCode} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
                  onMouseEnter={e => { if (!loading) (e.currentTarget.style.backgroundColor = '#001a4a') }}
                  onMouseLeave={e => { (e.currentTarget.style.backgroundColor = 'var(--navy)') }}
                >
                  {loading ? t.auth_sending : t.auth_send_code}
                </button>
              </form>
            </>
          ) : (
            <>
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: 700,
                color: '#0f172a',
                marginBottom: '0.25rem',
                letterSpacing: '-0.02em',
              }}>
                {t.auth_code_label}
              </h2>
              <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '2rem' }}>
                {t.auth_code_sent_pre}{' '}
                <span style={{ color: '#0f172a', fontWeight: 500 }}>{email}</span>
              </p>

              <form onSubmit={verifyCode} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>
                    {t.auth_code_label}
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder={t.auth_code_placeholder}
                    value={code}
                    onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    required
                    autoFocus
                    style={{
                      width: '100%',
                      border: '1.5px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '0.7rem 1rem',
                      fontSize: '1.5rem',
                      fontWeight: 700,
                      letterSpacing: '0.4em',
                      outline: 'none',
                      transition: 'border-color 0.15s',
                      boxSizing: 'border-box',
                      textAlign: 'center',
                    }}
                    onFocus={e => (e.target.style.borderColor = 'var(--navy)')}
                    onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
                  />
                </div>

                {error && <p style={{ fontSize: '0.8125rem', color: '#dc2626', margin: 0 }}>{error}</p>}

                <button
                  type="submit"
                  disabled={loading || code.length < 6}
                  style={{
                    backgroundColor: 'var(--navy)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.8rem',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    cursor: (loading || code.length < 6) ? 'not-allowed' : 'pointer',
                    opacity: (loading || code.length < 6) ? 0.5 : 1,
                    transition: 'opacity 0.15s, background-color 0.15s',
                    marginTop: '0.25rem',
                  }}
                  onMouseEnter={e => { if (!loading && code.length === 6) (e.currentTarget.style.backgroundColor = '#001a4a') }}
                  onMouseLeave={e => { (e.currentTarget.style.backgroundColor = 'var(--navy)') }}
                >
                  {loading ? t.auth_verifying : t.auth_verify}
                </button>
              </form>

              <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'space-between' }}>
                <button
                  onClick={() => { setStep('email'); setError(''); setCode('') }}
                  style={{ fontSize: '0.8125rem', color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#64748b')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}
                >
                  ← {t.auth_back}
                </button>
                <button
                  onClick={resend}
                  style={{ fontSize: '0.8125rem', color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--navy)')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}
                >
                  {t.auth_resend}
                </button>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  )
}
