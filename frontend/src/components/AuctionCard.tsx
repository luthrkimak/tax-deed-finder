import { Link } from 'react-router-dom'
import type { Auction } from '../types'

const TYPE_LABELS: Record<string, string> = {
  tax_deed: 'Tax Deed',
  tax_lien: 'Tax Lien',
  foreclosure: 'Foreclosure',
}

const TYPE_COLORS: Record<string, string> = {
  tax_deed: 'bg-blue-100 text-blue-700',
  tax_lien: 'bg-green-100 text-green-700',
  foreclosure: 'bg-orange-100 text-orange-700',
}

interface Props {
  auction: Auction
  isFavorited?: boolean
  onToggleFavorite?: (auction: Auction) => void
}

export default function AuctionCard({ auction, isFavorited, onToggleFavorite }: Props) {
  return (
    <div className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full mb-2 ${TYPE_COLORS[auction.type]}`}>
            {TYPE_LABELS[auction.type]}
          </span>
          <Link to={`/auctions/${auction.id}`} className="block font-semibold text-gray-900 hover:text-blue-600 truncate">
            {auction.address || 'Address not available'}
          </Link>
          <p className="text-sm text-gray-500">{auction.county}, {auction.state}</p>
        </div>
        {onToggleFavorite && (
          <button onClick={() => onToggleFavorite(auction)} className="text-xl flex-shrink-0">
            {isFavorited ? '★' : '☆'}
          </button>
        )}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-gray-500">Min Bid</span>
          <p className="font-semibold text-gray-900">{auction.min_bid ? `$${auction.min_bid.toLocaleString()}` : '—'}</p>
        </div>
        <div>
          <span className="text-gray-500">Assessed</span>
          <p className="font-semibold text-gray-900">{auction.assessed_value ? `$${auction.assessed_value.toLocaleString()}` : '—'}</p>
        </div>
        <div>
          <span className="text-gray-500">Auction Date</span>
          <p className="font-semibold text-gray-900">{auction.auction_date || '—'}</p>
        </div>
        <div>
          <span className="text-gray-500">Property</span>
          <p className="font-semibold text-gray-900 capitalize">{auction.property_type || '—'}</p>
        </div>
      </div>
    </div>
  )
}
