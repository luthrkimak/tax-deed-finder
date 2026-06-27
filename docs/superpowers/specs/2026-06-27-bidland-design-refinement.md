# BidLand — Design Refinement Spec

**Date:** 2026-06-27  
**Direction:** Clean / SaaS moderno  
**Palette:** Manter navy `#002868` + vermelho `#BF0A30`  
**Scope:** Refinamento cirúrgico (Opção 1) — sem mudança de estrutura de páginas

---

## 1. Navbar (`src/components/Navbar.tsx`)

**Goal:** Link ativo visível, logout mais distinguível, melhor espaçamento.

- Link ativo: detectar rota atual com `useLocation()` e aplicar `bg-white/15 rounded-md` no link correspondente
- Cada link: `px-3 py-1.5 rounded-md text-sm transition-colors` — área de clique maior
- Links inativos: `text-blue-200 hover:text-white hover:bg-white/10`
- Separador visual (`<span>` com `w-px h-4 bg-white/20`) antes da área de logout/login
- Botão logout: `border border-white/20 rounded-md px-3 py-1.5 text-sm text-blue-200 hover:text-white hover:border-white/40` — deixa de ser texto puro

---

## 2. FilterBar (`src/components/FilterBar.tsx`)

**Goal:** Barra mais limpa, menos densa, botão de busca consistente com a paleta.

- Container: `bg-white border-b border-gray-100 shadow-sm px-6 py-3`
- Selects e inputs: `rounded-lg border-gray-200` (antes `rounded border-gray-300`) com `focus:border-[#002868] focus:ring-1 focus:ring-[#002868]/20`
- Labels: `text-xs font-medium text-gray-400 mb-1` (antes `text-gray-500`)
- Botão "Buscar": `bg-[#002868] text-white` — navy ao invés do vermelho; vermelho reservado para CTA da Auth
- Botão estado loading: `opacity-60` com cursor `not-allowed`

**Search page — contador de resultados:**
- `<p>` com resultado: `text-sm font-semibold text-gray-900` + número em destaque, ao invés de `text-sm text-gray-500`

---

## 3. AuctionCard (`src/components/AuctionCard.tsx`)

**Goal:** Hierarquia visual clara — lance mínimo como dado principal, metadados secundários.

- Border: `border-gray-100` (antes `border-gray-200`), `shadow-sm hover:shadow-md`
- Badge de tipo: `rounded-md` ao invés de `rounded-full` — mais sóbrio
- Endereço: `text-sm font-bold text-gray-900` (antes `font-semibold`)
- Lance mínimo (`min_bid`): extrair do grid e mostrar como linha própria acima dele — `text-lg font-bold text-gray-900`; se ausente, omitir a linha
- Grid de metadados: labels em `text-xs text-gray-400 uppercase tracking-wide`, valores em `text-sm font-medium text-gray-700` (antes `font-bold text-gray-900` — muito pesado para metadados)
- Botão favorito: adicionar `hover:bg-gray-50 rounded-lg` ao wrapper do botão

---

## 4. Dashboard (`src/pages/Dashboard.tsx`)

**Goal:** Substituir emojis, paleta consistente, badges mais contidos.

- Cards de métrica: remover emojis; adicionar `border-t-2 border-[#002868]` no topo de cada card — diferencia sem cor de fundo
- Ícones: SVG inline monocromático (`text-gray-400`, 18×18) para cada métrica:
  - Leilões disponíveis → ícone de casa
  - Próximos 7 dias → ícone de calendário
  - Menor lance → ícone de cifrão
  - Condados ativos → ícone de pin
- Barra de progresso "Top condados": `bg-[#002868]` (antes `bg-blue-500`)
- Badge de desconto: `bg-green-50 text-green-700 rounded-md px-2 py-0.5 text-sm font-semibold` (antes texto puro `text-green-600`)
- Títulos de seção: manter uppercase tracking, mas adicionar separador `·` com contexto de estado, ex: `Disponível agora · Florida`

---

## Fora do escopo

- Auth page (já tem design sólido de dois painéis)
- AuctionDetail page
- AuctionMap component
- Responsividade mobile (refinamento futuro)
- Dark mode

---

## Critérios de sucesso

1. Navbar mostra claramente qual página está ativa
2. FilterBar visualmente mais leve que o conteúdo abaixo
3. AuctionCard: lance mínimo é o primeiro dado que o olho encontra
4. Dashboard sem emojis, paleta navy consistente em todos os elementos de destaque
