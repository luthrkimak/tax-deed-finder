import { useState, useEffect } from 'react'
import type { AuctionFilters, AuctionType, PropertyType } from '../types'
import { apiClient } from '../lib/api'
import { useI18n } from '../lib/i18n'

interface Props {
  onSearch: (filters: AuctionFilters) => void
  loading: boolean
}

const US_STATES = ['FL', 'TX', 'GA']

export default function FilterBar({ onSearch, loading }: Props) {
  const { t } = useI18n()
  const [state, setState] = useState('')
  const [county, setCounty] = useState('')
  const [counties, setCounties] = useState<string[]>([])
  const [type, setType] = useState<AuctionType | ''>('')
  const [propertyType, setPropertyType] = useState<PropertyType | ''>('')
  const [minBid, setMinBid] = useState('')
  const [maxBid, setMaxBid] = useState('')

  useEffect(() => {
    setCounty('')
    apiClient.getCounties(state || undefined).then(setCounties).catch(() => setCounties([]))
  }, [state])

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

  const selectClass = "border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-[#002868]"
  const inputClass  = "border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-[#002868]"

  return (
    <form onSubmit={handleSearch} className="bg-white border-b px-6 py-3 flex flex-wrap gap-3 items-end">
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">{t.filter_state}</label>
        <select value={state} onChange={e => setState(e.target.value)} className={selectClass}>
          <option value="">{t.filter_all}</option>
          {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">{t.filter_county}</label>
        <select
          value={county}
          onChange={e => setCounty(e.target.value)}
          className={`${selectClass} w-40`}
          disabled={counties.length === 0}
        >
          <option value="">{t.filter_all}</option>
          {counties.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">{t.filter_type}</label>
        <select value={type} onChange={e => setType(e.target.value as AuctionType | '')} className={selectClass}>
          <option value="">{t.filter_all}</option>
          <option value="tax_deed">{t.type_tax_deed}</option>
          <option value="tax_lien">{t.type_tax_lien}</option>
          <option value="foreclosure">{t.type_foreclosure}</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">{t.filter_property}</label>
        <select value={propertyType} onChange={e => setPropertyType(e.target.value as PropertyType | '')} className={selectClass}>
          <option value="">{t.filter_all}</option>
          <option value="residential">{t.prop_residential}</option>
          <option value="commercial">{t.prop_commercial}</option>
          <option value="land">{t.prop_land}</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">{t.filter_min_bid}</label>
        <input type="number" value={minBid} onChange={e => setMinBid(e.target.value)} placeholder="0" className={`${inputClass} w-28`} />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">{t.filter_max_bid}</label>
        <input type="number" value={maxBid} onChange={e => setMaxBid(e.target.value)} placeholder={t.filter_any_value} className={`${inputClass} w-28`} />
      </div>

      <button
        type="submit"
        disabled={loading}
        style={{ backgroundColor: loading ? undefined : 'var(--red)' }}
        className="bg-gray-400 text-white px-5 py-1.5 rounded font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {loading ? t.filter_searching : t.filter_search}
      </button>
    </form>
  )
}
