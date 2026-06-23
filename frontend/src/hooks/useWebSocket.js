/**
 * useWebSocket — real-time market data hook with auto-reconnect.
 *
 * Features:
 *  - Derives WebSocket URL from the same BASE_URL used by Axios (no duplication).
 *  - Exponential backoff reconnect: 1s → 2s → 4s → 8s → 16s → cap 30s.
 *  - Connection state exposed so UI can show a "Reconnecting…" badge.
 *  - Returns `prices` (keyed by ticker) and `status` ('connecting'|'live'|'disconnected').
 *  - Heartbeat ping sent every 30s to keep the Render free-tier socket alive.
 *  - Cleans up the socket and all timers on unmount.
 */

import { useEffect, useRef, useState, useCallback } from 'react';

const BASE_URL = import.meta.env.VITE_API_URL || 'https://market-chatbot.onrender.com';
// Convert https://... → wss://... (or http:// → ws://)
const WS_BASE = BASE_URL.replace(/^https/, 'wss').replace(/^http/, 'ws');
const WS_URL  = `${WS_BASE}/api/ws/market`;

const BACKOFF_BASE   = 1000;   // ms
const BACKOFF_MAX    = 30_000; // ms
const PING_INTERVAL  = 30_000; // ms — keeps Render socket alive

export function useWebSocket() {
  const [prices, setPrices]   = useState({});          // { BTC: { price, change_pct, … }, … }
  const [status, setStatus]   = useState('connecting'); // 'connecting' | 'live' | 'disconnected'

  const socketRef    = useRef(null);
  const retryCount   = useRef(0);
  const retryTimer   = useRef(null);
  const pingTimer    = useRef(null);
  const unmounted    = useRef(false);

  // ── Heartbeat ────────────────────────────────────────────────────────────
  const startPing = useCallback((ws) => {
    clearInterval(pingTimer.current);
    pingTimer.current = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, PING_INTERVAL);
  }, []);

  // ── Connect ──────────────────────────────────────────────────────────────
  const connect = useCallback(() => {
    if (unmounted.current) return;

    // Pass JWT as a query param so the backend can optionally auth the stream.
    const token = localStorage.getItem('token');
    const url   = token ? `${WS_URL}?token=${token}` : WS_URL;

    setStatus('connecting');

    const ws = new WebSocket(url);
    socketRef.current = ws;

    ws.onopen = () => {
      if (unmounted.current) { ws.close(); return; }
      retryCount.current = 0;
      setStatus('live');
      startPing(ws);
    };

    ws.onmessage = (event) => {
      try {
        const frame = JSON.parse(event.data);
        if (frame.type === 'market_snapshot' && frame.data) {
          setPrices(frame.data);
        }
        // Ignore pong / other frame types silently.
      } catch {
        // Malformed frame — ignore.
      }
    };

    ws.onerror = () => {
      // onerror is always followed by onclose; handle retry there.
    };

    ws.onclose = () => {
      clearInterval(pingTimer.current);
      if (unmounted.current) return;

      setStatus('disconnected');

      // Exponential backoff
      const delay = Math.min(
        BACKOFF_BASE * 2 ** retryCount.current,
        BACKOFF_MAX,
      );
      retryCount.current += 1;

      retryTimer.current = setTimeout(connect, delay);
    };
  }, [startPing]);

  // ── Lifecycle ────────────────────────────────────────────────────────────
  useEffect(() => {
    unmounted.current = false;
    connect();

    return () => {
      unmounted.current = true;
      clearTimeout(retryTimer.current);
      clearInterval(pingTimer.current);
      if (socketRef.current) {
        socketRef.current.onclose = null; // prevent retry on intentional close
        socketRef.current.close();
      }
    };
  }, [connect]);

  return { prices, status };
}
