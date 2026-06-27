from __future__ import annotations
import hashlib
import re
from datetime import datetime, date

from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright

from scrapers.base import BaseScraper

SOURCE_URL = "https://apps2.collincountytx.gov/ForeclosureNotices"

PROP_TYPE_MAP = {
    "single family": "residential",
    "duplex": "residential",
    "townhouse": "residential",
    "condo": "residential",
    "multifamily": "residential",
    "residential": "residential",
    "commercial": "commercial",
    "retail": "commercial",
    "office": "commercial",
    "industrial": "commercial",
    "land": "land",
    "lot": "land",
    "acreage": "land",
    "farm": "land",
}


def _map_prop_type(raw: str) -> str | None:
    lower = raw.lower()
    for key, val in PROP_TYPE_MAP.items():
        if key in lower:
            return val
    return None


def _parse_date(value: str) -> str | None:
    """Convert MM/DD/YYYY to YYYY-MM-DD."""
    try:
        return datetime.strptime(value.strip(), "%m/%d/%Y").date().isoformat()
    except ValueError:
        return None


def _parse_row(row_text: str) -> dict | None:
    """Parse a single table row's text into a record dict."""
    lines = [l.strip() for l in row_text.split("\n") if l.strip()]
    if len(lines) < 4:
        return None

    address_line = lines[0]

    def _field(label: str) -> str:
        for line in lines:
            if line.lower().startswith(label.lower()):
                return line.split(":", 1)[-1].strip()
        return ""

    sale_date_str = _field("Sale Date")
    prop_type_raw = _field("Property Type")

    auction_date = _parse_date(sale_date_str)
    if not auction_date:
        return None

    # Only keep upcoming auctions
    if auction_date < date.today().isoformat():
        return None

    prop_type = _map_prop_type(prop_type_raw)

    # Build a stable parcel_id from address + sale date
    key = f"{address_line}-{auction_date}"
    parcel_id = f"CC-{hashlib.md5(key.encode()).hexdigest()[:12]}"

    return {
        "type": "foreclosure",
        "status": "upcoming",
        "state": "TX",
        "county": "Collin",
        "address": address_line,
        "parcel_id": parcel_id,
        "auction_date": auction_date,
        "property_type": prop_type,
        "source": "scrape",
        "source_url": SOURCE_URL,
    }


class CollinCountyScraper(BaseScraper):
    state = "TX"
    county = "Collin"
    source_name = "collin_county_tx"

    def scrape(self) -> list[dict]:
        ua = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        records: list[dict] = []

        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page(user_agent=ua)
            page.goto(SOURCE_URL, wait_until="networkidle", timeout=30000)
            page.wait_for_timeout(3000)

            page_num = 1
            while True:
                # Extract current page rows
                rows = page.query_selector_all("tr")
                for row in rows:
                    text = row.inner_text().strip()
                    if len(text) < 20:
                        continue
                    record = _parse_row(text)
                    if record:
                        records.append(record)

                # Click "Next page" if available
                next_btn = page.query_selector('button[aria-label="Next page"]:not([disabled])')
                if not next_btn:
                    break
                next_btn.click()
                page.wait_for_timeout(1500)
                page_num += 1
                if page_num > 30:  # safety cap
                    break

            browser.close()

        self.sleep()
        return records
