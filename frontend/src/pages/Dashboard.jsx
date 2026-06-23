/**
 * Dashboard — personalized, real-time market overview.
 *
 * Features:
 *  - Live asset ticker grid powered by useWebSocket
 *  - Per-cell flash animation (green tick-up, red tick-down)
 *  - Personal stat cards from /api/stats
 *  - Watchlist CRUD component
 *  - Greeting driven by AuthContext user
 */

import { useEffect, useState, useRef, useCallback, useContext } from 'react';
import {
  TrendingUp, TrendingDown, Activity, Zap, AlertCircle,
  RefreshCw, User, Wifi, WifiOff, Loader2,
} from 'lucide-react';
import { getStats } from '../api/api';
import { AuthContext } from '../context/AuthContext';
import { useWebSocket } from '../hooks/useWebSocket';
import Watchlist from '../components/Watchlist';

// ── Helpers ───────────────────────────────────────────────────────────────────

const FEATURED = ['BTC', 'ETH', 'AAPL', 'NVDA', 'TSLA', 'SPY', 'MSFT', 'SOL'];

function fmt(n, decimals = 2) {
  if (n === undefined || n === null) return '–';
  return n.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

// ── Price flash hook ──────────────────────────────────────────────────────────
// Returns a map of ticker → 'flash-up' | 'flash-down' | ''
function usePriceFlash(prices) {
  const prevRef   = useRef({});
  const [flash, setFlash] = useState({});

  useEffect(() => {
    const updates = {};
    for (const [ticker, q] of Object.entries(prices)) {
      const prev = prevRef.current[ticker]?.price;
      if (prev !== undefined && q.price !== prev) {
        updates[ticker] = q.price > prev ? 'up' : 'down';
      }
    }
    prevRef.current = prices;

    if (Object.keys(updates).length === 0) return;

    setFlash(updates);
    const timer = setTimeout(() => setFlash({}), 600); // flash lasts 600ms
    return () => clearTimeout(timer);
  }, [prices]);

  return flash;
}

// ── Asset card ────────────────────────────────────────────────────────────────
function AssetCard({ ticker, quote, flashDir }) {
  if (!quote) {
    return (
      <div style={s.assetCard.base}>
        <div style={s.assetCard.ticker}>{ticker}</div>
        <div style={s.assetCard.price}>—</div>
      </div>
    );
  }

  const up      = quote.change_pct >= 0;
  const bgFlash = flashDir === 'up'
    ? 'rgba(52,211,153,0.12)'
    : flashDir === 'down'
    ? 'rgba(248,113,113,0.12)'
    : undefined;

  return (
    <div
      style={{
        ...s.assetCard.base,
        background: bgFlash || s.assetCard.base.background,
        transition: bgFlash ? 'background 0ms' : 'background 600ms ease',
        borderColor: flashDir === 'up'
          ? 'rgba(52,211,153,0.3)'
          : flashDir === 'down'
          ? 'rgba(248,113,113,0.3)'
          : s.assetCard.base.borderColor,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={s.assetCard.ticker}>{ticker}</div>
          <div style={s.assetCard.name}>{quote.name || quote.category || '—'}</div>
        </div>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
          background: quote.category === 'crypto'
            ? 'rgba(139,92,246,0.15)' : 'rgba(59,130,246,0.15)',
          color: quote.category === 'crypto' ? '#a78bfa' : '#60a5fa',
          textTransform: 'uppercase', letterSpacing: '0.5px',
        }}>
          {quote.category || 'asset'}
        </span>
      </div>

      <div style={s.assetCard.price}>
        ${fmt(quote.price, quote.price > 1000 ? 0 : 2)}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={up ? s.badge.up : s.badge.down}>
          {up ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
          &nbsp;{up ? '+' : ''}{fmt(quote.change_pct, 3)}%
        </span>
        <span style={{ fontSize: 11, color: 'rgba(226,232,240,0.3)' }}>
          {up ? '+' : ''}{fmt(quote.change, 2)}
        </span>
      </div>
    </div>
  );
}

// ── Connection status badge ───────────────────────────────────────────────────
function WsBadge({ status }) {
  const map = {
    live:         { icon: <Wifi size={12} />,    label: 'Live',         color: '#34d399', bg: 'rgba(52,211,153,0.1)' },
    connecting:   { icon: <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />, label: 'Connecting', color: '#fbbf24', bg: 'rgba(251,191,36,0.1)' },
    disconnected: { icon: <WifiOff size={12} />, label: 'Reconnecting', color: '#f87171', bg: 'rgba(248,113,113,0.1)' },
  };
  const cfg = map[status] || map.connecting;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, color: cfg.color, background: cfg.bg }}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user }          = useContext(AuthContext);
  const { prices, status } = useWebSocket();
  const flash              = usePriceFlash(prices);

  const [stats, setStats]     = useState({ total_sessions: 0, indexed_reports: 0, queries_24h: 0, avg_response_time: '…' });
  const [statsLoading, setStatsLoading] = useState(true);

  const loadStats = useCallback(() => {
    setStatsLoading(true);
    getStats()
      .then((r) => { setStats(r.data); setStatsLoading(false); })
      .catch(() => setStatsLoading(false));
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  const userHandle = user?.email?.split('@')[0] || 'Investor';

  return (
    <div className="page-content">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User size={18} color="#fff" />
            </div>
            <h2 style={{ margin: 0 }}>{greeting()}, {userHandle} 👋</h2>
            <WsBadge status={status} />
          </div>
          <p style={{ color: 'var(--color-slate)', fontSize: 13 }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            &nbsp;·&nbsp;Live market feed streaming
          </p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={loadStats}>
          <RefreshCw size={14} style={statsLoading ? { animation: 'spin 1s linear infinite' } : {}} />
          Refresh
        </button>
      </div>

      {/* ── Your Stats ─────────────────────────────────────────── */}
      <div className="stat-cards">
        <div className="stat-card blue">
          <div className="stat-label">Your Sessions</div>
          <div className="stat-value">{stats.total_sessions ?? 0}</div>
          <div className="stat-delta up"><TrendingUp size={12} /> Live from DB</div>
        </div>
        <div className="stat-card green">
          <div className="stat-label">Queries (24h)</div>
          <div className="stat-value">{stats.queries_24h ?? 0}</div>
          <div className="stat-delta up"><Activity size={12} /> Your activity</div>
        </div>
        <div className="stat-card orange">
          <div className="stat-label">AI Response</div>
          <div className="stat-value">{stats.avg_response_time || 'N/A'}</div>
          <div className="stat-delta"><AlertCircle size={12} /> Avg speed</div>
        </div>
        <div className="stat-card purple">
          <div className="stat-label">Indexed Reports</div>
          <div className="stat-value">{stats.indexed_reports ?? 0}</div>
          <div className="stat-delta up"><Zap size={12} /> Ready for RAG</div>
        </div>
      </div>

      {/* ── Live Market Grid ────────────────────────────────────── */}
      <div style={s.sectionTitle}>
        <Activity size={15} color="#6366f1" />
        Live Market Feed
        {status === 'live' && (
          <span style={s.pulse}>
            <span style={s.pulseDot} />
            Streaming
          </span>
        )}
      </div>
      <div style={s.assetGrid}>
        {FEATURED.map((ticker) => (
          <AssetCard
            key={ticker}
            ticker={ticker}
            quote={prices[ticker]}
            flashDir={flash[ticker]}
          />
        ))}
      </div>

      {/* ── Two-column: Watchlist + mini chart placeholder ──────── */}
      <div style={s.twoCol}>
        {/* Watchlist */}
        <Watchlist prices={prices} />

        {/* Performance placeholder */}
        <div className="card" style={s.chartCard}>
          <div className="card-title" style={{ marginBottom: 12 }}>
            <TrendingUp size={15} color="#6366f1" />
            Portfolio Performance
            <span className="badge badge-blue" style={{ marginLeft: 'auto' }}>Phase 4</span>
          </div>
          <div style={s.chartBars}>
            {[42, 55, 51, 70, 65, 80, 77, 88, 83, 96].map((h, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: `${h}%`,
                  background: i === 9
                    ? 'linear-gradient(to top,#6366f1,#a78bfa)'
                    : `rgba(99,102,241,${0.15 + i * 0.06})`,
                  borderRadius: '3px 3px 0 0',
                  transition: 'height 0.5s ease',
                }}
              />
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--color-slate)', marginTop: 8 }}>
            <span>Jan</span><span>Mar</span><span>May</span><span>Jul</span><span>Sep</span><span>Now</span>
          </div>
          <div style={{ marginTop: 16, fontSize: 13, color: 'var(--color-slate)', textAlign: 'center', lineHeight: 1.7 }}>
            Real portfolio analytics will stream here once<br />holdings tracking is connected in Phase 4.
          </div>
        </div>
      </div>

    </div>
  );
}

/* ── Styles ── */
const s = {
  sectionTitle: {
    display: 'flex', alignItems: 'center', gap: 8,
    fontSize: 14, fontWeight: 700, color: 'var(--color-text)',
    margin: '24px 0 12px',
  },
  pulse: {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    fontSize: 11, color: '#34d399', marginLeft: 4,
  },
  pulseDot: {
    display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
    background: '#34d399',
    animation: 'pulse 1.5s ease-in-out infinite',
  },
  assetGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
    gap: 12,
  },
  assetCard: {
    base: {
      padding: '14px 16px', borderRadius: 12,
      background: 'rgba(255,255,255,0.025)',
      border: '1px solid rgba(255,255,255,0.07)',
      display: 'flex', flexDirection: 'column', gap: 8,
    },
    ticker: { fontSize: 14, fontWeight: 800, color: 'var(--color-text)', letterSpacing: '0.5px' },
    name:   { fontSize: 11, color: 'rgba(226,232,240,0.45)', marginTop: 1 },
    price:  { fontSize: 22, fontWeight: 800, color: 'var(--color-text)', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.5px' },
  },
  badge: {
    up:   { display:'inline-flex',alignItems:'center',gap:3,fontSize:11,fontWeight:700,color:'#34d399',background:'rgba(52,211,153,0.1)',padding:'2px 7px',borderRadius:6 },
    down: { display:'inline-flex',alignItems:'center',gap:3,fontSize:11,fontWeight:700,color:'#f87171',background:'rgba(248,113,113,0.1)',padding:'2px 7px',borderRadius:6 },
  },
  twoCol: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 16,
    marginTop: 20,
  },
  chartCard: {
    display: 'flex', flexDirection: 'column',
  },
  chartBars: {
    display: 'flex', alignItems: 'flex-end', gap: 5,
    height: 130, marginTop: 8,
  },
};
