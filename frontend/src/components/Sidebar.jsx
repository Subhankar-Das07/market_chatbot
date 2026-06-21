import { NavLink, useLocation } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import {
  LayoutDashboard, BrainCircuit, FileText,
  Briefcase, Eye, Settings, HelpCircle, TrendingUp, LogOut
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard',  to: '/',          icon: LayoutDashboard },
  { label: 'AI Analyst', to: '/analyst',   icon: BrainCircuit },
  { label: 'Reports',    to: '/reports',   icon: FileText },
  { label: 'Portfolio',  to: '/portfolio', icon: Briefcase },
  { label: 'Watchlist',  to: '/watchlist', icon: Eye },
];

const bottomItems = [
  { label: 'Support',  to: '/support',  icon: HelpCircle },
  { label: 'Settings', to: '/settings', icon: Settings },
];

export default function Sidebar({ apiHealth }) {
  const { user, handleLogout } = useContext(AuthContext);

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <TrendingUp size={18} color="#3b82f6" />
          <h1>Intelligence Pro</h1>
        </div>
        <span>Enterprise Tier</span>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-nav-label">Main</div>
        {navItems.map(({ label, to, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}

        <div className="sidebar-nav-label">System</div>
        {bottomItems.map(({ label, to, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        {apiHealth !== null && (
          <div
            className={`health-banner ${apiHealth ? 'connected' : 'disconnected'}`}
            style={{ marginBottom: '12px' }}
          >
            <span className={`status-dot ${apiHealth ? 'online' : 'error'}`} />
            {apiHealth ? 'Backend Connected' : 'Backend Offline'}
          </div>
        )}
        <div className="sidebar-user" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="avatar">{user?.email?.[0]?.toUpperCase() || 'U'}</div>
            <div className="user-info">
              <div className="user-name" style={{ maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.email || 'User'}
              </div>
              <div className="user-tier">Enterprise Tier</div>
            </div>
          </div>
          <button 
            onClick={handleLogout} 
            style={{ background: 'transparent', border: 'none', color: 'var(--color-slate)', cursor: 'pointer', display: 'flex' }}
            title="Sign Out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
