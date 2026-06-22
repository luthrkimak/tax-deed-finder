#!/usr/bin/env python3
"""Fix malformed FL addresses in the database and re-geocode them."""
import sys, re, time, requests
sys.path.insert(0, '.')
from db.client import get_supabase

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
    "Hernando": "Brooksville", "Highlands": "Sebring", "Monroe": "Key West",
    "Seminole": "Sanford", "Bay": "Panama City", "Calhoun": "Blountstown",
    "Suwannee": "Live Oak", "Washington": "Chipley",
}

HEADERS = {"User-Agent": "TAx-Deed-Finder/1.0 (luthrkimak@gmail.com)"}

def nominatim(query: str):
    try:
        r = requests.get(
            "https://nominatim.openstreetmap.org/search",
            params={"q": query, "format": "json", "limit": 1, "countrycodes": "us"},
            headers=HEADERS, timeout=10,
        )
        results = r.json()
        if results:
            return float(results[0]["lat"]), float(results[0]["lon"])
    except Exception as e:
        print(f"  Nominatim error: {e}")
    return None

def fix_address(addr: str, county: str) -> str | None:
    """Return fixed address or None if no fix needed."""
    # Pattern 1: "STREET, FL CITY, ZIP" → "STREET, CITY, FL ZIP"
    m = re.search(r',\s*FL\s+([A-Z][A-Z ]+[A-Z]),\s*(\d{5})', addr)
    if m:
        street = addr[:m.start()].strip()
        city = m.group(1).title()
        zipcode = m.group(2)
        return f"{street}, {city}, FL {zipcode}"

    # Pattern 2: "STREET, FL" (no city, no zip) → "STREET, CITY, FL"
    if re.search(r',\s*FL\s*$', addr):
        city = COUNTY_CITY.get(county, county)
        street = re.sub(r',\s*FL\s*$', '', addr).strip()
        return f"{street}, {city}, FL"

    return None

def main():
    sb = get_supabase()
    # Fetch all FL auctions with addresses (paginate)
    all_auctions = []
    page = 0
    while True:
        rows = (
            sb.table("auctions")
            .select("id,address,county,lat,lng")
            .eq("state", "FL")
            .not_.is_("address", "null")
            .range(page * 1000, (page + 1) * 1000 - 1)
            .execute()
            .data
        )
        all_auctions.extend(rows)
        if len(rows) < 1000:
            break
        page += 1

    print(f"Found {len(all_auctions)} FL auctions with addresses")

    fixed = geocoded = skipped = 0
    for a in all_auctions:
        addr = (a.get("address") or "").strip()
        county = a.get("county", "")
        new_addr = fix_address(addr, county)

        if not new_addr:
            skipped += 1
            continue

        print(f"\nFIX  {addr}")
        print(f"  →  {new_addr}")

        # Update address in DB
        sb.table("auctions").update({"address": new_addr}).eq("id", a["id"]).execute()
        fixed += 1

        # Re-geocode
        city = COUNTY_CITY.get(county, county)
        coords = nominatim(new_addr) or nominatim(f"{new_addr.split(',')[0].strip()}, {city}, FL")
        time.sleep(1.1)
        if coords:
            sb.table("auctions").update({"lat": coords[0], "lng": coords[1]}).eq("id", a["id"]).execute()
            print(f"  ✓ Geocoded: {coords}")
            geocoded += 1
        else:
            print(f"  ✗ Could not geocode")

    print(f"\nDone — Fixed: {fixed} | Geocoded: {geocoded} | Already OK: {skipped}")

if __name__ == "__main__":
    main()
