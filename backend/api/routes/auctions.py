from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from decimal import Decimal
from datetime import date
from pydantic import BaseModel
from db.client import get_supabase
from models.auction import Auction, AuctionType, AuctionStatus, PropertyType

router = APIRouter()

ACTIVE_STATES = ["FL", "MS", "GA"]

@router.get("")
def get_auctions(
    state: Optional[str] = Query(None),
    county: Optional[str] = Query(None),
    type: Optional[AuctionType] = Query(None),
    status: Optional[AuctionStatus] = Query(None),
    property_type: Optional[PropertyType] = Query(None),
    min_bid: Optional[Decimal] = Query(None),
    max_bid: Optional[Decimal] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    sb = get_supabase()
    query = sb.table("auctions").select("*", count="exact")

    if state:
        query = query.eq("state", state.upper())
    else:
        query = query.in_("state", ACTIVE_STATES)
    if county:
        query = query.eq("county", county)
    if type:
        query = query.eq("type", type)
    if status:
        query = query.eq("status", status)
    else:
        query = query.not_.in_("status", ["archived", "cancelled", "sold", "no_bid"])
    if not date_from:
        # Always hide auctions whose date has already passed
        query = query.gte("auction_date", date.today().isoformat())
    if property_type:
        query = query.eq("property_type", property_type)
    if min_bid is not None:
        query = query.gte("min_bid", float(min_bid))
    if max_bid is not None:
        query = query.lte("min_bid", float(max_bid))
    if date_from:
        query = query.gte("auction_date", date_from.isoformat())
    if date_to:
        query = query.lte("auction_date", date_to.isoformat())

    offset = (page - 1) * page_size
    result = query.order("auction_date", desc=False, nullsfirst=False).range(offset, offset + page_size - 1).execute()

    return {
        "data": result.data,
        "total": result.count or 0,
        "page": page,
        "page_size": page_size,
    }

@router.get("/counties")
def get_counties(state: Optional[str] = Query(None)):
    sb = get_supabase()
    query = sb.table("auctions").select("county").limit(10000)
    if state:
        query = query.eq("state", state.upper())
    result = query.execute()
    counties = sorted({row["county"] for row in result.data if row.get("county")})
    return counties

# Approximate center coordinates for each county — used for auctions without geocoded address.
COUNTY_CENTERS: dict[str, tuple[float, float]] = {
    "Alachua": (29.6516, -82.3248), "Baker": (30.3305, -82.2882), "Bay": (30.1988, -85.6594),
    "Brevard": (28.2639, -80.7214), "Broward": (26.1901, -80.3659), "Calhoun": (30.4088, -85.1944),
    "Charlotte": (26.9342, -81.9582), "Citrus": (28.8408, -82.4665), "Clay": (29.9941, -81.8849),
    "Collier": (25.9017, -81.3999), "Columbia": (30.2168, -82.6196), "DeSoto": (27.1889, -81.8232),
    "Dixie": (29.5902, -83.1635), "Duval": (30.3322, -81.6557), "Escambia": (30.6388, -87.3419),
    "Flagler": (29.4727, -81.2874), "Franklin": (29.8219, -84.7497), "Gadsden": (30.5766, -84.6116),
    "Gilchrist": (29.7236, -82.7968), "Glades": (26.9626, -81.1996), "Gulf": (29.9285, -85.2296),
    "Hamilton": (30.4966, -82.9490), "Hardee": (27.4934, -81.8104), "Hendry": (26.4984, -81.1996),
    "Hernando": (28.5578, -82.4665), "Highlands": (27.3428, -81.3399), "Hillsborough": (27.9904, -82.3018),
    "Holmes": (30.8677, -85.8122), "Indian River": (27.6648, -80.5512), "Jackson": (30.7799, -85.2136),
    "Jefferson": (30.4255, -83.8807), "Lafayette": (30.0213, -83.1843), "Lake": (28.7491, -81.7601),
    "Lee": (26.5629, -81.8723), "Leon": (30.4380, -84.2807), "Levy": (29.3174, -82.7824),
    "Liberty": (30.2379, -84.8807), "Madison": (30.4694, -83.4735), "Manatee": (27.4799, -82.3452),
    "Marion": (29.2108, -82.1399), "Martin": (27.0527, -80.4399), "Miami-Dade": (25.5516, -80.6327),
    "Monroe": (24.5557, -81.7826), "Nassau": (30.6113, -81.7682), "Okaloosa": (30.6738, -86.5970),
    "Okeechobee": (27.3904, -80.8999), "Orange": (28.4845, -81.2488), "Osceola": (28.0618, -81.0868),
    "Palm Beach": (26.6443, -80.3566), "Pasco": (28.3058, -82.4360), "Pinellas": (27.9030, -82.7390),
    "Polk": (27.9362, -81.6990), "Putnam": (29.6268, -81.7399), "Santa Rosa": (30.6880, -86.9788),
    "Sarasota": (27.1884, -82.3649), "Seminole": (28.7179, -81.2088), "St. Johns": (29.9657, -81.4360),
    "St. Lucie": (27.3799, -80.4399), "Sumter": (28.7091, -82.0849), "Suwannee": (30.1968, -83.0135),
    "Taylor": (30.0624, -83.5899), "Union": (30.0413, -82.3735), "Volusia": (29.0286, -81.0999),
    "Wakulla": (30.1474, -84.3807), "Walton": (30.6038, -86.1738), "Washington": (30.6088, -85.6638),
}


@router.get("/pins")
def get_pins(
    state: Optional[str] = Query(None),
    county: Optional[str] = Query(None),
    type: Optional[AuctionType] = Query(None),
    property_type: Optional[PropertyType] = Query(None),
    min_bid: Optional[Decimal] = Query(None),
    max_bid: Optional[Decimal] = Query(None),
):
    """Returns lat/lng/type for all matching auctions — used by map (no pagination).
    Auctions without geocoded address use the county center and get approximate=true.
    """
    sb = get_supabase()
    base_filters = (
        sb.table("auctions")
        .select("id,lat,lng,type,state,address,county,min_bid,assessed_value")
        .not_.in_("status", ["archived", "cancelled", "sold", "no_bid"])
        .gte("auction_date", date.today().isoformat())
    )
    if state:
        base_filters = base_filters.eq("state", state.upper())
    else:
        base_filters = base_filters.in_("state", ACTIVE_STATES)
    if county:
        base_filters = base_filters.eq("county", county)
    if type:
        base_filters = base_filters.eq("type", type)
    if property_type:
        base_filters = base_filters.eq("property_type", property_type)
    if min_bid is not None:
        base_filters = base_filters.gte("min_bid", float(min_bid))
    if max_bid is not None:
        base_filters = base_filters.lte("min_bid", float(max_bid))

    pins = []
    page_size = 1000
    offset = 0
    while True:
        batch = base_filters.range(offset, offset + page_size - 1).execute().data
        pins_batch = []
        for row in batch:
            if row.get("lat") and row.get("lng"):
                row["approximate"] = False
                pins_batch.append(row)
            else:
                center = COUNTY_CENTERS.get(row.get("county", ""))
                if center:
                    row["lat"] = center[0]
                    row["lng"] = center[1]
                    row["approximate"] = True
                    pins_batch.append(row)
        pins.extend(pins_batch)
        if len(batch) < page_size:
            break
        offset += page_size
    return pins


@router.get("/{auction_id}")
def get_auction(auction_id: str):
    sb = get_supabase()
    result = sb.table("auctions").select("*").eq("id", auction_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Auction not found")
    return result.data[0]


class AddressUpdate(BaseModel):
    address: str


@router.patch("/{auction_id}/address")
def update_address(auction_id: str, body: AddressUpdate):
    sb = get_supabase()
    if not sb.table("auctions").select("id").eq("id", auction_id).execute().data:
        raise HTTPException(status_code=404, detail="Auction not found")
    sb.table("auctions").update({"address": body.address.strip()}).eq("id", auction_id).execute()
    from scrapers.geocoder import geocode_auctions
    geocode_auctions([auction_id])
    result = sb.table("auctions").select("*").eq("id", auction_id).execute()
    return result.data[0]
