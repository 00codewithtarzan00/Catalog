import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff } from 'lucide-react';
import Navbar from '../Home/Navbar';

interface LoginProps {
  onLoginSuccess: () => void;
}

const ADMIN_PASSWORD = 'adm_raj%7979';

export default function Login({ onLoginSuccess }: LoginProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Artificial delay for feedback
    setTimeout(() => {
      if (password === ADMIN_PASSWORD) {
        localStorage.setItem('adm_auth_session', 'true');
        onLoginSuccess();
        navigate('/admin');
      } else {
        setError('Incorrect password. Please try again.');
        setLoading(false);
      }
    }, 500);
  };

  return (
    <div className="min-h-screen flex flex-col bg-brand-bg">
      <Navbar onSearch={() => {}} />
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-white editorial-card p-10 text-center animate-fade-in shadow-xl relative z-10">
        <div className="logo font-display font-bold text-3xl text-brand-accent tracking-tighter mb-2">
          Admin Login
        </div>
        <p className="text-xs uppercase tracking-widest text-brand-muted font-bold mb-8">
          Raj Kirana Store
        </p>

        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-100 text-red-600 text-xs rounded-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-4 w-4 text-brand-muted" />
            </div>
            <input
              type={showPassword ? "text" : "password"}
              required
              placeholder="Enter Admin Password"
              className="editorial-input pl-12 pr-10 py-3"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff className="h-4 w-4 text-brand-muted" /> : <Eye className="h-4 w-4 text-brand-muted" />}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full editorial-btn-primary py-3 transition-transform active:scale-95"
          >
            {loading ? 'Verifying...' : 'Access Dashboard'}
          </button>
        </form>

        <p className="mt-8 text-[10px] text-gray-400 leading-relaxed italic">
          Restricted Area. Admin authorization required.
        </p>
      </div>
    </div>
  </div>
);
}
