from __future__ import annotations
import hashlib
import re
from datetime import datetime
from bs4 import BeautifulSoup, Tag
from playwright.sync_api import sync_playwright
from scrapers.base import BaseScraper

class RealForecloseScraper(BaseScraper):
    """Base for counties on the RealForeclose platform."""
    base_url: str
    auction_type: str = "foreclosure"
    ignore_ssl: bool = False  # set True for realtaxdeed.com counties

    def _get_html(self) -> str:
        ua = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(user_agent=ua, ignore_https_errors=self.ignore_ssl)
            page = context.new_page()
            page.goto(
                f"{self.base_url}/index.cfm?zaction=AUCTION&Zmethod=PREVIEW",
                timeout=30000,
            )
            page.wait_for_timeout(5000)
            html = page.content()
            browser.close()
        return html

    def _parse_label(self, item: Tag, label: str) -> str:
        for lbl in item.find_all(class_="AD_LBL"):
            if label.lower() in lbl.get_text(strip=True).lower():
                # Table layout: next <td> in same <tr>
                parent_tr = lbl.find_parent("tr")
                if parent_tr:
                    tds = parent_tr.find_all("td", class_="AD_DTA")
                    if tds:
                        return tds[0].get_text(strip=True)
                # Div layout: next sibling with AD_DTA class
                dta = lbl.find_next_sibling(class_="AD_DTA") or lbl.find_next(class_="AD_DTA")
                if dta:
                    return dta.get_text(strip=True)
        return ""

    def _parse_date(self, value: str) -> str | None:
        for fmt in ("%m/%d/%Y %I:%M %p %Z", "%m/%d/%Y %I:%M %p", "%m/%d/%Y"):
            try:
                return datetime.strptime(value.strip().split(" ET")[0].strip(), fmt).date().isoformat()
            except ValueError:
                continue
        return None

    @staticmethod
    def _parse_currency(value: str) -> float | None:
        cleaned = re.sub(r"[^\d.]", "", value)
        return float(cleaned) if cleaned else None

    def _parse_parcel_id(self, item: Tag) -> str:
        """Extract parcel ID preferring the folio query param from the link href."""
        for lbl in item.find_all(class_="AD_LBL"):
            if "parcel" in lbl.get_text(strip=True).lower():
                # Try to get folio from href (Miami-Dade pattern)
                parent_tr = lbl.find_parent("tr")
                search_root = parent_tr if parent_tr else item
                link = search_root.find("a", href=True) if search_root else None
                if link:
                    href = link.get("href", "")
                    m = re.search(r"folio=([0-9\-]+)", href)
                    if m and m.group(1):
                        return m.group(1)
                # Fall back to text — reject non-numeric parcel IDs
                text = self._parse_label(item, "Parcel ID")
                if re.search(r"\d", text):
                    return text
                return ""
        return ""

    def parse(self, html: str) -> list[dict]:
        soup = BeautifulSoup(html, "lxml")
        items = soup.find_all(class_="AUCTION_ITEM")
        records = []
        for item in items:
            # Auction date from stats block
            date_el = item.find(class_="ASTAT_MSGB")
            auction_date = self._parse_date(date_el.get_text(strip=True)) if date_el else None

            parcel_id = self._parse_parcel_id(item)
            address_line1 = self._parse_label(item, "Property Address")
            address_line2 = ""
            # second address line (city/zip) follows the first
            for lbl in item.find_all(class_="AD_LBL"):
                if "Property Address" in lbl.get_text(strip=True):
                    dta1 = lbl.find_next_sibling(class_="AD_DTA")
                    if dta1:
                        dta2 = dta1.find_next_sibling(class_="AD_DTA")
                        if dta2:
                            address_line2 = dta2.get_text(strip=True)
                    break

            address = f"{address_line1}, {self.state} {address_line2}".strip(", ") if address_line1 else None

            assessed_raw = self._parse_label(item, "Assessed Value")
            assessed = self._parse_currency(assessed_raw) if assessed_raw else None

            judgment_raw = self._parse_label(item, "Final Judgment Amount")
            min_bid = self._parse_currency(judgment_raw) if judgment_raw else None

            if not parcel_id and not address:
                continue

            # Generate fallback parcel_id from address+county to avoid upsert conflicts
            if not parcel_id:
                key = f"{address or ''}-{self.county}-{self.state}"
                parcel_id = f"RF-{hashlib.md5(key.encode()).hexdigest()[:12]}"

            records.append({
                "type": self.auction_type,
                "status": "upcoming",
                "state": self.state,
                "county": self.county,
                "address": address,
                "parcel_id": parcel_id or None,
                "min_bid": min_bid,
                "assessed_value": assessed,
                "auction_date": auction_date,
                "source": "scrape",
                "source_url": self.base_url,
            })
        return records

    def scrape(self) -> list[dict]:
        html = self._get_html()
        self.sleep()
        return self.parse(html)
