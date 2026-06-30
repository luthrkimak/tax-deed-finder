from pathlib import Path
from unittest.mock import patch, MagicMock
from scrapers.govease.discovery import GovEaseDiscovery, _parse_ms_entries, _county_name_from_slug
from scrapers.govease.base import GovEaseBaseScraper
from scrapers.base import ScrapeResult

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


def test_county_name_from_slug_canonical():
    """Fix 3: canonical names must come from MS_GOVEASE_COUNTIES, not capitalize()."""
    assert _county_name_from_slug("msdesoto") == "DeSoto"
    assert _county_name_from_slug("msjeffersondavis") == "Jefferson Davis"
    assert _county_name_from_slug("mspearlriver") == "Pearl River"
    assert _county_name_from_slug("msadams") == "Adams"
    assert _county_name_from_slug("mshinds") == "Hinds"


@patch("scrapers.govease.discovery.sync_playwright")
def test_run_dispatches_sub_scrapers(mock_playwright):
    """Fix 2: run() delegates to sub-scraper run(), not scrape()."""
    mock_page = MagicMock()
    mock_page.content.return_value = FIXTURE.read_text()
    mock_browser = MagicMock()
    mock_browser.new_context.return_value.new_page.return_value = mock_page
    mock_playwright.return_value.__enter__.return_value.chromium.launch.return_value = mock_browser

    dummy_result = ScrapeResult(records_found=1, records_new=1, new_ids=["abc"])

    with patch.object(GovEaseBaseScraper, "run", return_value=dummy_result) as mock_run:
        discovery = GovEaseDiscovery()
        result = discovery.run()

    # Two MS counties + one GA county found → three sub-scrapers' run() called
    assert mock_run.call_count == 3
    # GovEaseDiscovery.run() always returns a zero-result aggregate
    assert result.records_found == 0
    assert result.records_new == 0
    assert result.new_ids == []


@patch("scrapers.govease.discovery.sync_playwright")
def test_run_returns_empty_when_no_ms_auctions(mock_playwright):
    """Fix 2: run() returns empty ScrapeResult when no MS entries on GovEase."""
    mock_page = MagicMock()
    mock_page.content.return_value = "<select name='single-default'><option value='co|co1|1'>CO</option></select>"
    mock_browser = MagicMock()
    mock_browser.new_context.return_value.new_page.return_value = mock_page
    mock_playwright.return_value.__enter__.return_value.chromium.launch.return_value = mock_browser

    discovery = GovEaseDiscovery()
    result = discovery.run()
    assert isinstance(result, ScrapeResult)
    assert result.records_found == 0
    assert result.records_new == 0
    assert result.new_ids == []


def test_scrape_is_noop():
    """scrape() must not be called directly; it returns [] as a no-op."""
    discovery = GovEaseDiscovery()
    assert discovery.scrape() == []
