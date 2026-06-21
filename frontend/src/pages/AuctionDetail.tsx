import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import type { Auction, Favorite } from '../types'
import { apiClient } from '../lib/api'
import { useI18n } from '../lib/i18n'

export default function AuctionDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useI18n()
  const [auction, setAuction] = useState<Auction | null>(null)
  const [favorite, setFavorite] = useState<Favorite | null>(null)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)

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
    [t.field_status,    auction.status],
  ]

  return (
    <div className="max-w-3xl mx-auto p-6">
      <button onClick={() => navigate(-1)} style={{ color: 'var(--navy)' }} className="hover:underline text-sm mb-4 block">{t.detail_back}</button>
      {auction.photo_url && <img src={auction.photo_url} alt="Property" className="w-full h-64 object-cover rounded-lg mb-4" />}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 style={{ color: 'var(--navy)' }} className="text-2xl font-bold">{auction.address || t.detail_no_address}</h1>
          <p className="text-gray-500 mt-1">{auction.county}, {auction.state} · <span className="capitalize">{auction.type.replace('_', ' ')}</span></p>
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

      <div className="mt-4 flex flex-wrap gap-3">
        {auction.source_url && (
          <a href={auction.source_url} target="_blank" rel="noopener noreferrer"
            style={{ borderColor: 'var(--navy)', color: 'var(--navy)' }}
            className="border rounded px-4 py-2 text-sm font-medium hover:bg-blue-50 transition-colors">
            {t.detail_official}
          </a>
        )}
        {auction.zillow_url && (
          <a href={auction.zillow_url} target="_blank" rel="noopener noreferrer"
            style={{ borderColor: 'var(--navy)', color: 'var(--navy)' }}
            className="border rounded px-4 py-2 text-sm font-medium hover:bg-blue-50 transition-colors">
            Zillow
          </a>
        )}
        <a
          href={
            auction.lat && auction.lng
              ? `https://www.google.com/maps?q=${auction.lat},${auction.lng}`
              : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(auction.address ?? '')}`
          }
          target="_blank" rel="noopener noreferrer"
          style={{ borderColor: 'var(--red)', color: 'var(--red)' }}
          className="border rounded px-4 py-2 text-sm font-medium hover:bg-red-50 transition-colors flex items-center gap-1.5"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
          Google Maps
        </a>
        {(auction.lat && auction.lng) && (
          <a
            href={`https://www.google.com/maps?q=&layer=c&cbll=${auction.lat},${auction.lng}`}
            target="_blank" rel="noopener noreferrer"
            style={{ borderColor: 'var(--red)', color: 'var(--red)' }}
            className="border rounded px-4 py-2 text-sm font-medium hover:bg-red-50 transition-colors flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
            Street View
          </a>
        )}
      </div>
    </div>
  )
}
