import { useState, useMemo } from 'react'
import {
  STATES, SALE_TYPE_LABELS, SALE_TYPE_COLORS, BID_TYPE_LABELS,
  type StateInfo, type SaleType,
} from '../lib/counties-data'
import { useI18n } from '../lib/i18n'

const ALL_SALE_TYPES: SaleType[] = ['tax_deed', 'tax_lien', 'both', 'redeemable_deed']

export default function Counties() {
  const { lang } = useI18n()
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<SaleType | ''>('')
  const [selected, setSelected] = useState<StateInfo | null>(null)
  const [countySearch, setCountySearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return STATES.filter(s =>
      (filterType ? s.saleType === filterType : true) &&
      (q ? s.name.toLowerCase().includes(q) || s.abbr.toLowerCase().includes(q) : true)
    )
  }, [search, filterType])

  const filteredCounties = useMemo(() => {
    if (!selected) return []
    const q = countySearch.toLowerCase()
    return selected.counties.filter(c => !q || c.name.toLowerCase().includes(q))
  }, [selected, countySearch])

  const labels = {
    pt: { title: 'Diretório Nacional dos Condados', search: 'Buscar estado...', all: 'Todos os tipos', counties: 'Condados', phone: 'Telefone', address: 'Endereço', website: 'Site', interest: 'Juros', redemption: 'Resgate', bid: 'Lance', nCounties: 'condados', back: '← Voltar', searchCounty: 'Buscar condado...' },
    en: { title: 'National County Directory', search: 'Search state...', all: 'All types', counties: 'Counties', phone: 'Phone', address: 'Address', website: 'Website', interest: 'Interest', redemption: 'Redemption', bid: 'Bid Type', nCounties: 'counties', back: '← Back', searchCounty: 'Search county...' },
    es: { title: 'Directorio Nacional de Condados', search: 'Buscar estado...', all: 'Todos los tipos', counties: 'Condados', phone: 'Teléfono', address: 'Dirección', website: 'Sitio web', interest: 'Interés', redemption: 'Redención', bid: 'Tipo de oferta', nCounties: 'condados', back: '← Volver', searchCounty: 'Buscar condado...' },
  }[lang]

  if (selected) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <button onClick={() => { setSelected(null); setCountySearch('') }} style={{ color: 'var(--navy)' }} className="text-sm hover:underline mb-4 block">
          {labels.back}
        </button>

        {/* State header */}
        <div className="flex items-start gap-6 mb-6">
          <div className="text-6xl font-black" style={{ color: 'var(--navy)' }}>{selected.abbr}</div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold" style={{ color: 'var(--navy)' }}>{selected.name}</h1>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${SALE_TYPE_COLORS[selected.saleType]}`}>
                {SALE_TYPE_LABELS[selected.saleType]}
              </span>
              <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                {BID_TYPE_LABELS[selected.bidType]}
              </span>
              {selected.interestRate && (
                <span className="text-xs bg-red-50 text-red-700 px-2 py-1 rounded-full">
                  {labels.interest}: {selected.interestRate}
                </span>
              )}
              {selected.redemptionPeriod && (
                <span className="text-xs bg-yellow-50 text-yellow-700 px-2 py-1 rounded-full">
                  {labels.redemption}: {selected.redemptionPeriod}
                </span>
              )}
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                {selected.numCounties} {labels.nCounties}
              </span>
            </div>
          </div>
        </div>

        {selected.counties.length > 0 ? (
          <>
            <input
              value={countySearch}
              onChange={e => setCountySearch(e.target.value)}
              placeholder={labels.searchCounty}
              className="border rounded px-3 py-2 text-sm w-full mb-4 focus:outline-none focus:border-[#002868]"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredCounties.map(county => (
                <div key={county.name} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm">
                  <p className="font-semibold text-sm" style={{ color: 'var(--navy)' }}>{county.name}</p>
                  {county.phone && <p className="text-xs text-gray-500 mt-1">📞 {county.phone}</p>}
                  {county.address && <p className="text-xs text-gray-500 mt-0.5">📍 {county.address}</p>}
                  {county.website && (
                    <a href={county.website} target="_blank" rel="noopener noreferrer"
                      className="text-xs mt-1 hover:underline block truncate"
                      style={{ color: 'var(--red)' }}>
                      🌐 {county.website.replace(/^https?:\/\//, '')}
                    </a>
                  )}
                </div>
              ))}
            </div>
            {filteredCounties.length === 0 && (
              <p className="text-gray-400 text-sm text-center py-8">Nenhum condado encontrado.</p>
            )}
          </>
        ) : (
          <div className="bg-gray-50 rounded-lg p-8 text-center">
            <p className="text-gray-400 text-sm">Detalhes dos condados de {selected.name} serão adicionados em breve.</p>
            <p className="text-gray-300 text-xs mt-1">{selected.numCounties} condados no total</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--navy)' }}>{labels.title}</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={labels.search}
          className="border rounded px-3 py-2 text-sm w-48 focus:outline-none focus:border-[#002868]"
        />
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value as SaleType | '')}
          className="border rounded px-3 py-2 text-sm focus:outline-none focus:border-[#002868]"
        >
          <option value="">{labels.all}</option>
          {ALL_SALE_TYPES.map(t => (
            <option key={t} value={t}>{SALE_TYPE_LABELS[t]}</option>
          ))}
        </select>
        <span className="text-sm text-gray-400 self-center">{filtered.length} estados</span>
      </div>

      {/* State grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(state => (
          <button
            key={state.abbr}
            onClick={() => setSelected(state)}
            className="bg-white border border-gray-200 rounded-lg p-5 text-left hover:shadow-md hover:border-[#002868] transition-all group"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-3xl font-black group-hover:text-[#002868]" style={{ color: 'var(--navy)' }}>
                {state.abbr}
              </span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${SALE_TYPE_COLORS[state.saleType]}`}>
                {SALE_TYPE_LABELS[state.saleType]}
              </span>
            </div>
            <p className="font-semibold text-gray-800 mb-2">{state.name}</p>
            <div className="flex flex-wrap gap-1.5 text-xs text-gray-500">
              <span className="bg-gray-100 px-2 py-0.5 rounded">{BID_TYPE_LABELS[state.bidType]}</span>
              {state.interestRate && <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded">{state.interestRate}</span>}
              {state.redemptionPeriod && <span className="bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded">{state.redemptionPeriod}</span>}
              <span className="bg-gray-100 px-2 py-0.5 rounded">{state.numCounties} {labels.nCounties}</span>
            </div>
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-gray-400 text-center py-12">Nenhum estado encontrado.</p>
      )}
    </div>
  )
}
