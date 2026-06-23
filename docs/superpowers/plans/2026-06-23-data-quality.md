# Data Quality — Abordagem A — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Melhorar qualidade dos dados sem APIs pagas: normalizar endereços para geocodificação mais precisa, auto-arquivar leilões passados e detectar cancelamentos nos scrapers FL.

**Architecture:** (1) Um módulo `address_normalizer.py` chamado pelo `geocoder.py` antes de enviar ao Nominatim. (2) Uma função `archive_past_auctions()` no scheduler, rodando diariamente às 00:00 UTC. (3) Um hook `_mark_cancellations()` no `BaseScraper` sobrescrito pelo `RealForecloseScraper` para detectar leilões FL que sumiram da fonte.

**Tech Stack:** Python 3.9, FastAPI, APScheduler, Supabase Python client, pytest, unittest.mock

## Global Constraints

- Python 3.9 — sem sintaxe 3.10+
- Sem dependências novas além das já em `requirements.txt`
- Todos os testes rodam com `pytest` no diretório `backend/`
- Working dir para comandos: sempre `backend/`
- Status values permitidos: `upcoming`, `active`, `sold`, `cancelled`, `archived`

---

### Task 1: Address Normalizer

**Files:**
- Create: `backend/scrapers/address_normalizer.py`
- Modify: `backend/scrapers/geocoder.py` (linhas 57-78)
- Create: `backend/tests/scrapers/test_address_normalizer.py`

**Interfaces:**
- Produces: `normalize_address(raw: str) -> str` — recebe endereço bruto, retorna com abreviações expandidas e title case

- [ ] **Step 1: Escrever o teste que falha**

```python
# backend/tests/scrapers/test_address_normalizer.py
from scrapers.address_normalizer import normalize_address

def test_expands_blvd():
    assert normalize_address("123 SUNSET BLVD") == "123 Sunset Boulevard"

def test_expands_dr():
    assert normalize_address("456 OAK DR") == "456 Oak Drive"

def test_expands_rd():
    assert normalize_address("789 PINE RD") == "789 Pine Road"

def test_expands_ave():
    assert normalize_address("10 MAIN AVE") == "10 Main Avenue"

def test_expands_st():
    assert normalize_address("55 ELM ST") == "55 Elm Street"

def test_expands_hwy():
    assert normalize_address("US HWY 27") == "Us Highway 27"

def test_expands_ct():
    assert normalize_address("3 ROSE CT") == "3 Rose Court"

def test_expands_ln():
    assert normalize_address("7 OAK LN") == "7 Oak Lane"

def test_expands_pkwy():
    assert normalize_address("100 PALM PKWY") == "100 Palm Parkway"

def test_collapses_double_spaces():
    assert normalize_address("123  MAIN  ST") == "123 Main Street"

def test_returns_empty_unchanged():
    assert normalize_address("") == ""

def test_returns_none_unchanged():
    assert normalize_address(None) is None

def test_full_fl_address():
    result = normalize_address("123 SUNSET BLVD, ORLANDO FL 32801")
    assert result == "123 Sunset Boulevard, Orlando Fl 32801"
```

- [ ] **Step 2: Confirmar que o teste falha**

```bash
cd backend && source .venv/bin/activate && pytest tests/scrapers/test_address_normalizer.py -v
```
Esperado: `ModuleNotFoundError` ou `ImportError` — arquivo ainda não existe.

- [ ] **Step 3: Criar `address_normalizer.py`**

```python
# backend/scrapers/address_normalizer.py
from __future__ import annotations
import re

_ABBREV = {
    "BLVD": "Boulevard",
    "DR": "Drive",
    "RD": "Road",
    "AVE": "Avenue",
    "ST": "Street",
    "HWY": "Highway",
    "CT": "Court",
    "LN": "Lane",
    "PL": "Place",
    "TER": "Terrace",
    "CIR": "Circle",
    "PKWY": "Parkway",
    "TRL": "Trail",
    "FWY": "Freeway",
    "EXPY": "Expressway",
    "SQ": "Square",
}


def normalize_address(raw: str | None) -> str | None:
    if not raw:
        return raw
    s = raw.upper()
    for abbr, full in _ABBREV.items():
        s = re.sub(rf"\b{abbr}\b", full, s)
    s = re.sub(r"  +", " ", s).strip()
    return s.title()
```

- [ ] **Step 4: Rodar testes e confirmar que passam**

```bash
cd backend && source .venv/bin/activate && pytest tests/scrapers/test_address_normalizer.py -v
```
Esperado: todos os testes `PASSED`.

- [ ] **Step 5: Integrar normalizer no geocoder.py**

Modificar `backend/scrapers/geocoder.py`. Adicionar import no topo e chamar o normalizer no loop `for row in rows:`:

```python
# Adicionar após os imports existentes:
from scrapers.address_normalizer import normalize_address
```

Substituir no loop (linha ~58) a linha:
```python
        addr = (row.get("address") or "").strip()
```
por:
```python
        addr = normalize_address((row.get("address") or "").strip()) or ""
```

- [ ] **Step 6: Confirmar que os testes existentes ainda passam**

```bash
cd backend && source .venv/bin/activate && pytest tests/ -v --ignore=tests/scrapers/test_address_normalizer.py -k "not test_auctions and not test_alerts and not test_favorites"
```
Esperado: nenhum `FAILED`.

- [ ] **Step 7: Commit**

```bash
cd backend && git add scrapers/address_normalizer.py scrapers/geocoder.py tests/scrapers/test_address_normalizer.py
git commit -m "feat: normalizar endereços antes do Nominatim — expandir abreviações FL"
```

---

### Task 2: Status `archived` + auto-archive de leilões passados

**Files:**
- Modify: `backend/models/auction.py` (linha 7 — AuctionStatus)
- Modify: `backend/scheduler.py` (adicionar função + job)
- Modify: `backend/api/routes/auctions.py` (filtro default nas queries)

**Interfaces:**
- Consumes: `get_supabase()` de `db.client`
- Produces: `archive_past_auctions() -> None` — atualiza `status = 'archived'` em leilões com `auction_date < hoje`

- [ ] **Step 1: Escrever testes que falham**

```python
# backend/tests/test_archive.py
from unittest.mock import MagicMock, patch, call
from datetime import date


@patch("scheduler.get_supabase")
def test_archive_past_auctions_updates_status(mock_get_supabase):
    mock_sb = MagicMock()
    mock_sb.table.return_value.update.return_value.lt.return_value.neq.return_value.execute.return_value.data = [
        {"id": "1"}, {"id": "2"}
    ]
    mock_get_supabase.return_value = mock_sb

    from scheduler import archive_past_auctions
    archive_past_auctions()

    mock_sb.table.assert_called_with("auctions")
    mock_sb.table.return_value.update.assert_called_with({"status": "archived"})


@patch("scheduler.get_supabase")
def test_archive_past_auctions_does_not_rearchive(mock_get_supabase):
    mock_sb = MagicMock()
    chain = mock_sb.table.return_value.update.return_value.lt.return_value.neq.return_value
    chain.execute.return_value.data = []
    mock_get_supabase.return_value = mock_sb

    from scheduler import archive_past_auctions
    archive_past_auctions()

    # neq("status", "archived") deve ter sido chamado
    mock_sb.table.return_value.update.return_value.lt.return_value.neq.assert_called_with("status", "archived")
```

- [ ] **Step 2: Confirmar que os testes falham**

```bash
cd backend && source .venv/bin/activate && pytest tests/test_archive.py -v
```
Esperado: `ImportError` — `archive_past_auctions` não existe ainda.

- [ ] **Step 3: Adicionar `archived` ao modelo**

Em `backend/models/auction.py`, linha 7, alterar:
```python
AuctionStatus = Literal["upcoming", "active", "sold", "cancelled"]
```
para:
```python
AuctionStatus = Literal["upcoming", "active", "sold", "cancelled", "archived"]
```

- [ ] **Step 4: Adicionar `archive_past_auctions` e job ao scheduler**

Em `backend/scheduler.py`, adicionar no topo após os imports existentes:
```python
from datetime import date
from db.client import get_supabase
```

Adicionar a função antes de `create_scheduler()`:
```python
def archive_past_auctions() -> None:
    sb = get_supabase()
    today = date.today().isoformat()
    result = (
        sb.table("auctions")
        .update({"status": "archived"})
        .lt("auction_date", today)
        .neq("status", "archived")
        .execute()
    )
    logger.info("Archived %d past auctions", len(result.data))
```

Em `create_scheduler()`, adicionar o terceiro job:
```python
    scheduler.add_job(archive_past_auctions, CronTrigger(hour=0, minute=0))
```

- [ ] **Step 5: Adicionar filtro default na API — excluir `archived` quando status não informado**

Em `backend/api/routes/auctions.py`, localizar o bloco de filtros em `get_auctions()`:
```python
    if status:
        query = query.eq("status", status)
```
Substituir por:
```python
    if status:
        query = query.eq("status", status)
    else:
        query = query.neq("status", "archived")
```

Fazer o mesmo em `get_pins()` — localizar:
```python
    query = sb.table("auctions").select("id,lat,lng,type,address,min_bid").not_.is_("lat", "null")
```
Substituir por:
```python
    query = sb.table("auctions").select("id,lat,lng,type,address,min_bid").not_.is_("lat", "null").neq("status", "archived")
```

- [ ] **Step 6: Rodar todos os testes**

```bash
cd backend && source .venv/bin/activate && pytest tests/test_archive.py tests/test_models.py -v
```
Esperado: todos `PASSED`.

- [ ] **Step 7: Migração no Supabase — permitir valor `archived`**

```bash
cd backend && source .venv/bin/activate && python3 -c "
from dotenv import load_dotenv; load_dotenv()
from db.client import get_supabase
sb = get_supabase()
# Remove constraint antiga e recria com 'archived' incluído
sb.rpc('exec_sql', {'sql': '''
  ALTER TABLE auctions DROP CONSTRAINT IF EXISTS auctions_status_check;
  ALTER TABLE auctions ADD CONSTRAINT auctions_status_check
    CHECK (status IN (\'upcoming\', \'active\', \'sold\', \'cancelled\', \'archived\'));
'''}).execute()
print('Migration OK')
"
```

Se o comando acima falhar (RPC não disponível), rodar via Supabase CLI:
```bash
supabase db query --project-ref aqigjdqwqkapiyjbhksu "
ALTER TABLE auctions DROP CONSTRAINT IF EXISTS auctions_status_check;
ALTER TABLE auctions ADD CONSTRAINT auctions_status_check
  CHECK (status IN ('upcoming', 'active', 'sold', 'cancelled', 'archived'));
"
```

- [ ] **Step 8: Commit**

```bash
git add backend/models/auction.py backend/scheduler.py backend/api/routes/auctions.py backend/tests/test_archive.py
git commit -m "feat: auto-arquivar leilões passados às 00:00 UTC, filtrar archived na API"
```

---

### Task 3: Detecção de cancelamentos FL (Orange County + Miami-Dade)

**Files:**
- Modify: `backend/scrapers/base.py` (adicionar hook `_mark_cancellations`)
- Modify: `backend/scrapers/realforeclose_base.py` (implementar detecção)
- Create: `backend/tests/scrapers/test_cancellation_detection.py`

**Interfaces:**
- Consumes: `ScrapeResult.new_ids` e `records` de `BaseScraper.run()`
- Produces: `_mark_cancellations(found_parcel_ids: set[str], sb) -> int` — retorna quantidade marcada como cancelled

- [ ] **Step 1: Escrever testes que falham**

```python
# backend/tests/scrapers/test_cancellation_detection.py
from unittest.mock import MagicMock, patch
from scrapers.realforeclose_base import RealForecloseScraper


class ConcreteRFScraper(RealForecloseScraper):
    state = "FL"
    county = "Orange"
    source_name = "test_rf"
    base_url = "https://test.realforeclose.com"
    auction_type = "foreclosure"

    def scrape(self) -> list[dict]:
        return []


def _make_mock_sb(active_in_db):
    mock_sb = MagicMock()
    (
        mock_sb.table.return_value
        .select.return_value
        .eq.return_value
        .eq.return_value
        .eq.return_value
        .gte.return_value
        .execute.return_value
        .data
    ) = active_in_db
    mock_sb.table.return_value.update.return_value.in_.return_value.execute.return_value.data = []
    return mock_sb


def test_marks_missing_parcel_as_cancelled():
    scraper = ConcreteRFScraper()
    mock_sb = _make_mock_sb([
        {"id": "aaa", "parcel_id": "P001"},
        {"id": "bbb", "parcel_id": "P002"},
    ])
    # P001 still in source, P002 disappeared
    count = scraper._mark_cancellations({"P001"}, mock_sb)
    assert count == 1
    mock_sb.table.return_value.update.assert_called_with({"status": "cancelled"})
    mock_sb.table.return_value.update.return_value.in_.assert_called_with("id", ["bbb"])


def test_no_cancellations_when_all_present():
    scraper = ConcreteRFScraper()
    mock_sb = _make_mock_sb([
        {"id": "aaa", "parcel_id": "P001"},
    ])
    count = scraper._mark_cancellations({"P001"}, mock_sb)
    assert count == 0
    mock_sb.table.return_value.update.return_value.in_.assert_not_called()


def test_no_cancellations_when_db_empty():
    scraper = ConcreteRFScraper()
    mock_sb = _make_mock_sb([])
    count = scraper._mark_cancellations({"P001"}, mock_sb)
    assert count == 0
```

- [ ] **Step 2: Confirmar que os testes falham**

```bash
cd backend && source .venv/bin/activate && pytest tests/scrapers/test_cancellation_detection.py -v
```
Esperado: `AttributeError: type object 'RealForecloseScraper' has no attribute '_mark_cancellations'` ou similar.

- [ ] **Step 3: Adicionar hook no `BaseScraper`**

Em `backend/scrapers/base.py`, adicionar método à classe `BaseScraper` após `def sleep(self)`:

```python
    def _mark_cancellations(self, found_parcel_ids: set[str], sb) -> int:
        """Hook — subclasses sobrescrevem para detectar cancelamentos na fonte."""
        return 0
```

Em `run()`, dentro do bloco `if records:`, após a linha `result.records_new = len(new_records)`, adicionar:

```python
                found_parcel_ids = {r.get("parcel_id") for r in records if r.get("parcel_id")}
                cancelled = self._mark_cancellations(found_parcel_ids, sb)
                if cancelled:
                    logger.info("%s: marked %d auctions as cancelled", self.source_name, cancelled)
```

- [ ] **Step 4: Implementar `_mark_cancellations` no `RealForecloseScraper`**

Em `backend/scrapers/realforeclose_base.py`, adicionar import no topo:
```python
from datetime import date
```

Adicionar método à classe `RealForecloseScraper` (antes de `parse()`):

```python
    def _mark_cancellations(self, found_parcel_ids: set[str], sb) -> int:
        today = date.today().isoformat()
        active = (
            sb.table("auctions")
            .select("id,parcel_id")
            .eq("state", self.state)
            .eq("county", self.county)
            .eq("status", "upcoming")
            .gte("auction_date", today)
            .execute()
            .data
        )
        to_cancel = [r["id"] for r in active if r.get("parcel_id") not in found_parcel_ids]
        if to_cancel:
            sb.table("auctions").update({"status": "cancelled"}).in_("id", to_cancel).execute()
        return len(to_cancel)
```

- [ ] **Step 5: Rodar todos os testes**

```bash
cd backend && source .venv/bin/activate && pytest tests/scrapers/test_cancellation_detection.py tests/test_scraper_base.py -v
```
Esperado: todos `PASSED`.

- [ ] **Step 6: Rodar suite completa**

```bash
cd backend && source .venv/bin/activate && pytest tests/ -v
```
Esperado: nenhum `FAILED` (warnings são OK).

- [ ] **Step 7: Commit**

```bash
git add backend/scrapers/base.py backend/scrapers/realforeclose_base.py backend/tests/scrapers/test_cancellation_detection.py
git commit -m "feat: detectar leilões FL cancelados na fonte após cada scrape"
```

---

### Task 4: Push e deploy

- [ ] **Step 1: Push para GitHub**

```bash
git push origin main
```

- [ ] **Step 2: Verificar deploy no Railway**

Acessar https://railway.app e confirmar que o build da revisão mais recente ficou verde.

- [ ] **Step 3: Smoke test — confirmar archive rodando**

```bash
cd backend && source .venv/bin/activate && python3 -c "
from dotenv import load_dotenv; load_dotenv()
from scheduler import archive_past_auctions
archive_past_auctions()
print('archive_past_auctions OK')
"
```
Esperado: `archive_past_auctions OK` sem erros.
