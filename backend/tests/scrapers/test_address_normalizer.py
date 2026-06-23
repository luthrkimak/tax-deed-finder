from scrapers.address_normalizer import normalize_address

def test_expands_blvd():
    assert normalize_address("123 SUNSET BLVD") == "123 Sunset Boulevard"

def test_expands_dr():
    assert normalize_address("456 OAK DR") == "456 Oak Drive"

def test_expands_rd():
    assert normalize_address("789 PINE RD") == "789 Pine Road"

def test_expands_ave():
    assert normalize_address("10 MAIN AVE") == "10 Main Avenue"

def test_expands_st():
    assert normalize_address("55 ELM ST") == "55 Elm Street"

def test_expands_hwy():
    assert normalize_address("US HWY 27") == "Us Highway 27"

def test_expands_ct():
    assert normalize_address("3 ROSE CT") == "3 Rose Court"

def test_expands_ln():
    assert normalize_address("7 OAK LN") == "7 Oak Lane"

def test_expands_pkwy():
    assert normalize_address("100 PALM PKWY") == "100 Palm Parkway"

def test_collapses_double_spaces():
    assert normalize_address("123  MAIN  ST") == "123 Main Street"

def test_returns_empty_unchanged():
    assert normalize_address("") == ""

def test_returns_none_unchanged():
    assert normalize_address(None) is None

def test_full_fl_address():
    result = normalize_address("123 SUNSET BLVD, ORLANDO FL 32801")
    assert result == "123 Sunset Boulevard, Orlando Fl 32801"
