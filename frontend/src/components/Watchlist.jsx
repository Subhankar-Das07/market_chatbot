/**
 * Watchlist — personal asset tracker with live price enrichment.
 *
 * Props:
 *   prices: Record<ticker, QuoteObject>  — live ticking prices from useWebSocket
 *
 * Internal features:
 *   - GET /api/portfolio on mount
 *   - POST /api/portfolio/add to track a new ticker
 *   - DELETE /api/portfolio/{ticker} to remove
 *   - Auth errors (401/403) redirect to /login
 */

import { useState, useEffect, useCallback, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, TrendingUp, TrendingDown, Loader2, AlertCircle, Search } from 'lucide-react';
import { getPortfolio, addToPortfolio, removeFromPortfolio } from '../api/api';
import { AuthContext } from '../context/AuthContext';

function fmt(n) {
  if (n === undefined || n === null) return '–';
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function PctBadge({ pct }) {
  if (pct === undefined || pct === null) return <span style={s.badge.neutral}>–</span>;
  const up = pct >= 0;
  return (
    <span style={up ? s.badge.up : s.badge.down}>
      {up ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
      &nbsp;{up ? '+' : ''}{pct.toFixed(3)}%
    </span>
  );
}

export default function Watchlist({ prices = {} }) {
  const { handleLogout } = useContext(AuthContext);
  const navigate = useNavigate();

  const [assets, setAssets]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [ticker, setTicker]       = useState('');
  const [adding, setAdding]       = useState(false);
  const [addError, setAddError]   = useState(null);
  const [removing, setRemoving]   = useState(null);  // ticker being deleted

  // ── Auth-aware error handler ────────────────────────────────────────────
  const handleApiError = useCallback((err) => {
    if (err?.response?.status === 401 || err?.response?.status === 403) {
      handleLogout();
      navigate('/login');
      return;
    }
    const detail = err?.response?.data?.detail;
    return typeof detail === 'string' ? detail : 'Something went wrong.';
  }, [handleLogout, navigate]);

  // ── Fetch watchlist ─────────────────────────────────────────────────────
  const fetchWatchlist = useCallback(async () => {
    try {
      const res = await getPortfolio();
      setAssets(res.data?.assets ?? []);
      setError(null);
    } catch (err) {
      const msg = handleApiError(err);
      if (msg) setError(msg);
    } finally {
      setLoading(false);
    }
  }, [handleApiError]);

  useEffect(() => { fetchWatchlist(); }, [fetchWatchlist]);

  // ── Add ticker ──────────────────────────────────────────────────────────
  const handleAdd = async (e) => {
    e.preventDefault();
    const sym = ticker.trim().toUpperCase();
    if (!sym) return;
    setAdding(true);
    setAddError(null);
    try {
      const res = await addToPortfolio({ ticker: sym });
      setAssets((prev) => [...prev, res.data.asset]);
      setTicker('');
    } catch (err) {
      const msg = handleApiError(err);
      if (msg) setAddError(msg);
    } finally {
      setAdding(false);
    }
  };

  // ── Remove ticker ───────────────────────────────────────────────────────
  const handleRemove = async (sym) => {
    setRemoving(sym);
    try {
      await removeFromPortfolio(sym);
      setAssets((prev) => prev.filter((a) => a.ticker !== sym));
    } catch (err) {
      handleApiError(err);
    } finally {
      setRemoving(null);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div style={s.card}>
      <div style={s.header}>
        <div style={s.headerLeft}>
          <Search size={16} color="#10b981" />
          <span style={s.title}>My Watchlist</span>
          <span style={s.count}>{assets.length}</span>
        </div>
      </div>

      {/* Add form */}
      <form onSubmit={handleAdd} style={s.addForm}>
        <input
          type="text"
          placeholder="Add ticker… e.g. AAPL"
          value={ticker}
          onChange={(e) => setTicker(e.target.value.toUpperCase())}
          maxLength={10}
          style={s.input}
        />
        <button type="submit" disabled={adding || !ticker.trim()} style={s.addBtn}>
          {adding ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={14} />}
          &nbsp;Add
        </button>
      </form>
      {addError && (
        <div style={s.addError}>
          <AlertCircle size={12} /> {addError}
        </div>
      )}

      {/* Asset list */}
      {loading ? (
        <div style={s.center}>
          <Loader2 size={24} color="#6366f1" style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      ) : error ? (
        <div style={s.errorBox}><AlertCircle size={14} /> {error}</div>
      ) : assets.length === 0 ? (
        <div style={s.empty}>
          <p>Your watchlist is empty.</p>
          <p style={{ fontSize: 12, opacity: 0.6 }}>Add a ticker above to start tracking live prices.</p>
        </div>
      ) : (
        <div style={s.list}>
          {assets.map((asset) => {
            const live  = prices[asset.ticker];
            const price = live?.price;
            const pct   = live?.change_pct;
            const up    = pct >= 0;
            return (
              <div key={asset.ticker} style={s.row}>
                <div style={s.rowLeft}>
                  <div style={up ? s.dot.up : s.dot.down} />
                  <div>
                    <div style={s.rowTicker}>{asset.ticker}</div>
                    <div style={s.rowName}>{asset.name || asset.category || '—'}</div>
                  </div>
                </div>
                <div style={s.rowRight}>
                  <div style={s.rowPrice}>${fmt(price)}</div>
                  <PctBadge pct={pct} />
                  <button
                    onClick={() => handleRemove(asset.ticker)}
                    disabled={removing === asset.ticker}
                    style={s.removeBtn}
                    title="Remove from watchlist"
                  >
                    {removing === asset.ticker
                      ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                      : <Trash2 size={13} />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
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
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '16px 20px 12px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 8 },
  title: { fontSize: 14, fontWeight: 700, color: '#f1f5f9' },
  count: {
    fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 100,
    background: 'rgba(16,185,129,0.15)', color: '#34d399',
  },
  addForm: { display: 'flex', gap: 8, padding: '12px 20px 0' },
  input: {
    flex: 1, padding: '8px 12px', borderRadius: 8, fontSize: 13,
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
    color: '#f1f5f9', outline: 'none', fontFamily: 'inherit',
    textTransform: 'uppercase', letterSpacing: '1px',
  },
  addBtn: {
    display: 'flex', alignItems: 'center', padding: '8px 14px',
    borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: '#fff', border: 'none', whiteSpace: 'nowrap',
    opacity: 1, transition: 'opacity 150ms',
  },
  addError: {
    display: 'flex', alignItems: 'center', gap: 6, margin: '8px 20px 0',
    fontSize: 12, color: '#f87171',
  },
  center: { display: 'flex', justifyContent: 'center', padding: 32 },
  errorBox: {
    display: 'flex', alignItems: 'center', gap: 6, margin: '16px 20px',
    fontSize: 13, color: '#f87171',
  },
  empty: {
    padding: '28px 20px', textAlign: 'center',
    color: 'rgba(226,232,240,0.4)', fontSize: 13, lineHeight: 1.8,
  },
  list: { padding: '8px 0 8px' },
  row: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '10px 20px',
    transition: 'background 150ms',
    cursor: 'default',
  },
  rowLeft:  { display: 'flex', alignItems: 'center', gap: 10 },
  rowRight: { display: 'flex', alignItems: 'center', gap: 10 },
  rowTicker: { fontSize: 13, fontWeight: 700, color: '#f1f5f9', letterSpacing: '0.5px' },
  rowName:   { fontSize: 11, color: 'rgba(226,232,240,0.4)', marginTop: 1 },
  rowPrice:  { fontSize: 14, fontWeight: 700, color: '#f1f5f9', fontVariantNumeric: 'tabular-nums' },
  dot: {
    up:   { width: 7, height: 7, borderRadius: '50%', background: '#34d399' },
    down: { width: 7, height: 7, borderRadius: '50%', background: '#f87171' },
  },
  badge: {
    up:      { display:'inline-flex', alignItems:'center', gap:3, fontSize:11, fontWeight:700, color:'#34d399', background:'rgba(52,211,153,0.1)', padding:'2px 7px', borderRadius:6 },
    down:    { display:'inline-flex', alignItems:'center', gap:3, fontSize:11, fontWeight:700, color:'#f87171', background:'rgba(248,113,113,0.1)', padding:'2px 7px', borderRadius:6 },
    neutral: { display:'inline-flex', alignItems:'center', gap:3, fontSize:11, fontWeight:700, color:'rgba(226,232,240,0.4)', padding:'2px 7px', borderRadius:6 },
  },
  removeBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 28, height: 28, borderRadius: 6, border: 'none', cursor: 'pointer',
    background: 'rgba(248,113,113,0.08)', color: '#f87171',
    transition: 'background 150ms',
  },
};
