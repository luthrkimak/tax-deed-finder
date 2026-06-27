# BidLand Design Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refinar visualmente os 4 componentes principais (Navbar, FilterBar, AuctionCard, Dashboard) seguindo direção Clean/SaaS moderno, mantendo paleta navy `#002868` + vermelho `#BF0A30`.

**Architecture:** Mudanças puramente visuais em componentes existentes — sem nova lógica, sem novos arquivos, sem mudança de estrutura de páginas. Cada task é independente e commitável sozinha.

**Tech Stack:** React, TypeScript, Tailwind CSS, react-router-dom (`useLocation` para link ativo)

## Global Constraints

- Paleta: navy `#002868`, vermelho `#BF0A30` — não introduzir novas cores primárias
- Tailwind para classes utilitárias; inline style só quando Tailwind não suportar (ex: `var(--navy)`)
- Não alterar lógica de negócio, apenas estilos e estrutura visual
- Não alterar Auth.tsx, AuctionDetail.tsx, AuctionMap.tsx

---

### Task 1: Navbar — link ativo + logout refinado

**Files:**
- Modify: `frontend/src/components/Navbar.tsx`

**Interfaces:**
- Consumes: `useLocation` de `react-router-dom` (já instalado)
- Produces: Navbar com link ativo destacado e logout como botão com borda

- [ ] **Step 1: Adicionar `useLocation` e detectar rota ativa**

Substituir o import atual:
```tsx
import { Link, useNavigate } from 'react-router-dom'
```
Por:
```tsx
import { Link, useNavigate, useLocation } from 'react-router-dom'
```

Dentro do componente, logo após `const { lang, setLang, t } = useI18n()`:
```tsx
const location = useLocation()
function isActive(path: string) {
  return location.pathname === path
}
function navLink(path: string) {
  return `px-3 py-1.5 rounded-md text-sm transition-colors ${
    isActive(path)
      ? 'bg-white/15 text-white font-medium'
      : 'text-blue-200 hover:text-white hover:bg-white/10'
  }`
}
```

- [ ] **Step 2: Atualizar os links na navbar**

Substituir o bloco de links (linhas 29–35 atuais) por:
```tsx
{session && (
  <Link to="/dashboard" className={navLink('/dashboard')}>{t.nav_dashboard}</Link>
)}
<Link to="/search" className={navLink('/search')}>{t.nav_search}</Link>
<Link to="/favorites" className={navLink('/favorites')}>{t.nav_favorites}</Link>
<Link to="/alerts" className={navLink('/alerts')}>{t.nav_alerts}</Link>
<Link to="/counties" className={navLink('/counties')}>{t.nav_counties}</Link>
```

- [ ] **Step 3: Adicionar separador e refinar logout**

Substituir o bloco `ml-auto` (div final com lang selector + logout) por:
```tsx
<div className="ml-auto flex items-center gap-3">
  {/* Language selector */}
  <div className="flex items-center gap-1 bg-white/10 rounded px-2 py-1">
    {LANG_OPTIONS.map(opt => (
      <button
        key={opt.value}
        onClick={() => setLang(opt.value as Lang)}
        title={opt.label}
        className={`text-sm px-1.5 py-0.5 rounded transition-all ${
          lang === opt.value
            ? 'bg-white text-[#002868] font-bold'
            : 'text-blue-200 hover:text-white'
        }`}
      >
        {opt.flag} {opt.value.toUpperCase()}
      </button>
    ))}
  </div>

  {/* Separador */}
  <span className="w-px h-4 bg-white/20" />

  {session ? (
    <button
      onClick={signOut}
      className="text-sm text-blue-200 hover:text-white border border-white/20 hover:border-white/40 px-3 py-1.5 rounded-md transition-colors"
    >
      {t.nav_logout}
    </button>
  ) : (
    <Link
      to="/auth"
      style={{ backgroundColor: 'var(--red)' }}
      className="text-sm text-white px-4 py-1.5 rounded font-medium hover:opacity-90 transition-opacity"
    >
      {t.nav_login}
    </Link>
  )}
</div>
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/Navbar.tsx
git commit -m "style: refine Navbar — active link highlight, logout button border"
```

---

### Task 2: FilterBar — inputs mais limpos, botão navy

**Files:**
- Modify: `frontend/src/components/FilterBar.tsx`
- Modify: `frontend/src/pages/Search.tsx` (contador de resultados)

**Interfaces:**
- Produces: FilterBar com visual mais leve; contador de resultados destacado

- [ ] **Step 1: Atualizar classes base dos selects/inputs**

Substituir as constantes de classe (linhas 55–56):
```tsx
const selectClass = "border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-[#002868] focus:ring-1 focus:ring-[#002868]/20 bg-white"
const inputClass  = "border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-[#002868] focus:ring-1 focus:ring-[#002868]/20 bg-white"
```

- [ ] **Step 2: Atualizar labels para gray-400**

Substituir todas as ocorrências de `text-gray-500 mb-1` nas labels por `text-gray-400 mb-1`.

São 8 labels no form — fazer replace_all: `"block text-xs font-medium text-gray-500 mb-1"` → `"block text-xs font-medium text-gray-400 mb-1"`

- [ ] **Step 3: Atualizar container e botão**

Substituir a className do `<form>`:
```tsx
<form onSubmit={handleSearch} className="bg-white border-b border-gray-100 shadow-sm px-6 py-3 flex flex-wrap gap-3 items-end">
```

Substituir o botão (último elemento do form):
```tsx
<button
  type="submit"
  disabled={loading}
  className="bg-[#002868] text-white px-5 py-1.5 rounded-lg font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
>
  {loading ? t.filter_searching : t.filter_search}
</button>
```

- [ ] **Step 4: Destacar contador de resultados em Search.tsx**

Em `frontend/src/pages/Search.tsx`, substituir:
```tsx
<p className="text-sm text-gray-500">{total.toLocaleString()} {t.search_results}</p>
```
Por:
```tsx
<p className="text-sm text-gray-500">
  <span className="font-semibold text-gray-900">{total.toLocaleString()}</span> {t.search_results}
</p>
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/FilterBar.tsx frontend/src/pages/Search.tsx
git commit -m "style: refine FilterBar — cleaner inputs, navy search button, bolder result count"
```

---

### Task 3: AuctionCard — hierarquia visual com lance em destaque

**Files:**
- Modify: `frontend/src/components/AuctionCard.tsx`

**Interfaces:**
- Produces: Card com `min_bid` como linha de destaque acima do grid de metadados

- [ ] **Step 1: Atualizar container e badge**

Substituir a className do container principal do card:
```tsx
<div className="bg-white border border-gray-100 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
```

Substituir a className do badge de tipo (span com `rounded-full`):
```tsx
className="text-xs font-semibold px-2 py-0.5 rounded-md tracking-wide uppercase"
```

- [ ] **Step 2: Fortalecer o endereço**

Substituir a className do `<Link>` do endereço:
```tsx
className="block text-sm font-bold text-gray-900 hover:underline truncate"
style={{ color: undefined }}
```

O endereço usa `style={{ color: 'var(--navy)' }}` — remover o inline style e usar a classe acima para tornar o texto `text-gray-900` (mais limpo, sem override de cor).

Atenção: o `<Link>` atual tem `style={{ color: 'var(--navy)' }}`. Remover esse style e usar apenas className com `text-gray-900`.

- [ ] **Step 3: Extrair min_bid para linha de destaque**

Substituir o bloco `<div className="mt-3 grid grid-cols-2 gap-2 text-sm">` e todo seu conteúdo por:

```tsx
{auction.min_bid && (
  <div className="mt-3 mb-2">
    <span className="text-xs text-gray-400 uppercase tracking-wide">{t.card_min_bid}</span>
    <p className="text-lg font-bold text-gray-900">{`$${Number(auction.min_bid).toLocaleString()}`}</p>
  </div>
)}
<div className="grid grid-cols-2 gap-2 text-sm mt-2">
  <div>
    <span className="text-xs text-gray-400 uppercase tracking-wide">{t.card_assessed}</span>
    <p className="text-sm font-medium text-gray-700">{auction.assessed_value ? `$${Number(auction.assessed_value).toLocaleString()}` : '—'}</p>
  </div>
  <div>
    <span className="text-xs text-gray-400 uppercase tracking-wide">{t.card_date}</span>
    <p className="text-sm font-medium text-gray-900">
      {auction.auction_date ? relativeDate(auction.auction_date) : '—'}
    </p>
  </div>
  <div>
    <span className="text-xs text-gray-400 uppercase tracking-wide">{t.card_property}</span>
    <p className="text-sm font-medium text-gray-900 capitalize">{auction.property_type || '—'}</p>
  </div>
</div>
```

- [ ] **Step 4: Refinar botão de favorito**

Substituir o `style` do botão de favorito por className:
```tsx
<button
  onClick={async () => {
    setPending(true)
    try { await onToggleFavorite(auction) } finally { setPending(false) }
  }}
  disabled={pending}
  title={isFavorited ? 'Remover favorito' : 'Adicionar favorito'}
  className="flex items-center justify-center flex-shrink-0 hover:bg-gray-50 rounded-lg transition-colors"
  style={{ minWidth: 44, minHeight: 44, background: 'none', border: 'none', cursor: 'pointer', padding: 8 }}
>
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/AuctionCard.tsx
git commit -m "style: refine AuctionCard — min_bid destaque, hierarquia visual, badge rounded-md"
```

---

### Task 4: Dashboard — ícones SVG, paleta consistente, badges contidos

**Files:**
- Modify: `frontend/src/pages/Dashboard.tsx`

**Interfaces:**
- Produces: Dashboard sem emojis, com ícones SVG monocromáticos e paleta navy consistente

- [ ] **Step 1: Definir ícones SVG inline**

Dentro do componente `Dashboard`, antes do `return`, adicionar:

```tsx
const IconHouse = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
    <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"/><polyline points="9 21 9 12 15 12 15 21"/>
  </svg>
)
const IconCalendar = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
)
const IconDollar = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
    <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
  </svg>
)
const IconPin = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
    <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
  </svg>
)
```

- [ ] **Step 2: Atualizar cards de métrica**

Substituir o array de cards de métrica e seu map:

```tsx
{[
  { label: 'Leilões disponíveis', value: stats.total_available.toLocaleString(), Icon: IconHouse },
  { label: 'Próximos 7 dias',     value: stats.next_7_days.toLocaleString(),     Icon: IconCalendar },
  { label: 'Menor lance',          value: stats.min_bid_available ? fmt(stats.min_bid_available) : '—', Icon: IconDollar },
  { label: 'Condados ativos',      value: stats.active_counties.toLocaleString(), Icon: IconPin },
].map(({ label, value, Icon }) => (
  <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 border-t-2 border-t-[#002868]">
    <div className="mb-2"><Icon /></div>
    <div className="text-2xl font-bold text-gray-900">{value}</div>
    <div className="text-xs text-gray-500 mt-1">{label}</div>
  </div>
))}
```

- [ ] **Step 3: Atualizar barra de progresso dos condados**

Substituir `bg-blue-500` por `bg-[#002868]` no div da barra de progresso:
```tsx
<div className="h-full bg-[#002868] rounded-full" style={{ width: `${(count / maxCount) * 100}%` }} />
```

- [ ] **Step 4: Atualizar badge de desconto**

Substituir `<span className="text-lg font-bold text-green-600">{d.discount_pct}% desc.</span>` por:
```tsx
<span className="bg-green-50 text-green-700 rounded-md px-2 py-0.5 text-sm font-semibold">{d.discount_pct}% desc.</span>
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/Dashboard.tsx
git commit -m "style: refine Dashboard — SVG icons, navy progress bar, contained discount badge"
```

---

### Task 5: Deploy

- [ ] **Step 1: Build de verificação**

```bash
cd frontend && npm run build
```
Esperado: sem erros TypeScript, output em `dist/`.

- [ ] **Step 2: Deploy para produção**

```bash
cd frontend && vercel --prod
```
Esperado: URL `https://tax-deed-finder.vercel.app` atualizada.

- [ ] **Step 3: Push para GitHub**

```bash
git push origin main
```
