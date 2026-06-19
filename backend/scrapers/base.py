from __future__ import annotations
import os
import time
import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Optional
from db.client import get_supabase

logger = logging.getLogger(__name__)

@dataclass
class ScrapeResult:
    records_found: int = 0
    records_new: int = 0
    error: Optional[str] = None
    new_ids: list[str] = field(default_factory=list)

class BaseScraper(ABC):
    state: str
    county: str
    source_name: str

    @property
    def delay(self) -> float:
        return float(os.environ.get("SCRAPE_DELAY_SECONDS", "2"))

    @abstractmethod
    def scrape(self) -> list[dict]:
        """Fetch and parse raw auction records. Return list of dicts matching auctions schema."""

    def sleep(self):
        time.sleep(self.delay)

    def run(self) -> ScrapeResult:
        sb = get_supabase()
        result = ScrapeResult()
        try:
            records = self.scrape()
            result.records_found = len(records)

            if records:
                # Get existing parcel IDs for this county before upsert
                existing_result = sb.table("auctions").select("parcel_id").eq("state", self.state).eq("county", self.county).execute()
                existing_parcels = {row["parcel_id"] for row in existing_result.data}

                upsert_result = sb.table("auctions").upsert(
                    records, on_conflict="parcel_id,state,county"
                ).execute()

                # Only IDs for truly new records (not updates to existing ones)
                new_records = [r for r in upsert_result.data if r.get("parcel_id") not in existing_parcels]
                result.new_ids = [r["id"] for r in new_records if r.get("id")]
                result.records_new = len(new_records)

            sb.table("scrape_logs").insert({
                "source": self.source_name,
                "state": self.state,
                "county": self.county,
                "records_found": result.records_found,
                "records_new": result.records_new,
                "status": "success",
            }).execute()

        except Exception as exc:
            error_msg = str(exc)
            result.error = error_msg
            logger.error("Scraper %s failed: %s", self.source_name, error_msg)
            try:
                sb.table("scrape_logs").insert({
                    "source": self.source_name,
                    "state": self.state,
                    "county": self.county,
                    "records_found": 0,
                    "records_new": 0,
                    "status": "failed",
                    "error_message": error_msg,
                }).execute()
            except Exception:
                pass

        return result
