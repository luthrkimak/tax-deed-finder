# TAx Deed Finder — Improvement Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir geocodificação dos leilões FL, adicionar scrapers TX autenticados, mostrar todos os pins no mapa, ativar email alerts, adicionar clustering de pins e filtro de data.

**Architecture:** Backend FastAPI + Supabase (PostgreSQL). Frontend React + Vite + Tailwind + react-leaflet. Scrapers Playwright. Cada fase é independente e deployável.

**Tech Stack:** Python 3.9, FastAPI, Supabase, Playwright, pypdf, resend. React 18, TypeScript, react-leaflet v4, Leaflet.

## Global Constraints

- Python venv: `backend/.venv` — ativar com `source backend/.venv/bin/activate`
- Backend roda em: `cd backend && uvicorn api.main:app --reload --port 8000`
- Frontend roda em: `cd frontend && npm run dev` (porta 5173)
- Todas as rotas do backend ficam em `backend/api/routes/`
- Scrapers herdam de `backend/scrapers/base.py:BaseScraper`
- Supabase project_id: `aqigjdqwqkapiyjbhksu`
- Variáveis de ambiente em `backend/.env` e `frontend/.env`
- Nunca usar `ilike` no Supabase — usar `eq` para filtros de texto exatos

---

## FASE 1 — ALTA PRIORIDADE

---

### Task 1: Corrigir parser de endereço no RealForeclose + re-geocodificar

**Problema:** `realforeclose_base.py:100` monta o endereço como `"{street}, FL {city_zip}"` quando deveria ser `"{street}, {city_zip}, FL"`. Isso faz o Nominatim falhar na geocodificação e usar o centroide do condado.

**Exemplo atual (errado):** `"10070 BRODBECK BLVD, FL ORLANDO, 32832"`
**Esperado:** `"10070 BRODBECK BLVD, ORLANDO, FL 32832"`

**Files:**
- Modify: `backend/scrapers/realforeclose_base.py:100`
- Create: `backend/scripts/regeocode_fl.py`

- [ ] **Step 1: Corrigir a linha 100 de `realforeclose_base.py`**

Substituir:
```python
address = f"{address_line1}, {self.state} {address_line2}".strip(", ") if address_line1 else None
```
Por:
```python
if address_line1:
    if address_line2:
        address = f"{address_line1}, {address_line2}, {self.state}"
    else:
        address = f"{address_line1}, {self.state}"
else:
    address = None
```

- [ ] **Step 2: Verificar manualmente com um scraper**

```bash
cd backend && source .venv/bin/activate && python -c "
import sys; sys.path.insert(0, '.')
from scrapers.florida.orange_county import OrangeCountyScraper
s = OrangeCountyScraper()
records = s.scrape()
for r in records[:3]:
    print(r['address'])
"
```
Esperado: endereços no formato `"10070 BRODBECK BLVD, ORLANDO, 32832, FL"` (cidade antes do estado).

- [ ] **Step 3: Criar script de re-geocodificação em lote**

Criar `backend/scripts/regeocode_fl.py`:
```python
#!/usr/bin/env python3
"""Re-geocode all FL auctions from RealForeclose with the corrected address format."""
import sys, time, requests, re
sys.path.insert(0, '.')
from db.client import get_supabase

sb = get_supabase()
# Get all FL auctions from scrape source (not seed data)
auctions = (
    sb.table("auctions")
    .select("id,address,county,state,source_url")
    .eq("state", "FL")
    .eq("source", "scrape")
    .execute()
    .data
)
print(f"Found {len(auctions)} FL scrape auctions to re-geocode")

headers = {"User-Agent": "TAx-Deed-Finder/1.0 (luthrkimak@gmail.com)"}
COUNTY_CITY = {
    "Orange": "Orlando", "Miami-Dade": "Miami", "Broward": "Fort Lauderdale",
    "Palm Beach": "West Palm Beach", "Hillsborough": "Tampa", "Pinellas": "Clearwater",
    "Duval": "Jacksonville", "Lee": "Fort Myers", "Polk": "Lakeland",
    "Brevard": "Melbourne", "Manatee": "Bradenton", "Marion": "Ocala",
    "Leon": "Tallahassee", "Alachua": "Gainesville", "Sarasota": "Sarasota",
    "Flagler": "Bunnell", "St. Lucie": "Port St. Lucie", "Pasco": "New Port Richey",
    "Indian River": "Vero Beach", "Putnam": "Palatka", "Volusia": "Daytona Beach",
    "Lake": "Tavares", "Osceola": "Kissimmee", "Citrus": "Inverness",
    "Clay": "Green Cove Springs", "Escambia": "Pensacola", "Santa Rosa": "Milton",
    "Nassau": "Fernandina Beach", "Okaloosa": "Crestview", "St. Johns": "St. Augustine",
    "Jackson": "Marianna", "Hendry": "LaBelle", "Hernando": "Brooksville",
    "Highlands": "Sebring", "Monroe": "Key West", "Suwannee": "Live Oak",
    "Washington": "Chipley",
}

ok = miss = 0
for a in auctions:
    addr = (a.get("address") or "").strip()
    county = a.get("county", "")
    state = a.get("state", "FL")
    city = COUNTY_CITY.get(county, county)

    # Clean address
    addr_clean = re.sub(r",\s*FL\s*$", "", addr).strip()
    addr_clean = re.sub(r"(?<=[A-Z]) (?=[A-Z])", "", addr_clean)
    street_only = re.sub(r"\s*(UNIT|APT|#|STE)\s*\S+", "", addr_clean, flags=re.I).strip()
    street_only = re.sub(r"\s+\d+[A-Z]$", "", street_only).strip()

    queries = [
        f"{addr_clean}, {city}, {state}",
        f"{street_only}, {city}, {state}",
    ] if addr_clean else []

    geocoded = False
    for q in queries:
        try:
            r = requests.get(
                "https://nominatim.openstreetmap.org/search",
                params={"q": q, "format": "json", "limit": 1, "countrycodes": "us"},
                headers=headers,
                timeout=10,
            )
            results = r.json()
            if results:
                lat, lng = float(results[0]["lat"]), float(results[0]["lon"])
                sb.table("auctions").update({"lat": lat, "lng": lng}).eq("id", a["id"]).execute()
                print(f"OK  {addr[:55]:<55} ({lat:.4f}, {lng:.4f})")
                ok += 1
                geocoded = True
                break
            time.sleep(1.1)
        except Exception as e:
            print(f"ERR {addr[:40]}: {e}")

    if not geocoded:
        print(f"MISS {addr[:60]}")
        miss += 1

print(f"\nOK={ok} | MISS={miss} | Total={len(auctions)}")
```

- [ ] **Step 4: Rodar o script de re-geocodificação**

```bash
cd backend && source .venv/bin/activate && python scripts/regeocode_fl.py
```
Esperado: maioria marcada `OK`, poucos `MISS`.

- [ ] **Step 5: Adicionar geocodificação automática no `BaseScraper.run()`**

Em `backend/scrapers/base.py`, dentro do método `run()`, após o upsert dos registros, adicionar chamada ao geocoder para os registros novos:
```python
# Geocode new records automatically
if result.new_ids:
    from scrapers.geocoder import geocode_auctions
    geocode_auctions(result.new_ids)
```

- [ ] **Step 6: Criar `backend/scrapers/geocoder.py`**

```python
from __future__ import annotations
import re
import time
import logging
import requests
from db.client import get_supabase

logger = logging.getLogger(__name__)

HEADERS = {"User-Agent": "TAx-Deed-Finder/1.0 (luthrkimak@gmail.com)"}
COUNTY_CITY: dict[str, str] = {
    "Orange": "Orlando", "Miami-Dade": "Miami", "Broward": "Fort Lauderdale",
    "Palm Beach": "West Palm Beach", "Hillsborough": "Tampa", "Pinellas": "Clearwater",
    "Duval": "Jacksonville", "Lee": "Fort Myers", "Polk": "Lakeland",
    "Brevard": "Melbourne", "Manatee": "Bradenton", "Marion": "Ocala",
    "Leon": "Tallahassee", "Alachua": "Gainesville", "Sarasota": "Sarasota",
    "Flagler": "Bunnell", "St. Lucie": "Port St. Lucie", "Pasco": "New Port Richey",
    "Indian River": "Vero Beach", "Putnam": "Palatka", "Volusia": "Daytona Beach",
    "Lake": "Tavares", "Osceola": "Kissimmee", "Citrus": "Inverness",
    "Clay": "Green Cove Springs", "Escambia": "Pensacola", "Santa Rosa": "Milton",
    "Nassau": "Fernandina Beach", "Okaloosa": "Crestview", "St. Johns": "St. Augustine",
    "Jackson": "Marianna", "Hendry": "LaBelle", "Hernando": "Brooksville",
    "Highlands": "Sebring", "Monroe": "Key West", "Suwannee": "Live Oak",
    "Washington": "Chipley", "Dallas": "Dallas", "Travis": "Austin",
    "Fulton": "Atlanta",
}

def _nominatim(query: str) -> tuple[float, float] | None:
    try:
        r = requests.get(
            "https://nominatim.openstreetmap.org/search",
            params={"q": query, "format": "json", "limit": 1, "countrycodes": "us"},
            headers=HEADERS,
            timeout=10,
        )
        results = r.json()
        if results:
            return float(results[0]["lat"]), float(results[0]["lon"])
    except Exception as e:
        logger.warning("Nominatim error for %r: %s", query, e)
    return None

def geocode_auctions(auction_ids: list[str]) -> None:
    if not auction_ids:
        return
    sb = get_supabase()
    rows = sb.table("auctions").select("id,address,county,state").in_("id", auction_ids).execute().data
    for row in rows:
        addr = (row.get("address") or "").strip()
        county = row.get("county", "")
        state = row.get("state", "")
        city = COUNTY_CITY.get(county, county)
        addr_clean = re.sub(r",\s*[A-Z]{2}\s*$", "", addr).strip()
        addr_clean = re.sub(r"(?<=[A-Z]) (?=[A-Z])", "", addr_clean)
        street_only = re.sub(r"\s*(UNIT|APT|#|STE)\s*\S+", "", addr_clean, flags=re.I).strip()
        coords = None
        for q in [f"{addr_clean}, {city}, {state}", f"{street_only}, {city}, {state}"]:
            coords = _nominatim(q)
            time.sleep(1.1)
            if coords:
                break
        if coords:
            sb.table("auctions").update({"lat": coords[0], "lng": coords[1]}).eq("id", row["id"]).execute()
            logger.info("Geocoded %s → %s", row.get("address", ""), coords)
        else:
            logger.warning("Could not geocode: %s", row.get("address", ""))
```

- [ ] **Step 7: Verificar que novos leilões ficam com lat/lng após scrape**

```bash
cd backend && source .venv/bin/activate && python -c "
import sys; sys.path.insert(0, '.')
from scrapers.florida.orange_county import OrangeCountyScraper
r = OrangeCountyScraper().run()
print('new_ids:', r.new_ids)
# Check coords in DB
from db.client import get_supabase
sb = get_supabase()
if r.new_ids:
    rows = sb.table('auctions').select('address,lat,lng').in_('id', r.new_ids).execute().data
    for row in rows:
        print(row['address'], '→', row.get('lat'), row.get('lng'))
"
```

- [ ] **Step 8: Commit**

```bash
cd "/Users/luthkimak/Desktop/TAx deed"
git add backend/scrapers/realforeclose_base.py backend/scrapers/base.py backend/scrapers/geocoder.py backend/scripts/regeocode_fl.py
git commit -m "fix: corrigir formato de endereço RealForeclose e geocodificação automática de novos leilões"
```

---

### Task 2: Scrapers TX via RealAuction (login autenticado)

**Contexto:** Harris, Tarrant, Bexar, Collin, Denton usam `https://{county}.realforeclose.com` → redireciona para RealAuction, que requer login. Cada condado tem sua instância separada. O usuário precisa criar contas gratuitas de bidder em cada um.

**URLs por condado:**
- Harris: `https://harris.realforeclose.com` → login em `www.realauction.com`
- Tarrant: `https://tarrant.realforeclose.com`
- Bexar: `https://bexar.realforeclose.com`
- Collin: `https://collin.realforeclose.com`
- Denton: `https://denton.realforeclose.com`

**Files:**
- Create: `backend/scrapers/realauction_base.py`
- Create: `backend/scrapers/texas/harris_county.py`
- Create: `backend/scrapers/texas/tarrant_county.py`
- Create: `backend/scrapers/texas/bexar_county.py`
- Modify: `backend/scheduler.py`
- Modify: `backend/.env` (adicionar credenciais por condado)

- [ ] **Step 1: Usuário cria contas gratuitas de bidder**

Acessar cada URL e clicar em "Register" / "Bidder Registration":
1. `https://harris.realforeclose.com` → registrar com email/senha
2. `https://tarrant.realforeclose.com`
3. `https://bexar.realforeclose.com`
4. `https://collin.realforeclose.com`
5. `https://denton.realforeclose.com`

Guardar as credenciais (mesmo email/senha em todos pode funcionar).

- [ ] **Step 2: Adicionar credenciais ao `backend/.env`**

```
REALAUCTION_EMAIL=seu@email.com
REALAUCTION_PASSWORD=suasenha
```

- [ ] **Step 3: Criar `backend/scrapers/realauction_base.py`**

```python
from __future__ import annotations
import os
import re
from datetime import datetime
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright
from scrapers.base import BaseScraper

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"

class RealAuctionScraper(BaseScraper):
    """Base for counties hosted on RealAuction platform (requires bidder login)."""
    base_url: str          # e.g. "https://harris.realforeclose.com"
    auction_type: str = "foreclosure"

    def _get_html(self) -> str:
        email = os.environ["REALAUCTION_EMAIL"]
        password = os.environ["REALAUCTION_PASSWORD"]
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page(user_agent=UA)
            page.goto(self.base_url, timeout=30000)
            page.wait_for_timeout(3000)
            # Fill login form
            page.fill('input[name="loginName"]', email)
            page.fill('input[name="password"]', password)
            page.click('div[id="LogButton"]')
            page.wait_for_timeout(4000)
            # Navigate to auction preview
            page.goto(
                f"{self.base_url}/index.cfm?zaction=AUCTION&Zmethod=PREVIEW",
                timeout=30000,
            )
            page.wait_for_timeout(5000)
            html = page.content()
            browser.close()
        return html

    @staticmethod
    def _parse_date(value: str) -> str | None:
        for fmt in ("%m/%d/%Y %I:%M %p", "%m/%d/%Y"):
            try:
                return datetime.strptime(value.strip().split(" ET")[0].strip(), fmt).date().isoformat()
            except ValueError:
                continue
        return None

    @staticmethod
    def _parse_currency(value: str) -> float | None:
        cleaned = re.sub(r"[^\d.]", "", value)
        return float(cleaned) if cleaned else None

    def _get_cell(self, row, label: str) -> str:
        for td in row.find_all("td", class_="AD_LBL"):
            if label.lower() in td.get_text(strip=True).lower():
                dta = td.find_next_sibling("td", class_="AD_DTA")
                return dta.get_text(strip=True) if dta else ""
        return ""

    def parse(self, html: str) -> list[dict]:
        import hashlib
        soup = BeautifulSoup(html, "lxml")
        items = soup.find_all(class_="AUCTION_ITEM")
        records = []
        for item in items:
            date_el = item.find(class_="ASTAT_MSGB")
            auction_date = self._parse_date(date_el.get_text(strip=True)) if date_el else None
            # Find all table rows
            rows = item.find_all("tr")
            parcel_id = address_line1 = address_line2 = assessed_raw = judgment_raw = ""
            for row in rows:
                text = row.get_text(" ", strip=True).lower()
                if "parcel id" in text:
                    link = row.find("a", href=True)
                    if link:
                        m = re.search(r"[=/]([0-9\-]{6,})", link.get("href", ""))
                        parcel_id = m.group(1) if m else row.find("td", class_="AD_DTA").get_text(strip=True) if row.find("td", class_="AD_DTA") else ""
                elif "property address" in text:
                    tds = row.find_all("td", class_="AD_DTA")
                    if tds:
                        address_line1 = tds[0].get_text(strip=True)
                        if len(tds) > 1:
                            address_line2 = tds[1].get_text(strip=True)
                elif "assessed value" in text:
                    assessed_raw = self._get_cell(row, "Assessed Value")
                elif "final judgment" in text:
                    judgment_raw = self._get_cell(row, "Final Judgment")

            if address_line1:
                address = f"{address_line1}, {address_line2}, {self.state}" if address_line2 else f"{address_line1}, {self.state}"
            else:
                address = None

            if not parcel_id:
                key = f"{address or ''}-{self.county}-{self.state}"
                parcel_id = f"RA-{hashlib.md5(key.encode()).hexdigest()[:12]}"

            records.append({
                "type": self.auction_type,
                "status": "upcoming",
                "state": self.state,
                "county": self.county,
                "address": address,
                "parcel_id": parcel_id or None,
                "min_bid": self._parse_currency(judgment_raw) if judgment_raw else None,
                "assessed_value": self._parse_currency(assessed_raw) if assessed_raw else None,
                "auction_date": auction_date,
                "source": "scrape",
                "source_url": self.base_url,
            })
        return records

    def scrape(self) -> list[dict]:
        html = self._get_html()
        self.sleep()
        return self.parse(html)
```

- [ ] **Step 4: Criar scrapers individuais TX**

`backend/scrapers/texas/harris_county.py`:
```python
from scrapers.realauction_base import RealAuctionScraper

class HarrisCountyScraper(RealAuctionScraper):
    state = "TX"
    county = "Harris"
    source_name = "harris_county_tx"
    base_url = "https://harris.realforeclose.com"
    auction_type = "foreclosure"
```

`backend/scrapers/texas/tarrant_county.py`:
```python
from scrapers.realauction_base import RealAuctionScraper

class TarrantCountyScraper(RealAuctionScraper):
    state = "TX"
    county = "Tarrant"
    source_name = "tarrant_county_tx"
    base_url = "https://tarrant.realforeclose.com"
    auction_type = "foreclosure"
```

`backend/scrapers/texas/bexar_county.py`:
```python
from scrapers.realauction_base import RealAuctionScraper

class BexarCountyScraper(RealAuctionScraper):
    state = "TX"
    county = "Bexar"
    source_name = "bexar_county_tx"
    base_url = "https://bexar.realforeclose.com"
    auction_type = "foreclosure"
```

- [ ] **Step 5: Adicionar ao scheduler**

Em `backend/scheduler.py`, adicionar:
```python
from scrapers.texas.harris_county import HarrisCountyScraper
from scrapers.texas.tarrant_county import TarrantCountyScraper
from scrapers.texas.bexar_county import BexarCountyScraper
```
E ao array `SCRAPERS`:
```python
HarrisCountyScraper,
TarrantCountyScraper,
BexarCountyScraper,
```

- [ ] **Step 6: Testar manualmente Harris County**

```bash
cd backend && source .venv/bin/activate && python -c "
import sys; sys.path.insert(0, '.')
from scrapers.texas.harris_county import HarrisCountyScraper
s = HarrisCountyScraper()
records = s.scrape()
print(f'Found: {len(records)}')
for r in records[:3]:
    print(r['address'], r['auction_date'])
"
```
Esperado: lista de leilões do Harris County.

- [ ] **Step 7: Commit**

```bash
git add backend/scrapers/realauction_base.py backend/scrapers/texas/harris_county.py backend/scrapers/texas/tarrant_county.py backend/scrapers/texas/bexar_county.py backend/scheduler.py
git commit -m "feat: scrapers TX autenticados (Harris, Tarrant, Bexar) via RealAuction"
```

---

## FASE 2 — MÉDIA PRIORIDADE

---

### Task 3: Mapa mostra todos os pins (não só a página atual)

**Problema:** `AuctionMap` recebe `auctions` do `Search.tsx` que são os 20 da página atual. Se há 227 leilões, só 20 pins aparecem.

**Solução:** Novo endpoint `/auctions/pins` retorna lat/lng/type de todos os leilões (sem paginação, dados mínimos). O mapa busca esse endpoint independentemente.

**Files:**
- Modify: `backend/api/routes/auctions.py`
- Modify: `frontend/src/lib/api.ts`
- Modify: `frontend/src/components/AuctionMap.tsx`
- Modify: `frontend/src/pages/Search.tsx`

- [ ] **Step 1: Adicionar endpoint `/auctions/pins` no backend**

Em `backend/api/routes/auctions.py`, antes da rota `/{auction_id}`, adicionar:
```python
@router.get("/pins")
def get_pins(
    state: Optional[str] = Query(None),
    county: Optional[str] = Query(None),
    type: Optional[AuctionType] = Query(None),
    property_type: Optional[PropertyType] = Query(None),
    min_bid: Optional[Decimal] = Query(None),
    max_bid: Optional[Decimal] = Query(None),
):
    """Returns lat/lng/type for all matching auctions — used by map (no pagination)."""
    sb = get_supabase()
    query = sb.table("auctions").select("id,lat,lng,type,address,min_bid").not_.is_("lat", "null")
    if state:
        query = query.eq("state", state.upper())
    if county:
        query = query.eq("county", county)
    if type:
        query = query.eq("type", type)
    if property_type:
        query = query.eq("property_type", property_type)
    if min_bid is not None:
        query = query.gte("min_bid", float(min_bid))
    if max_bid is not None:
        query = query.lte("min_bid", float(max_bid))
    result = query.limit(2000).execute()
    return result.data
```

- [ ] **Step 2: Testar o endpoint**

```bash
curl -s "http://localhost:8000/auctions/pins?state=FL" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d), 'pins'); print(d[0])"
```
Esperado: lista com `id`, `lat`, `lng`, `type`, `address`, `min_bid`.

- [ ] **Step 3: Adicionar `getPins` ao `frontend/src/lib/api.ts`**

```typescript
async getPins(filters: Omit<AuctionFilters, 'page' | 'page_size' | 'date_from' | 'date_to' | 'status' | 'county'> & { county?: string } = {}): Promise<Array<{id:string; lat:number; lng:number; type:string; address:string|null; min_bid:number|null}>> {
  const params = Object.fromEntries(Object.entries(filters).filter(([,v]) => v !== undefined))
  const { data } = await axios.get(`${BASE_URL}/auctions/pins`, { params })
  return data
},
```

- [ ] **Step 4: Modificar `AuctionMap.tsx` para buscar pins independentemente**

```typescript
import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Popup, CircleMarker } from 'react-leaflet'
import type { AuctionFilters } from '../types'
import { apiClient } from '../lib/api'
import 'leaflet/dist/leaflet.css'

// ... (PIN_COLORS e LEGEND como estão)

interface Props {
  filters: AuctionFilters  // recebe filtros em vez de auctions[]
}

export default function AuctionMap({ filters }: Props) {
  const [pins, setPins] = useState<Array<{id:string;lat:number;lng:number;type:string;address:string|null;min_bid:number|null}>>([])
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    const { page, page_size, ...mapFilters } = filters
    apiClient.getPins(mapFilters).then(setPins).catch(() => setPins([]))
  }, [JSON.stringify(filters)])

  // ... resto do componente igual, mas usando `pins` em vez de `auctions`
}
```

- [ ] **Step 5: Atualizar `Search.tsx` para passar `filters` ao mapa**

Em `Search.tsx`, trocar:
```tsx
<AuctionMap auctions={auctions} />
```
Por:
```tsx
<AuctionMap filters={filters} />
```

- [ ] **Step 6: Verificar no browser**

Abrir `http://localhost:5173`, filtrar por FL — o mapa deve mostrar todos os ~200 pins da Flórida, não só 20.

- [ ] **Step 7: Commit**

```bash
git add backend/api/routes/auctions.py frontend/src/lib/api.ts frontend/src/components/AuctionMap.tsx frontend/src/pages/Search.tsx
git commit -m "feat: mapa mostra todos os pins independente da paginação via /auctions/pins"
```

---

### Task 4: Email alerts via Resend

**Contexto:** `backend/notifications.py` já está implementado e funcional. Só precisa de `RESEND_API_KEY` configurado e um domínio verificado no Resend.

**Files:**
- Modify: `backend/.env`

- [ ] **Step 1: Criar conta e configurar Resend**

1. Acessar `https://resend.com` → criar conta gratuita
2. Em "Domains" → adicionar e verificar um domínio (ou usar o domínio de teste `@resend.dev` para testes)
3. Em "API Keys" → criar uma API key
4. Copiar a key

- [ ] **Step 2: Atualizar `backend/.env`**

```
RESEND_API_KEY=re_xxxxxxxxxxxxxxxx
ALERT_FROM_EMAIL=alerts@seudominio.com
```
Para testes sem domínio verificado, usar:
```
ALERT_FROM_EMAIL=onboarding@resend.dev
```

- [ ] **Step 3: Testar envio de email manualmente**

```bash
cd backend && source .venv/bin/activate && python -c "
import sys, os
sys.path.insert(0, '.')
from dotenv import load_dotenv
load_dotenv()
import resend
resend.api_key = os.environ['RESEND_API_KEY']
result = resend.Emails.send({
    'from': os.environ.get('ALERT_FROM_EMAIL', 'onboarding@resend.dev'),
    'to': 'luthrkimak@gmail.com',
    'subject': 'TAx Deed Finder — Teste de alerta',
    'html': '<h2>Funcionando!</h2><p>O sistema de alertas está configurado.</p>',
})
print('Email enviado:', result)
"
```
Esperado: `{'id': 'email_xxxxx'}` sem erro.

- [ ] **Step 4: Criar um alerta no app e rodar o scheduler para testar o fluxo completo**

```bash
cd backend && source .venv/bin/activate && python -c "
import sys
sys.path.insert(0, '.')
from notifications import send_alert_emails
# Pegar IDs de alguns leilões existentes
from db.client import get_supabase
sb = get_supabase()
ids = [r['id'] for r in sb.table('auctions').select('id').limit(3).execute().data]
send_alert_emails(ids)
print('Done')
"
```

- [ ] **Step 5: Commit**

```bash
# Não commitar .env — só documentar o que é necessário
git add backend/.env.example  # se existir, atualizar com RESEND_API_KEY=
git commit -m "docs: documentar variáveis Resend necessárias para alertas de email"
```

---

### Task 5: Mais estados — California e North Carolina

**Contexto:** CA e NC têm muitos condados no diretório. CA usa `{county}.realforeclose.com` igual à FL. NC também.

**Files:**
- Create: `backend/scrapers/california/all_counties.py`
- Create: `backend/scrapers/north_carolina/all_counties.py`
- Modify: `backend/scheduler.py`

- [ ] **Step 1: Verificar condados CA no RealForeclose**

```bash
cd backend && source .venv/bin/activate && python -c "
import sys, time
sys.path.insert(0, '.')
from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup

ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
ca_counties = ['losangeles','sandiego','orangecounty','riverside','sanbernardino','sacramento','alameda','contracosta','fresno','kern','sanmateo','santaclara','ventura','solano','stanislaus','placer','sanjoaquin','santabarbara','tulare','elder']

working = []
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    for county in ca_counties:
        url = f'https://{county}.realforeclose.com/index.cfm?zaction=AUCTION&Zmethod=PREVIEW'
        page = browser.new_page(user_agent=ua)
        try:
            page.goto(url, timeout=10000)
            page.wait_for_timeout(2000)
            soup = BeautifulSoup(page.content(), 'lxml')
            items = soup.find_all(class_='AUCTION_ITEM')
            if 'RealForeclose' in (soup.title.string or ''):
                print(f'OK  {county:<20} items={len(items)}')
                working.append(county)
            else:
                print(f'--- {county}')
        except:
            print(f'ERR {county}')
        page.close()
    browser.close()
print('Working:', working)
"
```

- [ ] **Step 2: Criar `backend/scrapers/california/__init__.py`**

```python
```
(arquivo vazio)

- [ ] **Step 3: Criar `backend/scrapers/california/all_counties.py`**

Baseado no resultado do Step 1, listar apenas os condados confirmados:
```python
from scrapers.realforeclose_base import RealForecloseScraper

CA_COUNTIES: list[tuple[str, str]] = [
    # Preencher com resultados do Step 1
    # ("Los Angeles", "losangeles"),
]

def make_ca_scraper(county_name: str, slug: str):
    return type(
        f"{county_name.replace(' ', '')}Scraper",
        (RealForecloseScraper,),
        {
            "state": "CA",
            "county": county_name,
            "source_name": f"{slug}_ca",
            "base_url": f"https://{slug}.realforeclose.com",
            "auction_type": "both",
        },
    )

CA_SCRAPERS = [make_ca_scraper(n, s) for n, s in CA_COUNTIES]
```

- [ ] **Step 4: Fazer mesmo para NC**

Repetir Steps 1-3 para North Carolina com `nc_counties` e `backend/scrapers/north_carolina/`.

- [ ] **Step 5: Adicionar ao scheduler e testar**

Em `backend/scheduler.py`:
```python
from scrapers.california.all_counties import CA_SCRAPERS
from scrapers.north_carolina.all_counties import NC_SCRAPERS
# Adicionar *CA_SCRAPERS, *NC_SCRAPERS ao array SCRAPERS
```

- [ ] **Step 6: Commit**

```bash
git add backend/scrapers/california/ backend/scrapers/north_carolina/ backend/scheduler.py
git commit -m "feat: scrapers California e North Carolina via RealForeclose"
```

---

## FASE 3 — MELHORIAS DE UX

---

### Task 6: Clustering de pins no mapa

**Problema:** Com 200+ pins, muitos se sobrepõem no mesmo lugar (centroide do condado). Clustering agrupa pins próximos e mostra o número.

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/src/components/AuctionMap.tsx`

- [ ] **Step 1: Instalar react-leaflet-cluster**

```bash
cd frontend && npm install react-leaflet-cluster --legacy-peer-deps
```

- [ ] **Step 2: Importar o CSS do cluster**

Em `frontend/src/components/AuctionMap.tsx`, adicionar no topo:
```typescript
import MarkerClusterGroup from 'react-leaflet-cluster'
import 'react-leaflet-cluster/lib/assets/MarkerCluster.css'
import 'react-leaflet-cluster/lib/assets/MarkerCluster.Default.css'
```

- [ ] **Step 3: Envolver os CircleMarkers no MarkerClusterGroup**

No JSX do `AuctionMap`, envolver os pins:
```tsx
<MarkerClusterGroup chunkedLoading>
  {pins.map(pin => (
    <CircleMarker key={pin.id} /* ... */ />
  ))}
</MarkerClusterGroup>
```

- [ ] **Step 4: Verificar no browser**

Abrir `http://localhost:5173` — pins próximos devem se agrupar em círculos com número. Zoom in deve separar os clusters.

- [ ] **Step 5: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/src/components/AuctionMap.tsx
git commit -m "feat: clustering de pins no mapa com react-leaflet-cluster"
```

---

### Task 7: Filtro de data na busca

**Contexto:** O backend já aceita `date_from` e `date_to` em `/auctions`. Só precisa adicionar os campos no `FilterBar.tsx` e `AuctionFilters`.

**Files:**
- Modify: `frontend/src/components/FilterBar.tsx`
- Modify: `frontend/src/lib/i18n.tsx` (adicionar labels)

- [ ] **Step 1: Adicionar labels de data ao i18n**

Em `frontend/src/lib/i18n.tsx`, nos 3 idiomas, adicionar:
```typescript
// PT
filter_date_from: 'Data início',
filter_date_to:   'Data fim',
// EN
filter_date_from: 'Date from',
filter_date_to:   'Date to',
// ES
filter_date_from: 'Fecha inicio',
filter_date_to:   'Fecha fin',
```

- [ ] **Step 2: Adicionar campos de data ao `FilterBar.tsx`**

Após os campos de Min/Max Bid, adicionar:
```tsx
const [dateFrom, setDateFrom] = useState('')
const [dateTo, setDateTo] = useState('')

// No handleSearch, adicionar:
date_from: dateFrom || undefined,
date_to: dateTo || undefined,

// No JSX, adicionar dois campos date:
<div>
  <label className="block text-xs font-medium text-gray-500 mb-1">{t.filter_date_from}</label>
  <input
    type="date"
    value={dateFrom}
    onChange={e => setDateFrom(e.target.value)}
    className={`${inputClass} w-36`}
  />
</div>
<div>
  <label className="block text-xs font-medium text-gray-500 mb-1">{t.filter_date_to}</label>
  <input
    type="date"
    value={dateTo}
    onChange={e => setDateTo(e.target.value)}
    className={`${inputClass} w-36`}
  />
</div>
```

- [ ] **Step 3: Verificar no browser**

Filtrar por data — `http://localhost:5173` → selecionar data início e fim → clicar Buscar → lista deve filtrar corretamente.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/FilterBar.tsx frontend/src/lib/i18n.tsx
git commit -m "feat: filtro de data de leilão na busca (date_from/date_to)"
```

---

### Task 8: Melhorias de autenticação

**Contexto:** A página `/auth` já existe com Supabase Auth. Melhorias: adicionar confirmação de email, mensagens de erro claras, e loading state.

**Files:**
- Modify: `frontend/src/pages/Auth.tsx`

- [ ] **Step 1: Ler Auth.tsx atual**

```bash
cat "frontend/src/pages/Auth.tsx"
```

- [ ] **Step 2: Adicionar loading state e mensagens de erro melhoradas**

Garantir que `Auth.tsx` tenha:
```tsx
const [loading, setLoading] = useState(false)
const [error, setError] = useState('')
const [message, setMessage] = useState('')

// No signUp:
setLoading(true)
const { error } = await supabase.auth.signUp({ email, password })
if (error) setError(error.message)
else setMessage('Verifique seu email para confirmar o cadastro.')
setLoading(false)

// No signIn:
setLoading(true)
const { error } = await supabase.auth.signInWithPassword({ email, password })
if (error) setError(error.message === 'Invalid login credentials' ? 'Email ou senha incorretos.' : error.message)
setLoading(false)
```

- [ ] **Step 3: Verificar fluxo completo**

1. Cadastrar com email novo → verificar mensagem de confirmação
2. Tentar login com senha errada → verificar mensagem de erro
3. Login com credenciais corretas → redirecionar para `/`

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/Auth.tsx
git commit -m "feat: melhorias de UX na autenticação (loading, erros, confirmação)"
```

---

## Ordem de execução sugerida

```
Fase 1: Task 1 → Task 2 (depende de conta criada pelo usuário)
Fase 2: Task 3 → Task 4 → Task 5
Fase 3: Task 6 → Task 7 → Task 8
```

Tasks 1, 3, 4, 6, 7, 8 são independentes e podem ser feitas sem input externo.
Task 2 requer que o usuário crie contas no RealAuction primeiro.
Task 5 requer verificação de quais condados CA/NC funcionam.
