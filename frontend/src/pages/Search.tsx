import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Auction, AuctionFilters } from '../types'
import { apiClient } from '../lib/api'
import { supabase } from '../lib/supabase'
import { useI18n } from '../lib/i18n'
import FilterBar from '../components/FilterBar'
import AuctionCard from '../components/AuctionCard'
import AuctionMap from '../components/AuctionMap'

export default function Search() {
  const navigate = useNavigate()
  const { t } = useI18n()
  const [auctions, setAuctions] = useState<Auction[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<AuctionFilters>({})
  const [loading, setLoading] = useState(false)
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setIsLoggedIn(!!data.session)
      if (data.session) {
        apiClient.listFavorites().then(favs => {
          setFavoriteIds(new Set(favs.map(f => f.auction_id)))
        }).catch(() => {})
      }
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => {
      setIsLoggedIn(!!s)
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
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { search({}) }, [search])

  async function toggleFavorite(auction: Auction) {
    if (!isLoggedIn) {
      navigate('/auth')
      return
    }
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
  }

  const totalPages = Math.ceil(total / 20)

  return (
    <div className="flex flex-col h-[calc(100vh-57px)]">
      <FilterBar onSearch={f => search(f, 1)} loading={loading} />
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
