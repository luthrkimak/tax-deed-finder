import pytest
from decimal import Decimal
from models.auction import Auction, AuctionFilters
from models.alert import Alert, AlertCreate

def test_auction_model_valid():
    a = Auction(
        id="123e4567-e89b-12d3-a456-426614174000",
        type="tax_deed",
        status="upcoming",
        state="FL",
        county="Orange",
        source="scrape",
        min_bid=Decimal("45000.00"),
    )
    assert a.state == "FL"
    assert a.min_bid == Decimal("45000.00")

def test_auction_filters_defaults():
    f = AuctionFilters()
    assert f.state is None
    assert f.min_bid is None
    assert f.page == 1
    assert f.page_size == 20

def test_alert_create_valid():
    a = AlertCreate(
        filters={"state": "FL", "type": "tax_deed"},
        email="user@example.com",
    )
    assert a.email == "user@example.com"
    assert a.filters["state"] == "FL"
