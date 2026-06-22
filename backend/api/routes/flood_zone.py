from fastapi import APIRouter, Query, HTTPException
import requests

router = APIRouter()

FEMA_URL = (
    "https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/28/query"
)
HEADERS = {"User-Agent": "TAx-Deed-Finder/1.0 (luthrkimak@gmail.com)"}


@router.get("")
def get_flood_zone(lat: float = Query(...), lng: float = Query(...)):
    try:
        r = requests.get(
            FEMA_URL,
            params={
                "geometry": f"{lng},{lat}",
                "geometryType": "esriGeometryPoint",
                "inSR": "4326",
                "spatialRel": "esriSpatialRelIntersects",
                "outFields": "FLD_ZONE,SFHA_TF",
                "returnGeometry": "false",
                "f": "json",
            },
            headers=HEADERS,
            timeout=10,
        )
        data = r.json()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"FEMA API error: {e}")

    features = data.get("features") or []
    if not features:
        return {"zone": None, "sfha": False}

    attrs = features[0]["attributes"]
    return {
        "zone": attrs.get("FLD_ZONE"),
        "sfha": attrs.get("SFHA_TF") == "T",
    }
