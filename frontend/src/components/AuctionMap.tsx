import { useState } from 'react'
import { MapContainer, TileLayer, Popup, CircleMarker } from 'react-leaflet'
import type { Auction } from '../types'
import 'leaflet/dist/leaflet.css'

const PIN_COLORS: Record<string, string> = {
  tax_deed:    '#2563eb',
  tax_lien:    '#16a34a',
  foreclosure: '#ea580c',
}

const LEGEND = [
  { label: 'Tax Deed',    color: '#2563eb' },
  { label: 'Tax Lien',   color: '#16a34a' },
  { label: 'Foreclosure', color: '#ea580c' },
]

interface Props {
  auctions: Auction[]
}

export default function AuctionMap({ auctions }: Props) {
  const [selected, setSelected] = useState<Auction | null>(null)
  const mappable = auctions.filter(a => a.lat != null && a.lng != null)

  return (
    <MapContainer
      center={[37, -95]}
      zoom={4}
      style={{ width: '100%', height: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {mappable.map(auction => (
        <CircleMarker
          key={auction.id}
          center={[auction.lat!, auction.lng!]}
          radius={8}
          pathOptions={{ color: PIN_COLORS[auction.type] ?? '#6b7280', fillColor: PIN_COLORS[auction.type] ?? '#6b7280', fillOpacity: 0.85 }}
          eventHandlers={{ click: () => setSelected(auction) }}
        >
          {selected?.id === auction.id && (
            <Popup onClose={() => setSelected(null)}>
              <div className="text-sm">
                <p className="font-semibold">{auction.address}</p>
                <p>${auction.min_bid?.toLocaleString()} — {auction.type}</p>
              </div>
            </Popup>
          )}
        </CircleMarker>
      ))}
      <div style={{ position: 'absolute', bottom: 24, left: 12, zIndex: 1000 }}
        className="bg-white rounded-lg shadow px-3 py-2 text-xs space-y-1.5">
        {LEGEND.map(({ label, color }) => (
          <div key={label} className="flex items-center gap-2">
            <span style={{ backgroundColor: color }} className="inline-block w-3 h-3 rounded-full flex-shrink-0" />
            <span className="text-gray-700">{label}</span>
          </div>
        ))}
      </div>
    </MapContainer>
  )
}
