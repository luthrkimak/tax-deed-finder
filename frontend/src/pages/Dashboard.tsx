import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { StatsResponse, Favorite } from '../types'
import { apiClient } from '../lib/api'

function fmt(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

function fmtDate(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function urgencyBadge(dateIso: string) {
  const diff = Math.ceil((new Date(dateIso).getTime() - Date.now()) / 86400000)
  if (diff <= 1) return { label: 'Hoje / Amanhã', color: '#dc2626', bg: '#fee2e2' }
  if (diff <= 7) return { label: 'Esta semana', color: '#d97706', bg: '#fef3c7' }
  return { label: fmtDate(dateIso), color: '#6b7280', bg: '#f3f4f6' }
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<StatsResponse | null>(null)
  const [favs, setFavs] = useState<Favorite[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([apiClient.getStats(), apiClient.listFavorites()])
      .then(([s, f]) => {
        setStats(s)
        // Sort favorites by auction_date ascending, filter only future ones
        const upcoming = f
          .filter(fav => fav.auction?.auction_date && fav.auction.auction_date >= new Date().toISOString().split('T')[0])
          .sort((a, b) => (a.auction?.auction_date ?? '').localeCompare(b.auction?.auction_date ?? ''))
        setFavs(upcoming)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-400">Carregando...</div>
  )
  if (!stats) return null

  const maxCount = Math.max(...stats.top_counties.map(c => c.count), 1)

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-10">

      {/* Section 1 — Metric cards */}
      <section>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Disponível agora · Flórida</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Leilões disponíveis', value: stats.total_available.toLocaleString(), icon: '🏠' },
            { label: 'Próximos 7 dias', value: stats.next_7_days.toLocaleString(), icon: '📅' },
            { label: 'Menor lance', value: stats.min_bid_available ? fmt(stats.min_bid_available) : '—', icon: '💰' },
            { label: 'Condados ativos', value: stats.active_counties.toLocaleString(), icon: '📍' },
          ].map(({ label, value, icon }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="text-2xl mb-2">{icon}</div>
              <div className="text-2xl font-bold text-gray-900">{value}</div>
              <div className="text-xs text-gray-500 mt-1">{label}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid md:grid-cols-2 gap-8">

        {/* Section 2 — Upcoming favorites */}
        <section>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Favoritos com data chegando</h2>
          {favs.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 text-center text-gray-400 text-sm">
              Nenhum favorito com leilão futuro.<br />
              <button onClick={() => navigate('/')} className="mt-2 text-blue-600 hover:underline">Buscar leilões →</button>
            </div>
          ) : (
            <div className="space-y-3">
              {favs.slice(0, 5).map(fav => {
                const a = fav.auction!
                const badge = urgencyBadge(a.auction_date!)
                return (
                  <button
                    key={fav.id}
                    onClick={() => navigate(`/auctions/${a.id}`)}
                    className="w-full text-left bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:border-blue-200 hover:shadow transition"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-gray-800 leading-tight">{a.address ?? '—'}</p>
                      <span className="shrink-0 text-xs font-medium px-2 py-0.5 rounded-full" style={{ color: badge.color, background: badge.bg }}>
                        {badge.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{a.county} · {a.type?.replace(/_/g, ' ')}</p>
                    {a.min_bid && <p className="text-sm font-bold text-gray-900 mt-1">{fmt(a.min_bid)}</p>}
                  </button>
                )
              })}
              {favs.length > 5 && (
                <button onClick={() => navigate('/favorites')} className="text-sm text-blue-600 hover:underline">
                  Ver todos os {favs.length} favoritos →
                </button>
              )}
            </div>
          )}
        </section>

        {/* Section 3 — Top counties */}
        <section>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Top condados</h2>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
            {stats.top_counties.slice(0, 8).map(({ county, count }) => (
              <button
                key={county}
                onClick={() => navigate(`/?state=FL&county=${encodeURIComponent(county)}`)}
                className="w-full text-left hover:opacity-80 transition"
              >
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-gray-700">{county}</span>
                  <span className="text-gray-400">{count}</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(count / maxCount) * 100}%` }} />
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>

      {/* Section 4 — Top discounts */}
      <section>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Maiores descontos</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stats.top_discounts.slice(0, 5).map(d => (
            <button
              key={d.id}
              onClick={() => navigate(`/auctions/${d.id}`)}
              className="text-left bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:border-green-200 hover:shadow transition"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">{d.type?.replace(/_/g, ' ')}</span>
                <span className="text-lg font-bold text-green-600">{d.discount_pct}% desc.</span>
              </div>
              <p className="text-sm font-semibold text-gray-800 leading-tight mb-1">{d.address ?? '—'}</p>
              <p className="text-xs text-gray-400 mb-3">{d.county} · {fmtDate(d.auction_date)}</p>
              <div className="flex gap-4">
                <div>
                  <div className="text-xs text-gray-400">Lance</div>
                  <div className="text-sm font-bold text-gray-900">{fmt(d.min_bid)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">Avaliação</div>
                  <div className="text-sm font-bold text-gray-500">{fmt(d.assessed_value)}</div>
                </div>
              </div>
            </button>
          ))}
          {stats.top_discounts.length === 0 && (
            <p className="text-sm text-gray-400 col-span-3">Nenhum desconto disponível no momento.</p>
          )}
        </div>
      </section>

    </div>
  )
}
