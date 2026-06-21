from scrapers.realforeclose_base import RealForecloseScraper

class TravisCountyScraper(RealForecloseScraper):
    state = "TX"
    county = "Travis"
    source_name = "travis_county_tx"
    base_url = "https://travis.realforeclose.com"
    auction_type = "foreclosure"
