from __future__ import annotations
import logging
from datetime import date
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from db.client import get_supabase
from scrapers.florida.orange_county import OrangeCountyScraper
from scrapers.florida.miami_dade import MiamiDadeScraper
from scrapers.florida.all_counties import FL_SCRAPERS
from scrapers.california.all_counties import CA_SCRAPERS
from scrapers.north_carolina.all_counties import NC_SCRAPERS
from scrapers.texas.dallas_county import DallasCountyScraper
from scrapers.texas.travis_county import TravisCountyScraper
from scrapers.texas.bexar_county import BexarCountyScraper
from scrapers.georgia.fulton_county import FultonCountyScraper
from notifications import send_alert_emails

logger = logging.getLogger(__name__)

SCRAPERS = [
    OrangeCountyScraper,
    MiamiDadeScraper,
    *FL_SCRAPERS,
    *CA_SCRAPERS,
    *NC_SCRAPERS,
    DallasCountyScraper,
    TravisCountyScraper,
    BexarCountyScraper,
    FultonCountyScraper,
]


def run_all_scrapers():
    new_ids: list[str] = []
    for ScraperClass in SCRAPERS:
        scraper = ScraperClass()
        try:
            result = scraper.run()
            logger.info(
                "%s: found=%d new=%d",
                scraper.source_name, result.records_found, result.records_new,
            )
            new_ids.extend(result.new_ids)
        except Exception as exc:
            logger.error("Scraper %s crashed: %s", ScraperClass.__name__, exc)
    send_alert_emails(new_ids)


def archive_past_auctions() -> None:
    sb = get_supabase()
    today = date.today().isoformat()
    # Sold auctions that passed → archive (hide)
    sold = (
        sb.table("auctions")
        .update({"status": "archived"})
        .lt("auction_date", today)
        .eq("status", "sold")
        .execute()
    )
    # Upcoming auctions that passed without a bid → no_bid (keep visible)
    no_bid = (
        sb.table("auctions")
        .update({"status": "no_bid"})
        .lt("auction_date", today)
        .in_("status", ["upcoming", "active"])
        .execute()
    )
    logger.info("Archived %d sold | marked %d as no_bid", len(sold.data), len(no_bid.data))


def create_scheduler() -> BackgroundScheduler:
    scheduler = BackgroundScheduler()
    scheduler.add_job(run_all_scrapers, CronTrigger(hour=2, minute=0))
    scheduler.add_job(run_all_scrapers, CronTrigger(hour=14, minute=0))
    scheduler.add_job(archive_past_auctions, CronTrigger(hour=0, minute=0))
    return scheduler
