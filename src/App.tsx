import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import Home from './components/Home/Home';
import AdminDashboard from './components/Admin/AdminDashboard';
import Login from './components/Admin/Login';
import NoticeHistory from './components/Home/NoticeHistory';
import ErrorBoundary from './components/ErrorBoundary';

export default function App() {
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check local session for simple password auth
    const session = localStorage.getItem('adm_auth_session');
    if (session === 'true') {
      setIsAdmin(true);
    }
    setLoading(false);
  }, []);

  const handleLoginSuccess = () => {
    setIsAdmin(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('adm_auth_session');
    setIsAdmin(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-bg">
        <div className="animate-pulse text-brand-accent font-display text-2xl">Loading Raj Kirana Store...</div>
      </div>
    );
  }

  return (
    <Router>
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/notices" element={<NoticeHistory />} />
          <Route path="/admin" element={isAdmin ? <AdminDashboard onLogout={handleLogout} /> : <Login onLoginSuccess={handleLoginSuccess} />} />
          <Route path="/admin/login" element={<Login onLoginSuccess={handleLoginSuccess} />} />
        </Routes>
      </ErrorBoundary>
    </Router>
  );
}
