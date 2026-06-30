from __future__ import annotations
import logging
import re
from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup
from scrapers.base import BaseScraper, ScrapeResult
from scrapers.govease.base import GovEaseBaseScraper
from scrapers.mississippi.all_counties import MS_GOVEASE_COUNTIES

logger = logging.getLogger(__name__)

REGISTER_URL = "https://liveauctions.govease.com/PublicPortal/PublicRegisterAuctions"

_SLUG_TO_COUNTY: dict[str, str] = {
    f"ms{c.lower().replace(' ', '').replace('.', '')}": c
    for c in MS_GOVEASE_COUNTIES
}


def _county_name_from_slug(slug: str) -> str:
    """Resolve slug like 'msdesoto' → 'DeSoto' using canonical county name list."""
    return _SLUG_TO_COUNTY.get(slug, slug[2:].capitalize())


def _parse_ms_entries(html: str) -> list[tuple[str, int, str]]:
    """Return list of (slug, auction_id, county_name) for MS entries."""
    soup = BeautifulSoup(html, "lxml")
    select = soup.find("select", {"name": "single-default"})
    if not select:
        return []
    entries = []
    for opt in select.find_all("option"):
        val = opt.get("value", "")
        if not val.startswith("ms|"):
            continue
        parts = val.split("|")
        if len(parts) != 3:
            continue
        _, slug, auction_id_str = parts
        try:
            auction_id = int(auction_id_str)
        except ValueError:
            continue
        county_name = _county_name_from_slug(slug)
        entries.append((slug, auction_id, county_name))
    return entries


class GovEaseDiscovery(BaseScraper):
    """Discovers active MS counties on GovEase and orchestrates their scrapers."""
    state = "MS"
    county = "ALL"
    source_name = "govease_ms_discovery"

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
        entries = _parse_ms_entries(html)

        if not entries:
            logger.info("GovEaseDiscovery: no MS auctions found on GovEase")
            return self._empty_result()

        for slug, auction_id, county_name in entries:
            ScraperClass = type(
                f"{county_name.replace(' ', '')}MSGovEaseScraper",
                (GovEaseBaseScraper,),
                {
                    "state": "MS",
                    "county": county_name,
                    "slug": slug,
                    "auction_id": auction_id,
                    "source_name": f"{slug}_govease",
                    "auction_type": "tax_lien",
                },
            )
            try:
                ScraperClass().run()
                logger.info("GovEaseDiscovery: %s dispatched", county_name)
            except Exception as exc:
                logger.error("GovEaseDiscovery: %s failed: %s", county_name, exc)

        return self._empty_result()

    def _empty_result(self) -> ScrapeResult:
        return ScrapeResult(records_found=0, records_new=0, new_ids=[])
