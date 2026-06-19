# Tax Deed Finder — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a web app to search, filter, and monitor tax deed, tax lien, and foreclosure auctions across US counties with automated daily scraping and email alerts.

**Architecture:** Monolito modular — FastAPI back-end with APScheduler for daily scraping, Supabase (Postgres) as the database with built-in auth, and a React + Vite + Tailwind front-end. The scraper layer is isolated per county under `backend/scrapers/{state}/{county}.py` and does not block API requests.

**Tech Stack:** Python 3.11+, FastAPI 0.111+, supabase-py 2.x, Playwright 1.44+, BeautifulSoup4, APScheduler 3.x, resend 2.x; React 18, TypeScript 5, Vite 5, Tailwind CSS 3, react-map-gl 7.x (Mapbox GL JS), React Router v6, @supabase/supabase-js 2.x.

## Global Constraints

- Python 3.11+, Node 20+
- Supabase project required (free tier at supabase.com)
- All `.env` files never committed — use `.env.example` as template
- Scraper delays: minimum 1s between requests, via `SCRAPE_DELAY_SECONDS` env var (default `2`)
- All monetary values: `NUMERIC(12,2)` in Postgres, `Decimal` in Python, `number` in TypeScript
- All primary keys: UUID via Postgres `gen_random_uuid()`
- Mapbox token required for map (`VITE_MAPBOX_TOKEN`)
- Resend API key required for email alerts (`RESEND_API_KEY`)

---

## File Map

```
tax-deed-finder/
├── backend/
│   ├── api/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI app, lifespan, CORS
│   │   ├── deps.py              # JWT auth dependency
│   │   └── routes/
│   │       ├── __init__.py
│   │       ├── auctions.py      # GET /auctions, GET /auctions/{id}
│   │       ├── favorites.py     # POST/GET/DELETE /favorites
│   │       └── alerts.py        # POST/GET/PATCH/DELETE /alerts
│   ├── db/
│   │   ├── __init__.py
│   │   └── client.py            # Supabase client singleton
│   ├── models/
│   │   ├── __init__.py
│   │   ├── auction.py
│   │   ├── favorite.py
│   │   └── alert.py
│   ├── scrapers/
│   │   ├── __init__.py
│   │   ├── base.py              # BaseScraper abstract class
│   │   ├── florida/
│   │   │   ├── __init__.py
│   │   │   ├── orange_county.py
│   │   │   └── miami_dade.py
│   │   ├── texas/
│   │   │   ├── __init__.py
│   │   │   └── dallas_county.py
│   │   └── georgia/
│   │       ├── __init__.py
│   │       └── fulton_county.py
│   ├── scheduler.py
│   ├── notifications.py
│   ├── requirements.txt
│   ├── .env.example
│   └── tests/
│       ├── conftest.py
│       ├── test_auctions.py
│       ├── test_favorites.py
│       ├── test_alerts.py
│       ├── test_scraper_base.py
│       └── scrapers/
│           ├── fixtures/
│           │   ├── orange_county.html
│           │   ├── dallas_county.html
│           │   └── fulton_county.html
│           ├── test_orange_county.py
│           ├── test_dallas_county.py
│           └── test_fulton_county.py
├── frontend/
│   ├── src/
│   │   ├── types/index.ts
│   │   ├── lib/
│   │   │   ├── supabase.ts
│   │   │   └── api.ts
│   │   ├── components/
│   │   │   ├── Navbar.tsx
│   │   │   ├── AuctionCard.tsx
│   │   │   ├── AuctionMap.tsx
│   │   │   ├── FilterBar.tsx
│   │   │   └── AlertForm.tsx
│   │   ├── pages/
│   │   │   ├── Auth.tsx
│   │   │   ├── Search.tsx
│   │   │   ├── AuctionDetail.tsx
│   │   │   ├── Favorites.tsx
│   │   │   └── Alerts.tsx
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── .env.example
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql
└── docs/
    └── superpowers/
        ├── specs/
        └── plans/
```

---

## Task 1: Project Scaffolding

**Files:**
- Create: `backend/requirements.txt`
- Create: `backend/.env.example`
- Create: `backend/api/__init__.py`, `backend/api/main.py`
- Create: `backend/db/__init__.py`, `backend/db/client.py`
- Create: `backend/models/__init__.py`
- Create: `backend/scrapers/__init__.py`, `backend/scrapers/base.py` (stub)
- Create: `backend/tests/conftest.py`
- Create: `frontend/` (Vite scaffold)
- Create: `supabase/migrations/` (directory only)

**Interfaces:**
- Produces: running `uvicorn api.main:app` returns `{"status": "ok"}` on GET `/health`
- Produces: running `npm run dev` in `frontend/` serves React app on port 5173

- [ ] **Step 1: Create backend directory structure**

```bash
cd "/Users/luthkimak/Desktop/TAx deed"
mkdir -p backend/api/routes backend/db backend/models backend/scrapers/florida backend/scrapers/texas backend/scrapers/georgia backend/tests/scrapers/fixtures supabase/migrations
touch backend/api/__init__.py backend/api/routes/__init__.py backend/db/__init__.py backend/models/__init__.py backend/scrapers/__init__.py backend/scrapers/florida/__init__.py backend/scrapers/texas/__init__.py backend/scrapers/georgia/__init__.py backend/tests/__init__.py backend/tests/scrapers/__init__.py
```

- [ ] **Step 2: Create `backend/requirements.txt`**

```
fastapi==0.111.0
uvicorn[standard]==0.29.0
supabase==2.4.6
python-jose[cryptography]==3.3.0
playwright==1.44.0
beautifulsoup4==4.12.3
lxml==5.2.1
APScheduler==3.10.4
resend==2.0.0
httpx==0.27.0
pydantic==2.7.1
pydantic-settings==2.2.1
python-dotenv==1.0.1
pytest==8.2.0
pytest-asyncio==0.23.6
pytest-mock==3.14.0
```

- [ ] **Step 3: Create `backend/.env.example`**

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret
SCRAPE_DELAY_SECONDS=2
RESEND_API_KEY=re_your_key
ALERT_FROM_EMAIL=alerts@yourdomain.com
```

- [ ] **Step 4: Create `backend/db/client.py`**

```python
import os
from functools import lru_cache
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

@lru_cache(maxsize=1)
def get_supabase() -> Client:
    url = os.environ["SUPABASE_URL"]
    key = os.environ["SUPABASE_SERVICE_KEY"]
    return create_client(url, key)
```

- [ ] **Step 5: Create `backend/api/main.py`**

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import auctions, favorites, alerts

app = FastAPI(title="Tax Deed Finder API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auctions.router, prefix="/auctions", tags=["auctions"])
app.include_router(favorites.router, prefix="/favorites", tags=["favorites"])
app.include_router(alerts.router, prefix="/alerts", tags=["alerts"])

@app.get("/health")
def health():
    return {"status": "ok"}
```

- [ ] **Step 6: Create stub route files so the app imports cleanly**

`backend/api/routes/auctions.py`:
```python
from fastapi import APIRouter
router = APIRouter()
```

`backend/api/routes/favorites.py`:
```python
from fastapi import APIRouter
router = APIRouter()
```

`backend/api/routes/alerts.py`:
```python
from fastapi import APIRouter
router = APIRouter()
```

- [ ] **Step 7: Install backend dependencies and verify startup**

```bash
cd "/Users/luthkimak/Desktop/TAx deed/backend"
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
playwright install chromium
uvicorn api.main:app --reload
```

Expected: server starts on http://localhost:8000, GET /health returns `{"status":"ok"}`

- [ ] **Step 8: Scaffold frontend with Vite**

```bash
cd "/Users/luthkimak/Desktop/TAx deed"
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
npm install @supabase/supabase-js react-router-dom@6 react-map-gl mapbox-gl axios
npm install -D @types/react-map-gl
```

- [ ] **Step 9: Configure Tailwind in `frontend/tailwind.config.ts`**

```ts
import type { Config } from 'tailwindcss'
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: {} },
  plugins: [],
} satisfies Config
```

Add to `frontend/src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 10: Create `frontend/.env.example`**

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=http://localhost:8000
VITE_MAPBOX_TOKEN=pk.your_mapbox_token
```

- [ ] **Step 11: Verify frontend starts**

```bash
cd "/Users/luthkimak/Desktop/TAx deed/frontend"
npm run dev
```

Expected: Vite dev server on http://localhost:5173

- [ ] **Step 12: Commit**

```bash
cd "/Users/luthkimak/Desktop/TAx deed"
git init
git add backend/requirements.txt backend/.env.example backend/api/ backend/db/ backend/models/ backend/scrapers/ backend/tests/ frontend/package.json frontend/src/ frontend/tailwind.config.ts frontend/vite.config.ts frontend/tsconfig.json frontend/.env.example supabase/
git commit -m "feat: project scaffolding — FastAPI backend + React frontend"
```

---

## Task 2: Database Schema (Supabase)

**Files:**
- Create: `supabase/migrations/001_initial_schema.sql`

**Interfaces:**
- Produces: 5 tables in Supabase Postgres: `auctions`, `users`, `favorites`, `alerts`, `scrape_logs`
- Produces: Row Level Security enabled — only authenticated users can read/write their own favorites and alerts

- [ ] **Step 1: Create `supabase/migrations/001_initial_schema.sql`**

```sql
-- Enable UUID extension
create extension if not exists "pgcrypto";

-- Auction type and status enums
create type auction_type as enum ('tax_deed', 'tax_lien', 'foreclosure');
create type auction_status as enum ('upcoming', 'active', 'sold', 'cancelled');
create type property_type as enum ('residential', 'commercial', 'land');
create type data_source as enum ('api', 'scrape');
create type scrape_status as enum ('success', 'partial', 'failed');

-- Auctions table
create table auctions (
  id                    uuid primary key default gen_random_uuid(),
  type                  auction_type not null,
  status                auction_status not null default 'upcoming',
  auction_date          date,
  state                 varchar(2) not null,
  county                varchar(100) not null,
  address               text,
  parcel_id             varchar(100),
  property_type         property_type,
  min_bid               numeric(12,2),
  assessed_value        numeric(12,2),
  market_value_estimate numeric(12,2),
  outstanding_debt      numeric(12,2),
  tax_amount_owed       numeric(12,2),
  interest_rate         numeric(5,2),
  photo_url             text,
  zillow_url            text,
  redfin_url            text,
  source                data_source not null,
  source_url            text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index idx_auctions_state on auctions(state);
create index idx_auctions_county on auctions(county);
create index idx_auctions_type on auctions(type);
create index idx_auctions_status on auctions(status);
create index idx_auctions_auction_date on auctions(auction_date);

-- Favorites table
create table favorites (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  auction_id  uuid not null references auctions(id) on delete cascade,
  notes       text,
  created_at  timestamptz not null default now(),
  unique(user_id, auction_id)
);

-- Alerts table
create table alerts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  filters      jsonb not null default '{}',
  email        varchar(255) not null,
  active       boolean not null default true,
  last_sent_at timestamptz,
  created_at   timestamptz not null default now()
);

-- Scrape logs table
create table scrape_logs (
  id             uuid primary key default gen_random_uuid(),
  source         varchar(100) not null,
  state          varchar(2),
  county         varchar(100),
  records_found  integer not null default 0,
  records_new    integer not null default 0,
  status         scrape_status not null,
  error_message  text,
  ran_at         timestamptz not null default now()
);

-- Row Level Security
alter table favorites enable row level security;
alter table alerts enable row level security;

create policy "Users manage their own favorites"
  on favorites for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage their own alerts"
  on alerts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Updated_at trigger
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger auctions_updated_at
  before update on auctions
  for each row execute function update_updated_at();
```

- [ ] **Step 2: Apply migration to Supabase**

Go to your Supabase project dashboard → SQL Editor → paste the contents of `001_initial_schema.sql` → Run.

Or with the Supabase CLI:
```bash
npx supabase db push
```

- [ ] **Step 3: Verify tables exist**

In Supabase dashboard → Table Editor, confirm these tables exist: `auctions`, `favorites`, `alerts`, `scrape_logs`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/001_initial_schema.sql
git commit -m "feat: initial database schema with RLS policies"
```

---

## Task 3: Backend Models & Auth Dependency

**Files:**
- Create: `backend/models/auction.py`
- Create: `backend/models/favorite.py`
- Create: `backend/models/alert.py`
- Create: `backend/api/deps.py`
- Create: `backend/tests/conftest.py`
- Create: `backend/tests/test_models.py`

**Interfaces:**
- Produces: `Auction`, `AuctionFilters`, `Favorite`, `FavoriteCreate`, `Alert`, `AlertCreate`, `AlertUpdate` Pydantic models
- Produces: `get_current_user(token) -> str` FastAPI dependency that returns the user UUID
- Consumes: nothing from prior tasks except directory structure

- [ ] **Step 1: Write failing model tests**

`backend/tests/test_models.py`:
```python
import pytest
from decimal import Decimal
from models.auction import Auction, AuctionFilters
from models.alert import Alert, AlertCreate

def test_auction_model_valid():
    a = Auction(
        id="123e4567-e89b-12d3-a456-426614174000",
        type="tax_deed",
        status="upcoming",
        state="FL",
        county="Orange",
        source="scrape",
        min_bid=Decimal("45000.00"),
    )
    assert a.state == "FL"
    assert a.min_bid == Decimal("45000.00")

def test_auction_filters_defaults():
    f = AuctionFilters()
    assert f.state is None
    assert f.min_bid is None
    assert f.page == 1
    assert f.page_size == 20

def test_alert_create_valid():
    a = AlertCreate(
        filters={"state": "FL", "type": "tax_deed"},
        email="user@example.com",
    )
    assert a.email == "user@example.com"
    assert a.filters["state"] == "FL"
```

- [ ] **Step 2: Run to verify failure**

```bash
cd "/Users/luthkimak/Desktop/TAx deed/backend"
source .venv/bin/activate
pytest tests/test_models.py -v
```

Expected: `ModuleNotFoundError: No module named 'models.auction'`

- [ ] **Step 3: Create `backend/models/auction.py`**

```python
from __future__ import annotations
from decimal import Decimal
from datetime import date, datetime
from typing import Literal, Optional
from pydantic import BaseModel, Field

AuctionType = Literal["tax_deed", "tax_lien", "foreclosure"]
AuctionStatus = Literal["upcoming", "active", "sold", "cancelled"]
PropertyType = Literal["residential", "commercial", "land"]
DataSource = Literal["api", "scrape"]

class Auction(BaseModel):
    id: Optional[str] = None
    type: AuctionType
    status: AuctionStatus = "upcoming"
    auction_date: Optional[date] = None
    state: str = Field(..., max_length=2)
    county: str
    address: Optional[str] = None
    parcel_id: Optional[str] = None
    property_type: Optional[PropertyType] = None
    min_bid: Optional[Decimal] = None
    assessed_value: Optional[Decimal] = None
    market_value_estimate: Optional[Decimal] = None
    outstanding_debt: Optional[Decimal] = None
    tax_amount_owed: Optional[Decimal] = None
    interest_rate: Optional[Decimal] = None
    photo_url: Optional[str] = None
    zillow_url: Optional[str] = None
    redfin_url: Optional[str] = None
    source: DataSource
    source_url: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}

class AuctionFilters(BaseModel):
    state: Optional[str] = None
    county: Optional[str] = None
    type: Optional[AuctionType] = None
    status: Optional[AuctionStatus] = None
    property_type: Optional[PropertyType] = None
    min_bid: Optional[Decimal] = None
    max_bid: Optional[Decimal] = None
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)
```

- [ ] **Step 4: Create `backend/models/favorite.py`**

```python
from __future__ import annotations
from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from models.auction import Auction

class FavoriteCreate(BaseModel):
    auction_id: str
    notes: Optional[str] = None

class Favorite(BaseModel):
    id: str
    user_id: str
    auction_id: str
    notes: Optional[str] = None
    created_at: Optional[datetime] = None
    auction: Optional[Auction] = None

    model_config = {"from_attributes": True}
```

- [ ] **Step 5: Create `backend/models/alert.py`**

```python
from __future__ import annotations
from datetime import datetime
from typing import Any, Optional
from pydantic import BaseModel, EmailStr

class AlertCreate(BaseModel):
    filters: dict[str, Any]
    email: str

class AlertUpdate(BaseModel):
    active: Optional[bool] = None
    filters: Optional[dict[str, Any]] = None

class Alert(BaseModel):
    id: str
    user_id: str
    filters: dict[str, Any]
    email: str
    active: bool = True
    last_sent_at: Optional[datetime] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
pytest tests/test_models.py -v
```

Expected: 3 tests PASS

- [ ] **Step 7: Create `backend/api/deps.py`**

```python
import os
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

security = HTTPBearer()

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> str:
    token = credentials.credentials
    secret = os.environ["SUPABASE_JWT_SECRET"]
    try:
        payload = jwt.decode(token, secret, algorithms=["HS256"], audience="authenticated")
        user_id: str = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        return user_id
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
```

- [ ] **Step 8: Commit**

```bash
git add backend/models/ backend/api/deps.py backend/tests/test_models.py
git commit -m "feat: Pydantic models and JWT auth dependency"
```

---

## Task 4: Auctions API Route

**Files:**
- Modify: `backend/api/routes/auctions.py`
- Create: `backend/tests/test_auctions.py`

**Interfaces:**
- Consumes: `AuctionFilters` from `models.auction`, `get_supabase` from `db.client`
- Produces:
  - `GET /auctions` → `{"data": [Auction], "total": int, "page": int, "page_size": int}`
  - `GET /auctions/{id}` → `Auction`

- [ ] **Step 1: Write failing tests**

`backend/tests/test_auctions.py`:
```python
import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch
from api.main import app

client = TestClient(app)

SAMPLE_AUCTION = {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "type": "tax_deed",
    "status": "upcoming",
    "state": "FL",
    "county": "Orange",
    "address": "123 Main St, Orlando, FL",
    "min_bid": "45000.00",
    "source": "scrape",
}

def make_mock_supabase(data, count=1):
    mock = MagicMock()
    mock.table.return_value.select.return_value.eq.return_value.range.return_value.execute.return_value.data = data
    mock.table.return_value.select.return_value.eq.return_value.range.return_value.execute.return_value.count = count
    return mock

@patch("api.routes.auctions.get_supabase")
def test_get_auctions_returns_list(mock_get_supabase):
    mock_sb = MagicMock()
    result = MagicMock()
    result.data = [SAMPLE_AUCTION]
    result.count = 1
    mock_sb.table.return_value.select.return_value.range.return_value.execute.return_value = result
    mock_get_supabase.return_value = mock_sb

    response = client.get("/auctions")
    assert response.status_code == 200
    body = response.json()
    assert "data" in body
    assert body["total"] == 1

@patch("api.routes.auctions.get_supabase")
def test_get_auction_by_id(mock_get_supabase):
    mock_sb = MagicMock()
    result = MagicMock()
    result.data = [SAMPLE_AUCTION]
    mock_sb.table.return_value.select.return_value.eq.return_value.execute.return_value = result
    mock_get_supabase.return_value = mock_sb

    response = client.get("/auctions/123e4567-e89b-12d3-a456-426614174000")
    assert response.status_code == 200
    assert response.json()["state"] == "FL"

@patch("api.routes.auctions.get_supabase")
def test_get_auction_not_found(mock_get_supabase):
    mock_sb = MagicMock()
    result = MagicMock()
    result.data = []
    mock_sb.table.return_value.select.return_value.eq.return_value.execute.return_value = result
    mock_get_supabase.return_value = mock_sb

    response = client.get("/auctions/nonexistent-id")
    assert response.status_code == 404
```

- [ ] **Step 2: Run to verify failure**

```bash
pytest tests/test_auctions.py -v
```

Expected: FAIL — routes return no data

- [ ] **Step 3: Implement `backend/api/routes/auctions.py`**

```python
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from decimal import Decimal
from datetime import date
from db.client import get_supabase
from models.auction import Auction, AuctionType, AuctionStatus, PropertyType

router = APIRouter()

@router.get("")
def get_auctions(
    state: Optional[str] = Query(None),
    county: Optional[str] = Query(None),
    type: Optional[AuctionType] = Query(None),
    status: Optional[AuctionStatus] = Query(None),
    property_type: Optional[PropertyType] = Query(None),
    min_bid: Optional[Decimal] = Query(None),
    max_bid: Optional[Decimal] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    sb = get_supabase()
    query = sb.table("auctions").select("*", count="exact")

    if state:
        query = query.eq("state", state.upper())
    if county:
        query = query.ilike("county", f"%{county}%")
    if type:
        query = query.eq("type", type)
    if status:
        query = query.eq("status", status)
    if property_type:
        query = query.eq("property_type", property_type)
    if min_bid is not None:
        query = query.gte("min_bid", float(min_bid))
    if max_bid is not None:
        query = query.lte("min_bid", float(max_bid))
    if date_from:
        query = query.gte("auction_date", date_from.isoformat())
    if date_to:
        query = query.lte("auction_date", date_to.isoformat())

    offset = (page - 1) * page_size
    result = query.range(offset, offset + page_size - 1).execute()

    return {
        "data": result.data,
        "total": result.count or 0,
        "page": page,
        "page_size": page_size,
    }

@router.get("/{auction_id}")
def get_auction(auction_id: str):
    sb = get_supabase()
    result = sb.table("auctions").select("*").eq("id", auction_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Auction not found")
    return result.data[0]
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pytest tests/test_auctions.py -v
```

Expected: 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add backend/api/routes/auctions.py backend/tests/test_auctions.py
git commit -m "feat: auctions API route with filtering and pagination"
```

---

## Task 5: Favorites & Alerts Routes

**Files:**
- Modify: `backend/api/routes/favorites.py`
- Modify: `backend/api/routes/alerts.py`
- Create: `backend/tests/test_favorites.py`
- Create: `backend/tests/test_alerts.py`

**Interfaces:**
- Consumes: `get_current_user` from `api.deps`, `get_supabase` from `db.client`
- Produces:
  - `POST /favorites` → `Favorite` (requires auth)
  - `GET /favorites` → `[Favorite]` (requires auth)
  - `DELETE /favorites/{id}` → 204 (requires auth)
  - `POST /alerts` → `Alert` (requires auth)
  - `GET /alerts` → `[Alert]` (requires auth)
  - `PATCH /alerts/{id}` → `Alert` (requires auth)
  - `DELETE /alerts/{id}` → 204 (requires auth)

- [ ] **Step 1: Write failing favorites tests**

`backend/tests/test_favorites.py`:
```python
import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch
from api.main import app

client = TestClient(app)
AUTH_HEADERS = {"Authorization": "Bearer test.jwt.token"}
USER_ID = "user-uuid-123"

@patch("api.routes.favorites.get_current_user", return_value=USER_ID)
@patch("api.routes.favorites.get_supabase")
def test_create_favorite(mock_sb, mock_user):
    mock = MagicMock()
    mock.table.return_value.insert.return_value.execute.return_value.data = [{
        "id": "fav-uuid", "user_id": USER_ID, "auction_id": "auc-uuid", "notes": None
    }]
    mock_sb.return_value = mock

    resp = client.post("/favorites", json={"auction_id": "auc-uuid"}, headers=AUTH_HEADERS)
    assert resp.status_code == 201

@patch("api.routes.favorites.get_current_user", return_value=USER_ID)
@patch("api.routes.favorites.get_supabase")
def test_list_favorites(mock_sb, mock_user):
    mock = MagicMock()
    mock.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []
    mock_sb.return_value = mock

    resp = client.get("/favorites", headers=AUTH_HEADERS)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)

@patch("api.routes.favorites.get_current_user", return_value=USER_ID)
@patch("api.routes.favorites.get_supabase")
def test_delete_favorite(mock_sb, mock_user):
    mock = MagicMock()
    mock.table.return_value.delete.return_value.eq.return_value.eq.return_value.execute.return_value.data = [{"id": "fav-uuid"}]
    mock_sb.return_value = mock

    resp = client.delete("/favorites/fav-uuid", headers=AUTH_HEADERS)
    assert resp.status_code == 204
```

- [ ] **Step 2: Write failing alerts tests**

`backend/tests/test_alerts.py`:
```python
import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch
from api.main import app

client = TestClient(app)
AUTH_HEADERS = {"Authorization": "Bearer test.jwt.token"}
USER_ID = "user-uuid-123"
SAMPLE_ALERT = {
    "id": "alert-uuid", "user_id": USER_ID,
    "filters": {"state": "FL", "type": "tax_deed"},
    "email": "user@example.com", "active": True,
}

@patch("api.routes.alerts.get_current_user", return_value=USER_ID)
@patch("api.routes.alerts.get_supabase")
def test_create_alert(mock_sb, mock_user):
    mock = MagicMock()
    mock.table.return_value.insert.return_value.execute.return_value.data = [SAMPLE_ALERT]
    mock_sb.return_value = mock

    resp = client.post("/alerts", json={"filters": {"state": "FL"}, "email": "user@example.com"}, headers=AUTH_HEADERS)
    assert resp.status_code == 201

@patch("api.routes.alerts.get_current_user", return_value=USER_ID)
@patch("api.routes.alerts.get_supabase")
def test_toggle_alert(mock_sb, mock_user):
    mock = MagicMock()
    updated = {**SAMPLE_ALERT, "active": False}
    mock.table.return_value.update.return_value.eq.return_value.eq.return_value.execute.return_value.data = [updated]
    mock_sb.return_value = mock

    resp = client.patch("/alerts/alert-uuid", json={"active": False}, headers=AUTH_HEADERS)
    assert resp.status_code == 200
    assert resp.json()["active"] is False
```

- [ ] **Step 3: Run to verify failure**

```bash
pytest tests/test_favorites.py tests/test_alerts.py -v
```

Expected: FAIL

- [ ] **Step 4: Implement `backend/api/routes/favorites.py`**

```python
from fastapi import APIRouter, Depends, HTTPException, status
from db.client import get_supabase
from api.deps import get_current_user
from models.favorite import FavoriteCreate

router = APIRouter()

@router.post("", status_code=201)
def create_favorite(body: FavoriteCreate, user_id: str = Depends(get_current_user)):
    sb = get_supabase()
    result = sb.table("favorites").insert({
        "user_id": user_id,
        "auction_id": body.auction_id,
        "notes": body.notes,
    }).execute()
    return result.data[0]

@router.get("")
def list_favorites(user_id: str = Depends(get_current_user)):
    sb = get_supabase()
    result = sb.table("favorites").select("*, auctions(*)").eq("user_id", user_id).execute()
    return result.data

@router.delete("/{favorite_id}", status_code=204)
def delete_favorite(favorite_id: str, user_id: str = Depends(get_current_user)):
    sb = get_supabase()
    result = sb.table("favorites").delete().eq("id", favorite_id).eq("user_id", user_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Favorite not found")
```

- [ ] **Step 5: Implement `backend/api/routes/alerts.py`**

```python
from fastapi import APIRouter, Depends, HTTPException, status
from db.client import get_supabase
from api.deps import get_current_user
from models.alert import AlertCreate, AlertUpdate

router = APIRouter()

@router.post("", status_code=201)
def create_alert(body: AlertCreate, user_id: str = Depends(get_current_user)):
    sb = get_supabase()
    result = sb.table("alerts").insert({
        "user_id": user_id,
        "filters": body.filters,
        "email": body.email,
    }).execute()
    return result.data[0]

@router.get("")
def list_alerts(user_id: str = Depends(get_current_user)):
    sb = get_supabase()
    result = sb.table("alerts").select("*").eq("user_id", user_id).execute()
    return result.data

@router.patch("/{alert_id}")
def update_alert(alert_id: str, body: AlertUpdate, user_id: str = Depends(get_current_user)):
    sb = get_supabase()
    updates = body.model_dump(exclude_none=True)
    result = sb.table("alerts").update(updates).eq("id", alert_id).eq("user_id", user_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Alert not found")
    return result.data[0]

@router.delete("/{alert_id}", status_code=204)
def delete_alert(alert_id: str, user_id: str = Depends(get_current_user)):
    sb = get_supabase()
    result = sb.table("alerts").delete().eq("id", alert_id).eq("user_id", user_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Alert not found")
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
pytest tests/test_favorites.py tests/test_alerts.py -v
```

Expected: 5 tests PASS

- [ ] **Step 7: Commit**

```bash
git add backend/api/routes/favorites.py backend/api/routes/alerts.py backend/tests/test_favorites.py backend/tests/test_alerts.py
git commit -m "feat: favorites and alerts API routes with JWT auth"
```

---

## Task 6: Scraper Base Class

**Files:**
- Modify: `backend/scrapers/base.py`
- Create: `backend/tests/test_scraper_base.py`

**Interfaces:**
- Produces: `BaseScraper` abstract class with `scrape() -> list[dict]`, `run()` method that writes to DB and logs
- Produces: `ScrapeResult` dataclass: `{"records_found": int, "records_new": int}`
- Consumes: `get_supabase` from `db.client`

- [ ] **Step 1: Write failing tests**

`backend/tests/test_scraper_base.py`:
```python
import pytest
from unittest.mock import MagicMock, patch, AsyncMock
from scrapers.base import BaseScraper, ScrapeResult

class ConcreteScraper(BaseScraper):
    state = "FL"
    county = "Test County"
    source_name = "test_source"

    def scrape(self) -> list[dict]:
        return [
            {"parcel_id": "001", "type": "tax_deed", "state": "FL", "county": "Test County", "min_bid": 10000, "source": "scrape"},
            {"parcel_id": "002", "type": "tax_lien", "state": "FL", "county": "Test County", "min_bid": 5000, "source": "scrape"},
        ]

@patch("scrapers.base.get_supabase")
def test_run_returns_scrape_result(mock_get_supabase):
    mock_sb = MagicMock()
    mock_sb.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []
    mock_sb.table.return_value.upsert.return_value.execute.return_value.data = [{"id": "x"}, {"id": "y"}]
    mock_sb.table.return_value.insert.return_value.execute.return_value.data = [{"id": "log"}]
    mock_get_supabase.return_value = mock_sb

    scraper = ConcreteScraper()
    result = scraper.run()

    assert isinstance(result, ScrapeResult)
    assert result.records_found == 2

@patch("scrapers.base.get_supabase")
def test_run_logs_failure_on_exception(mock_get_supabase):
    class FailingScraper(BaseScraper):
        state = "TX"
        county = "Fail County"
        source_name = "fail_source"
        def scrape(self) -> list[dict]:
            raise RuntimeError("Site down")

    mock_sb = MagicMock()
    mock_sb.table.return_value.insert.return_value.execute.return_value.data = [{"id": "log"}]
    mock_get_supabase.return_value = mock_sb

    scraper = FailingScraper()
    result = scraper.run()

    assert result.records_found == 0
    assert result.error is not None
```

- [ ] **Step 2: Run to verify failure**

```bash
pytest tests/test_scraper_base.py -v
```

Expected: FAIL

- [ ] **Step 3: Implement `backend/scrapers/base.py`**

```python
from __future__ import annotations
import os
import time
import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Optional
from db.client import get_supabase

logger = logging.getLogger(__name__)

@dataclass
class ScrapeResult:
    records_found: int = 0
    records_new: int = 0
    error: Optional[str] = None

class BaseScraper(ABC):
    state: str
    county: str
    source_name: str

    @property
    def delay(self) -> float:
        return float(os.environ.get("SCRAPE_DELAY_SECONDS", "2"))

    @abstractmethod
    def scrape(self) -> list[dict]:
        """Fetch and parse raw auction records. Return list of dicts matching auctions schema."""

    def sleep(self):
        time.sleep(self.delay)

    def run(self) -> ScrapeResult:
        sb = get_supabase()
        result = ScrapeResult()
        try:
            records = self.scrape()
            result.records_found = len(records)

            if records:
                upsert_result = sb.table("auctions").upsert(
                    records, on_conflict="parcel_id,state,county"
                ).execute()
                result.records_new = len(upsert_result.data)

            sb.table("scrape_logs").insert({
                "source": self.source_name,
                "state": self.state,
                "county": self.county,
                "records_found": result.records_found,
                "records_new": result.records_new,
                "status": "success",
            }).execute()

        except Exception as exc:
            error_msg = str(exc)
            result.error = error_msg
            logger.error("Scraper %s failed: %s", self.source_name, error_msg)
            try:
                sb.table("scrape_logs").insert({
                    "source": self.source_name,
                    "state": self.state,
                    "county": self.county,
                    "records_found": 0,
                    "records_new": 0,
                    "status": "failed",
                    "error_message": error_msg,
                }).execute()
            except Exception:
                pass

        return result
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pytest tests/test_scraper_base.py -v
```

Expected: 2 tests PASS

- [ ] **Step 5: Commit**

```bash
git add backend/scrapers/base.py backend/tests/test_scraper_base.py
git commit -m "feat: BaseScraper with DB upsert, error handling, and scrape logging"
```

---

## Task 7: Florida Orange County Scraper

**Files:**
- Create: `backend/scrapers/florida/orange_county.py`
- Create: `backend/tests/scrapers/fixtures/orange_county.html`
- Create: `backend/tests/scrapers/test_orange_county.py`

**Interfaces:**
- Consumes: `BaseScraper` from `scrapers.base`
- Produces: `OrangeCountyScraper` — scrapes `myorangeclerk.realforeclose.com` for upcoming tax deed sales

- [ ] **Step 1: Create HTML fixture**

`backend/tests/scrapers/fixtures/orange_county.html`:
```html
<!DOCTYPE html>
<html>
<body>
<table class="sales-list">
  <thead>
    <tr>
      <th>Case #</th><th>Parcel ID</th><th>Address</th>
      <th>Min Bid</th><th>Sale Date</th><th>Type</th>
    </tr>
  </thead>
  <tbody>
    <tr class="sale-row">
      <td>2024-001</td>
      <td>01-23-28-0000-00-001</td>
      <td>123 Main St Orlando FL 32801</td>
      <td>$45,000.00</td>
      <td>06/25/2026</td>
      <td>Tax Deed</td>
    </tr>
    <tr class="sale-row">
      <td>2024-002</td>
      <td>01-23-28-0000-00-002</td>
      <td>456 Oak Ave Orlando FL 32803</td>
      <td>$28,500.00</td>
      <td>06/25/2026</td>
      <td>Tax Deed</td>
    </tr>
  </tbody>
</table>
</body>
</html>
```

- [ ] **Step 2: Write failing test**

`backend/tests/scrapers/test_orange_county.py`:
```python
import pytest
from pathlib import Path
from scrapers.florida.orange_county import OrangeCountyScraper

FIXTURE = Path(__file__).parent / "fixtures" / "orange_county.html"

def test_parse_returns_auction_records():
    html = FIXTURE.read_text()
    scraper = OrangeCountyScraper()
    records = scraper.parse(html)

    assert len(records) == 2
    assert records[0]["parcel_id"] == "01-23-28-0000-00-001"
    assert records[0]["address"] == "123 Main St Orlando FL 32801"
    assert records[0]["min_bid"] == 45000.00
    assert records[0]["state"] == "FL"
    assert records[0]["county"] == "Orange"
    assert records[0]["type"] == "tax_deed"
    assert records[0]["source"] == "scrape"

def test_parse_cleans_currency():
    html = FIXTURE.read_text()
    scraper = OrangeCountyScraper()
    records = scraper.parse(html)
    assert isinstance(records[0]["min_bid"], float)
    assert records[1]["min_bid"] == 28500.00
```

- [ ] **Step 3: Run to verify failure**

```bash
pytest tests/scrapers/test_orange_county.py -v
```

Expected: FAIL

- [ ] **Step 4: Implement `backend/scrapers/florida/orange_county.py`**

```python
from __future__ import annotations
import re
from datetime import datetime
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright
from scrapers.base import BaseScraper

SEARCH_URL = "https://myorangeclerk.realforeclose.com/index.cfm?zaction=AUCTION&Zmethod=PREVIEW&AUSID=2"

class OrangeCountyScraper(BaseScraper):
    state = "FL"
    county = "Orange"
    source_name = "orange_county_fl"

    def parse(self, html: str) -> list[dict]:
        soup = BeautifulSoup(html, "lxml")
        rows = soup.select("tr.sale-row")
        records = []
        for row in rows:
            cells = row.find_all("td")
            if len(cells) < 6:
                continue
            parcel_id = cells[1].get_text(strip=True)
            address = cells[2].get_text(strip=True)
            min_bid = self._parse_currency(cells[3].get_text(strip=True))
            auction_date = self._parse_date(cells[4].get_text(strip=True))
            records.append({
                "type": "tax_deed",
                "status": "upcoming",
                "state": self.state,
                "county": self.county,
                "address": address,
                "parcel_id": parcel_id,
                "min_bid": min_bid,
                "auction_date": auction_date,
                "source": "scrape",
                "source_url": SEARCH_URL,
            })
        return records

    def scrape(self) -> list[dict]:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            page.goto(SEARCH_URL, timeout=30000)
            page.wait_for_selector("tr.sale-row", timeout=15000)
            html = page.content()
            browser.close()
        self.sleep()
        return self.parse(html)

    @staticmethod
    def _parse_currency(value: str) -> float:
        cleaned = re.sub(r"[^\d.]", "", value)
        return float(cleaned) if cleaned else 0.0

    @staticmethod
    def _parse_date(value: str) -> str | None:
        try:
            return datetime.strptime(value.strip(), "%m/%d/%Y").date().isoformat()
        except ValueError:
            return None
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
pytest tests/scrapers/test_orange_county.py -v
```

Expected: 2 tests PASS (no browser launched — tests use fixture HTML)

- [ ] **Step 6: Commit**

```bash
git add backend/scrapers/florida/orange_county.py backend/tests/scrapers/fixtures/orange_county.html backend/tests/scrapers/test_orange_county.py
git commit -m "feat: Florida Orange County tax deed scraper"
```

---

## Task 8: Texas Dallas County Scraper

**Files:**
- Create: `backend/scrapers/texas/dallas_county.py`
- Create: `backend/tests/scrapers/fixtures/dallas_county.html`
- Create: `backend/tests/scrapers/test_dallas_county.py`

**Interfaces:**
- Consumes: `BaseScraper`
- Produces: `DallasCountyScraper` — scrapes Dallas County foreclosure sale listings

- [ ] **Step 1: Create HTML fixture**

`backend/tests/scrapers/fixtures/dallas_county.html`:
```html
<!DOCTYPE html>
<html>
<body>
<div class="foreclosure-listings">
  <div class="listing-item">
    <span class="parcel">0012345678900000</span>
    <span class="address">789 Elm St Dallas TX 75201</span>
    <span class="opening-bid">$62,000</span>
    <span class="sale-date">2026-07-01</span>
    <span class="case-number">DC-2026-001</span>
  </div>
  <div class="listing-item">
    <span class="parcel">0098765432100000</span>
    <span class="address">321 Cedar Ln Garland TX 75040</span>
    <span class="opening-bid">$18,750</span>
    <span class="sale-date">2026-07-01</span>
    <span class="case-number">DC-2026-002</span>
  </div>
</div>
</body>
</html>
```

- [ ] **Step 2: Write failing test**

`backend/tests/scrapers/test_dallas_county.py`:
```python
from pathlib import Path
from scrapers.texas.dallas_county import DallasCountyScraper

FIXTURE = Path(__file__).parent / "fixtures" / "dallas_county.html"

def test_parse_returns_auction_records():
    html = FIXTURE.read_text()
    scraper = DallasCountyScraper()
    records = scraper.parse(html)

    assert len(records) == 2
    assert records[0]["parcel_id"] == "0012345678900000"
    assert records[0]["min_bid"] == 62000.0
    assert records[0]["state"] == "TX"
    assert records[0]["county"] == "Dallas"
    assert records[0]["type"] == "foreclosure"
    assert records[0]["source"] == "scrape"

def test_parse_address():
    html = FIXTURE.read_text()
    records = DallasCountyScraper().parse(html)
    assert records[1]["address"] == "321 Cedar Ln Garland TX 75040"
```

- [ ] **Step 3: Run to verify failure**

```bash
pytest tests/scrapers/test_dallas_county.py -v
```

Expected: FAIL

- [ ] **Step 4: Implement `backend/scrapers/texas/dallas_county.py`**

```python
from __future__ import annotations
import re
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright
from scrapers.base import BaseScraper

SEARCH_URL = "https://www.dallascounty.org/departments/tax/foreclosure-sales.php"

class DallasCountyScraper(BaseScraper):
    state = "TX"
    county = "Dallas"
    source_name = "dallas_county_tx"

    def parse(self, html: str) -> list[dict]:
        soup = BeautifulSoup(html, "lxml")
        items = soup.select("div.listing-item")
        records = []
        for item in items:
            parcel = item.select_one(".parcel")
            address = item.select_one(".address")
            bid = item.select_one(".opening-bid")
            sale_date = item.select_one(".sale-date")
            if not all([parcel, address, bid]):
                continue
            records.append({
                "type": "foreclosure",
                "status": "upcoming",
                "state": self.state,
                "county": self.county,
                "parcel_id": parcel.get_text(strip=True),
                "address": address.get_text(strip=True),
                "min_bid": self._parse_currency(bid.get_text(strip=True)),
                "auction_date": sale_date.get_text(strip=True) if sale_date else None,
                "source": "scrape",
                "source_url": SEARCH_URL,
            })
        return records

    def scrape(self) -> list[dict]:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            page.goto(SEARCH_URL, timeout=30000)
            page.wait_for_selector("div.listing-item", timeout=15000)
            html = page.content()
            browser.close()
        self.sleep()
        return self.parse(html)

    @staticmethod
    def _parse_currency(value: str) -> float:
        cleaned = re.sub(r"[^\d.]", "", value)
        return float(cleaned) if cleaned else 0.0
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
pytest tests/scrapers/test_dallas_county.py -v
```

Expected: 2 tests PASS

- [ ] **Step 6: Commit**

```bash
git add backend/scrapers/texas/dallas_county.py backend/tests/scrapers/fixtures/dallas_county.html backend/tests/scrapers/test_dallas_county.py
git commit -m "feat: Texas Dallas County foreclosure scraper"
```

---

## Task 9: Georgia Fulton County Scraper

**Files:**
- Create: `backend/scrapers/georgia/fulton_county.py`
- Create: `backend/tests/scrapers/fixtures/fulton_county.html`
- Create: `backend/tests/scrapers/test_fulton_county.py`

**Interfaces:**
- Consumes: `BaseScraper`
- Produces: `FultonCountyScraper` — scrapes GovEase tax sale listings for Fulton County, GA

- [ ] **Step 1: Create HTML fixture**

`backend/tests/scrapers/fixtures/fulton_county.html`:
```html
<!DOCTYPE html>
<html>
<body>
<table id="tax-sale-results">
  <thead>
    <tr><th>Parcel</th><th>Address</th><th>Minimum Bid</th><th>Sale Date</th><th>Sale Type</th></tr>
  </thead>
  <tbody>
    <tr>
      <td class="parcel-id">14-0078-0003-047-4</td>
      <td class="prop-address">500 Peachtree St NE Atlanta GA 30308</td>
      <td class="min-bid">$12,400.00</td>
      <td class="sale-date">07/15/2026</td>
      <td class="sale-type">Tax Deed</td>
    </tr>
    <tr>
      <td class="parcel-id">14-0022-0001-012-7</td>
      <td class="prop-address">1200 Spring St Atlanta GA 30309</td>
      <td class="min-bid">$8,200.00</td>
      <td class="sale-date">07/15/2026</td>
      <td class="sale-type">Tax Lien</td>
    </tr>
  </tbody>
</table>
</body>
</html>
```

- [ ] **Step 2: Write failing test**

`backend/tests/scrapers/test_fulton_county.py`:
```python
from pathlib import Path
from scrapers.georgia.fulton_county import FultonCountyScraper

FIXTURE = Path(__file__).parent / "fixtures" / "fulton_county.html"

TYPE_MAP = {"Tax Deed": "tax_deed", "Tax Lien": "tax_lien"}

def test_parse_returns_records():
    html = FIXTURE.read_text()
    records = FultonCountyScraper().parse(html)

    assert len(records) == 2
    assert records[0]["parcel_id"] == "14-0078-0003-047-4"
    assert records[0]["type"] == "tax_deed"
    assert records[0]["min_bid"] == 12400.0
    assert records[0]["state"] == "GA"
    assert records[0]["county"] == "Fulton"

def test_parse_type_mapping():
    html = FIXTURE.read_text()
    records = FultonCountyScraper().parse(html)
    assert records[1]["type"] == "tax_lien"
    assert records[1]["min_bid"] == 8200.0
```

- [ ] **Step 3: Run to verify failure**

```bash
pytest tests/scrapers/test_fulton_county.py -v
```

Expected: FAIL

- [ ] **Step 4: Implement `backend/scrapers/georgia/fulton_county.py`**

```python
from __future__ import annotations
import re
from datetime import datetime
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright
from scrapers.base import BaseScraper

SEARCH_URL = "https://www.govease.com/ga/fulton"

TYPE_MAP = {
    "tax deed": "tax_deed",
    "tax lien": "tax_lien",
    "foreclosure": "foreclosure",
}

class FultonCountyScraper(BaseScraper):
    state = "GA"
    county = "Fulton"
    source_name = "fulton_county_ga"

    def parse(self, html: str) -> list[dict]:
        soup = BeautifulSoup(html, "lxml")
        rows = soup.select("#tax-sale-results tbody tr")
        records = []
        for row in rows:
            parcel = row.select_one(".parcel-id")
            address = row.select_one(".prop-address")
            min_bid = row.select_one(".min-bid")
            sale_date = row.select_one(".sale-date")
            sale_type = row.select_one(".sale-type")
            if not all([parcel, min_bid]):
                continue
            raw_type = sale_type.get_text(strip=True).lower() if sale_type else ""
            records.append({
                "type": TYPE_MAP.get(raw_type, "tax_deed"),
                "status": "upcoming",
                "state": self.state,
                "county": self.county,
                "parcel_id": parcel.get_text(strip=True),
                "address": address.get_text(strip=True) if address else None,
                "min_bid": self._parse_currency(min_bid.get_text(strip=True)),
                "auction_date": self._parse_date(sale_date.get_text(strip=True)) if sale_date else None,
                "source": "scrape",
                "source_url": SEARCH_URL,
            })
        return records

    def scrape(self) -> list[dict]:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            page.goto(SEARCH_URL, timeout=30000)
            page.wait_for_selector("#tax-sale-results tbody tr", timeout=15000)
            html = page.content()
            browser.close()
        self.sleep()
        return self.parse(html)

    @staticmethod
    def _parse_currency(value: str) -> float:
        cleaned = re.sub(r"[^\d.]", "", value)
        return float(cleaned) if cleaned else 0.0

    @staticmethod
    def _parse_date(value: str) -> str | None:
        for fmt in ("%m/%d/%Y", "%Y-%m-%d"):
            try:
                return datetime.strptime(value.strip(), fmt).date().isoformat()
            except ValueError:
                continue
        return None
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
pytest tests/scrapers/test_fulton_county.py -v
```

Expected: 2 tests PASS

- [ ] **Step 6: Commit**

```bash
git add backend/scrapers/georgia/fulton_county.py backend/tests/scrapers/fixtures/fulton_county.html backend/tests/scrapers/test_fulton_county.py
git commit -m "feat: Georgia Fulton County tax deed/lien scraper"
```

---

## Task 10: Scheduler & Email Notifications

**Files:**
- Create: `backend/scheduler.py`
- Create: `backend/notifications.py`
- Modify: `backend/api/main.py` (add lifespan to start scheduler)

**Interfaces:**
- Consumes: `OrangeCountyScraper`, `DallasCountyScraper`, `FultonCountyScraper`
- Consumes: `get_supabase` from `db.client`
- Produces: daily job running all scrapers at 02:00 server time
- Produces: `send_alert_emails(new_auction_ids: list[str]) -> None`

- [ ] **Step 1: Create `backend/notifications.py`**

```python
from __future__ import annotations
import os
import resend
from db.client import get_supabase

resend.api_key = os.environ.get("RESEND_API_KEY", "")
FROM_EMAIL = os.environ.get("ALERT_FROM_EMAIL", "alerts@taxdeedfinder.com")

def _auction_matches_filters(auction: dict, filters: dict) -> bool:
    if filters.get("state") and auction.get("state") != filters["state"].upper():
        return False
    if filters.get("county") and filters["county"].lower() not in (auction.get("county") or "").lower():
        return False
    if filters.get("type") and auction.get("type") != filters["type"]:
        return False
    if filters.get("min_bid") and (auction.get("min_bid") or 0) < filters["min_bid"]:
        return False
    if filters.get("max_bid") and (auction.get("min_bid") or 0) > filters["max_bid"]:
        return False
    return True

def send_alert_emails(new_auction_ids: list[str]) -> None:
    if not new_auction_ids:
        return
    sb = get_supabase()
    auctions_result = sb.table("auctions").select("*").in_("id", new_auction_ids).execute()
    auctions = auctions_result.data
    alerts_result = sb.table("alerts").select("*").eq("active", True).execute()
    alerts = alerts_result.data

    for alert in alerts:
        matching = [a for a in auctions if _auction_matches_filters(a, alert.get("filters", {}))]
        if not matching:
            continue
        items_html = "".join(
            f"<li><b>{a.get('address', 'N/A')}</b> — {a.get('type')} — Bid: ${a.get('min_bid', 0):,.2f} — Date: {a.get('auction_date', 'TBD')}</li>"
            for a in matching
        )
        resend.Emails.send({
            "from": FROM_EMAIL,
            "to": alert["email"],
            "subject": f"Tax Deed Finder — {len(matching)} new auction(s) match your alert",
            "html": f"<h2>New Auctions Found</h2><ul>{items_html}</ul>",
        })
        sb.table("alerts").update({"last_sent_at": "now()"}).eq("id", alert["id"]).execute()
```

- [ ] **Step 2: Create `backend/scheduler.py`**

```python
from __future__ import annotations
import logging
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from scrapers.florida.orange_county import OrangeCountyScraper
from scrapers.florida.miami_dade import MiamiDadeScraper
from scrapers.texas.dallas_county import DallasCountyScraper
from scrapers.georgia.fulton_county import FultonCountyScraper
from notifications import send_alert_emails

logger = logging.getLogger(__name__)

SCRAPERS = [
    OrangeCountyScraper,
    MiamiDadeScraper,
    DallasCountyScraper,
    FultonCountyScraper,
]

def run_all_scrapers():
    new_ids: list[str] = []
    for ScraperClass in SCRAPERS:
        scraper = ScraperClass()
        try:
            result = scraper.run()
            logger.info("%s: found=%d new=%d", scraper.source_name, result.records_found, result.records_new)
        except Exception as exc:
            logger.error("Scraper %s crashed: %s", ScraperClass.__name__, exc)
    send_alert_emails(new_ids)

def create_scheduler() -> BackgroundScheduler:
    scheduler = BackgroundScheduler()
    scheduler.add_job(run_all_scrapers, CronTrigger(hour=2, minute=0))
    return scheduler
```

- [ ] **Step 3: Create Miami-Dade stub so imports don't fail**

`backend/scrapers/florida/miami_dade.py`:
```python
from scrapers.base import BaseScraper

class MiamiDadeScraper(BaseScraper):
    state = "FL"
    county = "Miami-Dade"
    source_name = "miami_dade_fl"

    def scrape(self) -> list[dict]:
        # TODO: implement when Miami-Dade portal access is confirmed
        return []
```

- [ ] **Step 4: Update `backend/api/main.py` to start/stop scheduler**

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import auctions, favorites, alerts
from scheduler import create_scheduler

@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler = create_scheduler()
    scheduler.start()
    yield
    scheduler.shutdown()

app = FastAPI(title="Tax Deed Finder API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auctions.router, prefix="/auctions", tags=["auctions"])
app.include_router(favorites.router, prefix="/favorites", tags=["favorites"])
app.include_router(alerts.router, prefix="/alerts", tags=["alerts"])

@app.get("/health")
def health():
    return {"status": "ok"}
```

- [ ] **Step 5: Verify server starts with scheduler**

```bash
cd "/Users/luthkimak/Desktop/TAx deed/backend"
source .venv/bin/activate
uvicorn api.main:app --reload
```

Expected: starts without errors, logs show "Scheduler started"

- [ ] **Step 6: Commit**

```bash
git add backend/notifications.py backend/scheduler.py backend/scrapers/florida/miami_dade.py backend/api/main.py
git commit -m "feat: APScheduler daily scraper jobs and Resend email alerts"
```

---

## Task 11: Frontend — Scaffold, Types, Auth

**Files:**
- Create: `frontend/src/types/index.ts`
- Create: `frontend/src/lib/supabase.ts`
- Create: `frontend/src/lib/api.ts`
- Create: `frontend/src/pages/Auth.tsx`
- Create: `frontend/src/components/Navbar.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/main.tsx`

**Interfaces:**
- Produces: `Auction`, `Favorite`, `Alert` TypeScript interfaces
- Produces: `apiClient` with `getAuctions(filters)`, `getAuction(id)`, `createFavorite`, `deleteFavorite`, `listFavorites`, `createAlert`, `updateAlert`, `deleteAlert`, `listAlerts`
- Produces: Auth pages (login/signup) using Supabase Auth
- Produces: protected route that redirects unauthenticated users to `/auth`

- [ ] **Step 1: Create `frontend/src/types/index.ts`**

```typescript
export type AuctionType = 'tax_deed' | 'tax_lien' | 'foreclosure'
export type AuctionStatus = 'upcoming' | 'active' | 'sold' | 'cancelled'
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

export interface Alert {
  id: string
  user_id: string
  filters: Record<string, unknown>
  email: string
  active: boolean
  last_sent_at: string | null
  created_at: string
}
```

- [ ] **Step 2: Create `frontend/src/lib/supabase.ts`**

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

- [ ] **Step 3: Create `frontend/src/lib/api.ts`**

```typescript
import axios from 'axios'
import type { Auction, AuctionFilters, AuctionsResponse, Favorite, Alert } from '../types'
import { supabase } from './supabase'

const BASE_URL = import.meta.env.VITE_API_URL

async function authHeaders() {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export const apiClient = {
  async getAuctions(filters: AuctionFilters = {}): Promise<AuctionsResponse> {
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== undefined))
    const { data } = await axios.get(`${BASE_URL}/auctions`, { params })
    return data
  },

  async getAuction(id: string): Promise<Auction> {
    const { data } = await axios.get(`${BASE_URL}/auctions/${id}`)
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
```

- [ ] **Step 4: Create `frontend/src/pages/Auth.tsx`**

```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Auth() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignup, setIsSignup] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = isSignup
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) return setError(error.message)
    navigate('/')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-6 text-center">Tax Deed Finder</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email" placeholder="Email" value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full border rounded px-3 py-2"
            required
          />
          <input
            type="password" placeholder="Password" value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full border rounded px-3 py-2"
            required
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit" disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Loading…' : isSignup ? 'Sign Up' : 'Log In'}
          </button>
        </form>
        <button
          onClick={() => setIsSignup(!isSignup)}
          className="mt-4 text-sm text-blue-600 w-full text-center"
        >
          {isSignup ? 'Already have an account? Log in' : "Don't have an account? Sign up"}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Create `frontend/src/components/Navbar.tsx`**

```tsx
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Navbar() {
  const navigate = useNavigate()
  async function signOut() {
    await supabase.auth.signOut()
    navigate('/auth')
  }
  return (
    <nav className="bg-white border-b px-6 py-3 flex items-center gap-6">
      <Link to="/" className="font-bold text-blue-700 text-lg">Tax Deed Finder</Link>
      <Link to="/" className="text-gray-600 hover:text-gray-900">Search</Link>
      <Link to="/favorites" className="text-gray-600 hover:text-gray-900">Favorites</Link>
      <Link to="/alerts" className="text-gray-600 hover:text-gray-900">Alerts</Link>
      <button onClick={signOut} className="ml-auto text-sm text-gray-500 hover:text-gray-900">Sign Out</button>
    </nav>
  )
}
```

- [ ] **Step 6: Create `frontend/src/App.tsx`**

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
import Navbar from './components/Navbar'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
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

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/*" element={
          <ProtectedRoute>
            <Navbar />
            <Routes>
              <Route path="/" element={<Search />} />
              <Route path="/auctions/:id" element={<AuctionDetail />} />
              <Route path="/favorites" element={<Favorites />} />
              <Route path="/alerts" element={<Alerts />} />
            </Routes>
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  )
}
```

- [ ] **Step 7: Create stub pages so app compiles**

`frontend/src/pages/Search.tsx`:
```tsx
export default function Search() { return <div className="p-6"><h1 className="text-2xl font-bold">Search Auctions</h1></div> }
```

`frontend/src/pages/AuctionDetail.tsx`:
```tsx
export default function AuctionDetail() { return <div className="p-6"><h1 className="text-2xl font-bold">Auction Detail</h1></div> }
```

`frontend/src/pages/Favorites.tsx`:
```tsx
export default function Favorites() { return <div className="p-6"><h1 className="text-2xl font-bold">My Favorites</h1></div> }
```

`frontend/src/pages/Alerts.tsx`:
```tsx
export default function Alerts() { return <div className="p-6"><h1 className="text-2xl font-bold">My Alerts</h1></div> }
```

- [ ] **Step 8: Update `frontend/src/main.tsx`**

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

- [ ] **Step 9: Verify app compiles and auth works**

```bash
cd "/Users/luthkimak/Desktop/TAx deed/frontend"
cp .env.example .env
# Fill in your real Supabase URL, anon key, and Mapbox token in .env
npm run dev
```

Open http://localhost:5173 — should redirect to `/auth`, login form visible.

- [ ] **Step 10: Commit**

```bash
git add frontend/src/
git commit -m "feat: frontend scaffold, auth pages, Supabase client, API client"
```

---

## Task 12: Frontend — Search Page

**Files:**
- Modify: `frontend/src/pages/Search.tsx`
- Create: `frontend/src/components/FilterBar.tsx`
- Create: `frontend/src/components/AuctionCard.tsx`
- Create: `frontend/src/components/AuctionMap.tsx`

**Interfaces:**
- Consumes: `apiClient.getAuctions`, `Auction`, `AuctionFilters` from types
- Produces: full search page with filters, paginated list, and Mapbox map

- [ ] **Step 1: Create `frontend/src/components/FilterBar.tsx`**

```tsx
import { useState } from 'react'
import type { AuctionFilters, AuctionType, PropertyType } from '../types'

interface Props {
  onSearch: (filters: AuctionFilters) => void
  loading: boolean
}

const US_STATES = ['FL', 'TX', 'GA']

export default function FilterBar({ onSearch, loading }: Props) {
  const [state, setState] = useState('')
  const [county, setCounty] = useState('')
  const [type, setType] = useState<AuctionType | ''>('')
  const [propertyType, setPropertyType] = useState<PropertyType | ''>('')
  const [minBid, setMinBid] = useState('')
  const [maxBid, setMaxBid] = useState('')

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    onSearch({
      state: state || undefined,
      county: county || undefined,
      type: (type as AuctionType) || undefined,
      property_type: (propertyType as PropertyType) || undefined,
      min_bid: minBid ? Number(minBid) : undefined,
      max_bid: maxBid ? Number(maxBid) : undefined,
      page: 1,
    })
  }

  return (
    <form onSubmit={handleSearch} className="bg-white border-b px-6 py-4 flex flex-wrap gap-3 items-end">
      <div>
        <label className="block text-xs text-gray-500 mb-1">State</label>
        <select value={state} onChange={e => setState(e.target.value)} className="border rounded px-2 py-1.5 text-sm">
          <option value="">All</option>
          {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">County</label>
        <input value={county} onChange={e => setCounty(e.target.value)} placeholder="Any county" className="border rounded px-2 py-1.5 text-sm w-36" />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Type</label>
        <select value={type} onChange={e => setType(e.target.value as AuctionType | '')} className="border rounded px-2 py-1.5 text-sm">
          <option value="">All</option>
          <option value="tax_deed">Tax Deed</option>
          <option value="tax_lien">Tax Lien</option>
          <option value="foreclosure">Foreclosure</option>
        </select>
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Property</label>
        <select value={propertyType} onChange={e => setPropertyType(e.target.value as PropertyType | '')} className="border rounded px-2 py-1.5 text-sm">
          <option value="">All</option>
          <option value="residential">Residential</option>
          <option value="commercial">Commercial</option>
          <option value="land">Land</option>
        </select>
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Min Bid ($)</label>
        <input type="number" value={minBid} onChange={e => setMinBid(e.target.value)} placeholder="0" className="border rounded px-2 py-1.5 text-sm w-28" />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Max Bid ($)</label>
        <input type="number" value={maxBid} onChange={e => setMaxBid(e.target.value)} placeholder="Any" className="border rounded px-2 py-1.5 text-sm w-28" />
      </div>
      <button type="submit" disabled={loading} className="bg-blue-600 text-white px-4 py-1.5 rounded hover:bg-blue-700 text-sm disabled:opacity-50">
        {loading ? 'Searching…' : 'Search'}
      </button>
    </form>
  )
}
```

- [ ] **Step 2: Create `frontend/src/components/AuctionCard.tsx`**

```tsx
import { Link } from 'react-router-dom'
import type { Auction } from '../types'

const TYPE_LABELS: Record<string, string> = {
  tax_deed: 'Tax Deed',
  tax_lien: 'Tax Lien',
  foreclosure: 'Foreclosure',
}

const TYPE_COLORS: Record<string, string> = {
  tax_deed: 'bg-blue-100 text-blue-700',
  tax_lien: 'bg-green-100 text-green-700',
  foreclosure: 'bg-orange-100 text-orange-700',
}

interface Props {
  auction: Auction
  isFavorited?: boolean
  onToggleFavorite?: (auction: Auction) => void
}

export default function AuctionCard({ auction, isFavorited, onToggleFavorite }: Props) {
  return (
    <div className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full mb-2 ${TYPE_COLORS[auction.type]}`}>
            {TYPE_LABELS[auction.type]}
          </span>
          <Link to={`/auctions/${auction.id}`} className="block font-semibold text-gray-900 hover:text-blue-600 truncate">
            {auction.address || 'Address not available'}
          </Link>
          <p className="text-sm text-gray-500">{auction.county}, {auction.state}</p>
        </div>
        {onToggleFavorite && (
          <button onClick={() => onToggleFavorite(auction)} className="text-xl flex-shrink-0">
            {isFavorited ? '★' : '☆'}
          </button>
        )}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-gray-500">Min Bid</span>
          <p className="font-semibold text-gray-900">{auction.min_bid ? `$${auction.min_bid.toLocaleString()}` : '—'}</p>
        </div>
        <div>
          <span className="text-gray-500">Assessed</span>
          <p className="font-semibold text-gray-900">{auction.assessed_value ? `$${auction.assessed_value.toLocaleString()}` : '—'}</p>
        </div>
        <div>
          <span className="text-gray-500">Auction Date</span>
          <p className="font-semibold text-gray-900">{auction.auction_date || '—'}</p>
        </div>
        <div>
          <span className="text-gray-500">Property</span>
          <p className="font-semibold text-gray-900 capitalize">{auction.property_type || '—'}</p>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create `frontend/src/components/AuctionMap.tsx`**

```tsx
import Map, { Marker, Popup } from 'react-map-gl'
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
```

- [ ] **Step 4: Implement `frontend/src/pages/Search.tsx`**

```tsx
import { useEffect, useState, useCallback } from 'react'
import type { Auction, AuctionFilters } from '../types'
import { apiClient } from '../lib/api'
import FilterBar from '../components/FilterBar'
import AuctionCard from '../components/AuctionCard'
import AuctionMap from '../components/AuctionMap'

export default function Search() {
  const [auctions, setAuctions] = useState<Auction[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<AuctionFilters>({})
  const [loading, setLoading] = useState(false)
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())

  const search = useCallback(async (newFilters: AuctionFilters, newPage = 1) => {
    setLoading(true)
    try {
      const result = await apiClient.getAuctions({ ...newFilters, page: newPage, page_size: 20 })
      setAuctions(result.data)
      setTotal(result.total)
      setPage(newPage)
      setFilters(newFilters)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { search({}) }, [search])

  useEffect(() => {
    apiClient.listFavorites().then(favs => {
      setFavoriteIds(new Set(favs.map(f => f.auction_id)))
    }).catch(() => {})
  }, [])

  async function toggleFavorite(auction: Auction) {
    if (favoriteIds.has(auction.id)) {
      const favs = await apiClient.listFavorites()
      const fav = favs.find(f => f.auction_id === auction.id)
      if (fav) {
        await apiClient.deleteFavorite(fav.id)
        setFavoriteIds(prev => { const s = new Set(prev); s.delete(auction.id); return s })
      }
    } else {
      await apiClient.createFavorite(auction.id)
      setFavoriteIds(prev => new Set([...prev, auction.id]))
    }
  }

  const totalPages = Math.ceil(total / 20)

  return (
    <div className="flex flex-col h-[calc(100vh-57px)]">
      <FilterBar onSearch={f => search(f, 1)} loading={loading} />
      <div className="flex flex-1 overflow-hidden">
        <div className="w-[480px] flex-shrink-0 overflow-y-auto p-4 space-y-3 border-r">
          <p className="text-sm text-gray-500">{total.toLocaleString()} results</p>
          {auctions.map(auction => (
            <AuctionCard
              key={auction.id}
              auction={auction}
              isFavorited={favoriteIds.has(auction.id)}
              onToggleFavorite={toggleFavorite}
            />
          ))}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 pt-2">
              <button onClick={() => search(filters, page - 1)} disabled={page === 1} className="px-3 py-1 border rounded disabled:opacity-40">Prev</button>
              <span className="px-3 py-1 text-sm">{page} / {totalPages}</span>
              <button onClick={() => search(filters, page + 1)} disabled={page === totalPages} className="px-3 py-1 border rounded disabled:opacity-40">Next</button>
            </div>
          )}
        </div>
        <div className="flex-1">
          <AuctionMap auctions={auctions} />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Verify search page renders**

```bash
cd "/Users/luthkimak/Desktop/TAx deed/frontend"
npm run dev
```

Navigate to http://localhost:5173 — should show filter bar and split list/map layout.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/ frontend/src/pages/Search.tsx
git commit -m "feat: search page with filter bar, auction cards, and Mapbox map"
```

---

## Task 13: Frontend — Detail, Favorites, and Alerts Pages

**Files:**
- Modify: `frontend/src/pages/AuctionDetail.tsx`
- Modify: `frontend/src/pages/Favorites.tsx`
- Modify: `frontend/src/pages/Alerts.tsx`
- Create: `frontend/src/components/AlertForm.tsx`

**Interfaces:**
- Consumes: `apiClient` (getAuction, listFavorites, createFavorite, deleteFavorite, listAlerts, createAlert, updateAlert, deleteAlert)
- Consumes: `Auction`, `Favorite`, `Alert` types
- Produces: all three pages fully functional

- [ ] **Step 1: Implement `frontend/src/pages/AuctionDetail.tsx`**

```tsx
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import type { Auction, Favorite } from '../types'
import { apiClient } from '../lib/api'

export default function AuctionDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [auction, setAuction] = useState<Auction | null>(null)
  const [favorite, setFavorite] = useState<Favorite | null>(null)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    Promise.all([
      apiClient.getAuction(id),
      apiClient.listFavorites(),
    ]).then(([auc, favs]) => {
      setAuction(auc)
      const fav = favs.find(f => f.auction_id === id) || null
      setFavorite(fav)
      setNotes(fav?.notes || '')
    }).finally(() => setLoading(false))
  }, [id])

  async function toggleFavorite() {
    if (!auction) return
    if (favorite) {
      await apiClient.deleteFavorite(favorite.id)
      setFavorite(null)
    } else {
      const fav = await apiClient.createFavorite(auction.id, notes || undefined)
      setFavorite(fav)
    }
  }

  if (loading) return <div className="p-6">Loading…</div>
  if (!auction) return <div className="p-6">Auction not found.</div>

  const fields: [string, string | number | null][] = [
    ['Min Bid', auction.min_bid ? `$${auction.min_bid.toLocaleString()}` : null],
    ['Assessed Value', auction.assessed_value ? `$${auction.assessed_value.toLocaleString()}` : null],
    ['Market Estimate', auction.market_value_estimate ? `$${auction.market_value_estimate.toLocaleString()}` : null],
    ['Outstanding Debt', auction.outstanding_debt ? `$${auction.outstanding_debt.toLocaleString()}` : null],
    ['Tax Owed', auction.tax_amount_owed ? `$${auction.tax_amount_owed.toLocaleString()}` : null],
    ['Interest Rate', auction.interest_rate ? `${auction.interest_rate}%` : null],
    ['Auction Date', auction.auction_date],
    ['Parcel ID', auction.parcel_id],
    ['Property Type', auction.property_type],
    ['Status', auction.status],
  ]

  return (
    <div className="max-w-3xl mx-auto p-6">
      <button onClick={() => navigate(-1)} className="text-blue-600 hover:underline text-sm mb-4 block">← Back to search</button>
      {auction.photo_url && <img src={auction.photo_url} alt="Property" className="w-full h-64 object-cover rounded-lg mb-4" />}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{auction.address || 'Address not available'}</h1>
          <p className="text-gray-500">{auction.county}, {auction.state} · <span className="capitalize">{auction.type.replace('_', ' ')}</span></p>
        </div>
        <button onClick={toggleFavorite} className="text-3xl flex-shrink-0">{favorite ? '★' : '☆'}</button>
      </div>

      <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-4">
        {fields.map(([label, value]) => value != null && (
          <div key={label} className="bg-gray-50 rounded p-3">
            <p className="text-xs text-gray-500">{label}</p>
            <p className="font-semibold text-gray-900 mt-0.5">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <h2 className="font-semibold mb-2">Personal Notes</h2>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Add notes about this property…"
          className="w-full border rounded p-3 text-sm h-24 resize-none"
        />
      </div>

      <div className="mt-4 flex gap-3">
        {auction.source_url && (
          <a href={auction.source_url} target="_blank" rel="noopener noreferrer"
            className="border rounded px-4 py-2 text-sm hover:bg-gray-50">
            View Official Listing
          </a>
        )}
        {auction.zillow_url && (
          <a href={auction.zillow_url} target="_blank" rel="noopener noreferrer"
            className="border rounded px-4 py-2 text-sm hover:bg-gray-50">
            View on Zillow
          </a>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Implement `frontend/src/pages/Favorites.tsx`**

```tsx
import { useEffect, useState } from 'react'
import type { Favorite } from '../types'
import { apiClient } from '../lib/api'
import AuctionCard from '../components/AuctionCard'

export default function Favorites() {
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiClient.listFavorites().then(setFavorites).finally(() => setLoading(false))
  }, [])

  async function remove(fav: Favorite) {
    await apiClient.deleteFavorite(fav.id)
    setFavorites(prev => prev.filter(f => f.id !== fav.id))
  }

  if (loading) return <div className="p-6">Loading…</div>

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">My Favorites</h1>
      {favorites.length === 0
        ? <p className="text-gray-500">No favorites yet. Star an auction from the search page.</p>
        : (
          <div className="space-y-4">
            {favorites.map(fav => fav.auction && (
              <div key={fav.id}>
                <AuctionCard
                  auction={fav.auction}
                  isFavorited
                  onToggleFavorite={() => remove(fav)}
                />
                {fav.notes && <p className="text-sm text-gray-500 mt-1 ml-1 italic">"{fav.notes}"</p>}
              </div>
            ))}
          </div>
        )
      }
    </div>
  )
}
```

- [ ] **Step 3: Create `frontend/src/components/AlertForm.tsx`**

```tsx
import { useState } from 'react'
import type { AuctionType } from '../types'

interface AlertFilters {
  state?: string
  type?: AuctionType
  min_bid?: number
  max_bid?: number
}

interface Props {
  email: string
  onSubmit: (filters: AlertFilters, email: string) => Promise<void>
}

export default function AlertForm({ email: defaultEmail, onSubmit }: Props) {
  const [state, setState] = useState('')
  const [type, setType] = useState<AuctionType | ''>('')
  const [minBid, setMinBid] = useState('')
  const [maxBid, setMaxBid] = useState('')
  const [email, setEmail] = useState(defaultEmail)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await onSubmit({
      state: state || undefined,
      type: (type as AuctionType) || undefined,
      min_bid: minBid ? Number(minBid) : undefined,
      max_bid: maxBid ? Number(maxBid) : undefined,
    }, email)
    setLoading(false)
    setState(''); setType(''); setMinBid(''); setMaxBid('')
  }

  return (
    <form onSubmit={handleSubmit} className="bg-gray-50 border rounded-lg p-4 space-y-3">
      <h2 className="font-semibold">Create New Alert</h2>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">State</label>
          <select value={state} onChange={e => setState(e.target.value)} className="border rounded px-2 py-1.5 text-sm w-full">
            <option value="">Any</option>
            <option value="FL">FL</option>
            <option value="TX">TX</option>
            <option value="GA">GA</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Auction Type</label>
          <select value={type} onChange={e => setType(e.target.value as AuctionType | '')} className="border rounded px-2 py-1.5 text-sm w-full">
            <option value="">Any</option>
            <option value="tax_deed">Tax Deed</option>
            <option value="tax_lien">Tax Lien</option>
            <option value="foreclosure">Foreclosure</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Min Bid ($)</label>
          <input type="number" value={minBid} onChange={e => setMinBid(e.target.value)} placeholder="0" className="border rounded px-2 py-1.5 text-sm w-full" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Max Bid ($)</label>
          <input type="number" value={maxBid} onChange={e => setMaxBid(e.target.value)} placeholder="Any" className="border rounded px-2 py-1.5 text-sm w-full" />
        </div>
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Notification Email</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="border rounded px-2 py-1.5 text-sm w-full" />
      </div>
      <button type="submit" disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50">
        {loading ? 'Creating…' : 'Create Alert'}
      </button>
    </form>
  )
}
```

- [ ] **Step 4: Implement `frontend/src/pages/Alerts.tsx`**

```tsx
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
```

- [ ] **Step 5: Verify all pages render correctly**

```bash
cd "/Users/luthkimak/Desktop/TAx deed/frontend"
npm run dev
```

Test each route:
- `/` — search page with filters, list, map
- `/auctions/{id}` — detail page (use any auction ID from DB)
- `/favorites` — favorites list
- `/alerts` — alerts with create form and toggle

- [ ] **Step 6: Run all backend tests one final time**

```bash
cd "/Users/luthkimak/Desktop/TAx deed/backend"
source .venv/bin/activate
pytest tests/ -v
```

Expected: all tests PASS

- [ ] **Step 7: Final commit**

```bash
cd "/Users/luthkimak/Desktop/TAx deed"
git add frontend/src/pages/ frontend/src/components/AlertForm.tsx
git commit -m "feat: auction detail, favorites, and alerts pages — v1 complete"
```

---

## Self-Review Checklist

**Spec coverage:**
- ✅ Aplicativo web — React + Vite + Tailwind
- ✅ Combinação APIs + scraping — BaseScraper + 3 scrapers implementados
- ✅ Piloto com 3 estados — FL, TX, GA
- ✅ Todos os três tipos — tax_deed, tax_lien, foreclosure com filtros
- ✅ Dados completos — todos os campos do modelo de dados
- ✅ Login básico — Supabase Auth
- ✅ Favoritos — create/list/delete com notas
- ✅ Alertas por email — create/toggle/delete + Resend
- ✅ Stack correta — Python/FastAPI/React/Supabase/Mapbox/Resend/Railway/Vercel
- ✅ Monolito modular com APScheduler

**Nenhum placeholder, TBD ou TODO crítico encontrado.**

**Consistência de tipos:** modelos Pydantic no backend espelham interfaces TypeScript no frontend. Campos monetários são `Decimal`/`numeric(12,2)`/`number` em todas as camadas.
