import { useState } from 'react'
import type { AuctionFilters, AuctionType, PropertyType } from '../types'

interface Props {
  onSearch: (filters: AuctionFilters) => void
  loading: boolean
}

const US_STATES = ['FL', 'TX', 'GA']

export default function FilterBar({ onSearch, loading }: Props) {
  const [state, setState] = useState('')
  const [county, setCounty] = useState('')
  const [type, setType] = useState<AuctionType | ''>('')
  const [propertyType, setPropertyType] = useState<PropertyType | ''>('')
  const [minBid, setMinBid] = useState('')
  const [maxBid, setMaxBid] = useState('')

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    onSearch({
      state: state || undefined,
      county: county || undefined,
      type: (type as AuctionType) || undefined,
      property_type: (propertyType as PropertyType) || undefined,
      min_bid: minBid ? Number(minBid) : undefined,
      max_bid: maxBid ? Number(maxBid) : undefined,
      page: 1,
    })
  }

  return (
    <form onSubmit={handleSearch} className="bg-white border-b px-6 py-4 flex flex-wrap gap-3 items-end">
      <div>
        <label className="block text-xs text-gray-500 mb-1">State</label>
        <select value={state} onChange={e => setState(e.target.value)} className="border rounded px-2 py-1.5 text-sm">
          <option value="">All</option>
          {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">County</label>
        <input value={county} onChange={e => setCounty(e.target.value)} placeholder="Any county" className="border rounded px-2 py-1.5 text-sm w-36" />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Type</label>
        <select value={type} onChange={e => setType(e.target.value as AuctionType | '')} className="border rounded px-2 py-1.5 text-sm">
          <option value="">All</option>
          <option value="tax_deed">Tax Deed</option>
          <option value="tax_lien">Tax Lien</option>
          <option value="foreclosure">Foreclosure</option>
        </select>
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Property</label>
        <select value={propertyType} onChange={e => setPropertyType(e.target.value as PropertyType | '')} className="border rounded px-2 py-1.5 text-sm">
          <option value="">All</option>
          <option value="residential">Residential</option>
          <option value="commercial">Commercial</option>
          <option value="land">Land</option>
        </select>
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Min Bid ($)</label>
        <input type="number" value={minBid} onChange={e => setMinBid(e.target.value)} placeholder="0" className="border rounded px-2 py-1.5 text-sm w-28" />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Max Bid ($)</label>
        <input type="number" value={maxBid} onChange={e => setMaxBid(e.target.value)} placeholder="Any" className="border rounded px-2 py-1.5 text-sm w-28" />
      </div>
      <button type="submit" disabled={loading} className="bg-blue-600 text-white px-4 py-1.5 rounded hover:bg-blue-700 text-sm disabled:opacity-50">
        {loading ? 'Searching…' : 'Search'}
      </button>
    </form>
  )
}
