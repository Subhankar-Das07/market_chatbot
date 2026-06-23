"""
MarketDataService — Singleton async market data engine.

Architecture:
  - In-memory price cache keyed by our internal ticker symbol.
  - A background asyncio task fires every TICK_INTERVAL seconds.
  - Each tick issues ONE batch HTTP request to Yahoo Finance's public Quote API,
    fetching all 8 symbols in a single round-trip to minimise rate-limit exposure.
  - On any HTTP or parse failure the old cached prices are preserved unchanged,
    so the WebSocket broadcast layer never crashes or serves stale-error data.
  - The aiohttp ClientSession is reused across ticks (created once on startup,
    closed on shutdown) for maximum connection efficiency.

Ticker mapping:
  Internal │ Yahoo Finance symbol
  ─────────┼────────────────────
  BTC      │ BTC-USD
  ETH      │ ETH-USD
  AAPL     │ AAPL
  TSLA     │ TSLA
  SPY      │ SPY
  NVDA     │ NVDA
  MSFT     │ MSFT
  SOL      │ SOL-USD

To add a new asset: add one entry to ASSET_CATALOG with its Yahoo symbol.
No other file needs to change.
"""

from __future__ import annotations

import asyncio
import logging
import time
from typing import Dict, Any, List, Optional

import yfinance as yf

logger = logging.getLogger(__name__)

# ── Configurable constants ────────────────────────────────────────────────────

TICK_INTERVAL: float = 7.0          # seconds between Yahoo Finance fetches
REQUEST_TIMEOUT: float = 8.0        # timeout per batch request (used internally if needed)

# ── Asset catalog ─────────────────────────────────────────────────────────────
# Each entry: internal_ticker → metadata including the Yahoo Finance symbol.
# The base_price is used ONLY as the seed while the first live fetch is in flight.

ASSET_CATALOG: Dict[str, Dict[str, Any]] = {
    "BTC":  {"name": "Bitcoin",      "yahoo": "BTC-USD",  "base_price": 67_000.0, "category": "crypto",  "currency": "USD"},
    "ETH":  {"name": "Ethereum",     "yahoo": "ETH-USD",  "base_price":  3_500.0, "category": "crypto",  "currency": "USD"},
    "AAPL": {"name": "Apple Inc.",   "yahoo": "AAPL",     "base_price":    195.0, "category": "equity",  "currency": "USD"},
    "TSLA": {"name": "Tesla Inc.",   "yahoo": "TSLA",     "base_price":    240.0, "category": "equity",  "currency": "USD"},
    "SPY":  {"name": "S&P 500 ETF",  "yahoo": "SPY",      "base_price":    530.0, "category": "etf",     "currency": "USD"},
    "NVDA": {"name": "NVIDIA Corp.", "yahoo": "NVDA",     "base_price":    900.0, "category": "equity",  "currency": "USD"},
    "MSFT": {"name": "Microsoft",    "yahoo": "MSFT",     "base_price":    420.0, "category": "equity",  "currency": "USD"},
    "SOL":  {"name": "Solana",       "yahoo": "SOL-USD",  "base_price":    165.0, "category": "crypto",  "currency": "USD"},
}

# Pre-build the batch symbols string and a reverse-lookup map (yahoo → internal)
_YAHOO_SYMBOLS: str = ",".join(meta["yahoo"] for meta in ASSET_CATALOG.values())
_YAHOO_TO_INTERNAL: Dict[str, str] = {
    meta["yahoo"]: ticker for ticker, meta in ASSET_CATALOG.items()
}


# ── Singleton ─────────────────────────────────────────────────────────────────

class MarketDataService:
    """
    Central in-memory market data engine backed by Yahoo Finance.

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
        logger.info(
            "MarketDataService initialised with %d assets. Yahoo symbols: %s",
            len(ASSET_CATALOG),
            _YAHOO_SYMBOLS,
        )

    def _seed_cache(self) -> None:
        """
        Populate the cache with base prices so the WebSocket has something to
        broadcast immediately on startup before the first live fetch returns.
        """
        for ticker, meta in ASSET_CATALOG.items():
            self._cache[ticker] = {
                "ticker":       ticker,
                "name":         meta["name"],
                "price":        meta["base_price"],
                "prev_close":   meta["base_price"],
                "change":       0.0,
                "change_pct":   0.0,
                "category":     meta["category"],
                "currency":     meta["currency"],
                "source":       "seed",           # 'seed' | 'yahoo' | 'stale'
                "last_updated": time.time(),
            }

    # ── Public read API ───────────────────────────────────────────────────────

    def get_snapshot(self) -> Dict[str, Dict[str, Any]]:
        """Return a shallow copy of the entire price cache (thread-safe read)."""
        return dict(self._cache)

    def get_quote(self, ticker: str) -> Optional[Dict[str, Any]]:
        """Return a single asset quote or None if the ticker is unknown."""
        return self._cache.get(ticker.upper())

    def list_tickers(self) -> List[str]:
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
            "MarketDataService live feed started (%.1fs interval, Yahoo Finance).",
            TICK_INTERVAL,
        )

    async def stop_background_feed(self) -> None:
        """Gracefully cancel the background tick task."""
        self._running = False
        if self._task and not self._task.done():
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info("MarketDataService live feed stopped.")

    # ── Internal tick loop ────────────────────────────────────────────────────

    async def _tick_loop(self) -> None:
        """
        Fires every TICK_INTERVAL seconds.
        Issues a single batch request for all symbols, then updates the cache.
        If the request fails for any reason, old prices are kept untouched.
        """
        while self._running:
            await asyncio.sleep(TICK_INTERVAL)
            try:
                live_prices = await self._fetch_batch_quotes()
                if live_prices:
                    async with self._lock:
                        self._apply_quotes(live_prices)
                        logger.debug(
                            "Cache updated: %d assets from Yahoo Finance.", len(live_prices)
                        )
            except asyncio.CancelledError:
                raise  # propagate cancellation cleanly
            except Exception as exc:  # noqa: BLE001
                # Keep previous prices — never crash the broadcast layer.
                logger.warning(
                    "MarketDataService tick failed — retaining cached prices. Error: %s", exc
                )

    # ── Yahoo Finance batch fetch ─────────────────────────────────────────────

    def _fetch_yfinance_sync(self) -> Dict[str, float]:
        """Synchronous wrapper for yfinance."""
        tickers = yf.Tickers(_YAHOO_SYMBOLS.replace(",", " "))
        results: Dict[str, float] = {}
        for yahoo_symbol, internal in _YAHOO_TO_INTERNAL.items():
            try:
                # yfinance ticker.info can be slow, but fast_info is better.
                # using fast_info to get the last price
                ticker_obj = tickers.tickers[yahoo_symbol]
                price = ticker_obj.fast_info.get("lastPrice")
                if price is not None:
                    results[internal] = float(price)
            except Exception as e:
                logger.debug("Failed to get fast_info for %s: %s", yahoo_symbol, e)
                
        return results

    async def _fetch_batch_quotes(self) -> Dict[str, float]:
        """
        Fetch regularMarketPrice for all symbols in a single batch using yfinance.

        Returns:
            Dict mapping internal ticker (e.g. "BTC") → live float price.
            Returns an empty dict if the request fails.
        """
        try:
            results = await asyncio.to_thread(self._fetch_yfinance_sync)
            logger.info(
                "yfinance batch fetch: %d / %d symbols resolved.",
                len(results),
                len(ASSET_CATALOG),
            )
            return results
        except Exception as e:
            logger.warning("yfinance fetch error: %s", e)
            return {}

    # ── Cache update ──────────────────────────────────────────────────────────

    def _apply_quotes(self, live_prices: Dict[str, float]) -> None:
        """
        Merge the live prices from Yahoo into the in-memory cache.
        Calculates change and change_pct relative to the previous cached price
        so the WebSocket stream always exposes accurate delta values.
        """
        now = time.time()
        for ticker, new_price in live_prices.items():
            if ticker not in self._cache:
                continue
            old_price  = self._cache[ticker]["price"]
            change     = round(new_price - old_price, 6)
            change_pct = round((change / old_price) * 100, 6) if old_price else 0.0

            self._cache[ticker].update(
                {
                    "price":        round(new_price, 6),
                    "change":       change,
                    "change_pct":   change_pct,
                    "source":       "yahoo",
                    "last_updated": now,
                }
            )
