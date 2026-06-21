import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Activity, Target, Zap, AlertCircle, RefreshCw } from 'lucide-react';
import { getStats, checkHealth } from '../api/api';

const MOCK_EQUITIES = [
  { ticker: 'AAPL', name: 'Apple Inc.', price: '$189.84', change: '+1.23%', dir: 'up', sector: 'Technology' },
  { ticker: 'MSFT', name: 'Microsoft Corp.', price: '$374.51', change: '+0.87%', dir: 'up', sector: 'Technology' },
  { ticker: 'TSLA', name: 'Tesla Inc.', price: '$242.10', change: '-2.15%', dir: 'down', sector: 'Auto' },
  { ticker: 'NVDA', name: 'NVIDIA Corp.', price: '$495.22', change: '+3.41%', dir: 'up', sector: 'Semiconductors' },
  { ticker: 'JPM', name: 'JPMorgan Chase', price: '$198.05', change: '-0.32%', dir: 'down', sector: 'Finance' },
];

const MOCK_FEED = [
  { type: 'bullish', title: 'Q3 Tech Sector Analysis', preview: 'AI models indicate a strong bullish trend in semiconductor supply chains...', time: '2h ago' },
  { type: 'alert', title: 'Portfolio Rebalance', preview: 'Automated rebalancing completed for European emerging markets.', time: '5h ago' },
  { type: 'neutral', title: 'Fed Rate Decision', preview: 'FOMC holds rates steady; hawkish language signals one more hike possible.', time: 'Yesterday' },
  { type: 'bullish', title: 'Energy Sector Upgrade', preview: 'Renewable energy outflows reverse on EU policy clarity.', time: 'Yesterday' },
];

const CHART_BARS = [45, 60, 55, 70, 65, 80, 75, 90, 85, 95];

export default function Dashboard() {
  const [stats, setStats] = useState({ 
    total_sessions: 0, 
    indexed_reports: 0, 
    queries_24h: 0, 
    avg_response_time: '...',
    health: null 
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

  return (
    <div className="page-content">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <h2>Market Overview</h2>
          <p>Real-time intelligence and portfolio metrics — {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={loadData}>
          <RefreshCw size={14} className={loading ? "spinner" : ""} style={loading ? { animation: 'spin 1s linear infinite' } : {}} /> 
          Refresh Stats
        </button>
      </div>

      {/* Stat Cards */}
      <div className="stat-cards">
        <div className="stat-card blue">
          <div className="stat-label">Total Chat Sessions</div>
          <div className="stat-value">{stats.total_sessions || 0}</div>
          <div className="stat-delta up"><TrendingUp size={12} /> Live DB Data</div>
        </div>
        <div className="stat-card green">
          <div className="stat-label">Queries (Last 24h)</div>
          <div className="stat-value">{stats.queries_24h || 0}</div>
          <div className="stat-delta up"><Activity size={12} /> Active engagement</div>
        </div>
        <div className="stat-card orange">
          <div className="stat-label">Avg AI Response</div>
          <div className="stat-value">{stats.avg_response_time || 'N/A'}</div>
          <div className="stat-delta"><AlertCircle size={12} /> Speed metrics</div>
        </div>
        <div className="stat-card purple">
          <div className="stat-label">Indexed Reports</div>
          <div className="stat-value">{stats.indexed_reports || 0}</div>
          <div className="stat-delta up"><Zap size={12} /> Ready for RAG</div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="dashboard-grid">
        {/* Performance Chart */}
        <div className="card">
          <div className="card-title">
            Performance Trend
            <span className="badge badge-up">+12.4% YTD</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '120px', padding: '8px 0' }}>
            {CHART_BARS.map((h, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: `${h}%`,
                  background: i === CHART_BARS.length - 1
                    ? 'var(--color-blue)'
                    : `rgba(59,130,246,${0.25 + i * 0.05})`,
                  borderRadius: '3px 3px 0 0',
                  transition: 'height 0.5s ease',
                }}
              />
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--color-slate)', marginTop: '8px' }}>
            <span>Jan</span><span>Mar</span><span>May</span><span>Jul</span><span>Sep</span><span>Oct</span>
          </div>
        </div>

        {/* Intelligence Feed */}
        <div className="card">
          <div className="card-title">Intelligence Feed</div>
          {MOCK_FEED.map((item, i) => (
            <div key={i} className="feed-item">
              <div className={`feed-dot ${item.type}`} />
              <div className="feed-body">
                <div className="feed-title">{item.title}</div>
                <div className="feed-preview">{item.preview}</div>
                <div className="feed-meta">{item.time}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Equity Table */}
      <div className="card" style={{ marginTop: '16px' }}>
        <div className="card-title">
          Active Equities
          <span style={{ fontSize: '12px', color: 'var(--color-slate)', fontWeight: 400 }}>
            Live as of {new Date().toLocaleTimeString()}
          </span>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Ticker</th>
              <th>Company</th>
              <th>Sector</th>
              <th>Price</th>
              <th>Change</th>
              <th>Signal</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_EQUITIES.map(eq => (
              <tr key={eq.ticker}>
                <td><strong>{eq.ticker}</strong></td>
                <td>{eq.name}</td>
                <td><span className="badge badge-blue">{eq.sector}</span></td>
                <td>{eq.price}</td>
                <td>
                  <span className={`badge ${eq.dir === 'up' ? 'badge-up' : 'badge-down'}`}>
                    {eq.dir === 'up' ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                    &nbsp;{eq.change}
                  </span>
                </td>
                <td>
                  <span className={`badge ${eq.dir === 'up' ? 'badge-up' : 'badge-neutral'}`}>
                    {eq.dir === 'up' ? 'BUY' : 'HOLD'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
