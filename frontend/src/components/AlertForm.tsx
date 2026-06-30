import { useState } from 'react'
import type { AuctionType } from '../types'

interface Props {
  email: string
  onSubmit: (filters: Record<string, unknown>, email: string) => Promise<void>
}

export default function AlertForm({ email: defaultEmail, onSubmit }: Props) {
  const [state, setState] = useState('')
  const [type, setType] = useState<AuctionType | ''>('')
  const [minBid, setMinBid] = useState('')
  const [maxBid, setMaxBid] = useState('')
  const [email, setEmail] = useState(defaultEmail)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await onSubmit({
      state: state || undefined,
      type: (type as AuctionType) || undefined,
      min_bid: minBid ? Number(minBid) : undefined,
      max_bid: maxBid ? Number(maxBid) : undefined,
    }, email)
    setLoading(false)
    setState(''); setType(''); setMinBid(''); setMaxBid('')
  }

  return (
    <form onSubmit={handleSubmit} className="bg-gray-50 border rounded-lg p-4 space-y-3">
      <h2 className="font-semibold">Create New Alert</h2>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">State</label>
          <select value={state} onChange={e => setState(e.target.value)} className="border rounded px-2 py-1.5 text-sm w-full">
            <option value="">Any</option>
            <option value="FL">FL</option>
            <option value="MS">MS</option>
            <option value="GA">GA</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Auction Type</label>
          <select value={type} onChange={e => setType(e.target.value as AuctionType | '')} className="border rounded px-2 py-1.5 text-sm w-full">
            <option value="">Any</option>
            <option value="tax_deed">Tax Deed</option>
            <option value="tax_lien">Tax Lien</option>
            <option value="foreclosure">Foreclosure</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Min Bid ($)</label>
          <input type="number" value={minBid} onChange={e => setMinBid(e.target.value)} placeholder="0" className="border rounded px-2 py-1.5 text-sm w-full" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Max Bid ($)</label>
          <input type="number" value={maxBid} onChange={e => setMaxBid(e.target.value)} placeholder="Any" className="border rounded px-2 py-1.5 text-sm w-full" />
        </div>
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Notification Email</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="border rounded px-2 py-1.5 text-sm w-full" />
      </div>
      <button type="submit" disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50">
        {loading ? 'Creating…' : 'Create Alert'}
      </button>
    </form>
  )
}
