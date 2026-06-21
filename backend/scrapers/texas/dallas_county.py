from __future__ import annotations
import hashlib
import io
import re
import requests
from datetime import datetime
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright
from scrapers.base import BaseScraper

BASE_URL = "https://www.dallascounty.org"
NOTICES_URL = f"{BASE_URL}/government/county-clerk/recording/foreclosures.php"
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
MONTHS_ORDER = ["July","June","May","April","March","February","January","December","November","October","September","August"]


class DallasCountyScraper(BaseScraper):
    state = "TX"
    county = "Dallas"
    source_name = "dallas_county_tx"

    def _get_pdf_urls(self) -> list[str]:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page(user_agent=UA)
            page.goto(NOTICES_URL, timeout=30000)
            page.wait_for_timeout(5000)
            html = page.content()
            browser.close()

        soup = BeautifulSoup(html, "lxml")
        all_pdfs = [
            BASE_URL + a["href"]
            for a in soup.find_all("a", href=True)
            if a["href"].lower().endswith(".pdf")
        ]

        # Pick most recent month available
        for month in MONTHS_ORDER:
            month_pdfs = [u for u in all_pdfs if f"/foreclosure/{month}/" in u]
            if month_pdfs:
                return month_pdfs

        return []

    def _parse_pdf(self, url: str) -> dict | None:
        try:
            import pypdf
            r = requests.get(url, headers={"User-Agent": UA}, timeout=30)
            reader = pypdf.PdfReader(io.BytesIO(r.content))
            text = "\n".join(p.extract_text() or "" for p in reader.pages)
        except Exception:
            return None

        lines = [l.strip() for l in text.split("\n") if l.strip()]

        # Address: first line starting with digits, followed by city/state line
        address = None
        for i, line in enumerate(lines[:8]):
            if re.match(r"^\d+", line) and i + 1 < len(lines):
                next_line = lines[i + 1]
                if re.search(r"TX\s+\d{5}", next_line):
                    # Fix merged words: insert space before each uppercase run after digits
                    street = re.sub(r"(?<=[A-Z])(?=[A-Z]{2,})", " ", line)
                    street = re.sub(r"(?<=\d)(?=[A-Za-z])", " ", street)
                    address = f"{street.title()}, {next_line.title()}"
                    break

        # Sale date
        auction_date = None
        date_match = re.search(r"Date:\s*([A-Za-z]+ \d{1,2},\s*\d{4}|\d{1,2}/\d{1,2}/\d{4})", text)
        if date_match:
            raw = date_match.group(1).strip()
            for fmt in ("%B %d, %Y", "%m/%d/%Y"):
                try:
                    auction_date = datetime.strptime(raw, fmt).date().isoformat()
                    break
                except ValueError:
                    continue

        if not address and not auction_date:
            return None

        # Use URL hash as parcel_id to avoid duplicate upserts (no parcel_id in PDFs)
        parcel_id = "DAL-" + hashlib.md5(url.encode()).hexdigest()[:12]

        return {
            "type": "foreclosure",
            "status": "upcoming",
            "state": self.state,
            "county": self.county,
            "address": address,
            "parcel_id": parcel_id,
            "min_bid": None,
            "auction_date": auction_date,
            "source": "scrape",
            "source_url": url,
        }

    def scrape(self) -> list[dict]:
        pdf_urls = self._get_pdf_urls()
        records = []
        for url in pdf_urls:
            record = self._parse_pdf(url)
            if record:
                records.append(record)
            self.sleep()
        return records
