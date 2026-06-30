from __future__ import annotations
import logging
import re
from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup
from scrapers.base import BaseScraper
from scrapers.govease.base import GovEaseBaseScraper

logger = logging.getLogger(__name__)

REGISTER_URL = "https://liveauctions.govease.com/PublicPortal/PublicRegisterAuctions"


def _county_name_from_slug(slug: str) -> str:
    """Extract county name from slug like 'msadams' → 'Adams'."""
    name = re.sub(r"^ms", "", slug)
    return name.capitalize()


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
        html = self._get_register_html()
        entries = _parse_ms_entries(html)

        if not entries:
            logger.info("GovEaseDiscovery: no MS auctions found on GovEase")
            return []

        all_records: list[dict] = []
        for slug, auction_id, county_name in entries:
            ScraperClass = type(
                f"{county_name}MSGovEaseScraper",
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
                records = ScraperClass().scrape()
                all_records.extend(records)
                logger.info("GovEaseDiscovery: %s → %d records", county_name, len(records))
            except Exception as exc:
                logger.error("GovEaseDiscovery: %s failed: %s", county_name, exc)

        return all_records
