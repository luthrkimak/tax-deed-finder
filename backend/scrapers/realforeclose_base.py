from __future__ import annotations
import hashlib
import re
from datetime import datetime, date, timedelta
from bs4 import BeautifulSoup, Tag
from playwright.sync_api import sync_playwright
from scrapers.base import BaseScraper

class RealForecloseScraper(BaseScraper):
    """Base for counties on the RealForeclose platform."""
    base_url: str
    auction_type: str = "foreclosure"
    ignore_ssl: bool = False  # set True for realtaxdeed.com counties

    # Horizon in days: follow "Next Auction" links until the date exceeds this window.
    SCRAPE_HORIZON_DAYS: int = 15
    # Safety cap on page loads regardless of dates (avoid infinite loops on broken nav).
    MAX_PAGE_LOADS: int = 20

    def _get_html(self) -> str:
        """Fetch and combine HTML from the default preview page plus all upcoming date pages
        within the next SCRAPE_HORIZON_DAYS days.

        The RealForeclose platform shows one auction date at a time. Each page has a
        "Next Auction" link pointing to the next scheduled date. We follow that chain in
        a single browser session (session cookies required for date-specific URLs).
        """
        ua = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        collected_items: list[str] = []
        cutoff = date.today() + timedelta(days=self.SCRAPE_HORIZON_DAYS)

        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(user_agent=ua, ignore_https_errors=self.ignore_ssl)
            pw_page = context.new_page()

            def _load(url: str) -> str:
                pw_page.goto(url, timeout=30000, wait_until="networkidle")
                pw_page.wait_for_timeout(2000)
                return pw_page.content()

            # First load establishes the session and returns today's/current date auctions.
            html = _load(f"{self.base_url}/index.cfm?zaction=AUCTION&Zmethod=PREVIEW")
            soup = BeautifulSoup(html, "lxml")
            collected_items.extend(str(el) for el in soup.find_all(class_="AUCTION_ITEM"))

            # Follow "Next Auction" links until the date exceeds the 30-day window.
            visited: set[str] = set()
            for _ in range(self.MAX_PAGE_LOADS):
                next_tag = soup.find("a", string=lambda t: t and "Next Auction" in t)
                if not next_tag:
                    break
                href = str(next_tag.get("href", ""))
                m = re.search(r"AuctionDate=(\d{2}/\d{2}/\d{4})", href, re.IGNORECASE)
                if not m or m.group(1) in visited:
                    break
                next_date_str = m.group(1)
                try:
                    next_date_obj = datetime.strptime(next_date_str, "%m/%d/%Y").date()
                except ValueError:
                    break
                if next_date_obj > cutoff:
                    break
                visited.add(next_date_str)
                html = _load(
                    f"{self.base_url}/index.cfm?zaction=AUCTION&Zmethod=PREVIEW&AuctionDate={next_date_str}"
                )
                soup = BeautifulSoup(html, "lxml")
                collected_items.extend(str(el) for el in soup.find_all(class_="AUCTION_ITEM"))

            browser.close()

        return f"<div>{''.join(collected_items)}</div>"

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

    _CANCELLED_KEYWORDS = {"canceled", "cancelled", "redeemed", "rescheduled"}

    def _parse_status(self, msga: str, msgb: str) -> tuple[str, str | None]:
        """Return (status, auction_date_iso) from ASTAT_MSGA and ASTAT_MSGB text."""
        msga_lower = msga.lower()
        msgb_lower = msgb.lower()

        if any(k in msgb_lower for k in self._CANCELLED_KEYWORDS):
            return "cancelled", None

        auction_date = self._parse_date(msgb)

        if "sold" in msga_lower:
            return "sold", auction_date

        return "upcoming", auction_date

    def parse(self, html: str) -> list[dict]:
        soup = BeautifulSoup(html, "lxml")
        items = soup.find_all(class_="AUCTION_ITEM")
        records = []
        for item in items:
            msga = (item.find(class_="ASTAT_MSGA") or type("", (), {"get_text": lambda *a, **k: ""})()).get_text(strip=True)
            msgb = (item.find(class_="ASTAT_MSGB") or type("", (), {"get_text": lambda *a, **k: ""})()).get_text(strip=True)
            status, auction_date = self._parse_status(msga, msgb)

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

            if address_line1:
                if address_line2:
                    address = f"{address_line1}, {address_line2}, {self.state}"
                else:
                    address = f"{address_line1}, {self.state}"
            else:
                address = None

            assessed_raw = self._parse_label(item, "Assessed Value")
            assessed = self._parse_currency(assessed_raw) if assessed_raw else None

            judgment_raw = (
                self._parse_label(item, "Opening Bid")
                or self._parse_label(item, "Final Judgment Amount")
            )
            min_bid = self._parse_currency(judgment_raw) if judgment_raw else None

            if not parcel_id and not address:
                continue

            # Generate fallback parcel_id from address+county to avoid upsert conflicts
            if not parcel_id:
                key = f"{address or ''}-{self.county}-{self.state}"
                parcel_id = f"RF-{hashlib.md5(key.encode()).hexdigest()[:12]}"

            records.append({
                "type": self.auction_type,
                "status": status,
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
