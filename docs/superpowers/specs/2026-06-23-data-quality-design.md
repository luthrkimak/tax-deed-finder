# Design: Qualidade de Dados — Abordagem A

**Data:** 2026-06-23  
**Status:** Aprovado

## Objetivo

Melhorar a qualidade dos dados do BidLand sem uso de APIs pagas, resolvendo três problemas principais:
1. Pins no lugar errado por geocodificação falha
2. Leilões passados continuando visíveis
3. Leilões cancelados não sendo detectados

---

## Seção 1 — Normalização de endereços

**Problema:** O Nominatim falha com endereços em caixa alta e abreviações (ex: `123 SUNSET BLVD`).

**Solução:** Criar `backend/scrapers/address_normalizer.py` que roda antes do geocoder.

**Responsabilidades:**
- Expandir abreviações: `BLVD→Boulevard`, `DR→Drive`, `RD→Road`, `AVE→Avenue`, `ST→Street`, `HWY→Highway`, `CT→Court`, `LN→Lane`, `PL→Place`, `TER→Terrace`, `CIR→Circle`
- Converter para title case
- Remover sufixos de unidade malformados comuns nos dados FL
- Adicionar estado e país ao query para maior precisão no Nominatim

**Integração:** `geocoder.py` chama `normalize_address(raw)` antes de enviar ao Nominatim.

---

## Seção 2 — Auto-arquivar leilões passados

**Problema:** Leilões com `auction_date` no passado continuam aparecendo como ativos.

**Solução:**
- Adicionar coluna `status TEXT DEFAULT 'active'` na tabela `auctions` no Supabase
- Criar função `archive_past_auctions()` no backend
- Adicionar job no `scheduler.py` rodando diariamente às 00:00 UTC
- Filtrar `status = 'active'` em todas as queries da API (`/auctions`, `/auctions/pins`)

**Estados possíveis:** `active`, `archived`, `cancelled`

---

## Seção 3 — Detecção de leilões cancelados (FL apenas)

**Problema:** Scrapers só inserem novos leilões; nunca verificam cancelamentos na fonte.

**Solução:** Ao final do scrape de cada condado FL, comparar IDs encontrados na fonte com IDs `active` no banco para o mesmo condado + intervalo de datas. Leilões ausentes da fonte recebem `status = 'cancelled'`.

**Escopo:** Orange County e Miami-Dade (scrapers mais maduros). TX e GA fora do escopo.

**Sem nova tabela:** Usa a coluna `status` criada na Seção 2.

---

## Arquivos afetados

| Arquivo | Mudança |
|---|---|
| `backend/scrapers/address_normalizer.py` | Novo |
| `backend/scrapers/geocoder.py` | Chamar normalizador |
| `backend/scrapers/base.py` | Método `get_active_ids_for_county()` |
| `backend/scrapers/florida/orange_county.py` | Detectar cancelados |
| `backend/scrapers/florida/miami_dade.py` | Detectar cancelados |
| `backend/scheduler.py` | Job de auto-archive |
| `backend/api/routes/auctions.py` | Filtro `status = 'active'` |
| Supabase migration | Coluna `status` em `auctions` |

---

## Fora do escopo

- Google Geocoding API (paga)
- Enriquecimento de dados (área, valor avaliado) — próxima iteração
- Detecção de cancelados para TX e GA
