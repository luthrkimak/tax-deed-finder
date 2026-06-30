from __future__ import annotations
import logging
import httpx
from bs4 import BeautifulSoup
from scrapers.base import BaseScraper

logger = logging.getLogger(__name__)


class HindsCountyScraper(BaseScraper):
    state = "MS"
    county = "Hinds"
    source_name = "hinds_ms_website"
    source_url = "https://www.hindscountyms.com/delinquent-property-tax-lists-and-tax-sale-lists"

    def scrape(self) -> list[dict]:
        try:
            r = httpx.get(self.source_url, follow_redirects=True, timeout=20)
            r.raise_for_status()
            return self.parse(r.text)
        except Exception as exc:
            logger.error("%s scrape failed: %s", self.source_name, exc)
            return []

    def parse(self, html: str) -> list[dict]:
        # NOTE: Implement after researching site HTML in Step 2.
        # If the page has a table with parcel/address/bid columns, parse it here.
        # If the page links to a PDF, return [] for now (PDF support is out of scope).
        # If no list is present yet (off-season), return [].
        soup = BeautifulSoup(html, "lxml")
        records = []
        # TODO after research: add parsing logic here
        return records
