import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { Auction } from '../types'
import { useI18n } from '../lib/i18n'

function relativeDate(dateStr: string): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = new Date(dateStr + 'T00:00:00')
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000)
  if (diff === 0) return 'Hoje'
  if (diff === 1) return 'Amanhã'
  if (diff === -1) return 'Ontem'
  if (diff > 0 && diff <= 30) return `em ${diff} dias`
  if (diff < 0 && diff >= -30) return `há ${Math.abs(diff)} dias`
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

const TYPE_LABELS_KEY: Record<string, 'type_tax_deed' | 'type_tax_lien' | 'type_foreclosure'> = {
  tax_deed:    'type_tax_deed',
  tax_lien:    'type_tax_lien',
  foreclosure: 'type_foreclosure',
}

const TYPE_STYLE: Record<string, React.CSSProperties> = {
  tax_deed:    { background: '#dbeafe', color: '#1d4ed8' },
  tax_lien:    { background: '#dcfce7', color: '#15803d' },
  foreclosure: { background: '#ffedd5', color: '#c2410c' },
}

interface Props {
  auction: Auction
  isFavorited?: boolean
  onToggleFavorite?: (auction: Auction) => void
}

export default function AuctionCard({ auction, isFavorited, onToggleFavorite }: Props) {
  const { t } = useI18n()
  const [pending, setPending] = useState(false)

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-2 flex-wrap">
            <span
              style={TYPE_STYLE[auction.type] ?? { background: '#475569', color: '#fff' }}
              className="text-xs font-semibold px-2 py-0.5 rounded-full tracking-wide uppercase"
            >
              {t[TYPE_LABELS_KEY[auction.type] ?? 'type_tax_deed']}
            </span>
            {auction.status === 'no_bid' && (
              <span className="text-xs font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                {t[`status_${auction.status}` as keyof typeof t] ?? auction.status}
              </span>
            )}
          </div>
          <Link
            to={`/auctions/${auction.id}`}
            style={{ color: 'var(--navy)' }}
            className="block font-semibold hover:underline truncate"
          >
            {auction.address || t.card_no_address}
          </Link>
          <p className="text-sm text-gray-500">{auction.county}, {auction.state}</p>
        </div>
        {onToggleFavorite && (
          <button
            onClick={async () => {
              setPending(true)
              try { await onToggleFavorite(auction) } finally { setPending(false) }
            }}
            disabled={pending}
            title={isFavorited ? 'Remover favorito' : 'Adicionar favorito'}
            style={{ minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', padding: 8 }}
          >
            {pending ? (
              <span style={{ fontSize: 20, color: '#ef4444' }}>⟳</span>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill={isFavorited ? '#ef4444' : 'none'} stroke={isFavorited ? '#ef4444' : '#9ca3af'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
            )}
          </button>
        )}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-gray-400 text-xs uppercase tracking-wide">{t.card_min_bid}</span>
          <p className="font-bold text-gray-900">{auction.min_bid ? `$${Number(auction.min_bid).toLocaleString()}` : '—'}</p>
        </div>
        <div>
          <span className="text-gray-400 text-xs uppercase tracking-wide">{t.card_assessed}</span>
          <p className="font-semibold text-gray-700">{auction.assessed_value ? `$${Number(auction.assessed_value).toLocaleString()}` : '—'}</p>
        </div>
        <div>
          <span className="text-gray-400 text-xs uppercase tracking-wide">{t.card_date}</span>
          <p className="font-semibold text-gray-900">
            {auction.auction_date ? relativeDate(auction.auction_date) : '—'}
          </p>
        </div>
        <div>
          <span className="text-gray-400 text-xs uppercase tracking-wide">{t.card_property}</span>
          <p className="font-semibold text-gray-900 capitalize">{auction.property_type || '—'}</p>
        </div>
      </div>
    </div>
  )
}
