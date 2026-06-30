from pathlib import Path
from unittest.mock import patch, MagicMock, call
from scrapers.govease.discovery import GovEaseDiscovery, _parse_ms_entries
from scrapers.govease.base import GovEaseBaseScraper

FIXTURE = Path(__file__).parent / "fixtures" / "govease_register.html"


def test_parse_ms_entries_filters_ms_only():
    html = FIXTURE.read_text()
    entries = _parse_ms_entries(html)
    assert len(entries) == 2
    assert ("msadams", 1500, "Adams") in entries
    assert ("mshinds", 1501, "Hinds") in entries


def test_parse_ms_entries_ignores_other_states():
    html = FIXTURE.read_text()
    entries = _parse_ms_entries(html)
    slugs = [e[0] for e in entries]
    assert "coalamosatread" not in slugs
    assert "gaglynn" not in slugs
    assert "txdenton" not in slugs


def test_parse_ms_entries_empty_when_no_ms():
    html = "<select name='single-default'><option value='co|cotest|1'>CO - Test</option></select>"
    entries = _parse_ms_entries(html)
    assert entries == []


@patch("scrapers.govease.discovery.sync_playwright")
def test_scrape_dispatches_sub_scrapers(mock_playwright):
    # Mock Playwright to return fixture HTML
    mock_page = MagicMock()
    mock_page.content.return_value = FIXTURE.read_text()
    mock_browser = MagicMock()
    mock_browser.new_context.return_value.new_page.return_value = mock_page
    mock_playwright.return_value.__enter__.return_value.chromium.launch.return_value = mock_browser

    # Patch scrape on the real base class (type() creates real subclasses that inherit it)
    with patch.object(GovEaseBaseScraper, "scrape", return_value=[{"parcel_id": "X"}]) as mock_scrape:
        discovery = GovEaseDiscovery()
        records = discovery.scrape()

    # Two MS counties found → two sub-scrapers called
    assert mock_scrape.call_count == 2
    assert len(records) == 2  # 1 record per county


@patch("scrapers.govease.discovery.sync_playwright")
def test_scrape_returns_empty_when_no_ms_auctions(mock_playwright):
    mock_page = MagicMock()
    mock_page.content.return_value = "<select name='single-default'><option value='co|co1|1'>CO</option></select>"
    mock_browser = MagicMock()
    mock_browser.new_context.return_value.new_page.return_value = mock_page
    mock_playwright.return_value.__enter__.return_value.chromium.launch.return_value = mock_browser

    discovery = GovEaseDiscovery()
    records = discovery.scrape()
    assert records == []
