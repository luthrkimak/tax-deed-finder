import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import type { Auction, Favorite } from '../types'
import { apiClient } from '../lib/api'
import { useI18n } from '../lib/i18n'
import TitleResearch from '../components/TitleResearch'

type FloodZoneState = { zone: string; sfha: boolean } | 'loading' | 'error' | null

const AUCTION_TYPE_BADGE: Record<string, { label: string; bg: string; text: string }> = {
  tax_deed:       { label: 'Tax Deed',       bg: 'bg-green-100',  text: 'text-green-800' },
  tax_lien:       { label: 'Tax Lien',       bg: 'bg-blue-100',   text: 'text-blue-800'  },
  redeemable_deed:{ label: 'Redeemable Deed',bg: 'bg-purple-100', text: 'text-purple-800'},
  foreclosure:    { label: 'Foreclosure',    bg: 'bg-orange-100', text: 'text-orange-800'},
}

function floodZoneStyle(zone: string) {
  if (zone.startsWith('V')) return { bg: 'bg-red-100', border: 'border-red-300', text: 'text-red-900', label: 'Alto risco costeiro' }
  if (zone.startsWith('A'))  return { bg: 'bg-red-50',  border: 'border-red-200', text: 'text-red-800', label: 'Alto risco' }
  if (zone === 'X')          return { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800', label: 'Risco mínimo' }
  return { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700', label: 'Risco indeterminado' }
}

export default function AuctionDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useI18n()
  const [auction, setAuction] = useState<Auction | null>(null)
  const [favorite, setFavorite] = useState<Favorite | null>(null)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [floodZone, setFloodZone] = useState<FloodZoneState>(null)
  const [manualAddress, setManualAddress] = useState('')
  const [savingAddress, setSavingAddress] = useState(false)
  const [copiedCoords, setCopiedCoords] = useState(false)

  function copyAndOpenRegrid() {
    const state = auction!.state.toLowerCase()
    const county = auction!.county.toLowerCase().replace(/\s+county$/i, '').trim().replace(/\s+/g, '-')
    if (auction?.lat && auction?.lng) {
      navigator.clipboard.writeText(`${auction.lat}, ${auction.lng}`)
      setCopiedCoords(true)
      setTimeout(() => setCopiedCoords(false), 2000)
      window.open(`https://app.regrid.com/us/${state}/${county}`, '_blank')
    } else if (auction?.parcel_id) {
      navigator.clipboard.writeText(auction.parcel_id)
      setCopiedCoords(true)
      setTimeout(() => setCopiedCoords(false), 2000)
      window.open(`https://app.regrid.com/us/${state}/${county}?search=${encodeURIComponent(auction.parcel_id)}`, '_blank')
    }
  }

  useEffect(() => {
    if (!id) return
    apiClient.getAuction(id)
      .then(auc => {
        setAuction(auc)
        return apiClient.listFavorites().catch(() => [])
      })
      .then(favs => {
        const fav = favs.find(f => f.auction_id === id) || null
        setFavorite(fav)
        setNotes(fav?.notes || '')
      })
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (!auction?.lat || !auction?.lng) return
    setFloodZone('loading')
    const base = import.meta.env.VITE_API_URL || 'http://localhost:8000'
    fetch(`${base}/flood-zone?lat=${auction.lat}&lng=${auction.lng}`)
      .then(r => r.json())
      .then(data => {
        if (data.zone) setFloodZone({ zone: data.zone, sfha: data.sfha })
        else setFloodZone('error')
      })
      .catch(() => setFloodZone('error'))
  }, [auction?.lat, auction?.lng])

  async function toggleFavorite() {
    if (!auction) return
    if (favorite) {
      await apiClient.deleteFavorite(favorite.id)
      setFavorite(null)
    } else {
      const fav = await apiClient.createFavorite(auction.id, notes || undefined)
      setFavorite(fav)
    }
  }

  if (loading) return <div className="p-6">{t.detail_loading}</div>
  if (!auction) return <div className="p-6">{t.detail_not_found}</div>

  const fields: [string, string | number | null][] = [
    [t.field_min_bid,   auction.min_bid ? `$${Number(auction.min_bid).toLocaleString()}` : null],
    [t.field_assessed,  auction.assessed_value ? `$${Number(auction.assessed_value).toLocaleString()}` : null],
    [t.field_market,    auction.market_value_estimate ? `$${Number(auction.market_value_estimate).toLocaleString()}` : null],
    [t.field_debt,      auction.outstanding_debt ? `$${Number(auction.outstanding_debt).toLocaleString()}` : null],
    [t.field_tax,       auction.tax_amount_owed ? `$${Number(auction.tax_amount_owed).toLocaleString()}` : null],
    [t.field_interest,  auction.interest_rate ? `${auction.interest_rate}%` : null],
    [t.field_date,      auction.auction_date],
    [t.field_parcel,    auction.parcel_id],
    [t.field_prop_type, auction.property_type],
    [t.field_status,    t[`status_${auction.status}` as keyof typeof t] ?? auction.status],
  ]

  return (
    <div className="max-w-3xl mx-auto p-6">
      <button onClick={() => navigate(-1)} style={{ color: 'var(--navy)' }} className="hover:underline text-sm mb-4 block">{t.detail_back}</button>
      {auction.photo_url && <img src={auction.photo_url} alt="Property" className="w-full h-64 object-cover rounded-lg mb-4" />}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h1 style={{ color: 'var(--navy)' }} className="text-2xl font-bold">{auction.address || t.detail_no_address}</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <p className="text-gray-500">{auction.county}, {auction.state}</p>
            {(() => {
              const badge = AUCTION_TYPE_BADGE[auction.type] ?? { label: auction.type.replace(/_/g, ' '), bg: 'bg-gray-100', text: 'text-gray-700' }
              return (
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${badge.bg} ${badge.text}`}>
                  {badge.label}
                </span>
              )
            })()}
          </div>
          {!auction.address && (
            <div className="mt-3 flex gap-2 items-center">
              <input
                type="text"
                value={manualAddress}
                onChange={e => setManualAddress(e.target.value)}
                placeholder="Ex: 1234 Oak St, Orlando, FL 32801"
                className="flex-1 border border-amber-300 bg-amber-50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
              />
              <button
                disabled={!manualAddress.trim() || savingAddress}
                onClick={async () => {
                  if (!manualAddress.trim()) return
                  setSavingAddress(true)
                  try {
                    const updated = await apiClient.updateAddress(auction.id, manualAddress.trim())
                    setAuction(updated)
                    setManualAddress('')
                  } finally {
                    setSavingAddress(false)
                  }
                }}
                style={{ backgroundColor: 'var(--navy)' }}
                className="text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-40 whitespace-nowrap"
              >
                {savingAddress ? 'Salvando...' : 'Salvar endereço'}
              </button>
            </div>
          )}
        </div>
        <button
          onClick={toggleFavorite}
          style={{ color: favorite ? 'var(--red)' : undefined }}
          className="text-3xl flex-shrink-0 text-gray-300 hover:text-red-600 transition-colors"
        >
          {favorite ? '★' : '☆'}
        </button>
      </div>

      <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-4">
        {fields.map(([label, value]) => value != null && (
          <div key={label} className="bg-gray-50 border border-gray-100 rounded-lg p-3">
            <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
            <p className="font-semibold text-gray-900 mt-0.5">{value}</p>
          </div>
        ))}
      </div>

      {auction.min_bid != null && auction.assessed_value != null && (() => {
        const debt = Number(auction.min_bid)
        const assessed = Number(auction.assessed_value)
        const profit = assessed - debt
        const discount = Math.round((profit / assessed) * 100)
        const isGood = discount >= 40
        const isOk = discount >= 20
        const color = profit <= 0 ? '#dc2626' : isGood ? '#16a34a' : isOk ? '#d97706' : '#6b7280'
        const bg = profit <= 0 ? '#fef2f2' : isGood ? '#f0fdf4' : isOk ? '#fffbeb' : '#f9fafb'
        const border = profit <= 0 ? '#fecaca' : isGood ? '#bbf7d0' : isOk ? '#fde68a' : '#e5e7eb'
        return (
          <div className="mt-6 rounded-xl border p-4" style={{ backgroundColor: bg, borderColor: border }}>
            <h2 className="font-semibold text-sm mb-3" style={{ color: 'var(--navy)' }}>Análise de ROI</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Dívida</p>
                <p className="font-bold text-gray-900">${debt.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Avaliação</p>
                <p className="font-bold text-gray-900">${assessed.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Lucro estimado</p>
                <p className="font-bold" style={{ color }}>{profit >= 0 ? '+' : ''}{profit.toLocaleString('pt-BR', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Desconto</p>
                <p className="font-bold text-2xl" style={{ color }}>{discount}%</p>
              </div>
            </div>
          </div>
        )
      })()}

      <div className="mt-6">
          <h2 style={{ color: 'var(--navy)' }} className="font-semibold mb-2">Zona de Inundação (FEMA)</h2>
          {!auction.lat || !auction.lng ? (
            <div className="text-sm text-gray-400 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
              Sem coordenadas disponíveis para consultar a zona de inundação.
            </div>
          ) : floodZone === 'loading' ? (
            <div className="text-sm text-gray-400">Consultando FEMA...</div>
          ) : floodZone === 'error' ? (
            <div className="text-sm text-gray-400">Não foi possível consultar a zona de inundação.</div>
          ) : null}
          {floodZone && floodZone !== 'loading' && floodZone !== 'error' && (() => {
            const s = floodZoneStyle(floodZone.zone)
            return (
              <div className={`rounded-xl border p-4 ${s.bg} ${s.border}`}>
                <div className="flex items-center gap-3">
                  <span className={`text-2xl font-bold ${s.text}`}>Zona {floodZone.zone}</span>
                  <span className={`text-sm font-medium px-2.5 py-0.5 rounded-full ${s.bg} ${s.text} border ${s.border}`}>{s.label}</span>
                  {floodZone.sfha && (
                    <span className="text-xs font-semibold bg-red-600 text-white px-2 py-0.5 rounded-full">Seguro obrigatório</span>
                  )}
                </div>
                {!auction.address && (
                  <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    ⚠️ Localização aproximada — endereço não disponível. A zona pode não corresponder ao imóvel real.
                  </p>
                )}
                <p className="mt-2 text-xs text-gray-500">
                  Fonte: FEMA National Flood Hazard Layer ·{' '}
                  <a
                    href={`https://msc.fema.gov/portal/search#searchresultsanchor`}
                    target="_blank" rel="noopener noreferrer"
                    className="underline hover:text-gray-700"
                  >
                    Verificar no mapa oficial
                  </a>
                </p>
              </div>
            )
          })()}
        </div>

      <TitleResearch auction={auction} />

      <div className="mt-6">
        <h2 style={{ color: 'var(--navy)' }} className="font-semibold mb-2">{t.detail_notes}</h2>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder={t.detail_notes_placeholder}
          className="w-full border border-gray-200 rounded-lg p-3 text-sm h-24 resize-none focus:outline-none focus:border-[#002868]"
        />
        {favorite && (
          <button
            onClick={async () => { await apiClient.updateFavorite(favorite.id, notes) }}
            style={{ backgroundColor: 'var(--navy)' }}
            className="text-white px-4 py-2 rounded text-sm hover:opacity-90 transition-opacity mt-2"
          >
            {t.detail_save_notes}
          </button>
        )}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        {auction.source_url && (
          <a href={auction.source_url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-100 transition-all group">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--navy)' }}>
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm" style={{ color: 'var(--navy)' }}>{t.detail_official}</p>
              <p className="text-xs text-blue-500 truncate">Ver leilão oficial</p>
            </div>
          </a>
        )}
        {(auction.zillow_url || auction.address) && (
          <a
            href={auction.zillow_url || `https://www.zillow.com/homes/${encodeURIComponent((auction.address ?? '').replace(/,\s*/g, ' ').trim())}_rb/`}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 transition-all group">
            <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 9.5V21h7v-6h6v6h7V9.5L12 2z"/></svg>
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-indigo-900 text-sm">Zillow</p>
              <p className="text-xs text-indigo-500">Valor de mercado</p>
            </div>
          </a>
        )}
        {((auction.lat && auction.lng) || auction.parcel_id) && (
          <button
            onClick={copyAndOpenRegrid}
            className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 transition-all text-left w-full">
            <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center flex-shrink-0">
              {copiedCoords ? (
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              ) : (
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/></svg>
              )}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-emerald-900 text-sm">{copiedCoords ? 'Copiado! Abrindo Regrid...' : 'Regrid'}</p>
              <p className="text-xs text-emerald-600">
                {copiedCoords
                  ? (auction.lat && auction.lng ? `${auction.lat}, ${auction.lng}` : auction.parcel_id)
                  : auction.lat && auction.lng
                    ? 'Copiar coords e abrir'
                    : `Buscar parcel ${auction.parcel_id}`}
              </p>
            </div>
          </button>
        )}
        {(auction.address || (auction.lat && auction.lng)) && (
          <a
            href={auction.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(auction.address)}` : `https://www.google.com/maps?q=${auction.lat},${auction.lng}`}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 rounded-xl bg-red-50 hover:bg-red-100 border border-red-100 transition-all group">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--red)' }}>
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-red-900 text-sm">Google Maps</p>
              <p className="text-xs text-red-500">Ver localização</p>
            </div>
          </a>
        )}
        {auction.address && (
          <a
            href={`https://www.google.com/maps?q=${encodeURIComponent(auction.address)}&layer=c`}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 rounded-xl bg-orange-50 hover:bg-orange-100 border border-orange-100 transition-all group">
            <div className="w-10 h-10 rounded-lg bg-orange-500 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-orange-900 text-sm">Street View</p>
              <p className="text-xs text-orange-500">Ver a rua</p>
            </div>
          </a>
        )}
      </div>
    </div>
  )
}
