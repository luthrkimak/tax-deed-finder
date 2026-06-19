from pathlib import Path
from scrapers.texas.dallas_county import DallasCountyScraper

FIXTURE = Path(__file__).parent / "fixtures" / "dallas_county.html"

def test_parse_returns_auction_records():
    html = FIXTURE.read_text()
    scraper = DallasCountyScraper()
    records = scraper.parse(html)

    assert len(records) == 2
    assert records[0]["parcel_id"] == "0012345678900000"
    assert records[0]["min_bid"] == 62000.0
    assert records[0]["state"] == "TX"
    assert records[0]["county"] == "Dallas"
    assert records[0]["type"] == "foreclosure"
    assert records[0]["source"] == "scrape"

def test_parse_address():
    html = FIXTURE.read_text()
    records = DallasCountyScraper().parse(html)
    assert records[1]["address"] == "321 Cedar Ln Garland TX 75040"
