import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './components/Home/Home';
import AdminDashboard from './components/Admin/AdminDashboard';
import Login from './components/Admin/Login';
import NoticeHistory from './components/Home/NoticeHistory';
import Contact from './components/Home/Contact';
import About from './components/Home/About';
import ErrorBoundary from './components/ErrorBoundary';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import { StoreConfig } from './types';

export default function App() {
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [config, setConfig] = useState<StoreConfig>({});

  useEffect(() => {
    // Check local session for simple password auth
    const session = localStorage.getItem('adm_auth_session');
    if (session === 'true') {
      setIsAdmin(true);
    }

    // Sync Global Config for logo throughout the app
    const unsubConfig = onSnapshot(doc(db, 'config', 'global'), (snap) => {
      if (snap.exists()) {
        setConfig(snap.data() as StoreConfig);
      }
    });

    return () => unsubConfig();
  }, []);

  const handleLoginSuccess = () => {
    setIsAdmin(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('adm_auth_session');
    setIsAdmin(false);
  };

  return (
    <div className="relative min-h-screen">
      <Router>
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<Home config={config} />} />
            <Route path="/about" element={<About config={config} />} />
            <Route path="/contact" element={<Contact config={config} />} />
            <Route path="/notices" element={<NoticeHistory config={config} />} />
            <Route path="/admin" element={isAdmin ? <AdminDashboard onLogout={handleLogout} /> : <Login onLoginSuccess={handleLoginSuccess} />} />
            <Route path="/admin/login" element={<Login onLoginSuccess={handleLoginSuccess} />} />
          </Routes>
        </ErrorBoundary>
      </Router>
    </div>
  );
}
