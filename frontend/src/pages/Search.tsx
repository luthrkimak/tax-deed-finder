import { useEffect, useState, useCallback, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { Auction, AuctionFilters, AuctionType, PropertyType } from '../types'
import { apiClient } from '../lib/api'
import { supabase } from '../lib/supabase'
import { useI18n } from '../lib/i18n'
import FilterBar from '../components/FilterBar'
import AuctionCard from '../components/AuctionCard'
import AuctionMap from '../components/AuctionMap'

function paramsToFilters(params: URLSearchParams): AuctionFilters {
  return {
    state: params.get('state') || undefined,
    county: params.get('county') || undefined,
    type: (params.get('type') as AuctionType) || undefined,
    property_type: (params.get('property_type') as PropertyType) || undefined,
    min_bid: params.get('min_bid') ? Number(params.get('min_bid')) : undefined,
    max_bid: params.get('max_bid') ? Number(params.get('max_bid')) : undefined,
    date_from: params.get('date_from') || undefined,
    date_to: params.get('date_to') || undefined,
  }
}

export default function Search() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { t } = useI18n()
  const [auctions, setAuctions] = useState<Auction[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<AuctionFilters>(() => paramsToFilters(searchParams))
  const [loading, setLoading] = useState(false)
  const initialFilters = useMemo(() => paramsToFilters(searchParams), [])  // eslint-disable-line react-hooks/exhaustive-deps
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        apiClient.listFavorites().then(favs => {
          setFavoriteIds(new Set(favs.map(f => f.auction_id)))
        }).catch(() => {})
      }
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => {
      if (s) {
        apiClient.listFavorites().then(favs => {
          setFavoriteIds(new Set(favs.map(f => f.auction_id)))
        }).catch(() => {})
      } else {
        setFavoriteIds(new Set())
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const search = useCallback(async (newFilters: AuctionFilters, newPage = 1) => {
    setLoading(true)
    try {
      const result = await apiClient.getAuctions({ ...newFilters, page: newPage, page_size: 20 })
      setAuctions(result.data)
      setTotal(result.total)
      setPage(newPage)
      setFilters(newFilters)
      const params: Record<string, string> = {}
      if (newFilters.state) params.state = newFilters.state
      if (newFilters.county) params.county = newFilters.county
      if (newFilters.type) params.type = newFilters.type
      if (newFilters.property_type) params.property_type = newFilters.property_type
      if (newFilters.min_bid != null) params.min_bid = String(newFilters.min_bid)
      if (newFilters.max_bid != null) params.max_bid = String(newFilters.max_bid)
      if (newFilters.date_from) params.date_from = newFilters.date_from
      if (newFilters.date_to) params.date_to = newFilters.date_to
      setSearchParams(params, { replace: true })
    } finally {
      setLoading(false)
    }
  }, [setSearchParams])

  useEffect(() => { search(initialFilters) }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  async function toggleFavorite(auction: Auction) {
    // Check session at click time — avoids stale isLoggedIn state
    const { data } = await supabase.auth.getSession()
    if (!data.session) {
      navigate('/auth')
      return
    }
    try {
      if (favoriteIds.has(auction.id)) {
        const favs = await apiClient.listFavorites()
        const fav = favs.find(f => f.auction_id === auction.id)
        if (fav) {
          await apiClient.deleteFavorite(fav.id)
          setFavoriteIds(prev => { const s = new Set(prev); s.delete(auction.id); return s })
        }
      } else {
        await apiClient.createFavorite(auction.id)
        setFavoriteIds(prev => new Set([...prev, auction.id]))
      }
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 401 || status === 403) {
        alert('Sessão expirada. Faça login novamente.')
        navigate('/auth')
      } else {
        alert(`Erro ao salvar favorito (${status ?? 'rede'}). Tente novamente.`)
        console.error('toggleFavorite error:', err)
      }
    }
  }

  const totalPages = Math.ceil(total / 20)

  return (
    <div className="flex flex-col h-[calc(100vh-57px)]">
      <FilterBar onSearch={f => search(f, 1)} loading={loading} initialValues={filters} />
      <div className="flex flex-1 overflow-hidden">
        <div className="w-[480px] flex-shrink-0 overflow-y-auto p-4 space-y-3 border-r">
          <p className="text-sm text-gray-500">{total.toLocaleString()} {t.search_results}</p>
          {auctions.map(auction => (
            <AuctionCard
              key={auction.id}
              auction={auction}
              isFavorited={favoriteIds.has(auction.id)}
              onToggleFavorite={toggleFavorite}
            />
          ))}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 pt-2">
              <button onClick={() => search(filters, page - 1)} disabled={page === 1} className="px-3 py-1 border rounded disabled:opacity-40">{t.search_prev}</button>
              <span className="px-3 py-1 text-sm">{page} / {totalPages}</span>
              <button onClick={() => search(filters, page + 1)} disabled={page === totalPages} className="px-3 py-1 border rounded disabled:opacity-40">{t.search_next}</button>
            </div>
          )}
        </div>
        <div className="flex-1">
          <AuctionMap filters={filters} />
        </div>
      </div>
    </div>
  )
}
