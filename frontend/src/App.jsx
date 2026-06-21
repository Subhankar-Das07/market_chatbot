import { useState, useEffect, useContext } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { Briefcase, Eye, HelpCircle, Settings } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Analyst from './pages/Analyst';
import Reports from './pages/Reports';
import Placeholder from './pages/Placeholder';
import Login from './pages/Login';
import Register from './pages/Register';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { checkHealth } from './api/api';
import './index.css';

const PAGE_TITLES = {
  '/':          'Market Overview',
  '/analyst':   'AI Financial Analyst',
  '/reports':   'Market Reports',
  '/portfolio': 'Portfolio',
  '/watchlist': 'Watchlist',
  '/support':   'Support',
  '/settings':  'Settings',
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

function ProtectedRoute({ children }) {
  const { user, loading } = useContext(AuthContext);
  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--color-slate)' }}>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AuthRoute({ children }) {
  const { user, loading } = useContext(AuthContext);
  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--color-slate)' }}>Loading...</div>;
  if (user) return <Navigate to="/" replace />;
  return children;
}

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
        <Routes>
          <Route path="/"          element={<Dashboard />} />
          <Route path="/analyst"   element={<Analyst />} />
          <Route path="/reports"   element={<Reports />} />
          <Route path="/portfolio" element={<Placeholder title="Portfolio" icon={Briefcase} description="Portfolio management and performance tracking coming soon." />} />
          <Route path="/watchlist" element={<Placeholder title="Watchlist" icon={Eye} description="Custom watchlists with real-time alerts coming soon." />} />
          <Route path="/support"   element={<Placeholder title="Support" icon={HelpCircle} description="Help documentation and support tickets coming soon." />} />
          <Route path="/settings"  element={<Placeholder title="Settings" icon={Settings} description="Account settings, API keys, and preferences coming soon." />} />
        </Routes>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={
            <AuthRoute>
              <Login />
            </AuthRoute>
          } />
          <Route path="/register" element={
            <AuthRoute>
              <Register />
            </AuthRoute>
          } />
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
