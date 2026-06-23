"""
WebSocket router — real-time market data streaming.

Endpoint:   ws://[host]/api/ws/market
Protocol:   Client connects → server streams JSON price snapshots every PUSH_INTERVAL seconds.
Auth:       Optional JWT token passed as ?token= query param.
            Unauthenticated connections receive the same public feed (market data is public).
            Future: private channels (portfolio alerts) will require validated tokens.

Connection Manager design:
  - A single ConnectionManager instance lives for the process lifetime.
  - Each new WebSocket is appended to the `active` set.
  - Sends are fire-and-forget; if a client disconnects mid-send, the
    WebSocketDisconnect exception is caught and the client is cleanly evicted.
  - Broadcast is O(n) over active connections — adequate for MVP.
  - For horizontal scale: replace the in-process set with a Redis Pub/Sub channel.
"""

from __future__ import annotations

import asyncio
import json
import logging
import time
from typing import Set

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from fastapi.websockets import WebSocketState

from services.market_data import MarketDataService

logger = logging.getLogger(__name__)

router = APIRouter(tags=["websocket"])

PUSH_INTERVAL: float = 2.0  # seconds between push frames to each client


# ── Connection Manager ────────────────────────────────────────────────────────

class ConnectionManager:
    """
    Manages the lifecycle of all active WebSocket connections.

    Internals
    ---------
    `active`  : set[WebSocket]
        Every open connection lives here. Set chosen for O(1) add/discard.

    `broadcast` pushes the same payload to all connections concurrently via
    asyncio.gather, meaning one slow client cannot block all others.
    Individual send failures are caught and the offending socket is evicted
    without crashing the broadcast loop.
    """

    def __init__(self) -> None:
        self.active: Set[WebSocket] = set()

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        self.active.add(ws)
        logger.info(
            "WS client connected. Total active: %d", len(self.active)
        )

    def disconnect(self, ws: WebSocket) -> None:
        self.active.discard(ws)
        logger.info(
            "WS client disconnected. Total active: %d", len(self.active)
        )

    async def send_json(self, ws: WebSocket, payload: dict) -> bool:
        """Send JSON to a single client. Returns False if the send failed."""
        try:
            if ws.client_state == WebSocketState.CONNECTED:
                await ws.send_text(json.dumps(payload))
                return True
        except Exception as exc:  # noqa: BLE001
            logger.warning("WS send error: %s", exc)
        return False

    async def broadcast(self, payload: dict) -> None:
        """
        Push `payload` to every active connection concurrently.
        Evicts any client whose send fails.
        """
        if not self.active:
            return
        results = await asyncio.gather(
            *[self.send_json(ws, payload) for ws in list(self.active)],
            return_exceptions=True,
        )
        # Evict failed connections
        dead = [ws for ws, ok in zip(list(self.active), results) if ok is False]
        for ws in dead:
            self.active.discard(ws)


# Process-wide singleton manager
manager = ConnectionManager()


# ── WebSocket endpoint ────────────────────────────────────────────────────────

@router.websocket("/api/ws/market")
async def market_feed(
    websocket: WebSocket,
    token: str = Query(default=None, description="Optional JWT bearer token"),
):
    """
    Real-time market price stream.

    Frame schema (JSON):
    {
        "type": "market_snapshot",
        "timestamp": <unix_epoch_float>,
        "data": {
            "BTC":  {"ticker": "BTC", "name": "Bitcoin", "price": 67123.45,
                     "change": 45.2, "change_pct": 0.067, "category": "crypto", ...},
            ...
        }
    }

    Special frames:
      - "ping"  → server replies with "pong" (keepalive)
      - "sub"   → future subscription filter (reserved)
    """
    await manager.connect(websocket)
    service = MarketDataService.instance()

    try:
        # Send an immediate snapshot on connection so the client UI is
        # populated before the first tick fires.
        await websocket.send_text(
            json.dumps(
                {
                    "type": "market_snapshot",
                    "timestamp": time.time(),
                    "data": service.get_snapshot(),
                }
            )
        )

        # Async generator loop: push a snapshot every PUSH_INTERVAL seconds,
        # while also listening for client messages (ping/sub frames).
        while True:
            try:
                # Wait for either a client message or a timeout.
                raw = await asyncio.wait_for(
                    websocket.receive_text(), timeout=PUSH_INTERVAL
                )
                # Handle client-initiated frames
                try:
                    msg = json.loads(raw)
                    if msg.get("type") == "ping":
                        await websocket.send_text(
                            json.dumps({"type": "pong", "timestamp": time.time()})
                        )
                except (json.JSONDecodeError, AttributeError):
                    pass  # ignore malformed frames

            except asyncio.TimeoutError:
                # No message from client — push the next price snapshot.
                snapshot = service.get_snapshot()
                await websocket.send_text(
                    json.dumps(
                        {
                            "type": "market_snapshot",
                            "timestamp": time.time(),
                            "data": snapshot,
                        }
                    )
                )

    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(websocket)
