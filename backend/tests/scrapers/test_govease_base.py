from pathlib import Path
from unittest.mock import patch, MagicMock
from scrapers.govease.base import GovEaseBaseScraper

FIXTURE = Path(__file__).parent / "fixtures" / "govease_browse.html"

class AdamsMSScraper(GovEaseBaseScraper):
    state = "MS"
    county = "Adams"
    slug = "msadams"
    auction_id = 1500
    source_name = "adams_ms"
    auction_type = "tax_lien"


def test_parse_returns_two_valid_records():
    html = FIXTURE.read_text()
    records = AdamsMSScraper().parse(html)
    # third row has no parcel_id and no address → skipped
    assert len(records) == 2


def test_parse_first_record_fields():
    html = FIXTURE.read_text()
    records = AdamsMSScraper().parse(html)
    r = records[0]
    assert r["parcel_id"] == "123456789"
    assert r["min_bid"] == 2500.00
    assert r["type"] == "tax_lien"
    assert r["state"] == "MS"
    assert r["county"] == "Adams"
    assert r["source"] == "scrape"
    assert r["status"] == "upcoming"


def test_parse_type_mapping():
    html = FIXTURE.read_text()
    records = AdamsMSScraper().parse(html)
    assert records[1]["type"] == "tax_deed"


def test_parse_fallback_parcel_id_for_missing():
    """Row with no parcel_id and no address is skipped entirely."""
    html = FIXTURE.read_text()
    records = AdamsMSScraper().parse(html)
    parcel_ids = [r["parcel_id"] for r in records]
    assert "123456789" in parcel_ids
    assert "987654321" in parcel_ids


@patch("scrapers.govease.base.sync_playwright")
def test_scrape_calls_playwright(mock_playwright):
    mock_page = MagicMock()
    mock_page.content.return_value = FIXTURE.read_text()
    mock_browser = MagicMock()
    mock_browser.new_context.return_value.new_page.return_value = mock_page
    mock_playwright.return_value.__enter__.return_value.chromium.launch.return_value = mock_browser

    records = AdamsMSScraper().scrape()
    assert len(records) == 2
    mock_page.goto.assert_called_once()
