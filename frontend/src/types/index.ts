export type AuctionType = 'tax_deed' | 'tax_lien' | 'foreclosure'
export type AuctionStatus = 'upcoming' | 'active' | 'sold' | 'cancelled' | 'archived' | 'no_bid'
export type PropertyType = 'residential' | 'commercial' | 'land'

export interface Auction {
  id: string
  type: AuctionType
  status: AuctionStatus
  auction_date: string | null
  state: string
  county: string
  address: string | null
  parcel_id: string | null
  property_type: PropertyType | null
  min_bid: number | null
  assessed_value: number | null
  market_value_estimate: number | null
  outstanding_debt: number | null
  tax_amount_owed: number | null
  interest_rate: number | null
  photo_url: string | null
  zillow_url: string | null
  redfin_url: string | null
  source: 'api' | 'scrape'
  source_url: string | null
  lat: number | null
  lng: number | null
  created_at: string
  updated_at: string
}

export interface AuctionFilters {
  state?: string
  county?: string
  type?: AuctionType
  status?: AuctionStatus
  property_type?: PropertyType
  min_bid?: number
  max_bid?: number
  date_from?: string
  date_to?: string
  page?: number
  page_size?: number
}

export interface AuctionsResponse {
  data: Auction[]
  total: number
  page: number
  page_size: number
}

export interface Favorite {
  id: string
  user_id: string
  auction_id: string
  notes: string | null
  created_at: string
  auction?: Auction
}

export interface PinData {
  id: string
  lat: number
  lng: number
  type: string
  address: string | null
  min_bid: number | null
  assessed_value: number | null
  approximate?: boolean
}

export interface Alert {
  id: string
  user_id: string
  filters: Record<string, unknown>
  email: string
  active: boolean
  last_sent_at: string | null
  created_at: string
}

export interface TopCounty {
  county: string
  count: number
}

export interface TopDiscount {
  id: string
  address: string | null
  county: string
  type: AuctionType
  auction_date: string
  min_bid: number
  assessed_value: number
  discount_pct: number
}

export interface StatsResponse {
  total_available: number
  next_7_days: number
  min_bid_available: number | null
  active_counties: number
  top_counties: TopCounty[]
  top_discounts: TopDiscount[]
}
