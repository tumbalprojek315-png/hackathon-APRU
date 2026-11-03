"""Lapisan open finance Laju: antarmuka penyedia, versi simulasi, dan versi sungguhan."""
import os

from .base import LinkedAccount, LinkSession, Provider, ProviderError, RawTransaction  # noqa: F401
from .categorize import CATEGORY_LABELS, PLATFORM_LABELS, history, summarize  # noqa: F401


def get_provider() -> Provider:
    mode = os.environ.get("LAJU_PROVIDER", "mock").lower()
    if mode == "live":
        from .live import LiveProvider
        return LiveProvider()
    from .mock import MockProvider
    return MockProvider()
