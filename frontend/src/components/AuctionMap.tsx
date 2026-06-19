import Map, { Marker, Popup } from 'react-map-gl/mapbox'
import { useState } from 'react'
import type { Auction } from '../types'
import 'mapbox-gl/dist/mapbox-gl.css'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN

const PIN_COLORS: Record<string, string> = {
  tax_deed: '#2563eb',
  tax_lien: '#16a34a',
  foreclosure: '#ea580c',
}

interface Props {
  auctions: Auction[]
}

// Only auctions with lat/lng can be mapped — real lat/lng comes from geocoding (future feature)
// For now we show a placeholder US-centered map
export default function AuctionMap({ auctions }: Props) {
  const [selected, setSelected] = useState<Auction | null>(null)
  const mappable = auctions.filter(a => (a as any).lat && (a as any).lng)

  return (
    <Map
      mapboxAccessToken={MAPBOX_TOKEN}
      initialViewState={{ longitude: -95, latitude: 37, zoom: 4 }}
      style={{ width: '100%', height: '100%' }}
      mapStyle="mapbox://styles/mapbox/streets-v12"
    >
      {mappable.map(auction => (
        <Marker
          key={auction.id}
          longitude={(auction as any).lng}
          latitude={(auction as any).lat}
          color={PIN_COLORS[auction.type]}
          onClick={() => setSelected(auction)}
        />
      ))}
      {selected && (
        <Popup
          longitude={(selected as any).lng}
          latitude={(selected as any).lat}
          onClose={() => setSelected(null)}
          closeOnClick={false}
        >
          <div className="text-sm">
            <p className="font-semibold">{selected.address}</p>
            <p>${selected.min_bid?.toLocaleString()} — {selected.type}</p>
          </div>
        </Popup>
      )}
    </Map>
  )
}
