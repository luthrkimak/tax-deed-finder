from __future__ import annotations
import re
from datetime import datetime
from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup
from scrapers.base import BaseScraper

SOURCE_URL = (
    "https://publicaccess.dekalbtax.org"
    "/forms/htmlframe.aspx?mode=content/search/tax_sale_listing.html"
)


class DeKalbCountyScraper(BaseScraper):
    state = "GA"
    county = "DeKalb"
    source_name = "dekalb_county_ga"

    def parse(self, html: str) -> list[dict]:
        soup = BeautifulSoup(html, "lxml")
        # Page has a hidden maintenance table first; find the data table by header
        table = next(
            (t for t in soup.find_all("table")
             if t.find("th") and "Tax Sale Date" in t.get_text()),
            None,
        )
        if not table:
            return []
        records = []
        for row in table.select("tbody tr"):
            cells = row.find_all("td")
            if len(cells) < 15:
                continue
            date_text = cells[0].get_text(strip=True)
            parcel_id = cells[1].get_text(strip=True)
            address = cells[5].get_text(strip=True)
            bid_text = cells[14].get_text(strip=True)

            try:
                auction_date = datetime.strptime(date_text, "%d-%b-%Y").date().isoformat()
            except ValueError:
                auction_date = None

            bid_clean = re.sub(r"[^\d.]", "", bid_text)
            min_bid = float(bid_clean) if bid_clean else None

            if not parcel_id and not address:
                continue

            records.append({
                "type": "tax_deed",
                "status": "upcoming",
                "state": self.state,
                "county": self.county,
                "address": f"{address}, GA" if address else None,
                "parcel_id": parcel_id,
                "min_bid": min_bid,
                "assessed_value": None,
                "auction_date": auction_date,
                "source": "scrape",
                "source_url": SOURCE_URL,
            })
        return records

    def scrape(self) -> list[dict]:
        ua = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_context(user_agent=ua).new_page()
            page.goto(SOURCE_URL, timeout=30000, wait_until="networkidle")
            page.wait_for_timeout(2000)
            html = page.content()
            browser.close()
        self.sleep()
        return self.parse(html)
