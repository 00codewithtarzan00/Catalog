import React, { useState } from 'react';
import { Search, User as UserIcon, ArrowLeft, Menu, X, Home as HomeIcon, Info, Mail, Bell } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { StoreConfig } from '../../types';

interface NavbarProps {
  onSearch: (query: string) => void;
  config?: StoreConfig;
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

export default function Navbar({ onSearch, config }: NavbarProps) {
  const [searchValue, setSearchValue] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

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
