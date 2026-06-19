import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { apiClient } from '../lib/api'
import type { Alert } from '../types'
import AlertForm from '../components/AlertForm'

export default function Alerts() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email || ''))
    apiClient.listAlerts().then(setAlerts).finally(() => setLoading(false))
  }, [])

  async function handleCreate(filters: Record<string, unknown>, alertEmail: string) {
    const alert = await apiClient.createAlert(filters, alertEmail)
    setAlerts(prev => [alert, ...prev])
  }

  async function toggleActive(alert: Alert) {
    const updated = await apiClient.updateAlert(alert.id, { active: !alert.active })
    setAlerts(prev => prev.map(a => a.id === alert.id ? updated : a))
  }

  async function remove(alert: Alert) {
    await apiClient.deleteAlert(alert.id)
    setAlerts(prev => prev.filter(a => a.id !== alert.id))
  }

  function describeFilters(filters: Record<string, unknown>) {
    const parts: string[] = []
    if (filters.state) parts.push(`State: ${filters.state}`)
    if (filters.type) parts.push(`Type: ${String(filters.type).replace('_', ' ')}`)
    if (filters.min_bid) parts.push(`Min: $${Number(filters.min_bid).toLocaleString()}`)
    if (filters.max_bid) parts.push(`Max: $${Number(filters.max_bid).toLocaleString()}`)
    return parts.length ? parts.join(' · ') : 'All auctions'
  }

  if (loading) return <div className="p-6">Loading…</div>

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">My Alerts</h1>
      <AlertForm email={email} onSubmit={handleCreate} />
      {alerts.length === 0
        ? <p className="text-gray-500">No alerts yet.</p>
        : (
          <div className="space-y-3">
            {alerts.map(alert => (
              <div key={alert.id} className="bg-white border rounded-lg p-4 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{describeFilters(alert.filters as Record<string, unknown>)}</p>
                  <p className="text-xs text-gray-500 mt-0.5">→ {alert.email}</p>
                  {alert.last_sent_at && <p className="text-xs text-gray-400 mt-0.5">Last sent: {new Date(alert.last_sent_at).toLocaleDateString()}</p>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => toggleActive(alert)}
                    className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${alert.active ? 'bg-blue-600' : 'bg-gray-300'}`}
                  >
                    <span className={`inline-block h-4 w-4 rounded-full bg-white m-1 transition-transform ${alert.active ? 'translate-x-5' : ''}`} />
                  </button>
                  <button onClick={() => remove(alert)} className="text-red-400 hover:text-red-600 text-sm">Delete</button>
                </div>
              </div>
            ))}
          </div>
        )
      }
    </div>
  )
}
