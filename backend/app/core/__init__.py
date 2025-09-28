"""
Core configuration and utilities
Contains configuration modules
"""

from .config import settings
from .database import connect_to_mongo, close_mongo_connection

__all__ = [
    "settings",
    "connect_to_mongo",
    "close_mongo_connection"
]