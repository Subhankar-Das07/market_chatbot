"""
Portfolio REST router.

All routes are protected by JWT via Depends(get_current_user).
Each user has exactly one portfolio document in the `user_portfolios` collection.
The document is created on first access (upsert pattern) so there is no
explicit "create portfolio" step required after registration.

Endpoints
---------
GET  /api/portfolio                  — fetch the user's portfolio + live quotes
POST /api/portfolio/add              — add a ticker to the watchlist
PATCH /api/portfolio/{ticker}        — update notes / price targets
DELETE /api/portfolio/{ticker}       — remove a ticker
GET  /api/portfolio/market           — read-only price snapshot for all tracked assets
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException, status
from bson import ObjectId

from models.portfolio import (
    UserPortfolio,
    WatchlistAsset,
    WatchlistAssetAdd,
    WatchlistAssetUpdate,
)
from services.db import get_db
from services.market_data import MarketDataService, ASSET_CATALOG
from utils.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(tags=["portfolio"])


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _get_or_create_portfolio(db, user_id: str) -> Dict[str, Any]:
    """
    Fetch the portfolio document for `user_id`, creating an empty one if it
    does not yet exist. Uses MongoDB upsert to avoid race conditions.
    """
    doc = await db["user_portfolios"].find_one({"user_id": user_id})
    if doc is None:
        now = datetime.now(timezone.utc)
        portfolio_doc = {
            "user_id": user_id,
            "assets": [],
            "created_at": now,
            "updated_at": now,
        }
        result = await db["user_portfolios"].insert_one(portfolio_doc)
        portfolio_doc["_id"] = result.inserted_id
        doc = portfolio_doc
    return doc


def _enrich_asset(asset: Dict[str, Any], service: MarketDataService) -> Dict[str, Any]:
    """Merge a watchlist entry with a live quote from the market data cache."""
    quote = service.get_quote(asset["ticker"])
    return {**asset, "live": quote}  # `live` is None if ticker not in catalog


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/api/portfolio")
async def get_portfolio(current_user_id: str = Depends(get_current_user)):
    """
    Return the authenticated user's watchlist enriched with live market quotes.

    Response schema:
    {
        "user_id": "...",
        "assets": [ { ...watchlist fields..., "live": { price, change_pct, ... } }, ... ],
        "updated_at": "..."
    }
    """
    db = get_db()
    doc = await _get_or_create_portfolio(db, current_user_id)
    service = MarketDataService.instance()

    enriched_assets = [_enrich_asset(a, service) for a in doc.get("assets", [])]
    return {
        "user_id": current_user_id,
        "assets": enriched_assets,
        "updated_at": doc.get("updated_at"),
    }


@router.post("/api/portfolio/add", status_code=status.HTTP_201_CREATED)
async def add_to_portfolio(
    payload: WatchlistAssetAdd,
    current_user_id: str = Depends(get_current_user),
):
    """
    Add a new ticker to the user's watchlist.

    - Ticker is normalised to uppercase.
    - If the ticker already exists in the watchlist, returns a 409 Conflict.
    - Enriches the catalog metadata (name, category) from our ASSET_CATALOG
      if not supplied by the client.
    """
    ticker = payload.ticker.upper().strip()
    if not ticker:
        raise HTTPException(status_code=400, detail="Ticker symbol cannot be empty.")

    db = get_db()
    doc = await _get_or_create_portfolio(db, current_user_id)

    # Duplicate guard
    existing_tickers = {a["ticker"] for a in doc.get("assets", [])}
    if ticker in existing_tickers:
        raise HTTPException(
            status_code=409,
            detail=f"'{ticker}' is already in your watchlist.",
        )

    # Enrich from catalog if the client didn't send metadata
    catalog_meta = ASSET_CATALOG.get(ticker, {})
    asset = WatchlistAsset(
        ticker=ticker,
        name=payload.name or catalog_meta.get("name"),
        category=payload.category or catalog_meta.get("category"),
        target_buy=payload.target_buy,
        target_sell=payload.target_sell,
        notes=payload.notes,
    )

    now = datetime.now(timezone.utc)
    await db["user_portfolios"].update_one(
        {"user_id": current_user_id},
        {
            "$push": {"assets": asset.model_dump()},
            "$set": {"updated_at": now},
        },
    )

    return {
        "message": f"'{ticker}' added to watchlist.",
        "asset": asset.model_dump(),
        "live": MarketDataService.instance().get_quote(ticker),
    }


@router.patch("/api/portfolio/{ticker}")
async def update_asset(
    ticker: str,
    payload: WatchlistAssetUpdate,
    current_user_id: str = Depends(get_current_user),
):
    """Update price targets or notes for a tracked asset."""
    ticker = ticker.upper()
    db = get_db()
    doc = await _get_or_create_portfolio(db, current_user_id)

    # Find the asset in the embedded array
    assets: List[Dict] = doc.get("assets", [])
    asset_index = next(
        (i for i, a in enumerate(assets) if a["ticker"] == ticker), None
    )
    if asset_index is None:
        raise HTTPException(
            status_code=404, detail=f"'{ticker}' not found in your watchlist."
        )

    # Build a partial update using MongoDB array element update
    update_fields: Dict[str, Any] = {}
    if payload.name is not None:
        update_fields[f"assets.{asset_index}.name"] = payload.name
    if payload.target_buy is not None:
        update_fields[f"assets.{asset_index}.target_buy"] = payload.target_buy
    if payload.target_sell is not None:
        update_fields[f"assets.{asset_index}.target_sell"] = payload.target_sell
    if payload.notes is not None:
        update_fields[f"assets.{asset_index}.notes"] = payload.notes
    update_fields["updated_at"] = datetime.now(timezone.utc)

    if not update_fields:
        raise HTTPException(status_code=400, detail="No fields to update.")

    await db["user_portfolios"].update_one(
        {"user_id": current_user_id}, {"$set": update_fields}
    )
    return {"message": f"'{ticker}' updated successfully."}


@router.delete("/api/portfolio/{ticker}", status_code=status.HTTP_200_OK)
async def remove_from_portfolio(
    ticker: str,
    current_user_id: str = Depends(get_current_user),
):
    """Remove a ticker from the user's watchlist."""
    ticker = ticker.upper()
    db = get_db()
    result = await db["user_portfolios"].update_one(
        {"user_id": current_user_id},
        {
            "$pull": {"assets": {"ticker": ticker}},
            "$set": {"updated_at": datetime.now(timezone.utc)},
        },
    )
    if result.modified_count == 0:
        raise HTTPException(
            status_code=404, detail=f"'{ticker}' not found in your watchlist."
        )
    return {"message": f"'{ticker}' removed from watchlist."}


@router.get("/api/portfolio/market")
async def get_market_snapshot(current_user_id: str = Depends(get_current_user)):
    """
    Return a live price snapshot for ALL assets in the market catalog.
    Useful for the "add ticker" search UI.
    """
    service = MarketDataService.instance()
    return {
        "type": "market_snapshot",
        "data": service.get_snapshot(),
        "tickers": service.list_tickers(),
    }
