"""
Portfolio Pydantic models.

Collections
-----------
user_portfolios  : one document per user, contains `assets` array.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel, Field


class WatchlistAsset(BaseModel):
    """A single tracked position / watchlist entry."""

    ticker: str = Field(..., description="Uppercase ticker symbol, e.g. 'AAPL'")
    name: Optional[str] = Field(default=None, description="Human-readable name")
    category: Optional[str] = Field(
        default=None,
        description="Asset class: 'equity' | 'crypto' | 'etf' | 'fx' | 'commodity'",
    )
    target_buy: Optional[float] = Field(
        default=None, description="User's target buy price (for price alerts)"
    )
    target_sell: Optional[float] = Field(
        default=None, description="User's target sell price (for price alerts)"
    )
    notes: Optional[str] = Field(default=None, max_length=500)
    added_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class WatchlistAssetAdd(BaseModel):
    """Payload accepted by POST /api/portfolio/add."""

    ticker: str
    name: Optional[str] = None
    category: Optional[str] = None
    target_buy: Optional[float] = None
    target_sell: Optional[float] = None
    notes: Optional[str] = None


class WatchlistAssetUpdate(BaseModel):
    """Payload accepted by PATCH /api/portfolio/{ticker}."""

    name: Optional[str] = None
    target_buy: Optional[float] = None
    target_sell: Optional[float] = None
    notes: Optional[str] = None


class UserPortfolio(BaseModel):
    """Top-level portfolio document stored in MongoDB."""

    user_id: str
    assets: list[WatchlistAsset] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Config:
        populate_by_name = True
