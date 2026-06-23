import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import L from 'leaflet'
import type { AuctionFilters, PinData } from '../types'
import { apiClient } from '../lib/api'
import 'leaflet/dist/leaflet.css'
import 'react-leaflet-cluster/dist/assets/MarkerCluster.css'
import 'react-leaflet-cluster/dist/assets/MarkerCluster.Default.css'

function FitBounds({ pins }: { pins: PinData[] }) {
  const map = useMap()
  useEffect(() => {
    if (pins.length === 0) return
    const bounds = L.latLngBounds(pins.map(p => [p.lat, p.lng]))
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 13, animate: true })
  }, [pins]) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}

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
    // 48x52px hit area com a casa centralizada — maior área de toque para tablet/mobile
    html: `<div style="width:48px;height:52px;display:flex;align-items:center;justify-content:center;padding-bottom:8px">
      <svg width="32" height="38" viewBox="0 0 28 32" xmlns="http://www.w3.org/2000/svg" style="display:block;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3))">
        <polygon points="14,2 26,13 26,27 2,27 2,13" fill="${color}" stroke="white" stroke-width="1.5" stroke-linejoin="round"/>
        <rect x="10.5" y="18" width="7" height="9" rx="1" fill="white" fill-opacity="0.3"/>
        <polygon points="11,27 17,27 14,32" fill="${color}"/>
      </svg>
    </div>`,
    iconSize: [48, 52],
    iconAnchor: [24, 52],
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
      <FitBounds pins={pins} />
      <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 1000 }}
        className="bg-white rounded-lg shadow px-3 py-1.5 text-xs text-gray-600 font-medium">
        {pins.length.toLocaleString()} propriedades
      </div>
      <MarkerClusterGroup chunkedLoading>
        {pins.map(pin => (
          <Marker
            key={pin.id}
            position={[pin.lat, pin.lng]}
            icon={makeIcon(PIN_COLORS[pin.type] ?? '#6b7280')}
            eventHandlers={{ click: () => setSelected(pin.id) }}
          >
            {selected === pin.id && (
              <Popup eventHandlers={{ remove: () => setSelected(null) }} minWidth={200}>
                <div style={{ margin: '-14px -20px -14px', overflow: 'hidden', borderRadius: '8px', width: 220 }}>
                  <div style={{ height: 4, backgroundColor: PIN_COLORS[pin.type] ?? '#6b7280' }} />
                  <div style={{ padding: '12px 14px 14px' }}>
                    <span style={{
                      display: 'inline-block',
                      fontSize: '10px',
                      fontWeight: 600,
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                      color: PIN_COLORS[pin.type] ?? '#6b7280',
                      backgroundColor: `${PIN_COLORS[pin.type] ?? '#6b7280'}18`,
                      borderRadius: '4px',
                      padding: '2px 6px',
                      marginBottom: '8px',
                    }}>
                      {pin.type?.replace(/_/g, ' ')}
                    </span>
                    <p style={{ margin: '0 0 6px', fontSize: '13px', fontWeight: 600, color: '#1e293b', lineHeight: 1.4 }}>
                      {pin.address ?? '—'}
                    </p>
                    <div style={{ display: 'flex', gap: '12px', margin: '0 0 12px' }}>
                      {pin.min_bid != null && (
                        <div>
                          <div style={{ fontSize: '10px', color: '#94a3b8', marginBottom: 1 }}>Dívida</div>
                          <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>${pin.min_bid.toLocaleString()}</div>
                        </div>
                      )}
                      {pin.assessed_value != null && (
                        <div>
                          <div style={{ fontSize: '10px', color: '#94a3b8', marginBottom: 1 }}>Avaliação</div>
                          <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>${pin.assessed_value.toLocaleString()}</div>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => navigate(`/auctions/${pin.id}`)}
                      style={{
                        width: '100%',
                        padding: '7px 0',
                        backgroundColor: PIN_COLORS[pin.type] ?? '#6b7280',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Ver detalhes →
                    </button>
                  </div>
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
            <svg width="12" height="14" viewBox="0 0 28 32" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
              <polygon points="14,2 26,13 26,27 2,27 2,13" fill={color} stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
              <rect x="10.5" y="18" width="7" height="9" rx="1" fill="white" fillOpacity="0.3"/>
              <polygon points="11,27 17,27 14,32" fill={color}/>
            </svg>
            <span className="text-gray-700">{label}</span>
          </div>
        ))}
      </div>
    </MapContainer>
  )
}
