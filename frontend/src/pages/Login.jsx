import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Lock, Mail } from 'lucide-react';
import '../index.css';

export default function Login() {
  const { handleLogin } = useContext(AuthContext);
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await handleLogin(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div className="glass-panel" style={styles.card}>
        <h2 style={{ marginBottom: '0.5rem', fontWeight: 600 }}>Welcome Back</h2>
        <p style={{ color: 'var(--color-slate)', marginBottom: '2rem', fontSize: '14px' }}>
          Sign in to your AI Market Intelligence account.
        </p>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={onSubmit} style={styles.form}>
          <div className="input-group" style={styles.inputGroup}>
            <Mail size={18} style={styles.icon} />
            <input
              type="email"
              placeholder="Email address"
              className="glass-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={styles.input}
            />
          </div>
          
          <div className="input-group" style={styles.inputGroup}>
            <Lock size={18} style={styles.icon} />
            <input
              type="password"
              placeholder="Password"
              className="glass-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={styles.input}
            />
          </div>

          <button type="submit" className="action-button primary" disabled={loading} style={styles.button}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '14px' }}>
          <span style={{ color: 'var(--color-slate)' }}>Don't have an account? </span>
          <Link to="/register" style={{ color: 'var(--color-cyan)', textDecoration: 'none' }}>
            Create one
          </Link>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    width: '100vw',
    backgroundColor: 'var(--color-bg)',
    backgroundImage: 'radial-gradient(circle at top right, rgba(0,212,255,0.05), transparent 40%), radial-gradient(circle at bottom left, rgba(123,44,191,0.05), transparent 40%)',
  },
  card: {
    width: '100%',
    maxWidth: '400px',
    padding: '2.5rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  error: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    color: '#ef4444',
    padding: '0.75rem',
    borderRadius: '8px',
    marginBottom: '1.5rem',
    width: '100%',
    fontSize: '14px',
    textAlign: 'center',
    border: '1px solid rgba(239, 68, 68, 0.2)',
  },
  form: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  inputGroup: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  icon: {
    position: 'absolute',
    left: '12px',
    color: 'var(--color-slate)',
  },
  input: {
    width: '100%',
    paddingLeft: '2.5rem',
    height: '48px',
  },
  button: {
    height: '48px',
    marginTop: '0.5rem',
    fontWeight: 500,
    fontSize: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }
};
