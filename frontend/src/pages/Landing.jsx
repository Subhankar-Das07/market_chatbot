import { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import {
  TrendingUp, Brain, Zap, Shield, BarChart2, Globe,
  ArrowRight, Star, ChevronRight, Activity, Users, Database
} from 'lucide-react';

const FEATURES = [
  {
    icon: Brain,
    color: '#6366f1',
    bg: 'rgba(99,102,241,0.1)',
    title: 'AI-Powered Analysis',
    description:
      'Our RAG pipeline ingests your market reports and delivers precise, cited answers in milliseconds using state-of-the-art LLMs.',
  },
  {
    icon: Activity,
    color: '#06b6d4',
    bg: 'rgba(6,182,212,0.1)',
    title: 'Real-Time Market Feeds',
    description:
      'Stream live equity prices, sentiment signals, and sector rotations directly to your personalized dashboard.',
  },
  {
    icon: BarChart2,
    color: '#10b981',
    bg: 'rgba(16,185,129,0.1)',
    title: 'Portfolio Intelligence',
    description:
      'Track holdings, run scenario analyses, and receive AI-generated rebalancing recommendations tuned to your risk profile.',
  },
  {
    icon: Globe,
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.1)',
    title: 'Global Coverage',
    description:
      'Monitor equities, ETFs, forex, and crypto across 40+ exchanges with institutional-grade data quality.',
  },
  {
    icon: Shield,
    color: '#ec4899',
    bg: 'rgba(236,72,153,0.1)',
    title: 'Secure & Private',
    description:
      'Your data never leaves our encrypted infrastructure. Multi-user isolation ensures complete portfolio privacy.',
  },
  {
    icon: Zap,
    color: '#8b5cf6',
    bg: 'rgba(139,92,246,0.1)',
    title: 'Instant RAG Retrieval',
    description:
      'Upload PDFs and URLs. Our vector engine indexes them instantly and makes them queryable through natural language.',
  },
];

const STATS = [
  { value: '40+', label: 'Global Exchanges', icon: Globe },
  { value: '<200ms', label: 'AI Response Time', icon: Zap },
  { value: '99.9%', label: 'Uptime SLA', icon: Shield },
  { value: '10k+', label: 'Reports Indexed', icon: Database },
];

const TESTIMONIALS = [
  {
    quote: 'The AI analyst cut my research time in half. I get institutional-grade reports in seconds.',
    name: 'Priya M.',
    role: 'Equity Research, Mumbai',
    stars: 5,
  },
  {
    quote: 'Finally a fintech tool that speaks plain English and backs every answer with sources.',
    name: 'James K.',
    role: 'Retail Investor, London',
    stars: 5,
  },
  {
    quote: 'RAG-powered document search is a game changer for compliance teams.',
    name: 'Sofia L.',
    role: 'Risk Analyst, Frankfurt',
    stars: 5,
  },
];

export default function Landing() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleCTA = () => navigate(user ? '/dashboard' : '/register');

  return (
    <div style={s.root}>
      {/* ── NAV ─────────────────────────────────────────────────── */}
      <nav style={s.nav}>
        <div style={s.navInner}>
          <div style={s.logo}>
            <div style={s.logoIcon}>
              <TrendingUp size={18} color="#fff" />
            </div>
            <span style={s.logoText}>MarketAI</span>
          </div>
          <div style={s.navLinks}>
            <a href="#features" style={s.navLink}>Features</a>
            <a href="#stats" style={s.navLink}>Metrics</a>
            <a href="#testimonials" style={s.navLink}>Reviews</a>
          </div>
          <div style={s.navCtas}>
            {user ? (
              <Link to="/dashboard" style={s.btnPrimary}>Go to Dashboard</Link>
            ) : (
              <>
                <Link to="/login" style={s.btnGhost}>Log In</Link>
                <Link to="/register" style={s.btnPrimary}>Sign Up Free</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────── */}
      <section style={s.hero}>
        <div style={s.heroBadge}>
          <Zap size={12} color="#6366f1" />
          <span>Powered by Groq · MongoDB Atlas · LangChain RAG</span>
        </div>
        <h1 style={s.heroH1}>
          Your AI-Powered<br />
          <span style={s.heroGradient}>Financial Intelligence</span><br />
          Command Center
        </h1>
        <p style={s.heroSub}>
          Aggregate market data, analyze reports with AI, and get real-time answers
          to your most complex investment questions — all in one place.
        </p>
        <div style={s.heroBtns}>
          <button onClick={handleCTA} style={s.btnHero}>
            {user ? 'Open Dashboard' : 'Get Started Free'}
            <ArrowRight size={18} />
          </button>
          <a href="#features" style={s.btnHeroGhost}>
            Explore Features <ChevronRight size={16} />
          </a>
        </div>

        {/* Mini dashboard preview card */}
        <div style={s.previewCard}>
          <div style={s.previewHeader}>
            <div style={s.previewDot} />
            <div style={{ ...s.previewDot, background: '#f59e0b' }} />
            <div style={{ ...s.previewDot, background: '#10b981' }} />
            <span style={s.previewTitle}>AI Market Intelligence Suite</span>
          </div>
          <div style={s.previewBars}>
            {[42, 58, 51, 72, 65, 80, 77, 88, 84, 96].map((h, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: `${h}%`,
                  background: i === 9
                    ? 'linear-gradient(to top, #6366f1, #a78bfa)'
                    : `rgba(99,102,241,${0.15 + i * 0.06})`,
                  borderRadius: '3px 3px 0 0',
                  transition: 'height 0.6s ease',
                }}
              />
            ))}
          </div>
          <div style={s.previewTickers}>
            {['AAPL +1.2%', 'NVDA +3.4%', 'TSLA -2.1%', 'MSFT +0.9%'].map((t, i) => (
              <span key={i} style={{
                ...s.previewTick,
                color: t.includes('-') ? '#f87171' : '#34d399',
              }}>{t}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS STRIP ─────────────────────────────────────────── */}
      <section id="stats" style={s.statsStrip}>
        {STATS.map(({ value, label, icon: Icon }) => (
          <div key={label} style={s.statItem}>
            <Icon size={20} color="#6366f1" />
            <div style={s.statValue}>{value}</div>
            <div style={s.statLabel}>{label}</div>
          </div>
        ))}
      </section>

      {/* ── FEATURES ────────────────────────────────────────────── */}
      <section id="features" style={s.section}>
        <div style={s.sectionTag}>Core Capabilities</div>
        <h2 style={s.sectionH2}>Everything you need to stay ahead of the market</h2>
        <p style={s.sectionSub}>
          A unified platform that turns raw data, analyst reports, and live feeds into
          actionable intelligence — personalized to you.
        </p>
        <div style={s.featuresGrid}>
          {FEATURES.map(({ icon: Icon, color, bg, title, description }) => (
            <div key={title} style={s.featureCard}>
              <div style={{ ...s.featureIcon, background: bg }}>
                <Icon size={22} color={color} />
              </div>
              <h3 style={s.featureTitle}>{title}</h3>
              <p style={s.featureDesc}>{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── TESTIMONIALS ────────────────────────────────────────── */}
      <section id="testimonials" style={{ ...s.section, background: 'rgba(99,102,241,0.03)', borderTop: '1px solid rgba(99,102,241,0.08)', borderBottom: '1px solid rgba(99,102,241,0.08)' }}>
        <div style={s.sectionTag}>User Stories</div>
        <h2 style={s.sectionH2}>Trusted by investors worldwide</h2>
        <div style={s.testimonialsGrid}>
          {TESTIMONIALS.map(({ quote, name, role, stars }) => (
            <div key={name} style={s.testimonialCard}>
              <div style={s.stars}>
                {Array.from({ length: stars }).map((_, i) => (
                  <Star key={i} size={14} fill="#f59e0b" color="#f59e0b" />
                ))}
              </div>
              <p style={s.quote}>"{quote}"</p>
              <div style={s.reviewer}>
                <div style={s.reviewerAvatar}>{name[0]}</div>
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
        <Users size={32} color="rgba(255,255,255,0.5)" style={{ marginBottom: 16 }} />
        <h2 style={s.ctaH2}>Ready to unlock your market edge?</h2>
        <p style={s.ctaSub}>
          Join thousands of investors using AI to make smarter, faster decisions.
          No credit card required.
        </p>
        <div style={s.heroBtns}>
          <button onClick={handleCTA} style={s.btnHeroWhite}>
            {user ? 'Open Dashboard' : 'Create Free Account'}
            <ArrowRight size={18} />
          </button>
          <Link to="/login" style={s.btnHeroGhostWhite}>Already have an account?</Link>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────── */}
      <footer style={s.footer}>
        <div style={s.footerInner}>
          <div style={s.logo}>
            <div style={s.logoIcon}><TrendingUp size={16} color="#fff" /></div>
            <span style={{ ...s.logoText, color: 'rgba(255,255,255,0.6)' }}>MarketAI</span>
          </div>
          <span style={s.footerCopy}>© {new Date().getFullYear()} AI Market Intelligence Suite. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}

/* ── STYLES ─────────────────────────────────────────────────── */
const s = {
  root: {
    minHeight: '100vh',
    background: '#0a0a0f',
    color: '#e2e8f0',
    fontFamily: "'Inter', system-ui, sans-serif",
    overflowX: 'hidden',
  },

  /* Nav */
  nav: {
    position: 'sticky',
    top: 0,
    zIndex: 100,
    background: 'rgba(10,10,15,0.85)',
    backdropFilter: 'blur(16px)',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  navInner: {
    maxWidth: 1200,
    margin: '0 auto',
    padding: '0 24px',
    height: 64,
    display: 'flex',
    alignItems: 'center',
    gap: 32,
  },
  logo: { display: 'flex', alignItems: 'center', gap: 10, marginRight: 'auto' },
  logoIcon: {
    width: 32, height: 32, borderRadius: 8,
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  logoText: { fontWeight: 700, fontSize: 18, color: '#f1f5f9', letterSpacing: '-0.5px' },
  navLinks: { display: 'flex', gap: 28 },
  navLink: { color: 'rgba(226,232,240,0.6)', fontSize: 14, fontWeight: 500, transition: 'color 200ms', textDecoration: 'none' },
  navCtas: { display: 'flex', gap: 10, alignItems: 'center' },

  /* Buttons */
  btnGhost: {
    padding: '8px 16px', borderRadius: 8, fontSize: 14, fontWeight: 500,
    color: 'rgba(226,232,240,0.8)', background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)', textDecoration: 'none', display: 'inline-block',
    transition: 'all 200ms',
  },
  btnPrimary: {
    padding: '8px 18px', borderRadius: 8, fontSize: 14, fontWeight: 600,
    color: '#fff', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    border: 'none', textDecoration: 'none', display: 'inline-block',
    boxShadow: '0 0 16px rgba(99,102,241,0.35)',
    transition: 'all 200ms',
  },
  btnHero: {
    padding: '14px 28px', borderRadius: 10, fontSize: 16, fontWeight: 700,
    color: '#fff', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    border: 'none', display: 'flex', alignItems: 'center', gap: 8,
    boxShadow: '0 0 32px rgba(99,102,241,0.4)', cursor: 'pointer',
    transition: 'all 200ms',
  },
  btnHeroGhost: {
    padding: '14px 24px', borderRadius: 10, fontSize: 15, fontWeight: 500,
    color: 'rgba(226,232,240,0.7)', background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)', textDecoration: 'none',
    display: 'flex', alignItems: 'center', gap: 4,
  },
  btnHeroWhite: {
    padding: '14px 28px', borderRadius: 10, fontSize: 16, fontWeight: 700,
    color: '#6366f1', background: '#fff', border: 'none',
    display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
  },
  btnHeroGhostWhite: {
    padding: '14px 24px', borderRadius: 10, fontSize: 15, fontWeight: 500,
    color: 'rgba(255,255,255,0.7)', background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.2)', textDecoration: 'none',
    display: 'flex', alignItems: 'center',
  },

  /* Hero */
  hero: {
    maxWidth: 1200, margin: '0 auto', padding: '100px 24px 60px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
  },
  heroBadge: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '6px 14px', borderRadius: 100, marginBottom: 28,
    background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)',
    fontSize: 12, fontWeight: 600, color: '#a78bfa',
    letterSpacing: '0.3px',
  },
  heroH1: {
    fontSize: 'clamp(36px, 5vw, 68px)', fontWeight: 800, lineHeight: 1.1,
    letterSpacing: '-2px', color: '#f1f5f9', marginBottom: 24,
  },
  heroGradient: {
    background: 'linear-gradient(135deg, #6366f1, #a78bfa, #06b6d4)',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  heroSub: {
    maxWidth: 580, fontSize: 18, color: 'rgba(226,232,240,0.6)',
    lineHeight: 1.7, marginBottom: 36,
  },
  heroBtns: { display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 56 },

  /* Preview card */
  previewCard: {
    width: '100%', maxWidth: 680, borderRadius: 16, overflow: 'hidden',
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
    boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(99,102,241,0.1)',
  },
  previewHeader: {
    display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  previewDot: { width: 10, height: 10, borderRadius: '50%', background: '#f87171' },
  previewTitle: { marginLeft: 8, fontSize: 12, color: 'rgba(226,232,240,0.4)', fontWeight: 500 },
  previewBars: {
    display: 'flex', alignItems: 'flex-end', gap: 5, height: 140,
    padding: '16px 20px 0',
  },
  previewTickers: {
    display: 'flex', gap: 12, flexWrap: 'wrap', padding: '12px 20px',
    borderTop: '1px solid rgba(255,255,255,0.06)',
  },
  previewTick: { fontSize: 12, fontWeight: 600, fontVariantNumeric: 'tabular-nums' },

  /* Stats */
  statsStrip: {
    borderTop: '1px solid rgba(255,255,255,0.06)',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 0,
  },
  statItem: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
    padding: '32px 48px', borderRight: '1px solid rgba(255,255,255,0.06)',
  },
  statValue: { fontSize: 36, fontWeight: 800, color: '#f1f5f9', letterSpacing: '-1px' },
  statLabel: { fontSize: 13, color: 'rgba(226,232,240,0.5)', fontWeight: 500 },

  /* Sections */
  section: { maxWidth: 1200, margin: '0 auto', padding: '80px 24px', textAlign: 'center' },
  sectionTag: {
    display: 'inline-block', padding: '4px 14px', borderRadius: 100, marginBottom: 16,
    background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)',
    fontSize: 12, fontWeight: 600, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '1px',
  },
  sectionH2: {
    fontSize: 'clamp(26px, 3.5vw, 42px)', fontWeight: 800, color: '#f1f5f9',
    letterSpacing: '-1px', marginBottom: 16, lineHeight: 1.2,
  },
  sectionSub: {
    maxWidth: 560, margin: '0 auto 48px', fontSize: 16,
    color: 'rgba(226,232,240,0.55)', lineHeight: 1.7,
  },

  /* Features */
  featuresGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: 20, textAlign: 'left',
  },
  featureCard: {
    padding: '28px', borderRadius: 16,
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
    transition: 'transform 200ms, border-color 200ms',
  },
  featureIcon: {
    width: 48, height: 48, borderRadius: 12, display: 'flex',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  featureTitle: { fontSize: 17, fontWeight: 700, color: '#f1f5f9', marginBottom: 8 },
  featureDesc: { fontSize: 14, color: 'rgba(226,232,240,0.55)', lineHeight: 1.7 },

  /* Testimonials */
  testimonialsGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: 20, maxWidth: 1200, margin: '0 auto', textAlign: 'left',
  },
  testimonialCard: {
    padding: '28px', borderRadius: 16,
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
  },
  stars: { display: 'flex', gap: 3, marginBottom: 12 },
  quote: { fontSize: 15, color: 'rgba(226,232,240,0.8)', lineHeight: 1.7, marginBottom: 20, fontStyle: 'italic' },
  reviewer: { display: 'flex', alignItems: 'center', gap: 12 },
  reviewerAvatar: {
    width: 38, height: 38, borderRadius: '50%', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    fontWeight: 700, fontSize: 14, color: '#fff',
  },
  reviewerName: { fontSize: 14, fontWeight: 600, color: '#f1f5f9' },
  reviewerRole: { fontSize: 12, color: 'rgba(226,232,240,0.45)', marginTop: 2 },

  /* CTA Banner */
  ctaBanner: {
    background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #0891b2 100%)',
    padding: '80px 24px', textAlign: 'center',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
  },
  ctaH2: { fontSize: 'clamp(24px, 3vw, 40px)', fontWeight: 800, color: '#fff', letterSpacing: '-1px', marginBottom: 16 },
  ctaSub: { maxWidth: 480, fontSize: 16, color: 'rgba(255,255,255,0.75)', lineHeight: 1.7, marginBottom: 36 },

  /* Footer */
  footer: {
    background: 'rgba(0,0,0,0.4)', borderTop: '1px solid rgba(255,255,255,0.06)',
    padding: '24px',
  },
  footerInner: {
    maxWidth: 1200, margin: '0 auto',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
  },
  footerCopy: { fontSize: 13, color: 'rgba(226,232,240,0.35)' },
};
