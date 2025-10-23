"""
Shared utilities and modules
Common functionality used across services
"""

from .logging import setup_logger, get_logger


__all__ = [
    "setup_logger",
    "get_logger",
]