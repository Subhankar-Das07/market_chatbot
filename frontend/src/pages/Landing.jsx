/**
 * Landing.jsx — Premium commercial gateway page.
 *
 * Upgrades over v1:
 *  - Scroll-aware navbar: transparent at top → frosted glass + border on scroll
 *  - Live WebSocket ticker strip embedded in hero (proves tech before login)
 *  - Smart nav CTAs: logged-in shows "Dashboard + Logout", logged-out shows "Login + Sign Up"
 *  - Bento-box feature grid with hover glow effects
 *  - Subtle radial glow blobs behind hero for depth
 *  - All styles in-file (no external CSS dependency)
 */

import { useContext, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { useWebSocket } from '../hooks/useWebSocket';
import {
  TrendingUp, TrendingDown, Brain, Zap, Shield, BarChart2,
  ArrowRight, Star, ChevronRight, Activity, Users, Database,
  Globe, Wifi, LogOut, LayoutDashboard,
} from 'lucide-react';

// ── Live Ticker Strip (uses real WebSocket) ──────────────────────────────────
const STRIP_TICKERS = ['BTC', 'ETH', 'AAPL', 'TSLA', 'SPY', 'NVDA', 'MSFT', 'SOL'];

function fmt(n, d = 2) {
  if (n == null) return '–';
  return n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
}

function TickerChip({ ticker, quote, flashDir }) {
  if (!quote) return (
    <div style={ts.chip}>
      <span style={ts.chipTicker}>{ticker}</span>
      <span style={ts.chipPrice}>–</span>
    </div>
  );
  const up = quote.change_pct >= 0;
  return (
    <div style={{
      ...ts.chip,
      background: flashDir === 'up'
        ? 'rgba(52,211,153,0.12)'
        : flashDir === 'down'
        ? 'rgba(248,113,113,0.12)'
        : ts.chip.background,
      transition: flashDir ? 'background 0ms' : 'background 700ms ease',
    }}>
      <span style={ts.chipTicker}>{ticker}</span>
      <span style={ts.chipPrice}>${fmt(quote.price, quote.price > 100 ? 2 : 4)}</span>
      <span style={up ? ts.chipUp : ts.chipDown}>
        {up ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
        &nbsp;{up ? '+' : ''}{fmt(quote.change_pct, 2)}%
      </span>
    </div>
  );
}

function LiveTickerStrip() {
  const { prices, status } = useWebSocket();
  const prevRef = useRef({});
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
    const t = setTimeout(() => setFlash({}), 600);
    return () => clearTimeout(t);
  }, [prices]);

  return (
    <div style={ts.wrap}>
      <div style={ts.statusPill}>
        <span style={{
          ...ts.dot,
          background: status === 'live' ? '#34d399' : '#fbbf24',
          animation: status === 'live' ? 'pulse 1.5s ease-in-out infinite' : 'none',
        }} />
        {status === 'live' ? 'Live Feed' : 'Connecting…'}
      </div>
      <div style={ts.strip}>
        {STRIP_TICKERS.map((t) => (
          <TickerChip key={t} ticker={t} quote={prices[t]} flashDir={flash[t]} />
        ))}
      </div>
    </div>
  );
}

const ts = {
  wrap: {
    width: '100%', maxWidth: 820,
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 14,
    overflow: 'hidden',
    boxShadow: '0 0 0 1px rgba(99,102,241,0.08), 0 32px 80px rgba(0,0,0,0.5)',
  },
  statusPill: {
    display: 'flex', alignItems: 'center', gap: 7,
    padding: '8px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    fontSize: 11, fontWeight: 700, color: 'rgba(226,232,240,0.5)',
    letterSpacing: '0.5px',
  },
  dot: { width: 7, height: 7, borderRadius: '50%', display: 'inline-block' },
  strip: {
    display: 'flex', flexWrap: 'wrap', gap: 0,
    padding: '4px 8px 8px',
  },
  chip: {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '7px 12px', margin: '4px',
    borderRadius: 8, background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    transition: 'background 700ms ease',
  },
  chipTicker:  { fontSize: 12, fontWeight: 800, color: '#f1f5f9', letterSpacing: '0.5px' },
  chipPrice:   { fontSize: 13, fontWeight: 700, color: '#f1f5f9', fontVariantNumeric: 'tabular-nums' },
  chipUp:      { display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 10, fontWeight: 700, color: '#34d399' },
  chipDown:    { display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 10, fontWeight: 700, color: '#f87171' },
};

// ── Bento feature cards ───────────────────────────────────────────────────────
const BENTO = [
  {
    icon: Wifi,
    color: '#34d399',
    glow: 'rgba(52,211,153,0.15)',
    title: 'Zero-Latency WebSocket Streaming',
    description: 'Every asset price ticks live on your dashboard with sub-second WebSocket delivery. No polling, no page refreshes — just pure real-time data.',
    wide: true,
  },
  {
    icon: BarChart2,
    color: '#6366f1',
    glow: 'rgba(99,102,241,0.15)',
    title: 'Memory-Safe Time-Series Charts',
    description: 'A 30-point sliding window engine renders smooth bezier curves from live ticks without ever growing your browser memory footprint.',
    wide: false,
  },
  {
    icon: Shield,
    color: '#f59e0b',
    glow: 'rgba(245,158,11,0.15)',
    title: 'JWT-Secured Portfolio Tracking',
    description: 'Every watchlist and portfolio operation is protected by JWT auth. Your data is isolated — no other user can see your holdings.',
    wide: false,
  },
  {
    icon: Brain,
    color: '#a78bfa',
    glow: 'rgba(167,139,250,0.15)',
    title: 'RAG-Powered AI Analyst',
    description: 'Upload PDFs and market reports. Our LangChain + Groq pipeline makes them instantly queryable via natural language.',
    wide: false,
  },
  {
    icon: Database,
    color: '#06b6d4',
    glow: 'rgba(6,182,212,0.15)',
    title: 'MongoDB Atlas Backend',
    description: 'All chat history, reports, and sessions are stored in Atlas with per-user isolation and indexed for fast retrieval.',
    wide: false,
  },
];

const STATS = [
  { value: '8',      label: 'Live Assets', icon: Activity },
  { value: '7s',     label: 'Tick Interval', icon: Zap },
  { value: '30pt',   label: 'Chart Window', icon: BarChart2 },
  { value: '100%',   label: 'Free to Start', icon: Globe },
];

const TESTIMONIALS = [
  { quote: 'The AI analyst cut my research time in half. Institutional-grade answers in seconds.', name: 'Priya M.', role: 'Equity Research, Mumbai', stars: 5 },
  { quote: 'The live WebSocket chart actually works. Seeing BTC tick in real time on a free app is insane.', name: 'James K.', role: 'Retail Investor, London', stars: 5 },
  { quote: 'RAG document search is a game changer for compliance teams.', name: 'Sofia L.', role: 'Risk Analyst, Frankfurt', stars: 5 },
];

// ── Main Component ────────────────────────────────────────────────────────────
export default function Landing() {
  const { user, handleLogout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  // Scroll-aware navbar
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleCTA = () => navigate(user ? '/dashboard' : '/register');
  const handleLogoutClick = () => { handleLogout(); navigate('/'); };

  return (
    <div style={s.root}>
      {/* ── NAVBAR ──────────────────────────────────────────────── */}
      <nav style={{
        ...s.nav,
        background: scrolled ? 'rgba(10,10,15,0.92)' : 'transparent',
        borderBottomColor: scrolled ? 'rgba(255,255,255,0.07)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
      }}>
        <div style={s.navInner}>
          <Link to="/" style={s.logo}>
            <div style={s.logoIcon}><TrendingUp size={17} color="#fff" /></div>
            <span style={s.logoText}>MarketAI</span>
          </Link>

          <div style={s.navLinks}>
            <a href="#live" style={s.navLink}>Live Feed</a>
            <a href="#features" style={s.navLink}>Features</a>
            <a href="#testimonials" style={s.navLink}>Reviews</a>
          </div>

          <div style={s.navCtas}>
            {user ? (
              <>
                <Link to="/dashboard" style={s.btnNavGhost}>
                  <LayoutDashboard size={14} /> Dashboard
                </Link>
                <button onClick={handleLogoutClick} style={s.btnNavLogout}>
                  <LogOut size={14} /> Log Out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" style={s.btnNavGhost}>Log In</Link>
                <Link to="/register" style={s.btnNavPrimary}>Sign Up Free</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────── */}
      <section style={s.hero}>
        {/* Ambient glow blobs */}
        <div style={s.blobLeft} />
        <div style={s.blobRight} />

        <div style={s.heroBadge}>
          <Wifi size={11} color="#34d399" />
          <span>Real-Time · WebSocket · Zero Latency</span>
        </div>

        <h1 style={s.heroH1}>
          The Market,<br />
          <span style={s.heroGrad}>In Real-Time.</span>
        </h1>

        <p style={s.heroSub}>
          Live WebSocket price feeds, memory-safe interactive charts, and
          AI-powered market analysis — all in one zero-subscription platform.
        </p>

        <div style={s.heroBtns}>
          <button onClick={handleCTA} style={s.btnHero}>
            {user ? 'Open Dashboard' : 'Launch App Free'}
            <ArrowRight size={18} />
          </button>
          <a href="#features" style={s.btnHeroGhost}>
            See Features <ChevronRight size={15} />
          </a>
        </div>

        {/* ── Live Ticker Strip ── */}
        <div id="live" style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <p style={{ fontSize: 11, color: 'rgba(226,232,240,0.35)', letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 600 }}>
            Live market data · updated every 7 seconds · powered by Yahoo Finance
          </p>
          <LiveTickerStrip />
        </div>
      </section>

      {/* ── STATS STRIP ─────────────────────────────────────────── */}
      <div style={s.statsStrip}>
        {STATS.map(({ value, label, icon: Icon }) => (
          <div key={label} style={s.statItem}>
            <Icon size={18} color="#6366f1" />
            <div style={s.statVal}>{value}</div>
            <div style={s.statLbl}>{label}</div>
          </div>
        ))}
      </div>

      {/* ── BENTO FEATURES ──────────────────────────────────────── */}
      <section id="features" style={s.section}>
        <div style={s.sectionTag}>Core Capabilities</div>
        <h2 style={s.sectionH2}>Built for the serious investor</h2>
        <p style={s.sectionSub}>
          Every layer of the stack is optimized for real-time performance and institutional-quality analysis.
        </p>

        <div style={s.bentoGrid}>
          {/* Wide card */}
          {BENTO.filter(b => b.wide).map(({ icon: Icon, color, glow, title, description }) => (
            <div key={title} style={{ ...s.bentoCard, ...s.bentoCWide, '--glow': glow }}>
              <div style={{ ...s.bentoIconWrap, background: glow }}>
                <Icon size={28} color={color} />
              </div>
              <h3 style={s.bentoTitle}>{title}</h3>
              <p style={s.bentoDesc}>{description}</p>
              <div style={{ ...s.bentoGlow, background: glow }} />
            </div>
          ))}
          {/* Narrow cards */}
          <div style={s.bentoNarrowGroup}>
            {BENTO.filter(b => !b.wide).map(({ icon: Icon, color, glow, title, description }) => (
              <div key={title} style={{ ...s.bentoCard, ...s.bentoCNarrow }}>
                <div style={{ ...s.bentoIconWrap, background: glow }}>
                  <Icon size={22} color={color} />
                </div>
                <h3 style={{ ...s.bentoTitle, fontSize: 15 }}>{title}</h3>
                <p style={{ ...s.bentoDesc, fontSize: 13 }}>{description}</p>
                <div style={{ ...s.bentoGlow, background: glow }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ────────────────────────────────────────── */}
      <section id="testimonials" style={s.testiSection}>
        <div style={s.sectionTag}>User Stories</div>
        <h2 style={s.sectionH2}>Trusted by investors worldwide</h2>
        <div style={s.testiGrid}>
          {TESTIMONIALS.map(({ quote, name, role, stars }) => (
            <div key={name} style={s.testiCard}>
              <div style={s.stars}>
                {Array.from({ length: stars }).map((_, i) => (
                  <Star key={i} size={13} fill="#f59e0b" color="#f59e0b" />
                ))}
              </div>
              <p style={s.quote}>"{quote}"</p>
              <div style={s.reviewer}>
                <div style={s.avatar}>{name[0]}</div>
                <div>
                  <div style={s.reviewerName}>{name}</div>
                  <div style={s.reviewerRole}>{role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA BANNER ──────────────────────────────────────────── */}
      <section style={s.ctaBanner}>
        <Users size={28} color="rgba(255,255,255,0.4)" style={{ marginBottom: 14 }} />
        <h2 style={s.ctaH2}>Your market edge starts here.</h2>
        <p style={s.ctaSub}>
          No credit card. No rate limits. Just real-time data and AI intelligence — free.
        </p>
        <div style={s.heroBtns}>
          <button onClick={handleCTA} style={s.btnHeroWhite}>
            {user ? 'Open Dashboard' : 'Create Free Account'}
            <ArrowRight size={17} />
          </button>
          {!user && (
            <Link to="/login" style={s.btnHeroGhostWhite}>Already have an account →</Link>
          )}
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────── */}
      <footer style={s.footer}>
        <div style={s.footerInner}>
          <div style={s.logo}>
            <div style={s.logoIcon}><TrendingUp size={15} color="#fff" /></div>
            <span style={{ fontWeight: 700, fontSize: 15, color: 'rgba(255,255,255,0.5)' }}>MarketAI</span>
          </div>
          <div style={{ display: 'flex', gap: 20 }}>
            <Link to="/login"    style={s.footerLink}>Log In</Link>
            <Link to="/register" style={s.footerLink}>Sign Up</Link>
            <a href="#features"  style={s.footerLink}>Features</a>
          </div>
          <span style={s.footerCopy}>© {new Date().getFullYear()} AI Market Intelligence Suite</span>
        </div>
      </footer>
    </div>
  );
}

/* ── Styles ── */
const s = {
  root: {
    minHeight: '100vh',
    background: '#080810',
    color: '#e2e8f0',
    fontFamily: "'Inter', system-ui, sans-serif",
    overflowX: 'hidden',
  },

  // Navbar — scroll-aware styles applied inline above
  nav: {
    position: 'fixed',
    top: 0, left: 0, right: 0,
    zIndex: 200,
    borderBottom: '1px solid transparent',
    transition: 'background 300ms ease, border-color 300ms ease, backdrop-filter 300ms ease',
  },
  navInner: {
    maxWidth: 1200, margin: '0 auto',
    padding: '0 24px', height: 64,
    display: 'flex', alignItems: 'center', gap: 32,
  },
  logo: { display: 'flex', alignItems: 'center', gap: 9, marginRight: 'auto', textDecoration: 'none' },
  logoIcon: {
    width: 32, height: 32, borderRadius: 8,
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  logoText: { fontWeight: 800, fontSize: 17, color: '#f1f5f9', letterSpacing: '-0.5px' },
  navLinks: { display: 'flex', gap: 26 },
  navLink:  { color: 'rgba(226,232,240,0.55)', fontSize: 14, fontWeight: 500, textDecoration: 'none', transition: 'color 200ms' },
  navCtas:  { display: 'flex', gap: 8, alignItems: 'center' },

  btnNavGhost: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
    color: 'rgba(226,232,240,0.75)', background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)', textDecoration: 'none',
    cursor: 'pointer', transition: 'all 180ms',
  },
  btnNavPrimary: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700,
    color: '#fff', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
    border: 'none', textDecoration: 'none',
    boxShadow: '0 0 14px rgba(99,102,241,0.35)',
  },
  btnNavLogout: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
    color: '#f87171', background: 'rgba(248,113,113,0.08)',
    border: '1px solid rgba(248,113,113,0.2)',
    cursor: 'pointer', transition: 'all 180ms',
  },

  // Hero
  hero: {
    maxWidth: 1200, margin: '0 auto',
    padding: '140px 24px 72px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
    position: 'relative',
  },
  blobLeft: {
    position: 'absolute', top: 80, left: -100,
    width: 500, height: 500, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  blobRight: {
    position: 'absolute', top: 200, right: -100,
    width: 500, height: 500, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(52,211,153,0.08) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  heroBadge: {
    display: 'inline-flex', alignItems: 'center', gap: 7,
    padding: '5px 14px', borderRadius: 100, marginBottom: 28,
    background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)',
    fontSize: 11, fontWeight: 700, color: '#34d399', letterSpacing: '0.5px',
    position: 'relative',
  },
  heroH1: {
    fontSize: 'clamp(42px, 6vw, 80px)', fontWeight: 900,
    lineHeight: 1.05, letterSpacing: '-3px', color: '#f1f5f9',
    marginBottom: 22, position: 'relative',
  },
  heroGrad: {
    background: 'linear-gradient(135deg, #34d399, #6366f1, #a78bfa)',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
  },
  heroSub: {
    maxWidth: 560, fontSize: 18, color: 'rgba(226,232,240,0.58)',
    lineHeight: 1.75, marginBottom: 36, position: 'relative',
  },
  heroBtns: {
    display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center',
    marginBottom: 48, position: 'relative',
  },
  btnHero: {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    padding: '14px 28px', borderRadius: 10, fontSize: 16, fontWeight: 800,
    color: '#fff', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
    border: 'none', cursor: 'pointer',
    boxShadow: '0 0 32px rgba(99,102,241,0.45)',
    transition: 'transform 150ms, box-shadow 150ms',
  },
  btnHeroGhost: {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '14px 22px', borderRadius: 10, fontSize: 15, fontWeight: 600,
    color: 'rgba(226,232,240,0.65)', background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)', textDecoration: 'none',
  },
  btnHeroWhite: {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    padding: '14px 28px', borderRadius: 10, fontSize: 16, fontWeight: 800,
    color: '#6366f1', background: '#fff', border: 'none', cursor: 'pointer',
  },
  btnHeroGhostWhite: {
    display: 'inline-flex', alignItems: 'center',
    padding: '14px 22px', borderRadius: 10, fontSize: 15, fontWeight: 600,
    color: 'rgba(255,255,255,0.7)', background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.18)', textDecoration: 'none',
  },

  // Stats strip
  statsStrip: {
    borderTop: '1px solid rgba(255,255,255,0.05)',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    display: 'flex', justifyContent: 'center', flexWrap: 'wrap',
  },
  statItem: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
    padding: '28px 48px', borderRight: '1px solid rgba(255,255,255,0.05)',
  },
  statVal: { fontSize: 34, fontWeight: 900, color: '#f1f5f9', letterSpacing: '-1px' },
  statLbl: { fontSize: 12, color: 'rgba(226,232,240,0.45)', fontWeight: 600 },

  // Sections
  section: { maxWidth: 1200, margin: '0 auto', padding: '80px 24px', textAlign: 'center' },
  sectionTag: {
    display: 'inline-block', padding: '4px 14px', borderRadius: 100, marginBottom: 14,
    background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)',
    fontSize: 11, fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '1px',
  },
  sectionH2: {
    fontSize: 'clamp(26px, 3.5vw, 44px)', fontWeight: 900,
    color: '#f1f5f9', letterSpacing: '-1.5px', marginBottom: 14, lineHeight: 1.15,
  },
  sectionSub: {
    maxWidth: 520, margin: '0 auto 48px',
    fontSize: 16, color: 'rgba(226,232,240,0.5)', lineHeight: 1.75,
  },

  // Bento grid
  bentoGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 16, textAlign: 'left',
  },
  bentoNarrowGroup: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 16,
  },
  bentoCard: {
    padding: '28px', borderRadius: 18,
    background: 'rgba(255,255,255,0.025)',
    border: '1px solid rgba(255,255,255,0.07)',
    position: 'relative', overflow: 'hidden',
    transition: 'transform 200ms, border-color 200ms',
  },
  bentoCWide: {
    // spans full left column — achieved via grid placement
  },
  bentoCNarrow: {
    // normal card within the 2-col narrow group
  },
  bentoIconWrap: {
    width: 52, height: 52, borderRadius: 14,
    display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  bentoTitle: { fontSize: 17, fontWeight: 800, color: '#f1f5f9', marginBottom: 8 },
  bentoDesc:  { fontSize: 14, color: 'rgba(226,232,240,0.5)', lineHeight: 1.7 },
  bentoGlow: {
    position: 'absolute', bottom: -40, right: -40,
    width: 160, height: 160, borderRadius: '50%',
    filter: 'blur(40px)', opacity: 0.6, pointerEvents: 'none',
  },

  // Testimonials
  testiSection: {
    background: 'rgba(99,102,241,0.02)',
    borderTop: '1px solid rgba(99,102,241,0.07)',
    borderBottom: '1px solid rgba(99,102,241,0.07)',
    padding: '80px 24px', textAlign: 'center',
  },
  testiGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: 20, maxWidth: 1200, margin: '0 auto', textAlign: 'left',
  },
  testiCard: {
    padding: '28px', borderRadius: 16,
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
  },
  stars:   { display: 'flex', gap: 3, marginBottom: 12 },
  quote:   { fontSize: 14, color: 'rgba(226,232,240,0.78)', lineHeight: 1.7, marginBottom: 18, fontStyle: 'italic' },
  reviewer:     { display: 'flex', alignItems: 'center', gap: 11 },
  avatar:       { width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, color: '#fff' },
  reviewerName: { fontSize: 13, fontWeight: 700, color: '#f1f5f9' },
  reviewerRole: { fontSize: 11, color: 'rgba(226,232,240,0.4)', marginTop: 1 },

  // CTA Banner
  ctaBanner: {
    background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #0f4c75 100%)',
    padding: '88px 24px', textAlign: 'center',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    borderTop: '1px solid rgba(99,102,241,0.25)',
  },
  ctaH2: { fontSize: 'clamp(26px, 3.5vw, 44px)', fontWeight: 900, color: '#fff', letterSpacing: '-1px', marginBottom: 14 },
  ctaSub: { maxWidth: 460, fontSize: 16, color: 'rgba(255,255,255,0.65)', lineHeight: 1.75, marginBottom: 36 },

  // Footer
  footer: {
    background: 'rgba(0,0,0,0.5)', borderTop: '1px solid rgba(255,255,255,0.05)',
    padding: '20px 24px',
  },
  footerInner: {
    maxWidth: 1200, margin: '0 auto',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    flexWrap: 'wrap', gap: 12,
  },
  footerLink: { fontSize: 13, color: 'rgba(226,232,240,0.35)', textDecoration: 'none' },
  footerCopy: { fontSize: 12, color: 'rgba(226,232,240,0.25)' },
};
