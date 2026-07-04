import React, { useState, useEffect } from 'react';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';

const API_BASE = import.meta.env.VITE_API_BASE || (window.location.port === '5173' ? 'http://localhost:8000/api/v1' : '/api/v1');

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [appLoading, setAppLoading] = useState(true);

  // Auto-login if token exists in localStorage
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    if (savedToken) {
      fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${savedToken}` },
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data) { setUser(data); setToken(savedToken); }
          else localStorage.removeItem('token');
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
  }

  function handleLogout() {
    localStorage.removeItem('token');
    setUser(null);
    setToken(null);
  }

  if (appLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <div className="spinner" style={{ width: '40px', height: '40px' }}></div>
      </div>
    );
  }

  if (!user) {
    return <Auth onLogin={handleLogin} />;
  }

  return <Dashboard user={user} token={token} onLogout={handleLogout} />;
}

export default App;
