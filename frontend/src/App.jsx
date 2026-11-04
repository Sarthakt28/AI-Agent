import React, { useState, useEffect } from 'react';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Landing from './pages/Landing';

const API_BASE = import.meta.env.VITE_API_BASE || (window.location.port === '5173' ? 'http://localhost:8000/api/v1' : '/api/v1');

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [appLoading, setAppLoading] = useState(true);
  // showLanding: null = checking, true = show landing, false = skip landing
  const [showLanding, setShowLanding] = useState(true);

  // Auto-login if token exists in localStorage
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    if (savedToken) {
      fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${savedToken}` },
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data) {
            setUser(data);
            setToken(savedToken);
            setShowLanding(false); // Logged in users skip landing
          } else {
            localStorage.removeItem('token');
          }
        })
        .catch(() => localStorage.removeItem('token'))
        .finally(() => setAppLoading(false));
    } else {
      setAppLoading(false);
    }
  }, []);

  function handleLogin(userData, userToken) {
    setUser(userData);
    setToken(userToken);
    setShowLanding(false);
  }

  function handleLogout() {
    localStorage.removeItem('token');
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
    return <Dashboard user={user} token={token} onLogout={handleLogout} />;
  }

  // Not logged in and wants to go to auth
  if (!showLanding) {
    return <Auth onLogin={handleLogin} />;
  }

  // Default: show landing page
  return <Landing onLaunch={() => setShowLanding(false)} />;
}

export default App;
