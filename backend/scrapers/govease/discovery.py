from __future__ import annotations
import logging
from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup
from scrapers.base import BaseScraper, ScrapeResult
from scrapers.govease.base import GovEaseBaseScraper
from scrapers.mississippi.all_counties import MS_GOVEASE_COUNTIES

logger = logging.getLogger(__name__)

REGISTER_URL = "https://liveauctions.govease.com/PublicPortal/PublicRegisterAuctions"

# MS canonical names keyed by slug (e.g. "msdesoto" → "DeSoto")
_MS_SLUG_TO_COUNTY: dict[str, str] = {
    f"ms{c.lower().replace(' ', '').replace('.', '')}": c
    for c in MS_GOVEASE_COUNTIES
}

# GA canonical names keyed by slug (e.g. "gaglynn" → "Glynn")
_GA_GOVEASE_COUNTIES = [
    "Glynn", "DeKalb", "Fulton", "Clayton", "Cobb", "Gwinnett",
    "Henry", "Muscogee", "Richmond", "Cherokee", "Forsyth", "Hall",
    "Bibb", "Columbia", "Chatham",
]
_GA_SLUG_TO_COUNTY: dict[str, str] = {
    f"ga{c.lower().replace(' ', '').replace('-', '').replace('.', '')}": c
    for c in _GA_GOVEASE_COUNTIES
}


def _parse_entries(html: str, prefix: str, slug_map: dict[str, str]) -> list[tuple[str, int, str]]:
    """Return list of (slug, auction_id, county_name) for a given state prefix."""
    soup = BeautifulSoup(html, "lxml")
    select = soup.find("select", {"name": "single-default"})
    if not select:
        return []
    entries = []
    for opt in select.find_all("option"):
        val = opt.get("value", "")
        if not val.startswith(f"{prefix}|"):
            continue
        parts = val.split("|")
        if len(parts) != 3:
            continue
        _, slug, auction_id_str = parts
        try:
            auction_id = int(auction_id_str)
        except ValueError:
            continue
        county_name = slug_map.get(slug, slug[len(prefix):].capitalize())
        entries.append((slug, auction_id, county_name))
    return entries


def _parse_ms_entries(html: str) -> list[tuple[str, int, str]]:
    return _parse_entries(html, "ms", _MS_SLUG_TO_COUNTY)


def _parse_ga_entries(html: str) -> list[tuple[str, int, str]]:
    return _parse_entries(html, "ga", _GA_SLUG_TO_COUNTY)


def _county_name_from_slug(slug: str) -> str:
    """Resolve an MS slug to its canonical county name (e.g. 'msdesoto' → 'DeSoto')."""
    return _MS_SLUG_TO_COUNTY.get(slug, slug[2:].capitalize())


def _dispatch(entries: list[tuple[str, int, str]], state: str, auction_type: str) -> None:
    for slug, auction_id, county_name in entries:
        ScraperClass = type(
            f"{county_name.replace(' ', '')}{state}GovEaseScraper",
            (GovEaseBaseScraper,),
            {
                "state": state,
                "county": county_name,
                "slug": slug,
                "auction_id": auction_id,
                "source_name": f"{slug}_govease",
                "auction_type": auction_type,
            },
        )
        try:
            ScraperClass().run()
            logger.info("GovEaseDiscovery: %s %s dispatched", state, county_name)
        except Exception as exc:
            logger.error("GovEaseDiscovery: %s %s failed: %s", state, county_name, exc)


class GovEaseDiscovery(BaseScraper):
    """Discovers active MS and GA counties on GovEase and orchestrates their scrapers."""
    state = "MS"
    county = "ALL"
    source_name = "govease_discovery"

    def _get_register_html(self) -> str:
        ua = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_context(user_agent=ua).new_page()
            page.goto(REGISTER_URL, timeout=30000, wait_until="networkidle")
            page.wait_for_timeout(2000)
            html = page.content()
            browser.close()
        return html

    def scrape(self) -> list[dict]:
        # Not called directly; GovEaseDiscovery overrides run() instead.
        return []

    def run(self) -> ScrapeResult:
        html = self._get_register_html()
        ms_entries = _parse_ms_entries(html)
        ga_entries = _parse_ga_entries(html)

        if not ms_entries and not ga_entries:
            logger.info("GovEaseDiscovery: no active auctions found on GovEase")
            return self._empty_result()

        if ms_entries:
            logger.info("GovEaseDiscovery: found %d MS counties", len(ms_entries))
            _dispatch(ms_entries, "MS", "tax_lien")

        if ga_entries:
            logger.info("GovEaseDiscovery: found %d GA counties", len(ga_entries))
            _dispatch(ga_entries, "GA", "tax_deed")

        return self._empty_result()

    def _empty_result(self) -> ScrapeResult:
        return ScrapeResult(records_found=0, records_new=0, new_ids=[])
