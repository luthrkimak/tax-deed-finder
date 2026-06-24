# Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/dashboard` page for logged-in users showing live FL auction stats, upcoming favorites, top counties, and biggest discounts.

**Architecture:** New `/auctions/stats` backend endpoint aggregates all metrics in one DB call. Frontend `Dashboard.tsx` page calls this endpoint + existing `listFavorites`, and is set as the home route for authenticated users. No new DB tables needed.

**Tech Stack:** FastAPI (backend), React + Tailwind (frontend), Supabase (DB), existing `apiClient` pattern.

## Global Constraints

- Python 3.9+, FastAPI, Supabase Python client
- React 18, TypeScript, Tailwind CSS, react-router-dom v6
- No new DB tables — use existing `auctions` and `favorites` tables
- All monetary values formatted with `toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })`
- Dates displayed as `dd/MM/yyyy` (Brazilian format, consistent with rest of app)
- Dashboard only accessible when logged in (use existing `RequireAuth` pattern)
- Text in Portuguese (consistent with rest of app)

---

### Task 1: Backend — `/auctions/stats` endpoint

**Files:**
- Create: `backend/api/routes/stats.py`
- Modify: `backend/api/main.py`

**Interfaces:**
- Produces: `GET /stats` → `StatsResponse` (see schema below)

Response schema:
```json
{
  "total_available": 947,
  "next_7_days": 120,
  "min_bid_available": 1500.0,
  "active_counties": 32,
  "top_counties": [
    { "county": "Hillsborough", "count": 120 },
    ...
  ],
  "top_discounts": [
    {
      "id": "uuid",
      "address": "123 Main St, FL",
      "county": "Hillsborough",
      "type": "foreclosure",
      "auction_date": "2026-06-30",
      "min_bid": 50000,
      "assessed_value": 120000,
      "discount_pct": 58.3
    },
    ...
  ]
}
```

- [ ] **Step 1: Create `backend/api/routes/stats.py`**

```python
from fastapi import APIRouter
from datetime import date, timedelta
from db.client import get_supabase

router = APIRouter()

EXCLUDE_STATUSES = ["archived", "cancelled", "sold", "no_bid"]

@router.get("")
def get_stats():
    sb = get_supabase()
    today = date.today().isoformat()
    in_7_days = (date.today() + timedelta(days=7)).isoformat()

    # All upcoming available auctions
    all_rows = (
        sb.table("auctions")
        .select("id,county,type,min_bid,assessed_value,auction_date")
        .not_.in_("status", EXCLUDE_STATUSES)
        .gte("auction_date", today)
        .eq("state", "FL")
        .limit(3000)
        .execute()
        .data
    )

    total_available = len(all_rows)
    next_7_days = sum(1 for r in all_rows if r.get("auction_date") and r["auction_date"] <= in_7_days)

    bids = [r["min_bid"] for r in all_rows if r.get("min_bid") is not None]
    min_bid_available = min(bids) if bids else None

    # Count by county
    from collections import Counter
    county_counts = Counter(r["county"] for r in all_rows if r.get("county"))
    top_counties = [
        {"county": c, "count": n}
        for c, n in county_counts.most_common(8)
    ]
    active_counties = len(county_counts)

    # Top discounts: need both min_bid and assessed_value
    discounts = []
    for r in all_rows:
        mb = r.get("min_bid")
        av = r.get("assessed_value")
        if mb and av and av > 0 and mb < av:
            pct = round((1 - mb / av) * 100, 1)
            discounts.append({
                "id": r["id"],
                "address": None,  # fetched below
                "county": r["county"],
                "type": r["type"],
                "auction_date": r["auction_date"],
                "min_bid": mb,
                "assessed_value": av,
                "discount_pct": pct,
            })
    discounts.sort(key=lambda x: -x["discount_pct"])
    top5 = discounts[:5]

    # Enrich top5 with address
    if top5:
        ids = [r["id"] for r in top5]
        addr_rows = sb.table("auctions").select("id,address").in_("id", ids).execute().data
        addr_map = {r["id"]: r["address"] for r in addr_rows}
        for r in top5:
            r["address"] = addr_map.get(r["id"])

    return {
        "total_available": total_available,
        "next_7_days": next_7_days,
        "min_bid_available": min_bid_available,
        "active_counties": active_counties,
        "top_counties": top_counties,
        "top_discounts": top5,
    }
```

- [ ] **Step 2: Register router in `backend/api/main.py`**

Add import and registration:
```python
# Add to imports at top:
from api.routes import auctions, favorites, alerts, flood_zone, stats

# Add after existing include_router calls:
app.include_router(stats.router, prefix="/stats", tags=["stats"])
```

- [ ] **Step 3: Test the endpoint manually**

```bash
cd backend && source .venv/bin/activate
uvicorn api.main:app --port 8000 &
curl -s "http://localhost:8000/stats" | python3 -m json.tool | head -40
```

Expected: JSON with `total_available`, `top_counties` (8 items), `top_discounts` (up to 5 items with `discount_pct`).

- [ ] **Step 4: Commit**

```bash
git add backend/api/routes/stats.py backend/api/main.py
git commit -m "feat: add /stats endpoint with FL auction metrics"
```

---

### Task 2: Frontend — Stats type + API client method

**Files:**
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/lib/api.ts`

**Interfaces:**
- Produces: `apiClient.getStats()` → `Promise<StatsResponse>`

- [ ] **Step 1: Add types to `frontend/src/types/index.ts`**

Add at end of file:
```typescript
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
```

- [ ] **Step 2: Add `getStats` to `frontend/src/lib/api.ts`**

Add inside the `apiClient` object, after `getAuction`:
```typescript
async getStats(): Promise<StatsResponse> {
  const { data } = await axios.get(`${BASE_URL}/stats`)
  return data
},
```

Also add `StatsResponse` to the import at top of file:
```typescript
import type { Auction, AuctionFilters, AuctionsResponse, Favorite, Alert, PinData, StatsResponse } from '../types'
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd frontend && npm run build 2>&1 | grep -E "error|Error" | head -10
```

Expected: no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/types/index.ts frontend/src/lib/api.ts
git commit -m "feat: add StatsResponse type and getStats API method"
```

---

### Task 3: Frontend — Dashboard page

**Files:**
- Create: `frontend/src/pages/Dashboard.tsx`

**Interfaces:**
- Consumes: `apiClient.getStats()` → `StatsResponse`, `apiClient.listFavorites()` → `Favorite[]`

- [ ] **Step 1: Create `frontend/src/pages/Dashboard.tsx`**

```tsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { StatsResponse, Favorite } from '../types'
import { apiClient } from '../lib/api'

function fmt(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

function fmtDate(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function urgencyBadge(dateIso: string) {
  const diff = Math.ceil((new Date(dateIso).getTime() - Date.now()) / 86400000)
  if (diff <= 1) return { label: 'Hoje / Amanhã', color: '#dc2626', bg: '#fee2e2' }
  if (diff <= 7) return { label: 'Esta semana', color: '#d97706', bg: '#fef3c7' }
  return { label: fmtDate(dateIso), color: '#6b7280', bg: '#f3f4f6' }
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<StatsResponse | null>(null)
  const [favs, setFavs] = useState<Favorite[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([apiClient.getStats(), apiClient.listFavorites()])
      .then(([s, f]) => {
        setStats(s)
        // Sort favorites by auction_date ascending, filter only future ones
        const upcoming = f
          .filter(fav => fav.auction?.auction_date && fav.auction.auction_date >= new Date().toISOString().split('T')[0])
          .sort((a, b) => (a.auction?.auction_date ?? '').localeCompare(b.auction?.auction_date ?? ''))
        setFavs(upcoming)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-400">Carregando...</div>
  )
  if (!stats) return null

  const maxCount = Math.max(...stats.top_counties.map(c => c.count), 1)

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-10">

      {/* Section 1 — Metric cards */}
      <section>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Disponível agora · Flórida</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Leilões disponíveis', value: stats.total_available.toLocaleString(), icon: '🏠' },
            { label: 'Próximos 7 dias', value: stats.next_7_days.toLocaleString(), icon: '📅' },
            { label: 'Menor lance', value: stats.min_bid_available ? fmt(stats.min_bid_available) : '—', icon: '💰' },
            { label: 'Condados ativos', value: stats.active_counties.toLocaleString(), icon: '📍' },
          ].map(({ label, value, icon }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="text-2xl mb-2">{icon}</div>
              <div className="text-2xl font-bold text-gray-900">{value}</div>
              <div className="text-xs text-gray-500 mt-1">{label}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid md:grid-cols-2 gap-8">

        {/* Section 2 — Upcoming favorites */}
        <section>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Favoritos com data chegando</h2>
          {favs.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 text-center text-gray-400 text-sm">
              Nenhum favorito com leilão futuro.<br />
              <button onClick={() => navigate('/')} className="mt-2 text-blue-600 hover:underline">Buscar leilões →</button>
            </div>
          ) : (
            <div className="space-y-3">
              {favs.slice(0, 5).map(fav => {
                const a = fav.auction!
                const badge = urgencyBadge(a.auction_date!)
                return (
                  <button
                    key={fav.id}
                    onClick={() => navigate(`/auctions/${a.id}`)}
                    className="w-full text-left bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:border-blue-200 hover:shadow transition"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-gray-800 leading-tight">{a.address ?? '—'}</p>
                      <span className="shrink-0 text-xs font-medium px-2 py-0.5 rounded-full" style={{ color: badge.color, background: badge.bg }}>
                        {badge.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{a.county} · {a.type?.replace(/_/g, ' ')}</p>
                    {a.min_bid && <p className="text-sm font-bold text-gray-900 mt-1">{fmt(a.min_bid)}</p>}
                  </button>
                )
              })}
              {favs.length > 5 && (
                <button onClick={() => navigate('/favorites')} className="text-sm text-blue-600 hover:underline">
                  Ver todos os {favs.length} favoritos →
                </button>
              )}
            </div>
          )}
        </section>

        {/* Section 3 — Top counties */}
        <section>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Top condados</h2>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
            {stats.top_counties.map(({ county, count }) => (
              <button
                key={county}
                onClick={() => navigate(`/?state=FL&county=${encodeURIComponent(county)}`)}
                className="w-full text-left hover:opacity-80 transition"
              >
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-gray-700">{county}</span>
                  <span className="text-gray-400">{count}</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(count / maxCount) * 100}%` }} />
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>

      {/* Section 4 — Top discounts */}
      <section>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Maiores descontos</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stats.top_discounts.map(d => (
            <button
              key={d.id}
              onClick={() => navigate(`/auctions/${d.id}`)}
              className="text-left bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:border-green-200 hover:shadow transition"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">{d.type?.replace(/_/g, ' ')}</span>
                <span className="text-lg font-bold text-green-600">{d.discount_pct}% off</span>
              </div>
              <p className="text-sm font-semibold text-gray-800 leading-tight mb-1">{d.address ?? '—'}</p>
              <p className="text-xs text-gray-400 mb-3">{d.county} · {fmtDate(d.auction_date)}</p>
              <div className="flex gap-4">
                <div>
                  <div className="text-xs text-gray-400">Lance</div>
                  <div className="text-sm font-bold text-gray-900">{fmt(d.min_bid)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">Avaliação</div>
                  <div className="text-sm font-bold text-gray-500">{fmt(d.assessed_value)}</div>
                </div>
              </div>
            </button>
          ))}
          {stats.top_discounts.length === 0 && (
            <p className="text-sm text-gray-400 col-span-3">Nenhum desconto disponível no momento.</p>
          )}
        </div>
      </section>

    </div>
  )
}
```

- [ ] **Step 2: Verify file saved correctly**

```bash
wc -l frontend/src/pages/Dashboard.tsx
```
Expected: ~130 lines.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Dashboard.tsx
git commit -m "feat: add Dashboard page with stats, favorites, top counties and discounts"
```

---

### Task 4: Frontend — Wire Dashboard into routing + Navbar

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/Navbar.tsx`

**Interfaces:**
- Consumes: `Dashboard` component from `./pages/Dashboard`

- [ ] **Step 1: Add Dashboard route and redirect in `frontend/src/App.tsx`**

Replace the file content with:
```tsx
import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import Auth from './pages/Auth'
import Search from './pages/Search'
import AuctionDetail from './pages/AuctionDetail'
import Favorites from './pages/Favorites'
import Alerts from './pages/Alerts'
import Counties from './pages/Counties'
import Dashboard from './pages/Dashboard'
import Navbar from './components/Navbar'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])
  if (session === undefined) return null
  if (!session) return <Navigate to="/auth" replace />
  return <>{children}</>
}

function HomeRedirect() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])
  if (session === undefined) return null
  return session ? <Navigate to="/dashboard" replace /> : <Search />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/*" element={
          <>
            <Navbar />
            <Routes>
              <Route path="/" element={<HomeRedirect />} />
              <Route path="/search" element={<Search />} />
              <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
              <Route path="/auctions/:id" element={<AuctionDetail />} />
              <Route path="/favorites" element={<RequireAuth><Favorites /></RequireAuth>} />
              <Route path="/alerts" element={<RequireAuth><Alerts /></RequireAuth>} />
              <Route path="/counties" element={<Counties />} />
            </Routes>
          </>
        } />
      </Routes>
    </BrowserRouter>
  )
}
```

- [ ] **Step 2: Add "Dashboard" link to Navbar for logged-in users**

Read `frontend/src/components/Navbar.tsx` and find where the nav links are rendered. Add a Dashboard link that only shows when the user is logged in, before the Busca link:

In the section that renders nav links, add:
```tsx
{session && (
  <Link to="/dashboard" className={...same className as other links...}>
    Dashboard
  </Link>
)}
```

Also update the "Busca" link to point to `/search` instead of `/`:
```tsx
<Link to="/search" ...>Busca</Link>
```

- [ ] **Step 3: Build and check for errors**

```bash
cd frontend && npm run build 2>&1 | grep -E "error TS|Error" | head -20
```
Expected: no TypeScript errors.

- [ ] **Step 4: Start dev server and verify**

```bash
cd frontend && npm run dev
```

Open `http://localhost:5173` — if logged out, shows Search. If logged in, redirects to `/dashboard`. Check Dashboard loads with 4 metric cards, top counties list with bars, top discounts grid.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/App.tsx frontend/src/components/Navbar.tsx
git commit -m "feat: wire Dashboard into routing — logged-in users land on /dashboard"
```

---

### Task 5: Deploy

- [ ] **Step 1: Push to Railway**

```bash
git push origin main
```

- [ ] **Step 2: Verify production endpoint**

```bash
curl -s "https://tax-deed-finder-production.up.railway.app/stats" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'total={d[\"total_available\"]}, counties={d[\"active_counties\"]}, discounts={len(d[\"top_discounts\"])}')"
```
Expected: `total=947, counties=32, discounts=5`

- [ ] **Step 3: Verify frontend on Railway**

Open the production URL, log in, confirm redirect to `/dashboard` with real data.
