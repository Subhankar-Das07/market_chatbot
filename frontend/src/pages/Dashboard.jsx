import { useEffect, useState, useContext } from 'react';
import {
  TrendingUp, TrendingDown, Activity, Zap, AlertCircle,
  RefreshCw, User, BarChart2, BookOpen, Eye, Clock, Star
} from 'lucide-react';
import { getStats, checkHealth } from '../api/api';
import { AuthContext } from '../context/AuthContext';

export default function Dashboard() {
  const { user } = useContext(AuthContext);

  const [stats, setStats] = useState({
    total_sessions: 0,
    indexed_reports: 0,
    queries_24h: 0,
    avg_response_time: '...',
    health: null,
  });
  const [loading, setLoading] = useState(true);

  const loadData = () => {
    setLoading(true);
    Promise.allSettled([getStats(), checkHealth()]).then(([s, h]) => {
      setStats({
        ...(s.status === 'fulfilled' ? s.value.data : {}),
        health: h.status === 'fulfilled',
      });
      setLoading(false);
    });
  };

  useEffect(() => { loadData(); }, []);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const userHandle = user?.email?.split('@')[0] || 'Investor';

  return (
    <div className="page-content">

      {/* ── Personal Greeting Header ──────────────────────────── */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <User size={18} color="#fff" />
            </div>
            <h2 style={{ margin: 0 }}>{greeting()}, {userHandle} 👋</h2>
          </div>
          <p style={{ color: 'var(--color-slate)', fontSize: 14 }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            &nbsp;·&nbsp;
            <span style={{ color: stats.health ? 'var(--color-success)' : '#f87171' }}>
              {stats.health ? '● Backend Live' : '● Backend Offline'}
            </span>
          </p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={loadData}>
          <RefreshCw size={14} style={loading ? { animation: 'spin 1s linear infinite' } : {}} />
          Refresh
        </button>
      </div>

      {/* ── Your Stats ────────────────────────────────────────── */}
      <div className="stat-cards">
        <div className="stat-card blue">
          <div className="stat-label">Your Chat Sessions</div>
          <div className="stat-value">{stats.total_sessions ?? 0}</div>
          <div className="stat-delta up"><TrendingUp size={12} /> Live from DB</div>
        </div>
        <div className="stat-card green">
          <div className="stat-label">Queries (Last 24h)</div>
          <div className="stat-value">{stats.queries_24h ?? 0}</div>
          <div className="stat-delta up"><Activity size={12} /> Your activity</div>
        </div>
        <div className="stat-card orange">
          <div className="stat-label">Avg AI Response</div>
          <div className="stat-value">{stats.avg_response_time || 'N/A'}</div>
          <div className="stat-delta"><AlertCircle size={12} /> Speed metrics</div>
        </div>
        <div className="stat-card purple">
          <div className="stat-label">Indexed Reports</div>
          <div className="stat-value">{stats.indexed_reports ?? 0}</div>
          <div className="stat-delta up"><Zap size={12} /> Ready for RAG</div>
        </div>
      </div>

      {/* ── Personalized Feature Cards ────────────────────────── */}
      <div className="dashboard-grid">

        {/* Your Portfolio */}
        <div className="card" style={comingSoonCard}>
          <div className="card-title" style={{ marginBottom: 16 }}>
            <BarChart2 size={18} color="#6366f1" />
            Your Portfolio
            <span className="badge badge-blue" style={{ marginLeft: 'auto' }}>Coming Soon</span>
          </div>
          <div style={placeholderBody}>
            <div style={placeholderIcon('#6366f1', 'rgba(99,102,241,0.1)')}>
              <BarChart2 size={28} color="#6366f1" />
            </div>
            <div style={placeholderTitle}>Your Personal Portfolio Feed</div>
            <div style={placeholderDesc}>
              Track your holdings, see real-time P&L, and get AI-powered rebalancing 
              recommendations tailored to <strong>{userHandle}</strong>'s risk profile.
            </div>
            <div style={featureList}>
              {['Real-time P&L tracking', 'AI rebalancing alerts', 'Sector exposure heatmap'].map(f => (
                <div key={f} style={featureItem}><Star size={12} color="#f59e0b" />{f}</div>
              ))}
            </div>
          </div>
        </div>

        {/* Your Live Market Feed */}
        <div className="card" style={comingSoonCard}>
          <div className="card-title" style={{ marginBottom: 16 }}>
            <Activity size={18} color="#06b6d4" />
            Your Live Market Feed
            <span className="badge badge-blue" style={{ marginLeft: 'auto' }}>Coming Soon</span>
          </div>
          <div style={placeholderBody}>
            <div style={placeholderIcon('#06b6d4', 'rgba(6,182,212,0.1)')}>
              <Activity size={28} color="#06b6d4" />
            </div>
            <div style={placeholderTitle}>Personalized Market Intelligence</div>
            <div style={placeholderDesc}>
              Real-time equity prices, sector sentiment, and breaking news 
              filtered by <strong>{userHandle}</strong>'s watchlist and interests.
            </div>
            <div style={featureList}>
              {['Live price streaming', 'Sentiment scoring', 'Custom watchlist alerts'].map(f => (
                <div key={f} style={featureItem}><Star size={12} color="#f59e0b" />{f}</div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Your Watchlist ────────────────────────────────────── */}
      <div className="card" style={{ marginTop: 16, ...comingSoonCard }}>
        <div className="card-title" style={{ marginBottom: 16 }}>
          <Eye size={18} color="#10b981" />
          Your Watchlist
          <span className="badge badge-blue" style={{ marginLeft: 'auto' }}>Coming Soon</span>
        </div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {[
            { label: 'Add Tickers', icon: TrendingUp, desc: 'Track your favourite stocks and ETFs' },
            { label: 'Price Alerts', icon: AlertCircle, desc: 'Get notified when targets are hit' },
            { label: 'AI Signals', icon: Zap, desc: 'BUY / SELL signals powered by LLMs' },
            { label: 'History', icon: Clock, desc: 'Full audit log of your watch events' },
            { label: 'Reports', icon: BookOpen, desc: 'Attach research reports to any ticker' },
          ].map(({ label, icon: Icon, desc }) => (
            <div key={label} style={watchlistItem}>
              <Icon size={16} color="#10b981" />
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-text)' }}>{label}</div>
                <div style={{ fontSize: 12, color: 'var(--color-slate)', marginTop: 2 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

/* ── Inline style helpers ─────────────────────────────────── */
const comingSoonCard = {
  border: '1px dashed rgba(99,102,241,0.25)',
  background: 'rgba(99,102,241,0.02)',
};

const placeholderBody = {
  display: 'flex', flexDirection: 'column', alignItems: 'center',
  textAlign: 'center', padding: '16px 8px',
};

const placeholderIcon = (color, bg) => ({
  width: 64, height: 64, borderRadius: 16, background: bg,
  display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
});

const placeholderTitle = {
  fontSize: 16, fontWeight: 700, color: 'var(--color-text)', marginBottom: 8,
};

const placeholderDesc = {
  fontSize: 14, color: 'var(--color-slate)', lineHeight: 1.6, maxWidth: 320, marginBottom: 16,
};

const featureList = {
  display: 'flex', flexDirection: 'column', gap: 8, width: '100%', maxWidth: 280,
};

const featureItem = {
  display: 'flex', alignItems: 'center', gap: 8, fontSize: 13,
  color: 'var(--color-text-muted)', background: 'rgba(245,158,11,0.08)',
  padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(245,158,11,0.15)',
};

const watchlistItem = {
  flex: '1 1 180px', display: 'flex', alignItems: 'flex-start', gap: 10,
  padding: '14px 16px', borderRadius: 10, border: '1px solid rgba(16,185,129,0.15)',
  background: 'rgba(16,185,129,0.03)',
};
