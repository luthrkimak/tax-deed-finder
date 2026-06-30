from __future__ import annotations
import re
from datetime import datetime
from bs4 import BeautifulSoup
from scrapers.base import BaseScraper

_TYPE_MAP = {"tax deed": "tax_deed", "tax lien": "tax_lien"}


class FultonCountyScraper(BaseScraper):
    state = "GA"
    county = "Fulton"
    source_name = "fulton_county_ga"

    def parse(self, html: str) -> list[dict]:
        soup = BeautifulSoup(html, "lxml")
        table = soup.find("table", {"id": "tax-sale-results"})
        if not table:
            return []
        records = []
        for row in table.select("tbody tr"):
            parcel_el = row.select_one("td.parcel-id")
            addr_el = row.select_one("td.prop-address")
            bid_el = row.select_one("td.min-bid")
            date_el = row.select_one("td.sale-date")
            type_el = row.select_one("td.sale-type")

            parcel_id = parcel_el.get_text(strip=True) if parcel_el else None
            address = addr_el.get_text(strip=True) if addr_el else None
            bid_text = bid_el.get_text(strip=True) if bid_el else ""
            date_text = date_el.get_text(strip=True) if date_el else ""
            type_text = type_el.get_text(strip=True).lower() if type_el else ""

            bid_clean = re.sub(r"[^\d.]", "", bid_text)
            min_bid = float(bid_clean) if bid_clean else None

            try:
                auction_date = datetime.strptime(date_text, "%m/%d/%Y").date().isoformat()
            except ValueError:
                auction_date = None

            auction_type = _TYPE_MAP.get(type_text, "tax_deed")

            if not parcel_id and not address:
                continue

            records.append({
                "type": auction_type,
                "status": "upcoming",
                "state": self.state,
                "county": self.county,
                "address": address,
                "parcel_id": parcel_id,
                "min_bid": min_bid,
                "assessed_value": None,
                "auction_date": auction_date,
                "source": "scrape",
                "source_url": self.source_name,
            })
        return records

    def scrape(self) -> list[dict]:
        return []
