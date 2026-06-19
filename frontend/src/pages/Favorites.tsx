import { useEffect, useState } from 'react'
import type { Favorite } from '../types'
import { apiClient } from '../lib/api'
import AuctionCard from '../components/AuctionCard'

export default function Favorites() {
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiClient.listFavorites().then(setFavorites).finally(() => setLoading(false))
  }, [])

  async function remove(fav: Favorite) {
    await apiClient.deleteFavorite(fav.id)
    setFavorites(prev => prev.filter(f => f.id !== fav.id))
  }

  if (loading) return <div className="p-6">Loading…</div>

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">My Favorites</h1>
      {favorites.length === 0
        ? <p className="text-gray-500">No favorites yet. Star an auction from the search page.</p>
        : (
          <div className="space-y-4">
            {favorites.map(fav => fav.auction && (
              <div key={fav.id}>
                <AuctionCard
                  auction={fav.auction}
                  isFavorited
                  onToggleFavorite={() => remove(fav)}
                />
                {fav.notes && <p className="text-sm text-gray-500 mt-1 ml-1 italic">"{fav.notes}"</p>}
              </div>
            ))}
          </div>
        )
      }
    </div>
  )
}
