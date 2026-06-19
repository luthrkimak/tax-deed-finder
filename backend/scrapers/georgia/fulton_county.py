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
