import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import type { Auction, Favorite } from '../types'
import { apiClient } from '../lib/api'

export default function AuctionDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [auction, setAuction] = useState<Auction | null>(null)
  const [favorite, setFavorite] = useState<Favorite | null>(null)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    Promise.all([
      apiClient.getAuction(id),
      apiClient.listFavorites(),
    ]).then(([auc, favs]) => {
      setAuction(auc)
      const fav = favs.find(f => f.auction_id === id) || null
      setFavorite(fav)
      setNotes(fav?.notes || '')
    }).finally(() => setLoading(false))
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

  if (loading) return <div className="p-6">Loading…</div>
  if (!auction) return <div className="p-6">Auction not found.</div>

  const fields: [string, string | number | null][] = [
    ['Min Bid', auction.min_bid ? `$${auction.min_bid.toLocaleString()}` : null],
    ['Assessed Value', auction.assessed_value ? `$${auction.assessed_value.toLocaleString()}` : null],
    ['Market Estimate', auction.market_value_estimate ? `$${auction.market_value_estimate.toLocaleString()}` : null],
    ['Outstanding Debt', auction.outstanding_debt ? `$${auction.outstanding_debt.toLocaleString()}` : null],
    ['Tax Owed', auction.tax_amount_owed ? `$${auction.tax_amount_owed.toLocaleString()}` : null],
    ['Interest Rate', auction.interest_rate ? `${auction.interest_rate}%` : null],
    ['Auction Date', auction.auction_date],
    ['Parcel ID', auction.parcel_id],
    ['Property Type', auction.property_type],
    ['Status', auction.status],
  ]

  return (
    <div className="max-w-3xl mx-auto p-6">
      <button onClick={() => navigate(-1)} className="text-blue-600 hover:underline text-sm mb-4 block">← Back to search</button>
      {auction.photo_url && <img src={auction.photo_url} alt="Property" className="w-full h-64 object-cover rounded-lg mb-4" />}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{auction.address || 'Address not available'}</h1>
          <p className="text-gray-500">{auction.county}, {auction.state} · <span className="capitalize">{auction.type.replace('_', ' ')}</span></p>
        </div>
        <button onClick={toggleFavorite} className="text-3xl flex-shrink-0">{favorite ? '★' : '☆'}</button>
      </div>

      <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-4">
        {fields.map(([label, value]) => value != null && (
          <div key={label} className="bg-gray-50 rounded p-3">
            <p className="text-xs text-gray-500">{label}</p>
            <p className="font-semibold text-gray-900 mt-0.5">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <h2 className="font-semibold mb-2">Personal Notes</h2>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Add notes about this property…"
          className="w-full border rounded p-3 text-sm h-24 resize-none"
        />
        {favorite && (
          <button
            onClick={async () => {
              await apiClient.updateFavorite(favorite.id, notes)
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 mt-2"
          >
            Save Notes
          </button>
        )}
      </div>

      <div className="mt-4 flex gap-3">
        {auction.source_url && (
          <a href={auction.source_url} target="_blank" rel="noopener noreferrer"
            className="border rounded px-4 py-2 text-sm hover:bg-gray-50">
            View Official Listing
          </a>
        )}
        {auction.zillow_url && (
          <a href={auction.zillow_url} target="_blank" rel="noopener noreferrer"
            className="border rounded px-4 py-2 text-sm hover:bg-gray-50">
            View on Zillow
          </a>
        )}
      </div>
    </div>
  )
}
