import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import L from 'leaflet'
import type { AuctionFilters, PinData } from '../types'
import { apiClient } from '../lib/api'
import 'leaflet/dist/leaflet.css'
import 'react-leaflet-cluster/dist/assets/MarkerCluster.css'
import 'react-leaflet-cluster/dist/assets/MarkerCluster.Default.css'

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

const makeIcon = (color: string) =>
  L.divIcon({
    className: '',
    html: `<div style="width:12px;height:12px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.4)"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  })

interface Props {
  filters: AuctionFilters
}

export default function AuctionMap({ filters }: Props) {
  const [pins, setPins] = useState<PinData[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const navigate = useNavigate()

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const { page, page_size, date_from, date_to, status, ...mapFilters } = filters
    void page; void page_size; void date_from; void date_to; void status
    apiClient.getPins(mapFilters).then(setPins).catch(() => setPins([]))
  }, [JSON.stringify(filters)])  // stringify avoids infinite loops from object identity changes

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
      <MarkerClusterGroup chunkedLoading>
        {pins.map(pin => (
          <Marker
            key={pin.id}
            position={[pin.lat, pin.lng]}
            icon={makeIcon(PIN_COLORS[pin.type] ?? '#6b7280')}
            eventHandlers={{ click: () => setSelected(pin.id) }}
          >
            {selected === pin.id && (
              <Popup eventHandlers={{ remove: () => setSelected(null) }}>
                <div className="text-sm space-y-1.5" style={{ minWidth: 180 }}>
                  <p className="font-semibold leading-snug">{pin.address ?? '—'}</p>
                  <p className="text-gray-500">
                    {pin.type?.replace('_', ' ')}
                    {pin.min_bid != null && <> · <span className="font-medium text-gray-800">${pin.min_bid.toLocaleString()}</span></>}
                  </p>
                  <button
                    onClick={() => navigate(`/auctions/${pin.id}`)}
                    className="mt-1 w-full text-center text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded px-3 py-1.5 transition-colors"
                  >
                    Ver detalhes →
                  </button>
                </div>
              </Popup>
            )}
          </Marker>
        ))}
      </MarkerClusterGroup>
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
