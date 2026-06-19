"""Base scraper stub — to be implemented in later tasks."""
from abc import ABC, abstractmethod


class BaseScraper(ABC):
    """Abstract base class for all county auction scrapers."""

    @abstractmethod
    async def fetch_listings(self) -> list:
        """Fetch auction listings from the county website."""
        ...
