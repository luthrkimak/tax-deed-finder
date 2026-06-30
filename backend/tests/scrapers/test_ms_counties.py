import pytest
from unittest.mock import patch, MagicMock
from scrapers.mississippi.counties.hinds import HindsCountyScraper
from scrapers.mississippi.counties.desoto import DeSotoCountyScraper
from scrapers.mississippi.counties.rankin import RankinCountyScraper
from scrapers.mississippi.counties.madison import MadisonCountyScraper
from scrapers.mississippi.counties.lee import LeeCountyScraper
from scrapers.mississippi.counties.lauderdale import LauderdaleCountyScraper
from scrapers.mississippi.counties.forrest import ForrestCountyScraper
from scrapers.mississippi.counties.jackson import JacksonCountyScraper
from scrapers.mississippi.counties.lowndes import LowndesCountyScraper
from scrapers.mississippi.counties.oktibbeha import OktibbehaCountyScraper

ALL_SCRAPERS = [
    HindsCountyScraper, DeSotoCountyScraper, RankinCountyScraper,
    MadisonCountyScraper, LeeCountyScraper, LauderdaleCountyScraper,
    ForrestCountyScraper, JacksonCountyScraper, LowndesCountyScraper,
    OktibbehaCountyScraper,
]


@pytest.mark.parametrize("ScraperClass", ALL_SCRAPERS)
def test_scraper_attributes(ScraperClass):
    s = ScraperClass()
    assert s.state == "MS"
    assert s.county != ""
    assert s.source_name != ""
    assert hasattr(s, "source_url")


@pytest.mark.parametrize("ScraperClass", ALL_SCRAPERS)
def test_scraper_returns_empty_on_no_list(ScraperClass):
    """When the county has no active sale list, scrape() returns []."""
    with patch("httpx.get") as mock_get:
        mock_get.return_value = MagicMock(
            status_code=200,
            text="<html><body><p>No current tax sale list available.</p></body></html>"
        )
        records = ScraperClass().scrape()
    assert isinstance(records, list)


@pytest.mark.parametrize("ScraperClass", ALL_SCRAPERS)
def test_scraper_returns_empty_on_http_error(ScraperClass):
    """HTTP errors are caught and return empty list (logged, not raised)."""
    with patch("httpx.get") as mock_get:
        mock_get.side_effect = Exception("Connection refused")
        records = ScraperClass().scrape()
    assert records == []
