from __future__ import annotations
from scrapers.realforeclose_base import RealForecloseScraper

# North Carolina counties on the RealForeclose platform.
#
# TESTING RESULTS (2026-06-21):
# Tested 20 NC county slugs on {slug}.realforeclose.com — none resolved to RealForeclose.
# All redirected to Realauction.com (a different platform).
# Tested slugs: wake, mecklenburg, guilford, forsyth, durham, cumberland, buncombe,
# union, cabarrus, onslow, gaston, davidson, alamance, new-hanover, rowan, moore,
# catawba, randolph, brunswick, pitt — and many alternate naming conventions.
#
# The RealForeclose platform (as of 2026-06) only covers FL, AZ, CO, and NJ counties.
# North Carolina uses Realauction.com for online auctions.
# This list is intentionally empty; add entries if NC counties join the RealForeclose
# platform in the future.

NC_COUNTIES: list[tuple[str, str]] = [
    # No confirmed NC counties on RealForeclose as of 2026-06-21
    # ("Wake", "wake"),  # uses Realauction.com instead
]


def make_nc_scraper(county_name: str, slug: str) -> type[RealForecloseScraper]:
    return type(
        f"{county_name.replace(' ', '').replace('.', '')}Scraper",
        (RealForecloseScraper,),
        {
            "state":        "NC",
            "county":       county_name,
            "source_name":  f"{slug}_nc",
            "base_url":     f"https://{slug}.realforeclose.com",
            "auction_type": "tax_deed",
        },
    )


NC_SCRAPERS = [make_nc_scraper(name, slug) for name, slug in NC_COUNTIES]
