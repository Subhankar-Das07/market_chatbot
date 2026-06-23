"""
MarketDataService — Singleton async market data engine.

Architecture:
  - In-memory price cache keyed by ticker symbol.
  - A background asyncio task ticks every TICK_INTERVAL seconds,
    updating prices with a simulated random walk.
  - To swap in a real data source (Alpha Vantage, Binance, Yahoo),
    replace only the `_fetch_live_price` coroutine below.
"""

from __future__ import annotations

import asyncio
import logging
import random
import time
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

# ── Configurable constants ────────────────────────────────────────────────────

TICK_INTERVAL: float = 3.0  # seconds between price updates

# Seed prices and metadata for tracked assets.
# Add / remove entries here to expand coverage without touching any other file.
ASSET_CATALOG: Dict[str, Dict[str, Any]] = {
    "BTC":  {"name": "Bitcoin",       "base_price": 67_000.0, "category": "crypto",  "currency": "USD"},
    "ETH":  {"name": "Ethereum",      "base_price":  3_500.0, "category": "crypto",  "currency": "USD"},
    "AAPL": {"name": "Apple Inc.",    "base_price":    195.0, "category": "equity",  "currency": "USD"},
    "TSLA": {"name": "Tesla Inc.",    "base_price":    240.0, "category": "equity",  "currency": "USD"},
    "SPY":  {"name": "S&P 500 ETF",  "base_price":    530.0, "category": "etf",     "currency": "USD"},
    "NVDA": {"name": "NVIDIA Corp.",  "base_price":    900.0, "category": "equity",  "currency": "USD"},
    "MSFT": {"name": "Microsoft",     "base_price":    420.0, "category": "equity",  "currency": "USD"},
    "SOL":  {"name": "Solana",        "base_price":    165.0, "category": "crypto",  "currency": "USD"},
}

# Maximum random-walk step as a fraction of price per tick (e.g. 0.3 %).
VOLATILITY_FRACTION: float = 0.003


# ── Singleton ─────────────────────────────────────────────────────────────────

class MarketDataService:
    """
    Central in-memory market data engine.

    Usage:
        service = MarketDataService.instance()
        snapshot = service.get_snapshot()         # full price map
        quote    = service.get_quote("BTC")       # single asset
        await service.start_background_feed()     # call once on startup
        await service.stop_background_feed()      # call on shutdown
    """

    _instance: Optional["MarketDataService"] = None

    def __new__(cls) -> "MarketDataService":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialised = False
        return cls._instance

    @classmethod
    def instance(cls) -> "MarketDataService":
        """Return the process-wide singleton."""
        return cls()

    # ── Initialisation ────────────────────────────────────────────────────────

    def __init__(self) -> None:
        if self._initialised:
            return
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._task: Optional[asyncio.Task] = None
        self._lock = asyncio.Lock()
        self._running = False
        self._seed_cache()
        self._initialised = True
        logger.info("MarketDataService initialised with %d assets.", len(ASSET_CATALOG))

    def _seed_cache(self) -> None:
        """Populate the cache with base prices before the first tick."""
        for ticker, meta in ASSET_CATALOG.items():
            self._cache[ticker] = {
                "ticker": ticker,
                "name": meta["name"],
                "price": meta["base_price"],
                "prev_close": meta["base_price"],
                "change": 0.0,
                "change_pct": 0.0,
                "category": meta["category"],
                "currency": meta["currency"],
                "last_updated": time.time(),
            }

    # ── Public read API ───────────────────────────────────────────────────────

    def get_snapshot(self) -> Dict[str, Dict[str, Any]]:
        """Return a shallow copy of the entire price cache (thread-safe read)."""
        return dict(self._cache)

    def get_quote(self, ticker: str) -> Optional[Dict[str, Any]]:
        """Return a single asset quote or None if the ticker is unknown."""
        return self._cache.get(ticker.upper())

    def list_tickers(self) -> list[str]:
        return list(self._cache.keys())

    # ── Background feed ───────────────────────────────────────────────────────

    async def start_background_feed(self) -> None:
        """
        Launch the background price-tick task.
        Safe to call multiple times — only one task will ever run.
        """
        if self._running:
            logger.warning("MarketDataService background feed already running.")
            return
        self._running = True
        self._task = asyncio.create_task(self._tick_loop(), name="market-data-tick")
        logger.info(
            "MarketDataService background feed started (%.1fs interval).", TICK_INTERVAL
        )

    async def stop_background_feed(self) -> None:
        """Gracefully cancel the background tick task on application shutdown."""
        self._running = False
        if self._task and not self._task.done():
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info("MarketDataService background feed stopped.")

    # ── Internal tick loop ────────────────────────────────────────────────────

    async def _tick_loop(self) -> None:
        """
        Runs forever until cancelled.
        Updates every tracked ticker by calling `_fetch_live_price`.
        """
        while self._running:
            await asyncio.sleep(TICK_INTERVAL)
            async with self._lock:
                for ticker in list(self._cache.keys()):
                    try:
                        new_price = await self._fetch_live_price(ticker)
                        old_price = self._cache[ticker]["prev_close"]
                        change = round(new_price - old_price, 4)
                        change_pct = round((change / old_price) * 100, 4) if old_price else 0.0
                        self._cache[ticker].update(
                            {
                                "price": round(new_price, 4),
                                "change": change,
                                "change_pct": change_pct,
                                "last_updated": time.time(),
                            }
                        )
                    except Exception as exc:  # noqa: BLE001
                        logger.warning("Tick error for %s: %s", ticker, exc)

    # ── Data source adapter ───────────────────────────────────────────────────
    # ▼▼▼  SWAP THIS ONE COROUTINE TO CONNECT A REAL EXCHANGE API  ▼▼▼

    async def _fetch_live_price(self, ticker: str) -> float:
        """
        MVP implementation: Gaussian random walk around the current price.

        Production replacement (Alpha Vantage example):
            async with aiohttp.ClientSession() as sess:
                r = await sess.get(
                    "https://www.alphavantage.co/query",
                    params={"function": "GLOBAL_QUOTE", "symbol": ticker, "apikey": API_KEY}
                )
                data = await r.json()
                return float(data["Global Quote"]["05. price"])
        """
        current = self._cache[ticker]["price"]
        step = current * VOLATILITY_FRACTION
        return max(0.01, current + random.gauss(0, step))
