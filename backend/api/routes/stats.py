from fastapi import APIRouter, Query
from datetime import date, timedelta
from collections import Counter
from typing import Optional
from db.client import get_supabase

router = APIRouter()

EXCLUDE_STATUSES = ["archived", "cancelled", "sold", "no_bid"]
ACTIVE_STATES = ["FL", "MS", "GA"]

@router.get("")
def get_stats(state: Optional[str] = Query(default=None)):
    sb = get_supabase()
    today = date.today().isoformat()
    in_7_days = (date.today() + timedelta(days=7)).isoformat()

    # All upcoming available auctions — paginate to bypass Supabase 1000-row cap
    all_rows = []
    page_size = 1000
    offset = 0
    while True:
        q = (
            sb.table("auctions")
            .select("id,county,state,type,min_bid,assessed_value,auction_date,address")
            .not_.in_("status", EXCLUDE_STATUSES)
            .gte("auction_date", today)
        )
        if state and state.upper() != "ALL":
            q = q.eq("state", state.upper())
        else:
            q = q.in_("state", ACTIVE_STATES)
        batch = q.range(offset, offset + page_size - 1).execute().data
        all_rows.extend(batch)
        if len(batch) < page_size:
            break
        offset += page_size

    total_available = len(all_rows)
    next_7_days = sum(1 for r in all_rows if r.get("auction_date") and r["auction_date"] <= in_7_days)

    bids = [r["min_bid"] for r in all_rows if r.get("min_bid") is not None]
    min_bid_available = min(bids) if bids else None

    # Count by (state, county)
    county_state: dict[str, str] = {}
    county_counts: Counter = Counter()
    for r in all_rows:
        c = r.get("county")
        s = r.get("state", "")
        if c:
            county_counts[c] += 1
            county_state[c] = s
    top_counties = [
        {"county": c, "count": n, "state": county_state.get(c, "")}
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
                "state": r.get("state", ""),
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
