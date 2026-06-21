from scrapers.realforeclose_base import RealForecloseScraper

class MiamiDadeScraper(RealForecloseScraper):
    state = "FL"
    county = "Miami-Dade"
    source_name = "miami_dade_fl"
    base_url = "https://miamidade.realforeclose.com"
    auction_type = "foreclosure"
