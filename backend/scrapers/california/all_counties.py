from __future__ import annotations
from scrapers.realforeclose_base import RealForecloseScraper

# California counties on the RealForeclose platform.
#
# TESTING RESULTS (2026-06-21):
# Tested 26 CA county slugs on {slug}.realforeclose.com — none resolved to RealForeclose.
# All redirected to Realauction.com (a different platform).
# Tested slugs: losangeles, sandiego, orange, riverside, sacramento, fresno, kern,
# alameda, contracosta, sanbernardino, sanmateo, santaclara, ventura, solano, stanislaus,
# sanjose, eldorado, placer, sanjoaquin, santabarbara, tulare, madera, marin, monterey,
# napa, shasta — and many alternate naming conventions.
#
# The RealForeclose platform (as of 2026-06) only covers FL, AZ, CO, and NJ counties.
# California uses Realauction.com for online auctions.
# This list is intentionally empty; add entries if CA counties join the RealForeclose
# platform in the future.

CA_COUNTIES: list[tuple[str, str]] = [
    # No confirmed CA counties on RealForeclose as of 2026-06-21
    # ("Los Angeles", "losangeles"),  # uses Realauction.com instead
]


def make_ca_scraper(county_name: str, slug: str) -> type[RealForecloseScraper]:
    return type(
        f"{county_name.replace(' ', '').replace('.', '')}Scraper",
        (RealForecloseScraper,),
        {
            "state":        "CA",
            "county":       county_name,
            "source_name":  f"{slug}_ca",
            "base_url":     f"https://{slug}.realforeclose.com",
            "auction_type": "tax_deed",
        },
    )


CA_SCRAPERS = [make_ca_scraper(name, slug) for name, slug in CA_COUNTIES]
