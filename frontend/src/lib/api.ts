import axios from 'axios'
import type { Auction, AuctionFilters, AuctionsResponse, Favorite, Alert, PinData } from '../types'
import { supabase } from './supabase'

const BASE_URL = import.meta.env.VITE_API_URL

async function authHeaders() {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export const apiClient = {
  async getCounties(state?: string): Promise<string[]> {
    const params = state ? { state } : {}
    const { data } = await axios.get(`${BASE_URL}/auctions/counties`, { params })
    return data
  },

  async getAuctions(filters: AuctionFilters = {}): Promise<AuctionsResponse> {
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== undefined))
    const { data } = await axios.get(`${BASE_URL}/auctions`, { params })
    return data
  },

  async getAuction(id: string): Promise<Auction> {
    const { data } = await axios.get(`${BASE_URL}/auctions/${id}`)
    return data
  },

  async updateAddress(id: string, address: string): Promise<Auction> {
    const { data } = await axios.patch(`${BASE_URL}/auctions/${id}/address`, { address })
    return data
  },

  async getPins(filters: Omit<AuctionFilters, 'page' | 'page_size' | 'date_from' | 'date_to' | 'status'> = {}): Promise<PinData[]> {
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== undefined))
    const { data } = await axios.get(`${BASE_URL}/auctions/pins`, { params })
    return data
  },

  async listFavorites(): Promise<Favorite[]> {
    const headers = await authHeaders()
    const { data } = await axios.get(`${BASE_URL}/favorites`, { headers })
    return data
  },

  async createFavorite(auction_id: string, notes?: string): Promise<Favorite> {
    const headers = await authHeaders()
    const { data } = await axios.post(`${BASE_URL}/favorites`, { auction_id, notes }, { headers })
    return data
  },

  async deleteFavorite(id: string): Promise<void> {
    const headers = await authHeaders()
    await axios.delete(`${BASE_URL}/favorites/${id}`, { headers })
  },

  async updateFavorite(id: string, notes: string): Promise<Favorite> {
    const headers = await authHeaders()
    const { data } = await axios.patch(`${BASE_URL}/favorites/${id}`, { notes }, { headers })
    return data
  },

  async listAlerts(): Promise<Alert[]> {
    const headers = await authHeaders()
    const { data } = await axios.get(`${BASE_URL}/alerts`, { headers })
    return data
  },

  async createAlert(filters: Record<string, unknown>, email: string): Promise<Alert> {
    const headers = await authHeaders()
    const { data } = await axios.post(`${BASE_URL}/alerts`, { filters, email }, { headers })
    return data
  },

  async updateAlert(id: string, updates: { active?: boolean; filters?: Record<string, unknown> }): Promise<Alert> {
    const headers = await authHeaders()
    const { data } = await axios.patch(`${BASE_URL}/alerts/${id}`, updates, { headers })
    return data
  },

  async deleteAlert(id: string): Promise<void> {
    const headers = await authHeaders()
    await axios.delete(`${BASE_URL}/alerts/${id}`, { headers })
  },
}
