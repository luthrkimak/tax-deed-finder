from __future__ import annotations
import logging
import httpx
from bs4 import BeautifulSoup
from scrapers.base import BaseScraper

logger = logging.getLogger(__name__)


class RankinCountyScraper(BaseScraper):
    state = "MS"
    county = "Rankin"
    source_name = "rankin_ms_website"
    source_url = "https://www.rankincounty.org/161/Tax-Collector"

    def scrape(self) -> list[dict]:
        try:
            r = httpx.get(self.source_url, follow_redirects=True, timeout=20)
            r.raise_for_status()
            return self.parse(r.text)
        except Exception as exc:
            logger.error("%s scrape failed: %s", self.source_name, exc)
            return []

    def parse(self, html: str) -> list[dict]:
        soup = BeautifulSoup(html, "lxml")
        return []  # Implement after Step 2 research
