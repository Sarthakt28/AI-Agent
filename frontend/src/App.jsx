import React, { useState, useEffect, Component } from 'react';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Landing from './pages/Landing';

// ---- Error Boundary ----
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: '#07070F', color: '#fff',
          fontFamily: 'Inter, sans-serif', gap: 16, padding: 24, textAlign: 'center',
        }}>
          <div style={{ fontSize: 48 }}>⚠️</div>
          <h2 style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>Something went wrong</h2>
          <p style={{ color: '#9ea0b0', maxWidth: 400, margin: 0 }}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
            style={{
              marginTop: 8, padding: '10px 24px',
              background: 'linear-gradient(135deg,#4F6EF7,#8B5CF6)',
              border: 'none', borderRadius: 8, color: '#fff',
              cursor: 'pointer', fontSize: 14, fontWeight: 500,
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ---- API base ----
const API_BASE = import.meta.env.VITE_API_BASE || '/api/v1';

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [appLoading, setAppLoading] = useState(true);
  // showLanding: null = checking, true = show landing, false = skip landing
  const [showLanding, setShowLanding] = useState(true);

  // Auto-login with optimistic cached user for instant launch
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (savedToken) {
      if (savedUser) {
        try {
          const parsedUser = JSON.parse(savedUser);
          setUser(parsedUser);
          setToken(savedToken);
          setShowLanding(false);
          setAppLoading(false);
        } catch {
          // ignore JSON parse error, proceed to fetch
        }
      }

      // Verify token in background (or foreground if no cached user)
      fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${savedToken}` },
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data) {
            setUser(data);
            setToken(savedToken);
            localStorage.setItem('user', JSON.stringify(data));
            setShowLanding(false);
          } else {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setUser(null);
            setToken(null);
            setShowLanding(true);
          }
        })
        .catch(() => {
          // Network error: if we had a cached user, keep it; otherwise clear
          if (!savedUser) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setUser(null);
            setToken(null);
          }
        })
        .finally(() => setAppLoading(false));
    } else {
      setAppLoading(false);
    }
  }, []);

  function handleLogin(userData, userToken) {
    setUser(userData);
    setToken(userToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setShowLanding(false);
  }

  function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setToken(null);
    setShowLanding(true);
  }

  if (appLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#07070F' }}>
        <div style={{
          width: 40, height: 40,
          border: '2px solid rgba(79,110,247,0.2)',
          borderTopColor: '#4F6EF7',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Logged in → dashboard
  if (user) {
    return (
      <ErrorBoundary>
        <Dashboard user={user} token={token} onLogout={handleLogout} />
      </ErrorBoundary>
    );
  }

  // Not logged in and wants to go to auth
  if (!showLanding) {
    return (
      <ErrorBoundary>
        <Auth onLogin={handleLogin} />
      </ErrorBoundary>
    );
  }

  // Default: show landing page
  return (
    <ErrorBoundary>
      <Landing onLaunch={() => setShowLanding(false)} />
    </ErrorBoundary>
  );
}

export default App;
