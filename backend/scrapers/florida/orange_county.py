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
