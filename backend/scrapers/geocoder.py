from __future__ import annotations
import re
import time
import logging
import requests
from db.client import get_supabase

logger = logging.getLogger(__name__)

HEADERS = {"User-Agent": "TAx-Deed-Finder/1.0 (luthrkimak@gmail.com)"}
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
    """Geocode a list of auction IDs using Nominatim and update lat/lng in the DB."""
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
        addr = (row.get("address") or "").strip()
        county = row.get("county", "")
        state = row.get("state", "")
        city = COUNTY_CITY.get(county, county)

        # Normalize: strip trailing state abbreviation that may already be appended
        addr_clean = re.sub(r",\s*[A-Z]{2}\s*$", "", addr).strip()
        # Collapse double-spaces that can confuse Nominatim
        addr_clean = re.sub(r"  +", " ", addr_clean)
        # Strip unit/apt suffixes for fallback query
        street_only = re.sub(r"\s*(UNIT|APT|#|STE)\s*\S+", "", addr_clean, flags=re.I).strip()

        coords = None
        queries = [
            f"{addr_clean}, {city}, {state}",
            f"{street_only}, {city}, {state}",
        ] if addr_clean else []

        for q in queries:
            coords = _nominatim(q)
            if coords:
                break
            time.sleep(1.1)  # rate-limit only between retries

        if coords:
            sb.table("auctions").update({"lat": coords[0], "lng": coords[1]}).eq("id", row["id"]).execute()
            logger.info("Geocoded %s → %s", addr, coords)
        else:
            logger.warning("Could not geocode auction %s: %s", row.get("id"), addr)
