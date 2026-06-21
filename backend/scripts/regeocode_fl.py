#!/usr/bin/env python3
"""Re-geocode all FL auctions from RealForeclose with the corrected address format.

Usage (from backend/ directory):
    source .venv/bin/activate
    python scripts/regeocode_fl.py [--limit N]

Pass --limit N to test on the first N records instead of the full set.
Rate limit: Nominatim allows 1 request/second — ~200 records takes ~7 minutes.
"""
import sys
import time
import re
import argparse
import requests

sys.path.insert(0, ".")
from db.client import get_supabase

HEADERS = {"User-Agent": "TAx-Deed-Finder/1.0 (luthrkimak@gmail.com)"}

COUNTY_CITY = {
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
    "Washington": "Chipley",
}


def nominatim(query: str) -> tuple[float, float] | None:
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
        print(f"  Nominatim error: {e}")
    return None


def main():
    parser = argparse.ArgumentParser(description="Re-geocode FL scrape auctions")
    parser.add_argument("--limit", type=int, default=None, help="Max records to process (default: all)")
    args = parser.parse_args()

    sb = get_supabase()

    # Fetch all FL auctions from the scraper (not seed data)
    auctions = (
        sb.table("auctions")
        .select("id,address,county,state,source_url")
        .eq("state", "FL")
        .eq("source", "scrape")
        .execute()
        .data
    )

    if args.limit:
        auctions = auctions[: args.limit]

    print(f"Found {len(auctions)} FL scrape auctions to re-geocode")

    ok = miss = 0
    for a in auctions:
        addr = (a.get("address") or "").strip()
        county = a.get("county", "")
        state = a.get("state", "FL")
        city = COUNTY_CITY.get(county, county)

        # Normalize address — strip any trailing state abbreviation
        addr_clean = re.sub(r",\s*[A-Z]{2}\s*$", "", addr).strip()
        addr_clean = re.sub(r"  +", " ", addr_clean)
        # Strip unit suffixes for the fallback query
        street_only = re.sub(r"\s*(UNIT|APT|#|STE)\s*\S+", "", addr_clean, flags=re.I).strip()

        queries = [
            f"{addr_clean}, {city}, {state}",
            f"{street_only}, {city}, {state}",
        ] if addr_clean else []

        geocoded = False
        for q in queries:
            coords = nominatim(q)
            time.sleep(1.1)  # Nominatim: 1 request per second max
            if coords:
                lat, lng = coords
                sb.table("auctions").update({"lat": lat, "lng": lng}).eq("id", a["id"]).execute()
                print(f"OK   {addr[:60]:<60}  ({lat:.4f}, {lng:.4f})")
                ok += 1
                geocoded = True
                break

        if not geocoded:
            print(f"MISS {addr[:65]}")
            miss += 1

    print(f"\nDone — OK={ok} | MISS={miss} | Total={len(auctions)}")


if __name__ == "__main__":
    main()
