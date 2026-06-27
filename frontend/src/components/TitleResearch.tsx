import { useState } from 'react'
import type { Auction } from '../types'

// County recorder URLs keyed by "STATE:County"
const COUNTY_RECORDER: Record<string, string> = {
  'TX:Bexar':       'https://bexar.tx.publicsearch.us/',
  'TX:Dallas':      'https://countyclerk.dallascounty.org/',
  'TX:Travis':      'https://deed.traviscountytx.gov/',
  'TX:Collin':      'https://www.collincountytx.gov/county_clerk/pages/official_public_records.aspx',
  'TX:Harris':      'https://www.cclerk.hctx.net/applications/websearch/',
  'TX:Tarrant':     'https://www.tarrantcountytx.gov/en/county-clerk/real-property.html',
  'FL:Orange':      'https://or.occompt.com/recorder/web/',
  'FL:Miami-Dade':  'https://www2.miamidadeclerk.gov/officialrecords/StandardSearch.aspx',
  'FL:Broward':     'https://officialrecords.broward.org/',
  'FL:Hillsborough':'https://pubrec.hillsclerk.com/',
  'FL:Pinellas':    'https://www.pinellasclerk.org/apps2/OfficialRecordsSearch/',
  'FL:Palm Beach':  'https://www.mypalmbeachclerk.com/official-records/search',
  'FL:Lee':         'https://clts.leeclerk.org/',
  'FL:Polk':        'https://apps.polkcountyclerk.net/oncore/',
  'FL:Volusia':     'https://vweb2.clerk.org/',
  'FL:Sarasota':    'https://apps.scgov.net/RealPropertySearch/',
  'FL:Brevard':     'https://oncore.brevardclerk.us/',
  'FL:Seminole':    'https://public.seminoleclerk.org/',
  'FL:Duval':       'https://oncore.duvalclerk.com/',
  'FL:Pasco':       'https://apps.pascoclerk.com/officialrecords/',
  'FL:Alachua':     'https://www.alachuaclerk.org/real-property/',
  'FL:Collier':     'https://www.collierclerk.com/records/official-records/',
  'FL:Manatee':     'https://www.manateeclerk.com/official-records/',
  'GA:Fulton':      'https://www.gsccca.org/search',
  'GA:Gwinnett':    'https://www.gsccca.org/search',
  'GA:Cobb':        'https://www.gsccca.org/search',
  'GA:DeKalb':      'https://www.gsccca.org/search',
}

const STATE_UCC: Record<string, string> = {
  FL: 'https://dos.myflorida.com/sunbiz/search/',
  TX: 'https://www.sos.state.tx.us/ucc/index.shtml',
  GA: 'https://ecorp.sos.ga.gov/',
  NC: 'https://www.sosnc.gov/search/ucc_results',
  CA: 'https://www.sos.ca.gov/business-programs/ucc',
  IL: 'https://www.ilsos.gov/uccsearch/',
  OH: 'https://www.ohiosos.gov/businesses/ucc-information/',
  PA: 'https://www.corporations.pa.gov/search/ucc',
  NY: 'https://appext20.dos.ny.gov/pls/ucc_public/web_search.main_frame',
}

const CHECKLIST_ITEMS = [
  { id: 'hipotecas',    texto: 'Hipotecas ativas — buscar no cartório do condado pelo endereço ou nome do ex-proprietário' },
  { id: 'irs',          texto: 'Liens federais (IRS) — buscar "Notice of Federal Tax Lien" no cartório pelo nome do ex-proprietário' },
  { id: 'judicial',     texto: 'Penhoras judiciais — checar processos nos tribunais estaduais e federais (PACER)' },
  { id: 'hoa',          texto: 'Liens de HOA — contatar a associação de moradores do condomínio (se houver)' },
  { id: 'municipal',    texto: 'Multas municipais — verificar code enforcement, débitos de água, esgoto e lixo com a prefeitura' },
  { id: 'ucc',          texto: 'UCC estadual — verificar penhoras comerciais no Secretary of State do estado' },
  { id: 'falencia',     texto: 'Falência do proprietário — buscar no PACER (processo de bankruptcy impede ou atrasa a venda)' },
  { id: 'epa',          texto: 'Contaminação ambiental — verificar no EPA ECHO se o endereço consta em banco de sites contaminados' },
  { id: 'descricao',    texto: 'Descrição legal e área — conferir se bate com a matrícula do imóvel no cartório' },
  { id: 'zoneamento',   texto: 'Zoneamento e uso permitido — checar na prefeitura se o uso pretendido é permitido' },
]

interface Props { auction: Auction }

export default function TitleResearch({ auction }: Props) {
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [open, setOpen] = useState(false)

  function toggle(id: string) {
    setChecked(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const key = `${auction.state}:${auction.county}`
  const recorderUrl = COUNTY_RECORDER[key]
    ?? `https://www.google.com/search?q=${encodeURIComponent(`${auction.county} County ${auction.state} official records search`)}`

  const uccUrl = STATE_UCC[auction.state]
    ?? `https://www.google.com/search?q=${encodeURIComponent(`${auction.state} secretary of state UCC search`)}`

  const epaUrl = auction.address
    ? `https://echo.epa.gov/facilities/facility-search/results?location_name=${encodeURIComponent(auction.address)}&p_radius=0.25`
    : 'https://echo.epa.gov/facilities/facility-search'

  const pacerUrl = 'https://pcl.uscourts.gov/content/search.jsf'

  const progress = checked.size
  const total = CHECKLIST_ITEMS.length

  return (
    <div className="mt-6">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
              <polyline points="14 2 14 9 20 9"/>
              <line x1="9" y1="13" x2="15" y2="13"/>
              <line x1="9" y1="17" x2="15" y2="17"/>
            </svg>
          </div>
          <div className="text-left">
            <p className="font-semibold text-sm text-gray-900">Pesquisa de Título</p>
            <p className="text-xs text-gray-400">
              {progress === 0
                ? 'Links + checklist de due diligence'
                : `${progress} de ${total} itens verificados`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {progress > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all"
                  style={{ width: `${(progress / total) * 100}%` }}
                />
              </div>
              <span className="text-xs font-medium text-amber-600">{Math.round((progress / total) * 100)}%</span>
            </div>
          )}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
      </button>

      {open && (
        <div className="mt-2 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Links rápidos */}
          <div className="p-4 border-b border-gray-50">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Fontes de pesquisa</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                {
                  label: 'Cartório do Condado',
                  sub: `${auction.county}, ${auction.state}`,
                  url: recorderUrl,
                  known: !!COUNTY_RECORDER[key],
                  color: 'bg-blue-50 border-blue-100 text-blue-700',
                  icon: (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
                    </svg>
                  ),
                },
                {
                  label: 'UCC Estadual',
                  sub: `Secretary of State — ${auction.state}`,
                  url: uccUrl,
                  known: !!STATE_UCC[auction.state],
                  color: 'bg-purple-50 border-purple-100 text-purple-700',
                  icon: (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
                    </svg>
                  ),
                },
                {
                  label: 'PACER — Federal',
                  sub: 'Falências e ações federais',
                  url: pacerUrl,
                  known: true,
                  color: 'bg-slate-50 border-slate-100 text-slate-700',
                  icon: (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                  ),
                },
                {
                  label: 'EPA ECHO',
                  sub: 'Contaminação ambiental',
                  url: epaUrl,
                  known: true,
                  color: 'bg-green-50 border-green-100 text-green-700',
                  icon: (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z"/><path d="M12 8v4l3 3"/>
                    </svg>
                  ),
                },
              ].map(({ label, sub, url, known, color, icon }) => (
                <a
                  key={label}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-start gap-2.5 p-3 rounded-lg border text-left transition-opacity hover:opacity-80 ${color}`}
                >
                  <span className="mt-0.5 shrink-0">{icon}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold leading-tight">{label}</p>
                    <p className="text-xs opacity-70 truncate">{sub}</p>
                    {!known && <p className="text-xs opacity-50 mt-0.5">via Google Search</p>}
                  </div>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="ml-auto shrink-0 mt-0.5 opacity-50">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                  </svg>
                </a>
              ))}
            </div>
          </div>

          {/* Checklist */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Checklist de due diligence</p>
              {checked.size > 0 && (
                <button
                  onClick={() => setChecked(new Set())}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  Limpar
                </button>
              )}
            </div>
            <div className="space-y-2">
              {CHECKLIST_ITEMS.map(item => (
                <button
                  key={item.id}
                  onClick={() => toggle(item.id)}
                  className="w-full flex items-start gap-3 text-left group"
                >
                  <span className={`mt-0.5 shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-all ${
                    checked.has(item.id)
                      ? 'bg-amber-500 border-amber-500'
                      : 'border-gray-300 group-hover:border-amber-400'
                  }`}>
                    {checked.has(item.id) && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                  </span>
                  <span className={`text-xs leading-relaxed transition-colors ${
                    checked.has(item.id) ? 'text-gray-400 line-through' : 'text-gray-700 group-hover:text-gray-900'
                  }`}>
                    {item.texto}
                  </span>
                </button>
              ))}
            </div>

            {checked.size === total && (
              <div className="mt-4 bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-xs text-green-700 font-medium text-center">
                ✓ Due diligence completa — pronto para licitar com segurança
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
