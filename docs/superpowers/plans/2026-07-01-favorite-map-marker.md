# Favorite Star Map Marker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a user favorites an auction, its marker on the search map (`AuctionMap.tsx`) switches to a gold star icon, and the marker's popup gains a button to remove the favorite directly.

**Architecture:** `Search.tsx` already tracks `favoriteIds: Set<string>` and a `toggleFavorite` function, currently wired only to `AuctionCard`. This plan threads that same state down into `AuctionMap` as new props, adds a gold-star `L.divIcon` to the existing `ICONS` lookup, and selects it when a pin's id is in `favoriteIds` — overriding the type-based icon entirely. No backend or API changes are needed; `/auctions/pins` stays public/unauthenticated, and favorite status is resolved entirely on the client from data `Search.tsx` already has.

**Tech Stack:** React + TypeScript (frontend/), react-leaflet v4, Leaflet `L.divIcon`. No frontend test runner is configured in this repo (no Jest/Vitest) — verification is via `tsc` type-check, ESLint, and manual browser check per project convention.

## Global Constraints

- All changes are frontend-only, inside `frontend/src/` — do not touch `backend/`.
- Only these three files are modified: `frontend/src/pages/Search.tsx`, `frontend/src/components/AuctionCard.tsx`, `frontend/src/components/AuctionMap.tsx`. No new files.
- `toggleFavorite` changes signature from `(auction: Auction) => Promise<void>` to `(auctionId: string) => Promise<void>` — this is the one breaking-looking change and both call sites must be updated together in Task 1.
- The favorite star icon replaces the type icon completely (no combined color+star, no separate "approximate favorite" variant) — per approved spec.
- Favorite star color: `#eab308` (gold/yellow). Reuse the exact same 5-point star polygon already used in `AuctionCard.tsx` (`12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26 12,2`) for visual consistency across the app.
- Run all commands from the repo root `/Users/luthkimak/Desktop/Bidland` unless noted otherwise.

---

## Task 1: Change `toggleFavorite` to take an auction id

**Files:**
- Modify: `frontend/src/components/AuctionCard.tsx:31-35` (Props interface), `frontend/src/components/AuctionCard.tsx:66-85` (button onClick)
- Modify: `frontend/src/pages/Search.tsx:90-119` (`toggleFavorite` function), `frontend/src/pages/Search.tsx:136-142` (AuctionCard usage — no change needed here since `toggleFavorite` is still passed by reference, but verify it still type-checks)

**Interfaces:**
- Produces: `toggleFavorite(auctionId: string): Promise<void>` in `Search.tsx` — this is what Task 3 will pass into `AuctionMap` as the `onToggleFavorite` prop.
- Produces: `AuctionCard` prop `onToggleFavorite?: (auctionId: string) => void`

Pins (`PinData`) only carry an `id`, not a full `Auction` object, so the map can't call a function that expects `Auction`. Since `toggleFavorite` today only ever reads `auction.id`, narrowing the parameter to `auctionId: string` lets both `AuctionCard` and the map call it identically.

- [x] **Step 1: Update `AuctionCard.tsx` prop type and call site**

In `frontend/src/components/AuctionCard.tsx`, change:

```tsx
interface Props {
  auction: Auction
  isFavorited?: boolean
  onToggleFavorite?: (auction: Auction) => void
}
```

to:

```tsx
interface Props {
  auction: Auction
  isFavorited?: boolean
  onToggleFavorite?: (auctionId: string) => void
}
```

And change the button's `onClick` handler from:

```tsx
onClick={async () => {
  setPending(true)
  try { await onToggleFavorite(auction) } finally { setPending(false) }
}}
```

to:

```tsx
onClick={async () => {
  setPending(true)
  try { await onToggleFavorite(auction.id) } finally { setPending(false) }
}}
```

- [x] **Step 2: Update `toggleFavorite` in `Search.tsx`**

In `frontend/src/pages/Search.tsx`, change the function signature and every internal use of `auction.id` to `auctionId`:

```tsx
async function toggleFavorite(auctionId: string) {
  setFavError(null)
  try {
    const { data } = await supabase.auth.getSession()
    if (!data.session) {
      navigate('/auth')
      return
    }
    if (favoriteIds.has(auctionId)) {
      const favs = await apiClient.listFavorites()
      const fav = favs.find(f => f.auction_id === auctionId)
      if (fav) {
        await apiClient.deleteFavorite(fav.id)
        setFavoriteIds(prev => { const s = new Set(prev); s.delete(auctionId); return s })
      }
    } else {
      await apiClient.createFavorite(auctionId)
      setFavoriteIds(prev => new Set([...prev, auctionId]))
    }
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number } })?.response?.status
    console.error('toggleFavorite error:', err)
    if (status === 401 || status === 403) {
      setFavError('Sessão expirada. Faça login novamente.')
      setTimeout(() => navigate('/auth'), 2000)
    } else {
      setFavError(`Erro ao salvar favorito (${status ?? 'verifique o console'}).`)
    }
  }
}
```

The `<AuctionCard onToggleFavorite={toggleFavorite} .../>` usage at line 141 needs no textual change — it already passes the function by reference, and the new signature matches the updated `AuctionCard` prop type.

- [x] **Step 3: Type-check and lint**

```bash
cd frontend && npm run build
```
Expected: builds successfully, no TypeScript errors (specifically no mismatch between `AuctionCard`'s `onToggleFavorite` prop and `toggleFavorite`'s signature).

```bash
cd frontend && npm run lint
```
Expected: no new lint errors.

- [x] **Step 4: Commit**

```bash
git add frontend/src/components/AuctionCard.tsx frontend/src/pages/Search.tsx
git commit -m "refactor: toggleFavorite takes auctionId instead of full Auction object"
```

---

## Task 2: Add gold star icon and legend entry to `AuctionMap`

**Files:**
- Modify: `frontend/src/components/AuctionMap.tsx:148-172` (icon factory + `ICONS` lookup), `frontend/src/components/AuctionMap.tsx:288-308` (legend)

**Interfaces:**
- Consumes: nothing new (self-contained within `AuctionMap.tsx`)
- Produces: `ICONS.favorite: L.DivIcon` — consumed by Task 3's marker icon selection logic.

- [x] **Step 1: Add `makeStarIcon` next to the existing `makeIcon`**

In `frontend/src/components/AuctionMap.tsx`, right after the closing of `makeIcon` (after line 161, before the `ICONS` object), add:

```tsx
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
```

- [x] **Step 2: Register the icon in `ICONS`**

Change:

```tsx
const ICONS: Record<string, L.DivIcon> = {
  tax_deed:              makeIcon('#2563eb'),
  tax_lien:              makeIcon('#16a34a'),
  foreclosure:           makeIcon('#ea580c'),
  default:               makeIcon('#6b7280'),
  tax_deed_approx:       makeIcon('#2563eb', true),
  tax_lien_approx:       makeIcon('#16a34a', true),
  foreclosure_approx:    makeIcon('#ea580c', true),
  default_approx:        makeIcon('#6b7280', true),
}
```

to:

```tsx
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
```

- [x] **Step 3: Add a "Favorito" row to the legend**

In the legend block at the bottom of `AuctionMap.tsx` (currently lines 288-308), add a new row for favorites between the `LEGEND.map(...)` block and the existing "Localiz. aproximada" row. Change:

```tsx
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
```

- [x] **Step 4: Type-check and lint**

```bash
cd frontend && npm run build
```
Expected: builds successfully, no TypeScript errors.

```bash
cd frontend && npm run lint
```
Expected: no new lint errors.

- [x] **Step 5: Commit**

```bash
git add frontend/src/components/AuctionMap.tsx
git commit -m "feat: add gold star icon and legend entry for favorited map pins"
```

---

## Task 3: Wire favorite state into `AuctionMap` and select the star icon

**Files:**
- Modify: `frontend/src/components/AuctionMap.tsx:174-176` (Props interface), `frontend/src/components/AuctionMap.tsx:178` (component signature), `frontend/src/components/AuctionMap.tsx:224` (icon selection)
- Modify: `frontend/src/pages/Search.tsx:153` (pass new props)

**Interfaces:**
- Consumes: `toggleFavorite(auctionId: string): Promise<void>` and `favoriteIds: Set<string>` from `Search.tsx` (Task 1).
- Consumes: `ICONS.favorite` from Task 2.
- Produces: `AuctionMap` props `favoriteIds: Set<string>` and `onToggleFavorite: (auctionId: string) => void` — consumed by Task 4's popup button.

- [x] **Step 1: Extend `AuctionMap`'s Props interface and signature**

Change:

```tsx
interface Props {
  filters: AuctionFilters
}
```

to:

```tsx
interface Props {
  filters: AuctionFilters
  favoriteIds: Set<string>
  onToggleFavorite: (auctionId: string) => void
}
```

And change:

```tsx
export default function AuctionMap({ filters }: Props) {
```

to:

```tsx
export default function AuctionMap({ filters, favoriteIds, onToggleFavorite }: Props) {
```

(TypeScript will flag `onToggleFavorite` as unused until Task 4 uses it in the popup — that's expected and resolved in the next task. If `npm run build` fails on this due to `noUnusedParameters`, that's fine to leave failing until Task 4 in the same work session; do not silence it with an eslint-disable comment.)

- [x] **Step 2: Select `ICONS.favorite` for favorited pins**

Change the marker's `icon` prop from:

```tsx
icon={pin.approximate ? (ICONS[`${pin.type}_approx`] ?? ICONS.default_approx) : (ICONS[pin.type] ?? ICONS.default)}
```

to:

```tsx
icon={
  favoriteIds.has(pin.id)
    ? ICONS.favorite
    : pin.approximate ? (ICONS[`${pin.type}_approx`] ?? ICONS.default_approx) : (ICONS[pin.type] ?? ICONS.default)
}
```

- [x] **Step 3: Pass the new props from `Search.tsx`**

In `frontend/src/pages/Search.tsx`, change:

```tsx
<AuctionMap filters={filters} />
```

to:

```tsx
<AuctionMap filters={filters} favoriteIds={favoriteIds} onToggleFavorite={toggleFavorite} />
```

- [x] **Step 4: Type-check and lint**

```bash
cd frontend && npm run build
```
Expected: builds successfully. If it fails specifically because `onToggleFavorite` is unused, that confirms Task 4 is needed next — proceed to Task 4 before treating this as a blocking failure.

- [x] **Step 5: Commit**

```bash
git add frontend/src/components/AuctionMap.tsx frontend/src/pages/Search.tsx
git commit -m "feat: render gold star icon on map for favorited auctions"
```

---

## Task 4: Add "remove favorite" button to the popup

**Files:**
- Modify: `frontend/src/components/AuctionMap.tsx:266-281` (inside the `<Popup>`, after the existing "Ver detalhes" button)

**Interfaces:**
- Consumes: `favoriteIds` and `onToggleFavorite` props from Task 3.

- [x] **Step 1: Add the button after "Ver detalhes →"**

In `frontend/src/components/AuctionMap.tsx`, inside the `<Popup>` body, change:

```tsx
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
```

to:

```tsx
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
```

- [x] **Step 2: Type-check and lint**

```bash
cd frontend && npm run build
```
Expected: builds successfully, no TypeScript errors, no unused-variable errors (this step is what makes `onToggleFavorite` from Task 3 used).

```bash
cd frontend && npm run lint
```
Expected: no new lint errors.

- [x] **Step 3: Commit**

```bash
git add frontend/src/components/AuctionMap.tsx
git commit -m "feat: add remove-favorite button to map marker popup"
```

---

## Task 5: Manual browser verification

**Files:** none (verification only, no code changes)

**Interfaces:** none — exercises the full feature end-to-end as a real user would.

- [x] **Step 1: Start the frontend dev server**

```bash
cd frontend && npm run dev
```
Expected: Vite dev server starts, prints a local URL (typically `http://localhost:5173`).

- [x] **Step 2: Log in and favorite an auction from the list**

In a browser, navigate to the app, log in with a test account, go to the Search page. In the results list on the left, click the star/heart button on an `AuctionCard` to favorite an auction that has a visible marker on the map (pick one with a known address/county so it's easy to spot).

Expected: the button fills in (existing behavior, unchanged).

- [x] **Step 3: Confirm the marker turns into a gold star**

Locate that same auction's marker on the map (pan/zoom if needed, or use the popup from the card if one exists).

Expected: the marker now renders as a gold 5-point star instead of the colored pin shape for its type.

- [x] **Step 4: Confirm the legend shows the new "Favorito" entry**

Expected: the bottom-left legend box shows a "Favorito" row with a small gold star, above the "Localiz. aproximada" row.

- [x] **Step 5: Remove the favorite from the map popup**

Click the gold star marker to open its popup.

Expected: popup shows the existing "Ver detalhes →" button plus a new outlined "★ Remover dos favoritos" button.

Click "★ Remover dos favoritos".

Expected: the marker reverts to its type-colored pin icon (no page reload needed — this is the same optimistic `favoriteIds` state update already used elsewhere). Re-open the results list and confirm the corresponding `AuctionCard`'s favorite button also shows as un-favorited (since both read from the same `favoriteIds` state).

- [x] **Step 6: Confirm non-favorited markers are unaffected**

Expected: all other markers still render with their normal type-based pin icons (blue/green/orange), unchanged.

No commit for this task — if any step fails, return to the relevant earlier task, fix, and re-run its build/lint check before re-verifying here.

---

## Self-Review

**Spec coverage:**
- ✅ Refactor `toggleFavorite` to accept `auctionId` (Task 1) — spec section "Mudanças #1"
- ✅ New `favoriteIds`/`onToggleFavorite` props on `AuctionMap` (Task 3) — spec section "Mudanças #2"
- ✅ Gold star `L.divIcon` added to `ICONS` (Task 2) — spec section "Mudanças #3"
- ✅ Icon selection overrides type/approximate icon when favorited (Task 3) — spec section "Mudanças #4"
- ✅ "Remover dos favoritos" button in popup (Task 4) — spec section "Mudanças #5"
- ✅ Legend gains a "Favorito" entry (Task 2) — spec section "Mudanças #6"
- ✅ Manual verification plan (Task 5) — spec "Testes" section

**Placeholder scan:** No TBD/TODO; all code blocks are complete and copy-pasteable.

**Type consistency:** `toggleFavorite(auctionId: string)` (Task 1) matches `AuctionCard`'s `onToggleFavorite?: (auctionId: string) => void` (Task 1) and `AuctionMap`'s `onToggleFavorite: (auctionId: string) => void` (Task 3) — same signature used everywhere. `favoriteIds: Set<string>` is identical in `Search.tsx` (pre-existing) and the new `AuctionMap` prop (Task 3). `ICONS.favorite` (Task 2) is the exact key referenced in Task 3's selection logic and nowhere else.
