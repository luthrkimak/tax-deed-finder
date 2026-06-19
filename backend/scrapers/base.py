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
                upsert_result = sb.table("auctions").upsert(
                    records, on_conflict="parcel_id,state,county"
                ).execute()
                result.records_new = len(upsert_result.data)

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
