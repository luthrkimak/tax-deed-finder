import pytest
from unittest.mock import MagicMock, patch, AsyncMock
from scrapers.base import BaseScraper, ScrapeResult

class ConcreteScraper(BaseScraper):
    state = "FL"
    county = "Test County"
    source_name = "test_source"

    def scrape(self) -> list[dict]:
        return [
            {"parcel_id": "001", "type": "tax_deed", "state": "FL", "county": "Test County", "min_bid": 10000, "source": "scrape"},
            {"parcel_id": "002", "type": "tax_lien", "state": "FL", "county": "Test County", "min_bid": 5000, "source": "scrape"},
        ]

@patch("scrapers.base.get_supabase")
def test_run_returns_scrape_result(mock_get_supabase):
    mock_sb = MagicMock()
    mock_sb.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []
    mock_sb.table.return_value.upsert.return_value.execute.return_value.data = [{"id": "x"}, {"id": "y"}]
    mock_sb.table.return_value.insert.return_value.execute.return_value.data = [{"id": "log"}]
    mock_get_supabase.return_value = mock_sb

    scraper = ConcreteScraper()
    result = scraper.run()

    assert isinstance(result, ScrapeResult)
    assert result.records_found == 2

@patch("scrapers.base.get_supabase")
def test_run_logs_failure_on_exception(mock_get_supabase):
    class FailingScraper(BaseScraper):
        state = "TX"
        county = "Fail County"
        source_name = "fail_source"
        def scrape(self) -> list[dict]:
            raise RuntimeError("Site down")

    mock_sb = MagicMock()
    mock_sb.table.return_value.insert.return_value.execute.return_value.data = [{"id": "log"}]
    mock_get_supabase.return_value = mock_sb

    scraper = FailingScraper()
    result = scraper.run()

    assert result.records_found == 0
    assert result.error is not None
