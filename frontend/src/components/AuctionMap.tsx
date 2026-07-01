import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import L from 'leaflet'
import type { AuctionFilters, PinData } from '../types'
import { apiClient } from '../lib/api'
import 'leaflet/dist/leaflet.css'
import 'react-leaflet-cluster/dist/assets/MarkerCluster.css'
import 'react-leaflet-cluster/dist/assets/MarkerCluster.Default.css'

const MAP_VIEWPORT_KEY = 'map_viewport'

const STATE_BOUNDS: Record<string, [[number, number], [number, number]]> = {
  FL: [[24.4, -87.6], [31.0, -79.9]],
  MS: [[30.1, -91.7], [35.0, -88.0]],
  GA: [[30.3, -85.6], [35.0, -80.8]],
}

// Approximate center [lat, lng] per state → county
const COUNTY_CENTERS: Record<string, Record<string, [number, number]>> = {
  FL: {
    Alachua: [29.6516, -82.3248], Baker: [30.3305, -82.2882], Bay: [30.1988, -85.6594],
    Brevard: [28.2639, -80.7214], Broward: [26.1901, -80.3659], Calhoun: [30.4088, -85.1944],
    Charlotte: [26.9342, -81.9582], Citrus: [28.8408, -82.4665], Clay: [29.9941, -81.8849],
    Collier: [25.9017, -81.3999], Columbia: [30.2168, -82.6196], DeSoto: [27.1889, -81.8232],
    Dixie: [29.5902, -83.1635], Duval: [30.3322, -81.6557], Escambia: [30.6388, -87.3419],
    Flagler: [29.4727, -81.2874], Franklin: [29.8219, -84.7497], Gadsden: [30.5766, -84.6116],
    Gilchrist: [29.7236, -82.7968], Glades: [26.9626, -81.1996], Gulf: [29.9285, -85.2296],
    Hamilton: [30.4966, -82.9490], Hardee: [27.4934, -81.8104], Hendry: [26.4984, -81.1996],
    Hernando: [28.5578, -82.4665], Highlands: [27.3428, -81.3399], Hillsborough: [27.9904, -82.3018],
    Holmes: [30.8677, -85.8122], 'Indian River': [27.6648, -80.5512], Jackson: [30.7799, -85.2136],
    Jefferson: [30.4255, -83.8807], Lafayette: [30.0213, -83.1843], Lake: [28.7491, -81.7601],
    Lee: [26.5629, -81.8723], Leon: [30.4380, -84.2807], Levy: [29.3174, -82.7824],
    Liberty: [30.2379, -84.8807], Madison: [30.4694, -83.4735], Manatee: [27.4799, -82.3452],
    Marion: [29.2108, -82.1399], Martin: [27.0527, -80.4399], 'Miami-Dade': [25.5516, -80.6327],
    Monroe: [24.5557, -81.7826], Nassau: [30.6113, -81.7682], Okaloosa: [30.6738, -86.5970],
    Okeechobee: [27.3904, -80.8999], Orange: [28.4845, -81.2488], Osceola: [28.0618, -81.0868],
    'Palm Beach': [26.6443, -80.3566], Pasco: [28.3058, -82.4360], Pinellas: [27.9030, -82.7390],
    Polk: [27.9362, -81.6990], Putnam: [29.6268, -81.7399], 'Santa Rosa': [30.6880, -86.9788],
    Sarasota: [27.1884, -82.3649], Seminole: [28.7179, -81.2088], 'St. Johns': [29.9657, -81.4360],
    'St. Lucie': [27.3799, -80.4399], Sumter: [28.7091, -82.0849], Suwannee: [30.1968, -83.0135],
    Taylor: [30.0624, -83.5899], Union: [30.0413, -82.3735], Volusia: [29.0286, -81.0999],
    Wakulla: [30.1474, -84.3807], Walton: [30.6038, -86.1738], Washington: [30.6088, -85.6638],
  },
  MS: {
    Adams: [31.50, -91.00], Alcorn: [34.90, -88.60], Amite: [31.20, -90.70],
    Attala: [33.10, -89.60], Benton: [34.80, -89.20], Bolivar: [33.80, -90.90],
    Carroll: [33.40, -89.90], Chickasaw: [33.90, -88.90], Choctaw: [33.30, -89.30],
    Claiborne: [32.00, -90.90], Clarke: [32.00, -88.70], Clay: [33.60, -88.80],
    Coahoma: [34.20, -90.60], Copiah: [31.90, -90.50], Covington: [31.60, -89.50],
    DeSoto: [34.90, -89.90], Forrest: [31.20, -89.30], Franklin: [31.50, -90.90],
    George: [30.90, -88.60], Greene: [31.20, -88.60], Grenada: [33.80, -89.80],
    Hancock: [30.40, -89.50], Harrison: [30.40, -89.10], Hinds: [32.30, -90.50],
    Holmes: [33.10, -90.10], Humphreys: [33.10, -90.50], Issaquena: [32.70, -90.90],
    Itawamba: [34.30, -88.40], Jackson: [30.50, -88.70], Jasper: [32.00, -89.10],
    Jefferson: [31.70, -91.00], 'Jefferson Davis': [31.50, -89.90], Jones: [31.60, -89.20],
    Kemper: [32.70, -88.70], Lafayette: [34.40, -89.50], Lamar: [31.20, -89.50],
    Lauderdale: [32.40, -88.70], Lawrence: [31.50, -90.10], Leake: [32.80, -89.50],
    Lee: [34.30, -88.60], Leflore: [33.50, -90.20], Lincoln: [31.50, -90.40],
    Lowndes: [33.50, -88.40], Madison: [32.60, -90.00], Marion: [31.20, -89.80],
    Marshall: [34.80, -89.50], Monroe: [33.90, -88.50], Montgomery: [33.50, -89.60],
    Neshoba: [32.80, -89.10], Newton: [32.40, -89.10], Noxubee: [33.10, -88.60],
    Oktibbeha: [33.40, -88.90], Panola: [34.30, -89.90], 'Pearl River': [30.80, -89.60],
    Perry: [31.20, -89.00], Pike: [31.20, -90.40], Pontotoc: [34.20, -89.00],
    Prentiss: [34.60, -88.50], Quitman: [34.20, -90.30], Rankin: [32.30, -89.90],
    Scott: [32.40, -89.50], Sharkey: [32.90, -90.80], Simpson: [31.90, -89.90],
    Smith: [32.00, -89.50], Stone: [30.80, -89.00], Sunflower: [33.50, -90.60],
    Tallahatchie: [33.90, -90.20], Tate: [34.60, -89.90], Tippah: [34.70, -88.90],
    Tishomingo: [34.70, -88.20], Tunica: [34.70, -90.40], Union: [34.50, -89.00],
    Walthall: [31.20, -90.10], Warren: [32.40, -90.90], Washington: [33.30, -90.90],
    Wayne: [31.70, -88.70], Webster: [33.60, -89.30], Wilkinson: [31.20, -91.20],
    Winston: [33.10, -89.00], Yalobusha: [33.90, -89.70], Yazoo: [32.80, -90.30],
  },
}

function FitBounds({ pins, filterKey, state, county }: {
  pins: PinData[], filterKey: string, state?: string, county?: string
}) {
  const map = useMap()
  const initializedRef = useRef(false)
  const prevFilterKeyRef = useRef(filterKey)

  // Save viewport whenever the user moves/zooms the map
  useEffect(() => {
    const save = () => {
      const c = map.getCenter()
      sessionStorage.setItem(MAP_VIEWPORT_KEY, JSON.stringify({
        filterKey, lat: c.lat, lng: c.lng, zoom: map.getZoom(),
      }))
    }
    map.on('moveend', save)
    return () => { map.off('moveend', save) }
  }, [map, filterKey])

  // When filters change, fly to county → state → wait for pins (priority order)
  useEffect(() => {
    if (prevFilterKeyRef.current === filterKey) return
    prevFilterKeyRef.current = filterKey

    const countyCenter = state ? COUNTY_CENTERS[state]?.[county ?? ''] : undefined
    if (county && countyCenter) {
      map.setView(countyCenter, 11, { animate: true })
      initializedRef.current = true
      return
    }
    if (state && STATE_BOUNDS[state]) {
      map.fitBounds(STATE_BOUNDS[state], { padding: [32, 32], animate: true })
      initializedRef.current = true
      return
    }
    initializedRef.current = false
  }, [filterKey, county, state, map])

  // On initial load (or after filter with no predefined target): restore viewport or fit pins
  useEffect(() => {
    if (pins.length === 0 || initializedRef.current) return
    initializedRef.current = true
    try {
      const raw = sessionStorage.getItem(MAP_VIEWPORT_KEY)
      if (raw) {
        const saved = JSON.parse(raw)
        if (saved.filterKey === filterKey) {
          map.setView([saved.lat, saved.lng], saved.zoom, { animate: false })
          return
        }
      }
    } catch { /* ignore stale localStorage */ }
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

const makeIcon = (color: string, approximate = false) =>
  L.divIcon({
    className: '',
    html: `<div style="width:48px;height:52px;display:flex;align-items:flex-end;justify-content:center;opacity:${approximate ? 0.55 : 1}">
      <svg width="32" height="38" viewBox="0 0 28 32" xmlns="http://www.w3.org/2000/svg" style="display:block;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3))">
        <polygon points="14,2 26,13 26,27 2,27 2,13" fill="${approximate ? '#94a3b8' : color}" stroke="white" stroke-width="1.5" stroke-linejoin="round" stroke-dasharray="${approximate ? '3,2' : 'none'}"/>
        <rect x="10.5" y="18" width="7" height="9" rx="1" fill="white" fill-opacity="0.3"/>
        <polygon points="11,27 17,27 14,32" fill="${approximate ? '#94a3b8' : color}"/>
      </svg>
    </div>`,
    iconSize: [48, 52],
    iconAnchor: [24, 52],
    popupAnchor: [0, -50],
  })

const FAVORITE_COLOR = '#eab308'

const makeStarIcon = (color: string) =>
  L.divIcon({
    className: '',
    html: `<svg width="34" height="34" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="display:block;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4))">
      <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26 12,2" fill="${color}" stroke="white" stroke-width="1" stroke-linejoin="round"/>
    </svg>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -17],
  })

const ICONS: Record<string, L.DivIcon> = {
  tax_deed:              makeIcon('#2563eb'),
  tax_lien:              makeIcon('#16a34a'),
  foreclosure:           makeIcon('#ea580c'),
  default:               makeIcon('#6b7280'),
  tax_deed_approx:       makeIcon('#2563eb', true),
  tax_lien_approx:       makeIcon('#16a34a', true),
  foreclosure_approx:    makeIcon('#ea580c', true),
  default_approx:        makeIcon('#6b7280', true),
  favorite:              makeStarIcon(FAVORITE_COLOR),
}

interface Props {
  filters: AuctionFilters
  favoriteIds: Set<string>
  onToggleFavorite: (auctionId: string) => void
}

export default function AuctionMap({ filters, favoriteIds, onToggleFavorite }: Props) {
  const [pins, setPins] = useState<PinData[]>([])
  const navigate = useNavigate()
  const filterKey = JSON.stringify(filters)

  // Read saved viewport synchronously before first render to avoid flash
  const initialView = useMemo(() => {
    try {
      const raw = sessionStorage.getItem(MAP_VIEWPORT_KEY)
      if (raw) {
        const saved = JSON.parse(raw)
        if (saved.filterKey === filterKey) {
          return { center: [saved.lat, saved.lng] as [number, number], zoom: saved.zoom as number }
        }
      }
    } catch { /* ignore stale localStorage */ }
    return null
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const { page, page_size, date_from, date_to, status, ...mapFilters } = filters
    void page; void page_size; void date_from; void date_to; void status
    apiClient.getPins(mapFilters).then(setPins).catch(() => setPins([]))
  }, [filterKey])

  return (
    <MapContainer
      center={initialView?.center ?? [37, -95]}
      zoom={initialView?.zoom ?? 4}
      style={{ width: '100%', height: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds pins={pins.filter(p => p.state !== 'TX')} filterKey={filterKey} state={filters.state} county={filters.county} />
      <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 1000 }}
        className="bg-white rounded-lg shadow px-3 py-1.5 text-xs text-gray-600 font-medium">
        {pins.filter(p => p.state !== 'TX').length.toLocaleString()} propriedades
      </div>
      <MarkerClusterGroup chunkedLoading>
        {pins.filter(p => p.state !== 'TX').map(pin => (
          <Marker
            key={pin.id}
            position={[pin.lat, pin.lng]}
            icon={
              favoriteIds.has(pin.id)
                ? ICONS.favorite
                : pin.approximate ? (ICONS[`${pin.type}_approx`] ?? ICONS.default_approx) : (ICONS[pin.type] ?? ICONS.default)
            }
          >
            <Popup minWidth={200}>
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
                    {pin.approximate && (
                      <p style={{ margin: '0 0 6px', fontSize: '10px', color: '#94a3b8', fontStyle: 'italic' }}>
                        📍 Localização aproximada (condado)
                      </p>
                    )}
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
                    {favoriteIds.has(pin.id) && (
                      <button
                        onClick={() => onToggleFavorite(pin.id)}
                        style={{
                          width: '100%',
                          padding: '7px 0',
                          marginTop: '6px',
                          backgroundColor: 'transparent',
                          color: FAVORITE_COLOR,
                          border: `1px solid ${FAVORITE_COLOR}`,
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        ★ Remover dos favoritos
                      </button>
                    )}
                  </div>
                </div>
              </Popup>
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
        <div className="flex items-center gap-2 pt-1 border-t border-gray-100 mt-1">
          <svg width="12" height="12" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
            <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26 12,2" fill={FAVORITE_COLOR} stroke="white" strokeWidth="1"/>
          </svg>
          <span className="text-gray-700">Favorito</span>
        </div>
        <div className="flex items-center gap-2 pt-1 border-t border-gray-100 mt-1">
          <svg width="12" height="14" viewBox="0 0 28 32" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0" style={{ opacity: 0.55 }}>
            <polygon points="14,2 26,13 26,27 2,27 2,13" fill="#94a3b8" stroke="white" strokeWidth="1.5" strokeLinejoin="round" strokeDasharray="3,2"/>
            <rect x="10.5" y="18" width="7" height="9" rx="1" fill="white" fillOpacity="0.3"/>
            <polygon points="11,27 17,27 14,32" fill="#94a3b8"/>
          </svg>
          <span className="text-gray-400 italic">Localiz. aproximada</span>
        </div>
      </div>
    </MapContainer>
  )
}
