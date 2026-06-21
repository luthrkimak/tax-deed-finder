from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from decimal import Decimal
from datetime import date
from db.client import get_supabase
from models.auction import Auction, AuctionType, AuctionStatus, PropertyType

router = APIRouter()

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
    if county:
        query = query.eq("county", county)
    if type:
        query = query.eq("type", type)
    if status:
        query = query.eq("status", status)
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
    result = query.range(offset, offset + page_size - 1).execute()

    return {
        "data": result.data,
        "total": result.count or 0,
        "page": page,
        "page_size": page_size,
    }

@router.get("/counties")
def get_counties(state: Optional[str] = Query(None)):
    sb = get_supabase()
    query = sb.table("auctions").select("county")
    if state:
        query = query.eq("state", state.upper())
    result = query.execute()
    counties = sorted({row["county"] for row in result.data if row.get("county")})
    return counties

@router.get("/pins")
def get_pins(
    state: Optional[str] = Query(None),
    county: Optional[str] = Query(None),
    type: Optional[AuctionType] = Query(None),
    property_type: Optional[PropertyType] = Query(None),
    min_bid: Optional[Decimal] = Query(None),
    max_bid: Optional[Decimal] = Query(None),
):
    """Returns lat/lng/type for all matching auctions — used by map (no pagination)."""
    sb = get_supabase()
    query = sb.table("auctions").select("id,lat,lng,type,address,min_bid").not_.is_("lat", "null")
    if state:
        query = query.eq("state", state.upper())
    if county:
        query = query.eq("county", county)
    if type:
        query = query.eq("type", type)
    if property_type:
        query = query.eq("property_type", property_type)
    if min_bid is not None:
        query = query.gte("min_bid", float(min_bid))
    if max_bid is not None:
        query = query.lte("min_bid", float(max_bid))
    result = query.limit(2000).execute()
    return result.data


@router.get("/{auction_id}")
def get_auction(auction_id: str):
    sb = get_supabase()
    result = sb.table("auctions").select("*").eq("id", auction_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Auction not found")
    return result.data[0]
