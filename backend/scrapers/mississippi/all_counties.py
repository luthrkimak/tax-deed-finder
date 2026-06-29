from __future__ import annotations
from scrapers.base import BaseScraper


class MSGovEaseScraper(BaseScraper):
    """
    Mississippi counties use GovEase (liveauctions.govease.com) for annual
    tax lien auctions held on the last Monday of August. GovEase requires
    a registered bidder account to access listing data — this scraper
    returns no records until API access is configured.
    """
    state = "MS"
    source_name: str
    county: str

    def scrape(self) -> list[dict]:
        return []


def _make(county: str) -> type[MSGovEaseScraper]:
    return type(
        f"{county.replace(' ', '')}MSScraper",
        (MSGovEaseScraper,),
        {"county": county, "source_name": f"{county.lower().replace(' ', '_')}_ms"},
    )


MS_GOVEASE_COUNTIES = [
    "Adams", "Alcorn", "Amite", "Attala", "Benton", "Bolivar", "Calhoun",
    "Carroll", "Chickasaw", "Claiborne", "Clarke", "Clay", "Coahoma",
    "Copiah", "Covington", "DeSoto", "Forrest", "Franklin", "George",
    "Greene", "Grenada", "Hancock", "Harrison", "Hinds", "Holmes",
    "Humphreys", "Itawamba", "Jackson", "Jasper", "Jefferson",
    "Jefferson Davis", "Jones", "Kemper", "Lafayette", "Lamar",
    "Lauderdale", "Lawrence", "Leake", "Lee", "Leflore", "Lincoln",
    "Lowndes", "Madison", "Marion", "Marshall", "Monroe", "Montgomery",
    "Neshoba", "Newton", "Oktibbeha", "Panola", "Pearl River", "Perry",
    "Pike", "Pontotoc", "Prentiss", "Quitman", "Rankin", "Scott",
    "Simpson", "Smith", "Stone", "Sunflower", "Tallahatchie", "Tate",
    "Tippah", "Tunica", "Union", "Walthall", "Warren", "Washington",
    "Wayne", "Webster", "Wilkinson", "Winston", "Yalobusha", "Yazoo",
]

MS_SCRAPERS: list[type[MSGovEaseScraper]] = [_make(c) for c in MS_GOVEASE_COUNTIES]
