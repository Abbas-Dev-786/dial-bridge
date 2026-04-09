"""
Compatibility shim.

This module previously defined a separate Settings model that drifted from
`app.config`. It now re-exports the canonical configuration entrypoints.
"""

from app.config import Settings, get_settings, settings

__all__ = ["Settings", "get_settings", "settings"]

