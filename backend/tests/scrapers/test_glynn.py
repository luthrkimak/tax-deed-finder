from scrapers.georgia.glynn import GlynnCountyScraper


def test_glynn_attributes():
    s = GlynnCountyScraper()
    assert s.state == "GA"
    assert s.county == "Glynn"
    assert s.slug == "gaglynn"
    assert s.auction_id == 1208
    assert s.auction_type == "tax_deed"
    assert s.source_name == "glynn_ga"


def test_glynn_source_url():
    s = GlynnCountyScraper()
    assert s.source_url == (
        "https://liveauctions.govease.com/ga/gaglynn/1208/browsestandard"
    )


def test_glynn_parse_empty_page_returns_empty_list():
    s = GlynnCountyScraper()
    records = s.parse("<html><body><table><tbody></tbody></table></body></html>")
    assert records == []
