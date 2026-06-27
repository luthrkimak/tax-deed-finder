from __future__ import annotations
import calendar
from datetime import date, timedelta

import requests

from scrapers.base import BaseScraper

ARCGIS_BASE = "https://maps.bexar.org/arcgis/rest/services/CC/ForeclosuresProd/MapServer"
QUERY_PARAMS = "where=1%3D1&outFields=*&outSR=4326&returnGeometry=true&f=json"


def _first_tuesday(year: int, month: int) -> date:
    """TX foreclosure sales occur on the first Tuesday of each month."""
    cal = calendar.monthcalendar(year, month)
    # calendar.monthcalendar returns weeks starting Monday; Tuesday is index 1
    for week in cal:
        if week[1] != 0:
            return date(year, month, week[1])
    return date(year, month, 1)  # fallback, shouldn't happen


def _fetch_layer(layer: int) -> list[dict]:
    url = f"{ARCGIS_BASE}/{layer}/query?{QUERY_PARAMS}"
    resp = requests.get(url, timeout=30)
    resp.raise_for_status()
    return resp.json().get("features", [])


class BexarCountyScraper(BaseScraper):
    state = "TX"
    county = "Bexar"
    source_name = "bexar_county_tx"
    source_url = "https://maps.bexar.org/foreclosures/"

    # Map ArcGIS TYPE values to our auction_type vocabulary
    _TYPE_MAP = {
        "MORTGAGE": "foreclosure",
        "TAX": "tax_deed",
    }

    def scrape(self) -> list[dict]:
        features = _fetch_layer(0) + _fetch_layer(1)
        self.sleep()

        today = date.today()
        records: list[dict] = []

        for feat in features:
            attrs = feat.get("attributes", {})
            geom = feat.get("geometry") or {}

            year = attrs.get("YEAR")
            month = attrs.get("MONTH")
            if not year or not month:
                continue

            auction_date = _first_tuesday(year, month)
            # Skip auctions that have already passed
            if auction_date < today:
                continue

            raw_address = (attrs.get("ADDRESS") or "").strip()
            city = (attrs.get("CITY") or "").strip().title()
            zip_code = (attrs.get("ZIP") or "").strip()
            address = f"{raw_address}, {city}, TX {zip_code}".strip(", ") if raw_address else None

            doc_number = (attrs.get("DOC_NUMBER") or "").strip() or None
            raw_type = (attrs.get("TYPE") or "").upper()
            auction_type = self._TYPE_MAP.get(raw_type, "foreclosure")

            lng = geom.get("x")
            lat = geom.get("y")

            records.append({
                "type": auction_type,
                "status": "upcoming",
                "state": self.state,
                "county": self.county,
                "address": address,
                "parcel_id": doc_number,
                "auction_date": auction_date.isoformat(),
                "source": "scrape",
                "source_url": f"https://bexar.tx.publicsearch.us/doc/{doc_number}" if doc_number else self.source_url,
                "lat": lat if lat else None,
                "lng": lng if lng else None,
            })

        return records
