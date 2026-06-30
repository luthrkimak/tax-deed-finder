# GovEase MS/GA Scraper — Design Spec

**Date:** 2026-06-30  
**Scope:** Mississippi (GovEase discovery + county pre-sale lists) and Georgia Glynn County (GovEase fixed)

---

## Problem

Mississippi uses GovEase for annual tax lien auctions (last Monday of August). The existing MS scraper returns empty because:
1. GovEase assigns a new auction ID each year — no fixed URL to hardcode
2. Auctions only exist on GovEase during July/August
3. Between auctions, county websites publish pre-sale delinquent lists

Georgia has one county (Glynn) on GovEase with a public, stable URL.

---

## Architecture

```
backend/scrapers/
  govease/
    __init__.py
    base.py          ← generic scraper: given (state, slug, auction_id), scrapes public browse page
    discovery.py     ← discovers active MS auctions from GovEase public dropdown (July/Aug only)
  mississippi/
    all_counties.py  ← updated: delegates to GovEaseDiscovery; county scrapers registered separately
    counties/
      __init__.py
      hinds.py
      harrison.py
      desoto.py
      rankin.py
      madison.py
      lee.py
      lauderdale.py
      forrest.py
      jackson.py
      lowndes.py
  georgia/
    __init__.py
    glynn.py         ← GovEaseBaseScraper subclass with fixed slug/id
```

---

## Component Details

### `govease/base.py` — GovEaseBaseScraper

- Inherits from `BaseScraper`
- Class attributes: `state: str`, `slug: str`, `auction_id: int`
- URL pattern: `https://liveauctions.govease.com/{state}/{slug}/{auction_id}/browsestandard`
- Uses Playwright (headless Chromium) with `wait_until="networkidle"` — same pattern as `RealForecloseScraper`
- Parses each `.auction-item` (or equivalent GovEase DOM class) for:
  - Parcel number / folio
  - Owner name
  - Property address
  - Starting bid / minimum bid
  - Sale date
  - Property type (when available)
- `auction_type` resolved from slug: contains `taxlien` → `"tax_lien"`, else `"tax_deed"`
- Fallback parcel ID: MD5 hash of `{address}-{county}-{state}` when parcel not found (same as RealForeclose)
- If page returns no items: returns `[]` silently (auction not yet open)

### `govease/discovery.py` — GovEaseDiscovery

- Inherits from `BaseScraper` (state="MS", county="ALL", source_name="govease_ms_discovery")
- Fetches `https://liveauctions.govease.com/PublicPortal/PublicRegisterAuctions` with Playwright
- Reads `select[name="single-default"]` options
- Filters entries with value prefix `ms|`
- Each matching entry has format `ms|{slug}|{auction_id}`
- For each: dynamically builds a `GovEaseBaseScraper` subclass and calls `.run()`
- Returns aggregate `ScrapeResult` (sum of all counties)
- If no `ms|` entries found: logs `INFO: no MS auctions on GovEase` and returns empty result

### `georgia/glynn.py` — GlynCountyScraper

```python
class GlynnCountyScraper(GovEaseBaseScraper):
    state = "GA"
    county = "Glynn"
    slug = "gaglynn"
    auction_id = 1208
    auction_type = "tax_deed"
    source_name = "glynn_ga"
```

Runs year-round. Returns `[]` when no active auction (non-fatal).

### MS County Pre-Sale Scrapers (top 10 by population)

Each inherits from `BaseScraper`, uses BeautifulSoup (no Playwright — static pages).

| File | County | Population | Source URL |
|---|---|---|---|
| `hinds.py` | Hinds | ~230k | hindscountyms.com delinquent list |
| `oktibbeha.py` | Oktibbeha | ~50k | co.oktibbeha.ms.us (Harrison uses GovEase — covered by Discovery) |
| `desoto.py` | DeSoto | ~190k | desotocountyms.gov tax sale |
| `rankin.py` | Rankin | ~160k | rankincounty.org |
| `madison.py` | Madison | ~110k | madison-co.com |
| `lee.py` | Lee | ~85k | leecotaxcollector.com |
| `lauderdale.py` | Lauderdale | ~80k | lauderdalecountyms.com |
| `forrest.py` | Forrest | ~75k | county website |
| `jackson.py` | Jackson | ~60k | co.jackson.ms.us |
| `lowndes.py` | Lowndes | ~60k | lowndesms.gov |

Each scraper:
- Has a hardcoded `source_url` pointing to the county's tax sale page
- Parses whatever structure the site uses (HTML table, PDF-to-text, or list)
- Maps fields to the standard dict schema
- Missing fields default to `null` — never blocks insertion

---

## Scheduler Integration

Minimal changes to `scheduler.py`:

```python
from scrapers.govease.discovery import GovEaseDiscovery
from scrapers.georgia.glynn import GlynnCountyScraper
from scrapers.mississippi.counties.hinds import HindsCountyScraper
# ... other MS county scrapers

# Always active
SCRAPERS = [
    ...,  # existing scrapers
    GlynnCountyScraper,
    HindsCountyScraper,
    # ... MS county website scrapers
]

# July/August only — appended at runtime
if datetime.now().month in (7, 8):
    SCRAPERS.append(GovEaseDiscovery)
```

MS county website scrapers run year-round but only find data in June–August when counties publish pre-sale lists. Outside that window they return `[]`.

---

## Error Handling

| Scenario | Behavior |
|---|---|
| GovEase has no MS entries | Log INFO, return empty, no error |
| One MS county fails on GovEase | Log error for that county, continue others |
| County website changes layout | Scraper raises exception → logged as `failed` in `scrape_logs`, does not crash scheduler |
| Parcel ID missing | MD5 hash fallback |
| Auction page returns 0 items | Silent `[]` return |

---

## Out of Scope

- GovEase authentication (not needed — data is public)
- MS counties outside top 10 (add incrementally)
- Other GA counties beyond Glynn (separate initiative)
- CivicSource integration (Lincoln County MS uses this — future work)
