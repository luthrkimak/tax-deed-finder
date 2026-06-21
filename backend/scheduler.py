from __future__ import annotations
import logging
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from scrapers.florida.orange_county import OrangeCountyScraper
from scrapers.florida.miami_dade import MiamiDadeScraper
from scrapers.florida.all_counties import FL_SCRAPERS
from scrapers.texas.dallas_county import DallasCountyScraper
from scrapers.texas.travis_county import TravisCountyScraper
from scrapers.georgia.fulton_county import FultonCountyScraper
from notifications import send_alert_emails

logger = logging.getLogger(__name__)

SCRAPERS = [
    OrangeCountyScraper,
    MiamiDadeScraper,
    *FL_SCRAPERS,
    DallasCountyScraper,
    TravisCountyScraper,
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


def create_scheduler() -> BackgroundScheduler:
    scheduler = BackgroundScheduler()
    scheduler.add_job(run_all_scrapers, CronTrigger(hour=2, minute=0))
    return scheduler
