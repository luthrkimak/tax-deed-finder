from __future__ import annotations
import calendar
import time
from datetime import date

import requests

from scrapers.base import BaseScraper

ARCGIS_BASE = "https://maps.bexar.org/arcgis/rest/services/CC/ForeclosuresProd/MapServer"
QUERY_PARAMS = "where=1%3D1&outFields=*&outSR=4326&returnGeometry=true&f=json"
PARCELS_URL = "https://maps.bexar.org/arcgis/rest/services/Parcels/MapServer/0/query"
BCAD_PROP_URL = "https://bexar.trueautomation.com/clientdb/Property.aspx?cid=110&prop_id={}"


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


def _lookup_bcad_url(lng: float, lat: float) -> str | None:
    """Spatial query on the Bexar County Parcels layer to get the BCAD property URL."""
    try:
        resp = requests.get(
            PARCELS_URL,
            params={
                "geometry": f"{lng},{lat}",
                "geometryType": "esriGeometryPoint",
                "spatialRel": "esriSpatialRelIntersects",
                "outFields": "PropID",
                "returnGeometry": "false",
                "inSR": "4326",
                "f": "json",
            },
            timeout=15,
        )
        resp.raise_for_status()
        features = resp.json().get("features", [])
        if features:
            prop_id = features[0]["attributes"].get("PropID")
            if prop_id:
                return BCAD_PROP_URL.format(int(prop_id))
    except Exception:
        pass
    return None


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

            # Spatial query on Bexar County Parcels layer to get the BCAD property page URL
            source_url = self.source_url
            if lat and lng:
                bcad_url = _lookup_bcad_url(lng, lat)
                if bcad_url:
                    source_url = bcad_url
                time.sleep(0.3)  # rate-limit parcel queries

            records.append({
                "type": auction_type,
                "status": "upcoming",
                "state": self.state,
                "county": self.county,
                "address": address,
                "parcel_id": doc_number,
                "auction_date": auction_date.isoformat(),
                "source": "scrape",
                "source_url": source_url,
                "lat": lat if lat else None,
                "lng": lng if lng else None,
            })

        return records
