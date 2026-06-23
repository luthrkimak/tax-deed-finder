from __future__ import annotations
from decimal import Decimal
from datetime import date, datetime
from typing import Literal, Optional
from pydantic import BaseModel, Field

AuctionType = Literal["tax_deed", "tax_lien", "foreclosure"]
AuctionStatus = Literal["upcoming", "active", "sold", "cancelled", "archived", "no_bid"]
PropertyType = Literal["residential", "commercial", "land"]
DataSource = Literal["api", "scrape"]

class Auction(BaseModel):
    id: Optional[str] = None
    type: AuctionType
    status: AuctionStatus = "upcoming"
    auction_date: Optional[date] = None
    state: str = Field(..., max_length=2)
    county: str
    address: Optional[str] = None
    parcel_id: Optional[str] = None
    property_type: Optional[PropertyType] = None
    min_bid: Optional[Decimal] = None
    assessed_value: Optional[Decimal] = None
    market_value_estimate: Optional[Decimal] = None
    outstanding_debt: Optional[Decimal] = None
    tax_amount_owed: Optional[Decimal] = None
    interest_rate: Optional[Decimal] = None
    photo_url: Optional[str] = None
    zillow_url: Optional[str] = None
    redfin_url: Optional[str] = None
    source: DataSource
    source_url: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}

class AuctionFilters(BaseModel):
    state: Optional[str] = None
    county: Optional[str] = None
    type: Optional[AuctionType] = None
    status: Optional[AuctionStatus] = None
    property_type: Optional[PropertyType] = None
    min_bid: Optional[Decimal] = None
    max_bid: Optional[Decimal] = None
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)
