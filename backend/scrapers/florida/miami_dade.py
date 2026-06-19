from scrapers.base import BaseScraper

class MiamiDadeScraper(BaseScraper):
    state = "FL"
    county = "Miami-Dade"
    source_name = "miami_dade_fl"

    def scrape(self) -> list[dict]:
        # TODO: implement when Miami-Dade portal access is confirmed
        return []
