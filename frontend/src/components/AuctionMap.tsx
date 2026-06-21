import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Popup, CircleMarker } from 'react-leaflet'
import type { AuctionFilters, PinData } from '../types'
import { apiClient } from '../lib/api'
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
  filters: AuctionFilters
}

export default function AuctionMap({ filters }: Props) {
  const [pins, setPins] = useState<PinData[]>([])
  const [selected, setSelected] = useState<string | null>(null)

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
      {pins.map(pin => (
        <CircleMarker
          key={pin.id}
          center={[pin.lat, pin.lng]}
          radius={8}
          pathOptions={{ color: PIN_COLORS[pin.type] ?? '#6b7280', fillColor: PIN_COLORS[pin.type] ?? '#6b7280', fillOpacity: 0.85 }}
          eventHandlers={{ click: () => setSelected(pin.id) }}
        >
          {selected === pin.id && (
            <Popup onClose={() => setSelected(null)}>
              <div className="text-sm">
                <p className="font-semibold">{pin.address}</p>
                <p>${pin.min_bid?.toLocaleString()} — {pin.type}</p>
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
