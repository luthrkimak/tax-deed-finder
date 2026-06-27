import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  STATES, SALE_TYPE_LABELS, SALE_TYPE_COLORS, BID_TYPE_LABELS,
  type StateInfo, type SaleType,
} from '../lib/counties-data'
import { useI18n } from '../lib/i18n'

// Datas do leilão de tax lien 2026 — fonte: FL DOR PDF 2026TaxCertSale (30/04/2026)
// Formato: [data_inicio, plataforma, url_plataforma]
const FL_LIEN_DATES: Record<string, [string, string, string]> = {
  'Alachua':      ['06/05/2026', 'LienHub',      'https://lienhub.com/county/alachua/certsale/main'],
  'Baker':        ['05/05/2026', 'TaxCertSale',  'https://www.taxcertsale.com'],
  'Bay':          ['05/11/2026', 'LienHub',      'https://lienhub.com/county/bay/certsale/main'],
  'Bradford':     ['05/05/2026', 'TaxCertSale',  'https://www.taxcertsale.com'],
  'Brevard':      ['05/13/2026', 'LienHub',      'https://lienhub.com/county/brevard/certsale/main'],
  'Broward':      ['05/04/2026', 'LienHub',      'https://lienhub.com/county/broward/certsale/main'],
  'Calhoun':      ['05/05/2026', 'TaxCertSale',  'https://www.taxcertsale.com'],
  'Charlotte':    ['05/11/2026', 'LienHub',      'https://lienhub.com/county/charlotte/certsale/main'],
  'Citrus':       ['05/01/2026', 'LienHub',      'https://lienhub.com/county/citrus/certsale/main'],
  'Clay':         ['05/07/2026', 'LienHub',      'https://lienhub.com/county/clay/certsale/main'],
  'Collier':      ['05/11/2026', 'LienHub',      'https://lienhub.com/county/collier/certsale/main'],
  'Columbia':     ['05/13/2026', 'RealTaxLien',  'https://columbiafl.realtaxlien.com'],
  'DeSoto':       ['05/05/2026', 'TaxCertSale',  'https://www.taxcertsale.com'],
  'Dixie':        ['05/11/2026', 'RealTaxLien',  'https://dixiefl.realtaxlien.com'],
  'Duval':        ['05/08/2026', 'LienHub',      'https://lienhub.com/county/duval/certsale/main'],
  'Escambia':     ['05/04/2026', 'LienHub',      'https://lienhub.com/county/escambia/certsale/main'],
  'Flagler':      ['05/12/2026', 'LienHub',      'https://lienhub.com/county/flagler/certsale/main'],
  'Franklin':     ['05/05/2026', 'TaxCertSale',  'https://www.taxcertsale.com'],
  'Gadsden':      ['05/07/2026', 'RealTaxLien',  'https://gadsdenfl.realtaxlien.com'],
  'Gilchrist':    ['05/08/2026', 'RealTaxLien',  'https://gilchristfl.realtaxlien.com'],
  'Glades':       ['05/05/2026', 'TaxCertSale',  'https://www.taxcertsale.com'],
  'Gulf':         ['05/05/2026', 'TaxCertSale',  'https://www.taxcertsale.com'],
  'Hamilton':     ['05/05/2026', 'TaxCertSale',  'https://www.taxcertsale.com'],
  'Hardee':       ['05/05/2026', 'TaxCertSale',  'https://www.taxcertsale.com'],
  'Hendry':       ['05/11/2026', 'RealTaxLien',  'https://hendryfl.realtaxlien.com'],
  'Hernando':     ['05/09/2026', 'LienHub',      'https://lienhub.com/county/hernando/certsale/main'],
  'Highlands':    ['05/06/2026', 'Site Próprio', 'https://auction.highlands.tax/'],
  'Hillsborough': ['05/01/2026', 'LienHub',      'https://lienhub.com/county/hillsborough/certsale/main'],
  'Holmes':       ['05/05/2026', 'TaxCertSale',  'https://www.taxcertsale.com'],
  'Indian River': ['06/01/2026', 'LienHub',      'https://lienhub.com/county/indian-river/certsale/main'],
  'Jackson':      ['05/05/2026', 'TaxCertSale',  'https://www.taxcertsale.com'],
  'Jefferson':    ['05/05/2026', 'TaxCertSale',  'https://www.taxcertsale.com'],
  'Lafayette':    ['05/06/2026', 'RealTaxLien',  'https://lafayettefl.realtaxlien.com'],
  'Lake':         ['05/14/2026', 'LienHub',      'https://lienhub.com/county/lake/certsale/main'],
  'Lee':          ['05/04/2026', 'LienHub',      'https://lienhub.com/county/lee/certsale/main'],
  'Leon':         ['06/01/2026', 'Site Próprio', 'https://leontaxsale.wfbsusa.com/default.aspx'],
  'Levy':         ['05/08/2026', 'Site Próprio', 'https://levytaxsale.wfbsusa.com/default.aspx'],
  'Liberty':      ['05/05/2026', 'TaxCertSale',  'https://www.taxcertsale.com'],
  'Madison':      ['05/05/2026', 'TaxCertSale',  'https://www.taxcertsale.com'],
  'Manatee':      ['05/07/2026', 'Pacific Blue', 'https://www.pacificblueauction.com'],
  'Marion':       ['05/04/2026', 'Site Próprio', 'https://mariontaxsale.wfbsusa.com/Default.aspx'],
  'Martin':       ['06/01/2026', 'LienHub',      'https://lienhub.com/county/martin/certsale/main'],
  'Miami-Dade':   ['05/10/2026', 'LienHub',      'https://lienhub.com/county/miami-dade/certsale/main'],
  'Dade':         ['05/10/2026', 'LienHub',      'https://lienhub.com/county/miami-dade/certsale/main'],
  'Monroe':       ['05/07/2026', 'LienHub',      'https://lienhub.com/county/monroe/certsale/main'],
  'Nassau':       ['05/06/2026', 'LienHub',      'https://lienhub.com/county/nassau/certsale/main'],
  'Okaloosa':     ['05/07/2026', 'LienHub',      'https://lienhub.com/county/okaloosa/certsale/main'],
  'Okeechobee':   ['05/05/2026', 'TaxCertSale',  'https://www.taxcertsale.com'],
  'Orange':       ['05/01/2026', 'LienHub',      'https://lienhub.com/county/orange/certsale/main'],
  'Osceola':      ['05/09/2026', 'LienHub',      'https://lienhub.com/county/osceola/certsale/main'],
  'Palm Beach':   ['05/04/2026', 'RealTaxLien',  'https://palmbeachfl.realtaxlien.com'],
  'Pasco':        ['05/04/2026', 'LienHub',      'https://lienhub.com/county/pasco/certsale/main'],
  'Pinellas':     ['05/15/2026', 'LienHub',      'https://lienhub.com/county/pinellas/certsale/main'],
  'Polk':         ['05/01/2026', 'RealTaxLien',  'https://polkfl.realtaxlien.com'],
  'Putnam':       ['05/08/2026', 'RealTaxLien',  'https://putnamfl.realtaxlien.com'],
  'Santa Rosa':   ['05/12/2026', 'LienHub',      'https://lienhub.com/county/santa-rosa/certsale/main'],
  'Sarasota':     ['05/05/2026', 'LienHub',      'https://lienhub.com/county/sarasota/certsale/main'],
  'Seminole':     ['05/11/2026', 'LienHub',      'https://lienhub.com/county/seminole/certsale/main'],
  'St. Johns':    ['05/29/2026', 'Site Próprio', 'https://sjctax.us/tax-certificate-sales/'],
  'St. Lucie':    ['05/01/2026', 'LienHub',      'https://lienhub.com/county/st-lucie/certsale/main'],
  'Sumter':       ['05/06/2026', 'LienHub',      'https://lienhub.com/county/sumter/certsale/main'],
  'Suwannee':     ['05/13/2026', 'RealTaxLien',  'https://suwanneefl.realtaxlien.com'],
  'Taylor':       ['05/06/2026', 'RealTaxLien',  'https://taylorfl.realtaxlien.com'],
  'Union':        ['05/29/2026', 'Presencial',   ''],
  'Volusia':      ['05/15/2026', 'LienHub',      'https://lienhub.com/county/volusia/certsale/main'],
  'Wakulla':      ['05/04/2026', 'TaxCertSale',  'https://www.taxcertsale.com'],
  'Walton':       ['05/06/2026', 'LienHub',      'https://lienhub.com/county/walton/certsale/main'],
  'Washington':   ['05/05/2026', 'TaxCertSale',  'https://www.taxcertsale.com'],
}

const PLATFORM_COLORS: Record<string, string> = {
  'LienHub':      'bg-blue-50 text-blue-700 border-blue-100',
  'RealTaxLien':  'bg-indigo-50 text-indigo-700 border-indigo-100',
  'TaxCertSale':  'bg-violet-50 text-violet-700 border-violet-100',
  'Site Próprio': 'bg-gray-50 text-gray-600 border-gray-200',
  'Pacific Blue': 'bg-cyan-50 text-cyan-700 border-cyan-100',
  'Presencial':   'bg-amber-50 text-amber-700 border-amber-100',
}

// Condados FL cobertos automaticamente pelo scraper
const FL_COVERED = new Set([
  'Alachua','Baker','Bay','Brevard','Broward','Calhoun','Charlotte','Citrus','Clay',
  'Duval','Escambia','Flagler','Gilchrist','Gulf','Hendry','Hernando','Highlands',
  'Hillsborough','Indian River','Jackson','Lake','Lee','Leon','Manatee','Marion',
  'Martin','Miami-Dade','Dade','Monroe','Nassau','Okaloosa','Okeechobee','Orange',
  'Osceola','Palm Beach','Pasco','Pinellas','Polk','Putnam','Santa Rosa','Sarasota',
  'Seminole','St. Johns','St. Lucie','Sumter','Suwannee','Taylor','Union',
  'Volusia','Wakulla','Walton','Washington',
])

const ALL_SALE_TYPES: SaleType[] = ['tax_deed', 'tax_lien', 'both', 'redeemable_deed']

export default function Counties() {
  const { lang } = useI18n()
  const navigate = useNavigate()
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
    pt: { title: 'Condados dos EUA', search: 'Buscar estado...', all: 'Todos os tipos', counties: 'Condados', phone: 'Telefone', address: 'Endereço', website: 'Site', interest: 'Juros', redemption: 'Resgate', bid: 'Lance', nCounties: 'condados', back: '← Voltar', searchCounty: 'Buscar condado...' },
    en: { title: 'US Counties', search: 'Search state...', all: 'All types', counties: 'Counties', phone: 'Phone', address: 'Address', website: 'Website', interest: 'Interest', redemption: 'Redemption', bid: 'Bid Type', nCounties: 'counties', back: '← Back', searchCounty: 'Search county...' },
    es: { title: 'Condados de EE.UU.', search: 'Buscar estado...', all: 'Todos los tipos', counties: 'Condados', phone: 'Teléfono', address: 'Dirección', website: 'Sitio web', interest: 'Interés', redemption: 'Redención', bid: 'Tipo de oferta', nCounties: 'condados', back: '← Volver', searchCounty: 'Buscar condado...' },
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
              {filteredCounties.map(county => {
                const isCovered = selected?.abbr !== 'FL' || FL_COVERED.has(county.name)
                const lienInfo = selected?.abbr === 'FL' ? FL_LIEN_DATES[county.name] : undefined
                return (
                  <div key={county.name} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-sm" style={{ color: 'var(--navy)' }}>{county.name}</p>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${SALE_TYPE_COLORS[selected.saleType]}`}>
                          {SALE_TYPE_LABELS[selected.saleType]}
                        </span>
                        {selected?.abbr === 'FL' && (
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${isCovered ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                            {isCovered ? '● Coberto' : '○ Manual'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Tax Lien sale date + platform (FL only) */}
                    {lienInfo && (
                      <div className="flex items-center gap-2 mt-0.5 mb-0.5">
                        <div className="flex items-center gap-1 text-xs font-semibold text-emerald-700">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                          </svg>
                          {lienInfo[0]}
                        </div>
                        <span className="text-gray-300">·</span>
                        {lienInfo[2] ? (
                          <a
                            href={lienInfo[2]}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border hover:opacity-80 transition-opacity ${PLATFORM_COLORS[lienInfo[1]] ?? 'bg-gray-50 text-gray-600 border-gray-200'}`}
                            onClick={e => e.stopPropagation()}
                          >
                            {lienInfo[1]} ↗
                          </a>
                        ) : (
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${PLATFORM_COLORS[lienInfo[1]] ?? 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                            {lienInfo[1]}
                          </span>
                        )}
                      </div>
                    )}

                    {county.phone && <p className="text-xs text-gray-500">📞 {county.phone}</p>}
                    {county.address && <p className="text-xs text-gray-500">📍 {county.address}</p>}
                    {county.website && (
                      <a href={county.website} target="_blank" rel="noopener noreferrer"
                        className="text-xs hover:underline truncate"
                        style={{ color: 'var(--red)' }}>
                        🌐 {county.website.replace(/^https?:\/\//, '')}
                      </a>
                    )}
                    <div className="mt-2">
                      {isCovered ? (
                        <button
                          onClick={() => navigate(`/?state=${selected?.abbr}&county=${encodeURIComponent(county.name)}`)}
                          className="text-xs font-medium text-white px-3 py-1.5 rounded-md w-full text-center transition-opacity hover:opacity-90"
                          style={{ backgroundColor: 'var(--navy)' }}
                        >
                          Ver leilões →
                        </button>
                      ) : county.auctionUrl ? (
                        <a
                          href={county.auctionUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-medium px-3 py-1.5 rounded-md w-full text-center block transition-opacity hover:opacity-90"
                          style={{ backgroundColor: '#d97706', color: '#fff' }}
                        >
                          Ver site oficial ↗
                        </a>
                      ) : null}
                    </div>
                  </div>
                )
              })}
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
