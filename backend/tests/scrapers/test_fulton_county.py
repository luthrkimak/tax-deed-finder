from pathlib import Path
from scrapers.georgia.fulton_county import FultonCountyScraper

FIXTURE = Path(__file__).parent / "fixtures" / "fulton_county.html"

TYPE_MAP = {"Tax Deed": "tax_deed", "Tax Lien": "tax_lien"}

def test_parse_returns_records():
    html = FIXTURE.read_text()
    records = FultonCountyScraper().parse(html)

    assert len(records) == 2
    assert records[0]["parcel_id"] == "14-0078-0003-047-4"
    assert records[0]["type"] == "tax_deed"
    assert records[0]["min_bid"] == 12400.0
    assert records[0]["state"] == "GA"
    assert records[0]["county"] == "Fulton"

def test_parse_type_mapping():
    html = FIXTURE.read_text()
    records = FultonCountyScraper().parse(html)
    assert records[1]["type"] == "tax_lien"
    assert records[1]["min_bid"] == 8200.0
