from __future__ import annotations
import re
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright
from scrapers.base import BaseScraper

SEARCH_URL = "https://www.dallascounty.org/departments/tax/foreclosure-sales.php"

class DallasCountyScraper(BaseScraper):
    state = "TX"
    county = "Dallas"
    source_name = "dallas_county_tx"

    def parse(self, html: str) -> list[dict]:
        soup = BeautifulSoup(html, "lxml")
        items = soup.select("div.listing-item")
        records = []
        for item in items:
            parcel = item.select_one(".parcel")
            address = item.select_one(".address")
            bid = item.select_one(".opening-bid")
            sale_date = item.select_one(".sale-date")
            if not all([parcel, address, bid]):
                continue
            records.append({
                "type": "foreclosure",
                "status": "upcoming",
                "state": self.state,
                "county": self.county,
                "parcel_id": parcel.get_text(strip=True),
                "address": address.get_text(strip=True),
                "min_bid": self._parse_currency(bid.get_text(strip=True)),
                "auction_date": sale_date.get_text(strip=True) if sale_date else None,
                "source": "scrape",
                "source_url": SEARCH_URL,
            })
        return records

    def scrape(self) -> list[dict]:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            page.goto(SEARCH_URL, timeout=30000)
            page.wait_for_selector("div.listing-item", timeout=15000)
            html = page.content()
            browser.close()
        self.sleep()
        return self.parse(html)

    @staticmethod
    def _parse_currency(value: str) -> float:
        cleaned = re.sub(r"[^\d.]", "", value)
        return float(cleaned) if cleaned else 0.0
