# Tax Deed Finder — Design Spec
**Data:** 2026-06-19  
**Status:** Aprovado  

---

## Visão Geral

Aplicativo web para buscar e monitorar leilões de **Tax Deed**, **Tax Lien** e **Foreclosure** nos EUA. O sistema coleta dados automaticamente de APIs pagas e scraping de sites oficiais de condados, apresenta os resultados com filtros e mapa interativo, e envia alertas por email quando novos leilões correspondem aos critérios do usuário.

**Escopo inicial (piloto):** Florida, Texas e Georgia.

---

## Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| Front-end | React + Vite + Tailwind CSS |
| Back-end | Python + FastAPI |
| Scraping | Playwright + BeautifulSoup |
| Banco de dados | Supabase (Postgres) |
| Autenticação | Supabase Auth |
| Alertas email | Resend |
| Deploy front | Vercel |
| Deploy back | Railway |

---

## Arquitetura

```
┌─────────────────────────────────────────────────────────┐
│                    FRONT-END (React)                     │
│  Busca | Filtros | Mapa | Favoritos | Alertas | Login    │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTP / REST
┌──────────────────────▼──────────────────────────────────┐
│                  BACK-END (FastAPI)                      │
│                                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌────────────────┐  │
│  │  API Routes │  │   Scraper   │  │  Notificações  │  │
│  │  /auctions  │  │  Agendado   │  │  (email alert) │  │
│  │  /auth      │  │  (diário)   │  │                │  │
│  │  /favorites │  └──────┬──────┘  └───────┬────────┘  │
│  └──────┬──────┘         │                 │           │
└─────────┼────────────────┼─────────────────┼───────────┘
          │                │                 │
┌─────────▼────────────────▼─────────────────▼───────────┐
│                  SUPABASE (Postgres)                     │
│  auctions | users | favorites | alerts | scrape_logs    │
└─────────────────────────────────────────────────────────┘
          │
┌─────────▼───────────────────────────────────────────────┐
│              FONTES DE DADOS EXTERNAS                    │
│  APIs: ATTOM, PropertyRadar, RealtyTrac                  │
│  Scraping: Sites oficiais de condados (Playwright)       │
│  Enriquecimento: Zillow API (valor de mercado)           │
└─────────────────────────────────────────────────────────┘
```

**Padrão arquitetural:** Monolito modular — um único back-end Python com módulos separados para API, scraping, agendamento e notificações. Escalável para filas (Celery + Redis) quando o volume de estados aumentar.

---

## Modelo de Dados

```sql
-- Leilões (tabela central)
auctions (
  id                    UUID PRIMARY KEY,
  type                  ENUM (tax_deed, tax_lien, foreclosure),
  status                ENUM (upcoming, active, sold, cancelled),
  auction_date          DATE,
  state                 VARCHAR(2),
  county                VARCHAR(100),
  address               TEXT,
  parcel_id             VARCHAR(100),
  property_type         ENUM (residential, commercial, land),
  min_bid               DECIMAL(12,2),
  assessed_value        DECIMAL(12,2),
  market_value_estimate DECIMAL(12,2),
  outstanding_debt      DECIMAL(12,2),
  tax_amount_owed       DECIMAL(12,2),
  interest_rate         DECIMAL(5,2),  -- para tax lien
  photo_url             TEXT,
  zillow_url            TEXT,
  redfin_url            TEXT,
  source                ENUM (api, scrape),
  source_url            TEXT,
  created_at            TIMESTAMPTZ,
  updated_at            TIMESTAMPTZ
)

-- Usuários (gerenciado pelo Supabase Auth)
users (
  id         UUID PRIMARY KEY,
  email      VARCHAR(255),
  created_at TIMESTAMPTZ
)

-- Favoritos
favorites (
  id         UUID PRIMARY KEY,
  user_id    UUID REFERENCES users(id),
  auction_id UUID REFERENCES auctions(id),
  notes      TEXT,
  created_at TIMESTAMPTZ
)

-- Alertas
alerts (
  id           UUID PRIMARY KEY,
  user_id      UUID REFERENCES users(id),
  filters      JSONB,  -- {state, county, type, min_bid, max_bid, property_type}
  email        VARCHAR(255),
  active       BOOLEAN DEFAULT true,
  last_sent_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ
)

-- Log de scraping
scrape_logs (
  id             UUID PRIMARY KEY,
  source         VARCHAR(100),
  state          VARCHAR(2),
  county         VARCHAR(100),
  records_found  INTEGER,
  records_new    INTEGER,
  status         ENUM (success, partial, failed),
  error_message  TEXT,
  ran_at         TIMESTAMPTZ
)
```

---

## Telas do Front-End

### 1. Busca / Dashboard
- Barra de filtros: Estado, Condado, Tipo de leilão, Faixa de preço, Data, Tipo de imóvel
- Resultados em lista (esquerda) + mapa interativo Mapbox com pins por tipo (direita)
- Cada card: endereço, tipo, lance mínimo, data, valor avaliado, botão favoritar

### 2. Detalhe do Imóvel
- Fotos, endereço completo, todos os campos financeiros
- Histórico de impostos, estimativa Zillow, link para edital oficial
- Botão favoritar + campo de notas pessoais

### 3. Favoritos
- Lista dos imóveis salvos com notas
- Indicador visual de mudança de status (ex: leilão encerrado)

### 4. Alertas
- Criar alerta com filtros (estado, condado, tipo, faixa de preço)
- Lista de alertas ativos com toggle on/off e último disparo

### 5. Login / Cadastro
- Email + senha via Supabase Auth
- Recuperação de senha por email

---

## Estratégia de Coleta de Dados

### Camada 1 — APIs pagas
| API | Dados | Custo estimado |
|-----|-------|----------------|
| ATTOM Data | Avaliação, histórico, propriedade | ~$99-299/mês |
| PropertyRadar | Foreclosure, tax default | ~$49-99/mês |
| Zillow Bridge API | Estimativa de mercado | Gratuita (limitada) |

### Camada 2 — Scraping direto
| Estado | Fonte | Método |
|--------|-------|--------|
| Florida | Portais dos condados (ex: myorangeclerk.realforeclose.com) | Playwright |
| Texas | dallascounty.org, hctx.net | Playwright |
| Georgia | govease.com | BeautifulSoup + Playwright |

### Agendamento
- APScheduler dentro do FastAPI
- Execução diária às 02:00 (horário do servidor)
- Cada condado tem scraper isolado em `scrapers/{state}/{county}.py`
- Após coleta: detecta novos registros, dispara alertas por email

---

## Tratamento de Erros

| Cenário | Comportamento |
|---------|---------------|
| Scraper falha | Registra em `scrape_logs`, notificação interna, tenta novamente no dia seguinte |
| Estrutura do site mudou | Falha graciosamente sem derrubar a API, log indica condado afetado |
| API externa indisponível | Retorna dados do banco (cache), front-end exibe data da última atualização |
| Rate limiting detectado | Delays configuráveis entre requisições (1-3s padrão) |

---

## Testes

| Tipo | Ferramenta | Cobertura |
|------|-----------|-----------|
| Unitários | pytest | Parsers de scraping, lógica de filtros, formatação |
| Integração | pytest + Supabase local | Endpoints da API |
| E2E | Playwright | Busca, login, favoritar, criar alerta |

---

## Estrutura de Pastas

```
tax-deed-finder/
├── backend/
│   ├── api/
│   │   ├── routes/
│   │   │   ├── auctions.py
│   │   │   ├── favorites.py
│   │   │   └── alerts.py
│   │   └── main.py
│   ├── scrapers/
│   │   ├── florida/
│   │   │   ├── orange_county.py
│   │   │   └── miami_dade.py
│   │   ├── texas/
│   │   │   └── dallas_county.py
│   │   └── georgia/
│   │       └── fulton_county.py
│   ├── models/
│   │   └── auction.py
│   ├── scheduler.py
│   └── notifications.py
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Search.tsx
│   │   │   ├── AuctionDetail.tsx
│   │   │   ├── Favorites.tsx
│   │   │   └── Alerts.tsx
│   │   ├── components/
│   │   └── lib/
│   │       ├── supabase.ts
│   │       └── api.ts
│   └── index.html
└── docs/
    └── superpowers/specs/
```

---

## Custo Estimado (Piloto)

| Serviço | Plataforma | Custo/mês |
|---------|-----------|-----------|
| Front-end | Vercel | Gratuito |
| Back-end | Railway | ~$5 |
| Banco de dados | Supabase | Gratuito (até 500MB) |
| Email | Resend | Gratuito (3.000 emails) |
| **Total sem APIs pagas** | | **~$5/mês** |
| Com ATTOM + PropertyRadar | | ~$60-150/mês |

---

## Fora do Escopo (v1)

- Múltiplos usuários / CRM
- Histórico de lances do usuário
- Notificações push / SMS
- Cobertura de todos os 50 estados
- Análise de risco automatizada do imóvel
