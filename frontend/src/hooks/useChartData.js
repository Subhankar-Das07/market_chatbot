/**
 * useChartData — sliding-window time-series hook.
 *
 * Consumes `prices` from useWebSocket and maintains, per ticker,
 * a rolling history of up to MAX_POINTS data points.
 *
 * Memory guarantee: the array is always capped via .slice(-MAX_POINTS).
 * No matter how long the app runs, each ticker's buffer stays flat at ≤ 30 entries.
 *
 * API:
 *   const { history, activeTicker, setActiveTicker } = useChartData(prices, 'BTC');
 *   history → [{ time: '10:42:03', price: 67120.5 }, …]  (latest last)
 */

import { useState, useEffect, useRef } from 'react';

const MAX_POINTS = 30;

export function useChartData(prices, defaultTicker = 'BTC') {
  const [activeTicker, setActiveTicker] = useState(defaultTicker);
  // Stores history per ticker: { BTC: [{time, price}, …], ETH: […], … }
  const historyRef = useRef({});
  // Trigger re-render when history for the active ticker changes.
  const [activeHistory, setActiveHistory] = useState([]);

  useEffect(() => {
    if (!prices || Object.keys(prices).length === 0) return;

    const quote = prices[activeTicker];
    if (!quote || quote.price == null) return;

    const now = new Date();
    const timeLabel = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const point = { time: timeLabel, price: quote.price, ts: now.getTime() };

    // Append to this ticker's buffer, then hard-cap with slice.
    const prev = historyRef.current[activeTicker] ?? [];

    // De-duplicate: skip if the price hasn't changed since last tick
    if (prev.length > 0 && prev[prev.length - 1].price === point.price) return;

    const next = [...prev, point].slice(-MAX_POINTS);
    historyRef.current[activeTicker] = next;

    // Only trigger a re-render for the active ticker's history
    setActiveHistory(next);
  }, [prices, activeTicker]);

  // When the user switches the active ticker, immediately show whatever
  // history we already have buffered for it (may be empty).
  const handleSetActiveTicker = (ticker) => {
    setActiveTicker(ticker);
    setActiveHistory(historyRef.current[ticker] ?? []);
  };

  return { history: activeHistory, activeTicker, setActiveTicker: handleSetActiveTicker };
}
