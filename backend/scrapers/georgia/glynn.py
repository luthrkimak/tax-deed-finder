from scrapers.govease.base import GovEaseBaseScraper


class GlynnCountyScraper(GovEaseBaseScraper):
    state = "GA"
    county = "Glynn"
    slug = "gaglynn"
    auction_id = 1208
    auction_type = "tax_deed"
    source_name = "glynn_ga"
