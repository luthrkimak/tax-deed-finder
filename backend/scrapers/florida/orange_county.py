from scrapers.realforeclose_base import RealForecloseScraper

class OrangeCountyScraper(RealForecloseScraper):
    state = "FL"
    county = "Orange"
    source_name = "orange_county_fl"
    base_url = "https://myorangeclerk.realforeclose.com"
    auction_type = "foreclosure"
