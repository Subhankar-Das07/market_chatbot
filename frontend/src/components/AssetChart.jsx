/**
 * AssetChart — zero-dependency pure SVG real-time price chart.
 *
 * Features:
 *  - Pure SVG path rendered from the sliding-window history (no recharts, no chart.js)
 *  - Gradient area fill with subtle glow on the path line
 *  - Minimal clean gridlines (4 horizontal price levels)
 *  - Ticker selector tab-bar with smooth active state
 *  - Price flash on tick change (green / red)
 *  - "Waiting for live tick…" state when history is empty
 *  - Fully responsive via viewBox scaling
 *
 * Props:
 *   prices        : Record<ticker, QuoteObject>  — live feed from useWebSocket
 *   history       : [{time, price}]              — sliding window from useChartData
 *   activeTicker  : string
 *   setActiveTicker: (ticker: string) => void
 *   availableTickers: string[]
 */

import { useEffect, useRef, useState } from 'react';
import { TrendingUp, TrendingDown, Activity, Loader2 } from 'lucide-react';

// ── Chart dimensions (SVG coordinate space) ───────────────────────────────────
const W  = 600;
const H  = 180;
const PAD_X = 10;
const PAD_Y = 16;

function fmt(n, d = 2) {
  if (n == null) return '–';
  return n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
}

// ── Pure SVG path builder ─────────────────────────────────────────────────────
function buildPath(history) {
  if (history.length < 2) return { line: '', area: '' };

  const prices  = history.map((p) => p.price);
  const minP    = Math.min(...prices);
  const maxP    = Math.max(...prices);
  const range   = maxP - minP || 1; // avoid divide-by-zero on flat line

  const xStep = (W - PAD_X * 2) / (history.length - 1);
  const toX   = (i) => PAD_X + i * xStep;
  const toY   = (p) => PAD_Y + (H - PAD_Y * 2) * (1 - (p - minP) / range);

  const points = history.map((d, i) => ({ x: toX(i), y: toY(d.price) }));

  // Smooth cubic bezier for the line
  let line = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpX  = (prev.x + curr.x) / 2;
    line += ` C ${cpX} ${prev.y}, ${cpX} ${curr.y}, ${curr.x} ${curr.y}`;
  }

  // Area: close down to bottom-left corner
  const lastP = points[points.length - 1];
  const area  = `${line} L ${lastP.x} ${H - PAD_Y} L ${PAD_X} ${H - PAD_Y} Z`;

  // Gridline price labels
  const gridPrices = [
    minP + range * 0.75,
    minP + range * 0.5,
    minP + range * 0.25,
  ];
  const gridLines = gridPrices.map((gp) => ({ y: toY(gp), price: gp }));

  return { line, area, gridLines, minP, maxP };
}

// ── Ticker selector tab ───────────────────────────────────────────────────────
function TickerTab({ ticker, active, onClick }) {
  return (
    <button
      onClick={() => onClick(ticker)}
      style={{
        padding: '4px 12px',
        borderRadius: 8,
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: '0.5px',
        border: 'none',
        cursor: 'pointer',
        transition: 'all 150ms',
        background: active ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(255,255,255,0.05)',
        color: active ? '#fff' : 'rgba(226,232,240,0.5)',
        boxShadow: active ? '0 0 12px rgba(99,102,241,0.35)' : 'none',
      }}
    >
      {ticker}
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AssetChart({ prices, history, activeTicker, setActiveTicker, availableTickers }) {
  const prevPriceRef = useRef(null);
  const [flashDir, setFlashDir] = useState(null); // 'up' | 'down' | null

  const quote = prices?.[activeTicker];
  const price = quote?.price;
  const pct   = quote?.change_pct ?? 0;
  const isUp  = pct >= 0;

  // Flash the price display when it changes
  useEffect(() => {
    if (prevPriceRef.current == null) { prevPriceRef.current = price; return; }
    if (price == null || price === prevPriceRef.current) return;
    const dir = price > prevPriceRef.current ? 'up' : 'down';
    setFlashDir(dir);
    prevPriceRef.current = price;
    const t = setTimeout(() => setFlashDir(null), 700);
    return () => clearTimeout(t);
  }, [price]);

  const { line, area, gridLines } = history.length >= 2
    ? buildPath(history)
    : { line: '', area: '', gridLines: [] };

  const gradId   = `chart-grad-${activeTicker}`;
  const glowId   = `chart-glow-${activeTicker}`;
  const lineColor = isUp ? '#34d399' : '#f87171';
  const gradStop1 = isUp ? 'rgba(52,211,153,0.28)' : 'rgba(248,113,113,0.28)';

  return (
    <div style={s.card}>
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div style={s.header}>
        <div style={s.headerLeft}>
          <div style={{ ...s.iconBadge, background: isUp ? 'rgba(52,211,153,0.12)' : 'rgba(248,113,113,0.12)' }}>
            {isUp ? <TrendingUp size={14} color="#34d399" /> : <TrendingDown size={14} color="#f87171" />}
          </div>
          <div>
            <div style={s.assetLabel}>{quote?.name ?? activeTicker} / USD</div>
            <div style={s.assetSub}>{quote?.category ?? '—'} · Last {history.length} ticks</div>
          </div>
        </div>
        <div style={s.priceBlock}>
          <div style={{
            ...s.livePricce,
            color: flashDir === 'up' ? '#34d399' : flashDir === 'down' ? '#f87171' : '#f1f5f9',
            transition: flashDir ? 'color 0ms' : 'color 700ms ease',
          }}>
            ${fmt(price, price > 1000 ? 2 : 4)}
          </div>
          <span style={isUp ? s.badge.up : s.badge.down}>
            {isUp ? '+' : ''}{fmt(pct, 3)}%
          </span>
        </div>
      </div>

      {/* ── Ticker selector ────────────────────────────────────────── */}
      <div style={s.tabBar}>
        {availableTickers.map((t) => (
          <TickerTab
            key={t}
            ticker={t}
            active={t === activeTicker}
            onClick={setActiveTicker}
          />
        ))}
      </div>

      {/* ── Chart area ─────────────────────────────────────────────── */}
      {history.length < 2 ? (
        <div style={s.waiting}>
          <Loader2 size={20} color="#6366f1" style={{ animation: 'spin 1s linear infinite' }} />
          <span>Waiting for live market ticks…</span>
          <span style={{ fontSize: 11, opacity: 0.5 }}>
            {history.length === 0
              ? 'No data yet for this asset.'
              : `${history.length} / 2 ticks received — need one more to draw chart.`}
          </span>
        </div>
      ) : (
        <div style={s.svgWrap}>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
            style={{ width: '100%', height: '100%', overflow: 'visible' }}
          >
            <defs>
              {/* Area fill gradient */}
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor={gradStop1} />
                <stop offset="100%" stopColor="rgba(0,0,0,0)" />
              </linearGradient>
              {/* Glow filter on the line */}
              <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Horizontal gridlines */}
            {(gridLines ?? []).map(({ y, price: gp }, i) => (
              <g key={i}>
                <line
                  x1={PAD_X} y1={y} x2={W - PAD_X} y2={y}
                  stroke="rgba(255,255,255,0.06)"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <text
                  x={W - PAD_X + 2}
                  y={y + 4}
                  fontSize="10"
                  fill="rgba(226,232,240,0.3)"
                  textAnchor="start"
                >
                  {gp > 1000 ? fmt(gp, 0) : fmt(gp, 2)}
                </text>
              </g>
            ))}

            {/* Area fill */}
            <path d={area} fill={`url(#${gradId})`} />

            {/* Main line — with glow */}
            <path
              d={line}
              fill="none"
              stroke={lineColor}
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter={`url(#${glowId})`}
            />

            {/* Latest price dot */}
            {(() => {
              const last = history[history.length - 1];
              const pts  = buildPath(history);
              if (!last) return null;
              const allPrices = history.map((p) => p.price);
              const minP = Math.min(...allPrices);
              const maxP = Math.max(...allPrices);
              const range = maxP - minP || 1;
              const xStep = (W - PAD_X * 2) / (history.length - 1);
              const cx = PAD_X + (history.length - 1) * xStep;
              const cy = PAD_Y + (H - PAD_Y * 2) * (1 - (last.price - minP) / range);
              return (
                <g>
                  <circle cx={cx} cy={cy} r="5" fill={lineColor} opacity="0.25" />
                  <circle cx={cx} cy={cy} r="3" fill={lineColor} />
                </g>
              );
            })()}
          </svg>

          {/* X-axis time labels */}
          <div style={s.xAxis}>
            {history.length > 0 && <span>{history[0].time}</span>}
            {history.length > 1 && <span style={{ marginLeft: 'auto' }}>{history[history.length - 1].time}</span>}
          </div>
        </div>
      )}

      {/* ── Footer stats ───────────────────────────────────────────── */}
      <div style={s.footer}>
        {[
          { label: 'Change',   value: `${isUp ? '+' : ''}${fmt(quote?.change, 4)}` },
          { label: 'Change %', value: `${isUp ? '+' : ''}${fmt(pct, 4)}%` },
          { label: 'Ticks',    value: `${history.length} / 30` },
          { label: 'Window',   value: '~90s' },
        ].map(({ label, value }) => (
          <div key={label} style={s.footerStat}>
            <div style={s.footerLabel}>{label}</div>
            <div style={s.footerValue}>{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Styles ── */
const s = {
  card: {
    borderRadius: 16,
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.07)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
    padding: '16px 20px 12px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 12 },
  iconBadge: {
    width: 36, height: 36, borderRadius: 10, display: 'flex',
    alignItems: 'center', justifyContent: 'center',
  },
  assetLabel: { fontSize: 15, fontWeight: 700, color: '#f1f5f9' },
  assetSub:   { fontSize: 11, color: 'rgba(226,232,240,0.4)', marginTop: 2 },
  priceBlock: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 },
  livePricce: { fontSize: 22, fontWeight: 800, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.5px' },
  badge: {
    up:   { display:'inline-flex',alignItems:'center',gap:3,fontSize:11,fontWeight:700,color:'#34d399',background:'rgba(52,211,153,0.1)',padding:'2px 8px',borderRadius:6 },
    down: { display:'inline-flex',alignItems:'center',gap:3,fontSize:11,fontWeight:700,color:'#f87171',background:'rgba(248,113,113,0.1)',padding:'2px 8px',borderRadius:6 },
  },
  tabBar: {
    display: 'flex', gap: 6, padding: '10px 20px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    flexWrap: 'wrap',
  },
  waiting: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    gap: 8, height: 200,
    color: 'rgba(226,232,240,0.45)', fontSize: 13, textAlign: 'center',
  },
  svgWrap: {
    padding: '12px 12px 0',
    height: 220,
    position: 'relative',
  },
  xAxis: {
    display: 'flex', padding: '2px 2px 8px',
    fontSize: 10, color: 'rgba(226,232,240,0.3)',
  },
  footer: {
    display: 'flex', borderTop: '1px solid rgba(255,255,255,0.05)',
  },
  footerStat: {
    flex: 1, padding: '10px 16px',
    borderRight: '1px solid rgba(255,255,255,0.05)',
  },
  footerLabel: { fontSize: 10, color: 'rgba(226,232,240,0.35)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' },
  footerValue: { fontSize: 13, fontWeight: 700, color: '#f1f5f9', marginTop: 2, fontVariantNumeric: 'tabular-nums' },
};
