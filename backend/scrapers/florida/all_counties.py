from __future__ import annotations
from scrapers.realforeclose_base import RealForecloseScraper

# Florida counties on the RealForeclose platform.
# slug → (display name, subdomain)
# Orange and Miami-Dade have special subdomains and are kept as separate files.
FL_COUNTIES: list[tuple[str, str]] = [
    # Batch 1 — confirmed
    ("Broward",        "broward"),
    ("Palm Beach",     "palmbeach"),
    ("Hillsborough",   "hillsborough"),
    ("Pinellas",       "pinellas"),
    ("Duval",          "duval"),
    ("Lee",            "lee"),
    ("Polk",           "polk"),
    ("Seminole",       "seminole"),
    ("Osceola",        "osceola"),
    ("Volusia",        "volusia"),
    # Batch 2 — confirmed
    ("Alachua",        "alachua"),
    ("Baker",          "baker"),
    ("Bay",            "bay"),
    ("Brevard",        "brevard"),
    ("Calhoun",        "calhoun"),
    ("Charlotte",      "charlotte"),
    ("Citrus",         "citrus"),
    ("Clay",           "clay"),
    ("Escambia",       "escambia"),
    ("Flagler",        "flagler"),
    ("Gilchrist",      "gilchrist"),
    ("Gulf",           "gulf"),
    ("Indian River",   "indianriver"),
    ("Jackson",        "jackson"),
    ("Lake",           "lake"),
    ("Leon",           "leon"),
    ("Manatee",        "manatee"),
    ("Marion",         "marion"),
    ("Martin",         "martin"),
    ("Nassau",         "nassau"),
    # Batch 3 — likely valid (network timeout during test, same platform)
    ("Okaloosa",       "okaloosa"),
    ("Okeechobee",     "okeechobee"),
    ("Pasco",          "pasco"),
    ("Putnam",         "putnam"),
    ("Santa Rosa",     "santarosa"),
    ("Sarasota",       "sarasota"),
    ("St. Johns",      "stjohns"),
    ("St. Lucie",      "stlucie"),
    ("Sumter",         "sumter"),
    ("Suwannee",       "suwannee"),
    ("Taylor",         "taylor"),
    ("Union",          "union"),
    ("Wakulla",        "wakulla"),
    ("Walton",         "walton"),
    ("Washington",     "washington"),
]


# FL counties on realtaxdeed.com (different domain, same RealForeclose platform)
# These counties hold TAX DEED sales on realtaxdeed.com separately from their
# foreclosure sales on realforeclose.com — both must be scraped independently.
FL_TAXDEED_COUNTIES: list[tuple[str, str]] = [
    # Previously known
    ("Hendry",        "hendry"),
    ("Hernando",      "hernando"),
    ("Highlands",     "highlands"),
    ("Monroe",        "monroe"),
    ("Suwannee",      "suwannee"),
    ("Washington",    "washington"),
    # Confirmed via RealForeclose platform "Jump To" dropdown (June 2026)
    ("Alachua",       "alachua"),
    ("Bay",           "bay"),
    ("Brevard",       "brevard"),
    ("Citrus",        "citrus"),
    ("Clay",          "clay"),
    ("Duval",         "duval"),
    ("Escambia",      "escambia"),
    ("Flagler",       "flagler"),
    ("Gilchrist",     "gilchrist"),
    ("Gulf",          "gulf"),
    ("Hillsborough",  "hillsborough"),
    ("Indian River",  "indianriver"),
    ("Jackson",       "jackson"),
    ("Lake",          "lake"),
    ("Lee",           "lee"),
    ("Leon",          "leon"),
    ("Marion",        "marion"),
    ("Martin",        "martin"),
    ("Nassau",        "nassau"),
    ("Osceola",       "osceola"),
    ("Palm Beach",    "palmbeach"),
    ("Pasco",         "pasco"),
    ("Pinellas",      "pinellas"),
    ("Polk",          "polk"),
    ("Putnam",        "putnam"),
    ("Sarasota",      "sarasota"),
    ("Seminole",      "seminole"),
    ("Volusia",       "volusia"),
]


def make_fl_scraper(county_name: str, slug: str) -> type[RealForecloseScraper]:
    return type(
        f"{county_name.replace(' ', '').replace('.', '')}Scraper",
        (RealForecloseScraper,),
        {
            "state":        "FL",
            "county":       county_name,
            "source_name":  f"{slug}_fl",
            "base_url":     f"https://{slug}.realforeclose.com",
            "auction_type": "foreclosure",
        },
    )


def make_fl_taxdeed_scraper(county_name: str, slug: str) -> type[RealForecloseScraper]:
    return type(
        f"{county_name.replace(' ', '').replace('.', '')}TaxDeedScraper",
        (RealForecloseScraper,),
        {
            "state":        "FL",
            "county":       county_name,
            "source_name":  f"{slug}_taxdeed_fl",
            "base_url":     f"https://{slug}.realtaxdeed.com",
            "auction_type": "tax_deed",
        },
    )


FL_SCRAPERS = (
    [make_fl_scraper(name, slug) for name, slug in FL_COUNTIES] +
    [make_fl_taxdeed_scraper(name, slug) for name, slug in FL_TAXDEED_COUNTIES]
)
