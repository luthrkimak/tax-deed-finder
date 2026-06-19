from __future__ import annotations
import html
import os
from datetime import datetime, timezone, timedelta
import resend
from db.client import get_supabase

resend.api_key = os.environ.get("RESEND_API_KEY", "")
FROM_EMAIL = os.environ.get("ALERT_FROM_EMAIL", "alerts@taxdeedfinder.com")

COOLDOWN_HOURS = 23

def _auction_matches_filters(auction: dict, filters: dict) -> bool:
    if filters.get("state") and auction.get("state") != filters["state"].upper():
        return False
    if filters.get("county") and filters["county"].lower() not in (auction.get("county") or "").lower():
        return False
    if filters.get("type") and auction.get("type") != filters["type"]:
        return False
    if filters.get("min_bid") and (auction.get("min_bid") or 0) < filters["min_bid"]:
        return False
    if filters.get("max_bid") and (auction.get("min_bid") or 0) > filters["max_bid"]:
        return False
    return True

def send_alert_emails(new_auction_ids: list[str]) -> None:
    if not new_auction_ids:
        return
    sb = get_supabase()
    auctions_result = sb.table("auctions").select("*").in_("id", new_auction_ids).execute()
    auctions = auctions_result.data
    alerts_result = sb.table("alerts").select("*").eq("active", True).execute()
    alerts = alerts_result.data

    now = datetime.now(timezone.utc)
    for alert in alerts:
        # Skip if sent within cooldown window
        last_sent = alert.get("last_sent_at")
        if last_sent:
            last_sent_dt = datetime.fromisoformat(last_sent.replace("Z", "+00:00"))
            if (now - last_sent_dt) < timedelta(hours=COOLDOWN_HOURS):
                continue

        matching = [a for a in auctions if _auction_matches_filters(a, alert.get("filters", {}))]
        if not matching:
            continue
        items_html = "".join(
            f"<li><b>{html.escape(a.get('address') or 'N/A')}</b> — {html.escape(a.get('type') or '')} — Bid: ${a.get('min_bid', 0):,.2f} — Date: {html.escape(str(a.get('auction_date') or 'TBD'))}</li>"
            for a in matching
        )
        resend.Emails.send({
            "from": FROM_EMAIL,
            "to": alert["email"],
            "subject": f"Tax Deed Finder — {len(matching)} new auction(s) match your alert",
            "html": f"<h2>New Auctions Found</h2><ul>{items_html}</ul>",
        })
        sb.table("alerts").update({"last_sent_at": now.isoformat()}).eq("id", alert["id"]).execute()
