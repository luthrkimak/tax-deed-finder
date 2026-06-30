from __future__ import annotations
import re
import hashlib
from datetime import datetime
from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup
from scrapers.base import BaseScraper

_TYPE_MAP = {
    "tax lien": "tax_lien",
    "tax deed": "tax_deed",
    "deed": "tax_deed",
    "redeemable tax deed": "tax_deed",
    "foreclosure": "foreclosure",
}

class GovEaseBaseScraper(BaseScraper):
    """Scrapes a single GovEase county auction from the public browsestandard page."""
    slug: str
    auction_id: int
    auction_type: str = "tax_lien"

    @property
    def source_url(self) -> str:
        return (
            f"https://liveauctions.govease.com"
            f"/{self.state.lower()}/{self.slug}/{self.auction_id}/browsestandard"
        )

    def _get_html(self) -> str:
        ua = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_context(user_agent=ua).new_page()
            page.goto(self.source_url, timeout=30000, wait_until="networkidle")
            page.wait_for_timeout(2000)
            html = page.content()
            browser.close()
        return html

    def parse(self, html: str) -> list[dict]:
        soup = BeautifulSoup(html, "lxml")
        rows = soup.select("table tbody tr.nobid")
        records = []
        for row in rows:
            cells = row.find_all("td")
            if len(cells) < 10:
                continue

            parcel_id = cells[3].get_text(strip=True)
            bid_text = cells[5].get_text(strip=True)
            type_text = cells[9].get_text(strip=True).lower()
            desc_text = cells[6].get_text(strip=True)

            # Parse starting bid
            bid_clean = re.sub(r"[^\d.]", "", bid_text)
            min_bid = float(bid_clean) if bid_clean else None

            # Map auction type
            auction_type = self.auction_type
            for key, val in _TYPE_MAP.items():
                if key in type_text:
                    auction_type = val
                    break

            # Parse auction date from description
            auction_date = None
            m = re.search(r"(\d{1,2}/\d{1,2}/\d{4})", desc_text)
            if m:
                try:
                    auction_date = datetime.strptime(m.group(1), "%m/%d/%Y").date().isoformat()
                except ValueError:
                    pass

            # Skip rows with no parcel_id
            if not parcel_id:
                owner_text = cells[4].get_text(strip=True)
                if not owner_text:
                    continue
                fallback_key = f"{owner_text}-{self.county}-{self.state}"
                parcel_id = f"GE-{hashlib.md5(fallback_key.encode()).hexdigest()[:12]}"

            records.append({
                "type": auction_type,
                "status": "upcoming",
                "state": self.state,
                "county": self.county,
                "address": None,
                "parcel_id": parcel_id,
                "min_bid": min_bid,
                "assessed_value": None,
                "auction_date": auction_date,
                "source": "scrape",
                "source_url": self.source_url,
            })
        return records

    def scrape(self) -> list[dict]:
        html = self._get_html()
        self.sleep()
        return self.parse(html)
