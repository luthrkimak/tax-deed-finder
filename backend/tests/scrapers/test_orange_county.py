import pytest
from pathlib import Path
from scrapers.florida.orange_county import OrangeCountyScraper

FIXTURE = Path(__file__).parent / "fixtures" / "orange_county.html"

def test_parse_returns_auction_records():
    html = FIXTURE.read_text()
    scraper = OrangeCountyScraper()
    records = scraper.parse(html)

    assert len(records) == 2
    assert records[0]["parcel_id"] == "01-23-28-0000-00-001"
    assert records[0]["address"] == "123 Main St Orlando FL 32801, FL"
    assert records[0]["min_bid"] == 45000.00
    assert records[0]["state"] == "FL"
    assert records[0]["county"] == "Orange"
    assert records[0]["type"] == "tax_deed"
    assert records[0]["source"] == "scrape"

def test_parse_cleans_currency():
    html = FIXTURE.read_text()
    scraper = OrangeCountyScraper()
    records = scraper.parse(html)
    assert isinstance(records[0]["min_bid"], float)
    assert records[1]["min_bid"] == 28500.00
