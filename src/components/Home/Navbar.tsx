import React, { useState, useEffect } from 'react';
import { Search, User as UserIcon, ArrowLeft, Menu, X, Home as HomeIcon, Info, Mail, Bell } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { StoreConfig } from '../../types';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, loginWithGoogle } from '../../firebase';

interface NavbarProps {
  onSearch: (query: string) => void;
  config?: StoreConfig;
  onOpenOrders?: () => void;
}

interface SearchBarProps {
  value: string;
  onChange: (val: string) => void;
  onSubmit: (e?: React.FormEvent) => void;
  className?: string;
}

const SearchBar = ({ value, onChange, onSubmit, className = "" }: SearchBarProps) => (
  <form 
    onSubmit={onSubmit}
    className={`flex items-center bg-gray-100 rounded-md overflow-hidden border border-transparent focus-within:border-brand-accent transition-all ${className}`}
  >
    <div className="flex items-center px-3 py-2 flex-1">
      <Search className="w-4 h-4 text-brand-muted mr-2" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search price for..."
        className="bg-transparent border-none outline-none w-full text-xs md:text-sm font-sans"
      />
    </div>
    <button 
      type="submit"
      className="bg-brand-accent text-white px-4 py-2 text-xs font-bold hover:bg-opacity-90 transition-colors"
    >
      Search
    </button>
  </form>
);

const NavLinks = ({ closeMenu }: { closeMenu: () => void }) => (
  <>
    <Link to="/" onClick={closeMenu} className="flex items-center gap-2 text-sm font-semibold hover:text-brand-accent transition-colors">
      <HomeIcon className="w-4 h-4 lg:hidden" />
      <span>Home</span>
    </Link>
    <Link to="/about" onClick={closeMenu} className="flex items-center gap-2 text-sm font-semibold hover:text-brand-accent transition-colors">
      <Info className="w-4 h-4 lg:hidden" />
      <span>About</span>
    </Link>
    <Link to="/notices" onClick={closeMenu} className="flex items-center gap-2 text-sm font-semibold hover:text-brand-accent transition-colors">
      <Bell className="w-4 h-4 lg:hidden" />
      <span>Notices</span>
    </Link>
    <Link to="/contact" onClick={closeMenu} className="flex items-center gap-2 text-sm font-semibold hover:text-brand-accent transition-colors">
      <Mail className="w-4 h-4 lg:hidden" />
      <span>Contact</span>
    </Link>
  </>
);

export default function Navbar({ onSearch, config, onOpenOrders }: NavbarProps) {
  const [searchValue, setSearchValue] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsub();
  }, []);

  // Dynamic logo - removed fallback
  const LOGO_URL = config?.logoUrl;

  const handleSearchSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    onSearch(searchValue);
  };

  const handleSearchChange = (val: string) => {
    setSearchValue(val);
    // Instant search while typing for better UX
    onSearch(val);
  };

  const isSubPage = location.pathname !== '/';

  return (
    <>
      <nav className="h-16 border-b border-brand-border flex items-center justify-between px-4 md:px-8 bg-white sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-2 lg:gap-4 h-full">
          {isSubPage && (
            <button 
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors mr-1"
              title="Go Back"
            >
              <ArrowLeft className="w-5 h-5 text-brand-accent" />
            </button>
          )}
          
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="lg:hidden p-2 hover:bg-gray-100 rounded-md transition-colors"
          >
            {isMenuOpen ? <X className="w-6 h-6 text-brand-accent" /> : <Menu className="w-6 h-6 text-brand-accent" />}
          </button>

          <Link to="/" className="flex items-center gap-2 group mr-2 h-full">
            <div className={`w-9 h-9 md:w-10 md:h-10 rounded-full border-2 border-brand-accent bg-white flex-shrink-0 p-1 shadow-md flex items-center justify-center overflow-hidden transition-all duration-500`}>
               {LOGO_URL ? (
                 <img 
                   src={LOGO_URL} 
                   alt="Logo" 
                   className="max-w-full max-h-full object-contain"
                 />
               ) : (
                 <div className="w-full h-full bg-brand-accent/5 flex items-center justify-center">
                    <span className="text-base md:text-lg font-black text-brand-accent italic tracking-tighter">RK</span>
                 </div>
               )}
            </div>
            <div className="flex flex-col justify-center min-w-0 max-w-[150px] md:max-w-[300px]">
              <span className="logo font-display font-bold text-base md:text-xl text-brand-accent tracking-tighter whitespace-nowrap leading-none">
                Raj Kirana Store
              </span>
            </div>
          </Link>
        </div>

        {!isSubPage && (
          <div className="flex-1 max-w-sm mx-10 hidden lg:block">
            <SearchBar value={searchValue} onChange={handleSearchChange} onSubmit={handleSearchSubmit} />
          </div>
        )}

        <div className="flex items-center gap-2 md:gap-6">
          <div className="hidden lg:flex items-center gap-6">
            <NavLinks closeMenu={() => setIsMenuOpen(false)} />
          </div>

          {user ? (
            <button
              onClick={onOpenOrders}
              className="flex items-center gap-1.5 px-3 py-2 bg-brand-accent/5 hover:bg-brand-accent/10 border border-brand-accent/20 rounded-xl transition-all text-brand-accent cursor-pointer active:scale-95 text-xs font-bold shrink-0 shadow-sm"
            >
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || 'User'} className="w-5 h-5 rounded-full border border-brand-accent shrink-0" referrerPolicy="no-referrer" />
              ) : (
                <UserIcon className="w-4 h-4 text-brand-accent shrink-0" />
              )}
              <span className="max-w-[100px] truncate">
                My Orders / मेरे ऑर्डर
              </span>
              <span className="flex h-1.5 w-1.5 relative shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
              </span>
            </button>
          ) : (
            <button
              onClick={async () => {
                try {
                  await loginWithGoogle();
                } catch (err: any) {
                  if (err?.code !== 'auth/popup-closed-by-user' && err?.code !== 'auth/cancelled-popup-request') {
                    console.error('Navbar Google login failed:', err);
                  }
                }
              }}
              className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-gray-50 border border-gray-300 rounded-xl transition-all text-gray-700 cursor-pointer active:scale-95 text-xs font-bold shrink-0 shadow-sm"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              <span>Login with Google / गूगल लॉगिन</span>
            </button>
          )}
        </div>
      </nav>

      {/* Mobile Menu Overlay - Bottom Sheet Style */}
      {isMenuOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 lg:hidden animate-fade-in" onClick={() => setIsMenuOpen(false)}>
          <div 
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl p-6 shadow-2xl animate-slide-up max-h-[80vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-6" />
            <div className="flex flex-col gap-6">
              <NavLinks closeMenu={() => setIsMenuOpen(false)} />
              
              {user ? (
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    onOpenOrders?.();
                  }}
                  className="flex items-center justify-center gap-2.5 w-full bg-brand-accent text-white p-4 rounded-xl font-bold text-sm shadow-lg active:scale-95 transition-transform cursor-pointer"
                >
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="Avatar" className="w-5 h-5 rounded-full border border-white" referrerPolicy="no-referrer" />
                  ) : (
                    <UserIcon className="w-5 h-5" />
                  )}
                  <span>My Orders / मेरे ऑर्डर</span>
                </button>
              ) : (
                <button
                  onClick={async () => {
                    setIsMenuOpen(false);
                    try {
                      await loginWithGoogle();
                    } catch (err: any) {
                      if (err?.code !== 'auth/popup-closed-by-user' && err?.code !== 'auth/cancelled-popup-request') {
                        console.error('Navbar Google login failed (mobile):', err);
                      }
                    }
                  }}
                  className="flex items-center justify-center gap-2.5 w-full bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 p-4 rounded-xl font-bold text-sm shadow-md active:scale-95 transition-transform cursor-pointer"
                >
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  <span>Login with Google / गूगल लॉगिन</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mobile/Tablet Search Bar - Visible below navbar on smaller screens */}
      {!isSubPage && (
        <div className="lg:hidden bg-white border-b border-brand-border p-3 px-4 md:px-10 relative z-10 animate-fade-in">
          <SearchBar value={searchValue} onChange={handleSearchChange} onSubmit={handleSearchSubmit} />
        </div>
      )}
    </>
  );
}
