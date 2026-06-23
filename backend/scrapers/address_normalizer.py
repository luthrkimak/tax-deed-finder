from __future__ import annotations
import re

_ABBREV = {
    "BLVD": "Boulevard",
    "DR": "Drive",
    "RD": "Road",
    "AVE": "Avenue",
    "ST": "Street",
    "HWY": "Highway",
    "CT": "Court",
    "LN": "Lane",
    "PL": "Place",
    "TER": "Terrace",
    "CIR": "Circle",
    "PKWY": "Parkway",
    "TRL": "Trail",
    "FWY": "Freeway",
    "EXPY": "Expressway",
    "SQ": "Square",
}


def normalize_address(raw: str | None) -> str | None:
    if not raw:
        return raw
    s = raw.upper()
    for abbr, full in _ABBREV.items():
        s = re.sub(rf"\b{abbr}\b", full, s)
    s = re.sub(r"  +", " ", s).strip()
    return s.title()
