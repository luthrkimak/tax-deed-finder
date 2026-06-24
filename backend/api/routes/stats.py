from fastapi import APIRouter
from datetime import date, timedelta
from collections import Counter
from db.client import get_supabase

router = APIRouter()

EXCLUDE_STATUSES = ["archived", "cancelled", "sold", "no_bid"]

@router.get("")
def get_stats():
    sb = get_supabase()
    today = date.today().isoformat()
    in_7_days = (date.today() + timedelta(days=7)).isoformat()

    # All upcoming available auctions
    all_rows = (
        sb.table("auctions")
        .select("id,county,type,min_bid,assessed_value,auction_date,address")
        .not_.in_("status", EXCLUDE_STATUSES)
        .gte("auction_date", today)
        .eq("state", "FL")
        .limit(3000)
        .execute()
        .data
    )

    total_available = len(all_rows)
    next_7_days = sum(1 for r in all_rows if r.get("auction_date") and r["auction_date"] <= in_7_days)

    bids = [r["min_bid"] for r in all_rows if r.get("min_bid") is not None]
    min_bid_available = min(bids) if bids else None

    # Count by county
    county_counts = Counter(r["county"] for r in all_rows if r.get("county"))
    top_counties = [
        {"county": c, "count": n}
        for c, n in county_counts.most_common(8)
    ]
    active_counties = len(county_counts)

    # Top discounts: need both min_bid and assessed_value
    discounts = []
    for r in all_rows:
        mb = r.get("min_bid")
        av = r.get("assessed_value")
        if mb is not None and av is not None and av > 0 and mb < av:
            pct = round((1 - mb / av) * 100, 1)
            discounts.append({
                "id": r["id"],
                "address": r.get("address"),
                "county": r["county"],
                "type": r["type"],
                "auction_date": r["auction_date"],
                "min_bid": mb,
                "assessed_value": av,
                "discount_pct": pct,
            })
    discounts.sort(key=lambda x: -x["discount_pct"])
    top5 = discounts[:5]

    return {
        "total_available": total_available,
        "next_7_days": next_7_days,
        "min_bid_available": min_bid_available,
        "active_counties": active_counties,
        "top_counties": top_counties,
        "top_discounts": top5,
    }
