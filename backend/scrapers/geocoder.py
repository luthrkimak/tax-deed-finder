from __future__ import annotations
import os
import re
import time
import logging
import requests
from db.client import get_supabase
from scrapers.address_normalizer import normalize_address

logger = logging.getLogger(__name__)

HEADERS = {"User-Agent": "TAx-Deed-Finder/1.0 (luthrkimak@gmail.com)"}
MAPBOX_TOKEN = os.environ.get("MAPBOX_TOKEN", "")

COUNTY_CITY: dict[str, str] = {
    "Orange": "Orlando", "Miami-Dade": "Miami", "Broward": "Fort Lauderdale",
    "Palm Beach": "West Palm Beach", "Hillsborough": "Tampa", "Pinellas": "Clearwater",
    "Duval": "Jacksonville", "Lee": "Fort Myers", "Polk": "Lakeland",
    "Brevard": "Melbourne", "Manatee": "Bradenton", "Marion": "Ocala",
    "Leon": "Tallahassee", "Alachua": "Gainesville", "Sarasota": "Sarasota",
    "Flagler": "Bunnell", "St. Lucie": "Port St. Lucie", "Pasco": "New Port Richey",
    "Indian River": "Vero Beach", "Putnam": "Palatka", "Volusia": "Daytona Beach",
    "Lake": "Tavares", "Osceola": "Kissimmee", "Citrus": "Inverness",
    "Clay": "Green Cove Springs", "Escambia": "Pensacola", "Santa Rosa": "Milton",
    "Nassau": "Fernandina Beach", "Okaloosa": "Crestview", "St. Johns": "St. Augustine",
    "Jackson": "Marianna", "Hendry": "LaBelle", "Hernando": "Brooksville",
    "Highlands": "Sebring", "Monroe": "Key West", "Suwannee": "Live Oak",
    "Washington": "Chipley", "Dallas": "Dallas", "Travis": "Austin",
    "Fulton": "Atlanta",
}


def _mapbox(query: str) -> tuple[float, float] | None:
    if not MAPBOX_TOKEN:
        return None
    try:
        import urllib.parse
        encoded = urllib.parse.quote(query)
        r = requests.get(
            f"https://api.mapbox.com/geocoding/v5/mapbox.places/{encoded}.json",
            params={"access_token": MAPBOX_TOKEN, "country": "us", "limit": 1},
            timeout=10,
        )
        data = r.json()
        features = data.get("features", [])
        if features:
            lng, lat = features[0]["geometry"]["coordinates"]
            return float(lat), float(lng)
    except Exception as e:
        logger.warning("Mapbox error for %r: %s", query, e)
    return None


def _nominatim(query: str) -> tuple[float, float] | None:
    try:
        r = requests.get(
            "https://nominatim.openstreetmap.org/search",
            params={"q": query, "format": "json", "limit": 1, "countrycodes": "us"},
            headers=HEADERS,
            timeout=10,
        )
        results = r.json()
        if results:
            return float(results[0]["lat"]), float(results[0]["lon"])
    except Exception as e:
        logger.warning("Nominatim error for %r: %s", query, e)
    return None


def geocode_auctions(auction_ids: list[str]) -> None:
    """Geocode auction IDs using Mapbox (primary) then Nominatim (fallback)."""
    if not auction_ids:
        return
    sb = get_supabase()
    rows = (
        sb.table("auctions")
        .select("id,address,county,state")
        .in_("id", auction_ids)
        .execute()
        .data
    )
    for row in rows:
        addr = normalize_address((row.get("address") or "").strip()) or ""
        county = row.get("county", "")
        state = row.get("state", "")
        city = COUNTY_CITY.get(county, county)

        # Strip trailing state abbreviation (e.g. ", FL" or ", Fl")
        addr_clean = re.sub(r",\s*[A-Za-z]{2}\s*$", "", addr).strip()
        # Strip unit/apt for fallback
        street_only = re.sub(r"\s*(UNIT|APT|#|STE)\s*\S+", "", addr_clean, flags=re.I).strip()

        # If address already has city/zip embedded, don't add county city again
        parts = [p.strip() for p in addr_clean.split(",") if p.strip()]
        addr_has_city = len(parts) >= 2

        if addr_clean:
            if addr_has_city:
                queries = [f"{addr_clean}, {state}", f"{street_only}, {state}"]
            else:
                queries = [f"{addr_clean}, {city}, {state}", f"{street_only}, {city}, {state}"]
        else:
            queries = []

        coords = None
        for q in queries:
            # Try Mapbox first (no rate-limit sleep needed — 600 req/min free tier)
            coords = _mapbox(q)
            if coords:
                break
            # Fallback to Nominatim
            coords = _nominatim(q)
            if coords:
                break
            time.sleep(1.1)

        if coords:
            sb.table("auctions").update({"lat": coords[0], "lng": coords[1]}).eq("id", row["id"]).execute()
            logger.info("Geocoded %s → %s", addr, coords)
        else:
            logger.warning("Could not geocode auction %s: %s", row.get("id"), addr)
