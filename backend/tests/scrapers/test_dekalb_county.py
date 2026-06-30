from pathlib import Path
from scrapers.georgia.dekalb_county import DeKalbCountyScraper

FIXTURE = Path(__file__).parent / "fixtures" / "dekalb_county.html"


def test_parse_returns_records():
    scraper = DeKalbCountyScraper()
    records = scraper.parse(FIXTURE.read_text())
    assert len(records) == 2


def test_parse_fields():
    scraper = DeKalbCountyScraper()
    records = scraper.parse(FIXTURE.read_text())
    r = records[0]
    assert r["parcel_id"] == "15 021 08 023"
    assert r["address"] == "4036 SMITHFIELD TRL, GA"
    assert r["auction_date"] == "2026-07-07"
    assert r["min_bid"] == 966.62
    assert r["type"] == "tax_deed"
    assert r["state"] == "GA"
    assert r["county"] == "DeKalb"


def test_parse_skips_empty_rows():
    scraper = DeKalbCountyScraper()
    records = scraper.parse(FIXTURE.read_text())
    assert all(r["parcel_id"] for r in records)


def test_parse_empty_table():
    scraper = DeKalbCountyScraper()
    records = scraper.parse("<html><body><p>no table</p></body></html>")
    assert records == []
