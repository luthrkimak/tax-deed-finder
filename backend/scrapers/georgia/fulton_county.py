from scrapers.base import BaseScraper

class FultonCountyScraper(BaseScraper):
    """
    Fulton County GA uses GovEase (liveauctions.govease.com) which requires
    a registered bidder account to access listing data. Until an API key or
    alternative public source is identified, this scraper returns no records.
    """
    state = "GA"
    county = "Fulton"
    source_name = "fulton_county_ga"

    def scrape(self) -> list[dict]:
        return []
