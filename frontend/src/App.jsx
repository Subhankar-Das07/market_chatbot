import { useState, useEffect, useContext, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { Briefcase, Eye, HelpCircle, Settings } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { checkHealth } from './api/api';
import './index.css';

// Lazy loaded heavy routes
const Dashboard   = lazy(() => import('./pages/Dashboard'));
const Analyst     = lazy(() => import('./pages/Analyst'));
const Reports     = lazy(() => import('./pages/Reports'));
const Placeholder = lazy(() => import('./pages/Placeholder'));

const PAGE_TITLES = {
  '/dashboard':  'My Dashboard',
  '/analyst':    'AI Financial Analyst',
  '/reports':    'Market Reports',
  '/portfolio':  'My Portfolio',
  '/watchlist':  'My Watchlist',
  '/support':    'Support',
  '/settings':   'Settings',
};

function Header() {
  const loc = useLocation();
  const title = PAGE_TITLES[loc.pathname] || 'Intelligence Pro';
  return (
    <header className="top-header">
      <div className="top-header-title">{title}</div>
      <div className="top-header-actions">
        <span style={{ fontSize: '12px', color: 'var(--color-slate)' }}>
          {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} EST
        </span>
      </div>
    </header>
  );
}

/** Requires a valid auth token. Redirects to /login if not logged in. */
function ProtectedRoute({ children }) {
  const { user, loading } = useContext(AuthContext);
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--color-slate)' }}>
      Loading...
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

/** Public-only route (login / register). Redirects to /dashboard if already logged in. */
function AuthRoute({ children }) {
  const { user, loading } = useContext(AuthContext);
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--color-slate)' }}>
      Loading...
    </div>
  );
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

/** The authenticated app shell with sidebar + inner routes. */
function AppLayout() {
  const [apiHealth, setApiHealth] = useState(null);

  useEffect(() => {
    checkHealth()
      .then(() => setApiHealth(true))
      .catch(() => setApiHealth(false));
    const interval = setInterval(() => {
      checkHealth().then(() => setApiHealth(true)).catch(() => setApiHealth(false));
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="app-shell">
      <Sidebar apiHealth={apiHealth} />
      <div className="main-content">
        <Header />
        <Suspense fallback={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-slate)' }}>
            Loading module...
          </div>
        }>
          <Routes>
            <Route path="/dashboard"  element={<Dashboard />} />
            <Route path="/analyst"    element={<Analyst />} />
            <Route path="/reports"    element={<Reports />} />
            <Route path="/portfolio"  element={<Placeholder title="My Portfolio" icon={Briefcase} description="Portfolio management and performance tracking coming soon." />} />
            <Route path="/watchlist"  element={<Placeholder title="My Watchlist" icon={Eye} description="Custom watchlists with real-time alerts coming soon." />} />
            <Route path="/support"    element={<Placeholder title="Support" icon={HelpCircle} description="Help documentation and support tickets coming soon." />} />
            <Route path="/settings"   element={<Placeholder title="Settings" icon={Settings} description="Account settings, API keys, and preferences coming soon." />} />
            {/* Fallback: if user visits /app root, redirect to dashboard */}
            <Route path="*"           element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Suspense>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public landing page — the new root */}
          <Route path="/" element={<Landing />} />

          {/* Auth pages — redirect to /dashboard if already logged in */}
          <Route path="/login"    element={<AuthRoute><Login /></AuthRoute>} />
          <Route path="/register" element={<AuthRoute><Register /></AuthRoute>} />

          {/* Protected app shell — all /dashboard, /analyst, /reports, etc. */}
          <Route path="/*" element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
