import React, { useState } from 'react';
import { Search, User as UserIcon, ArrowLeft, Menu, X, Home as HomeIcon, Info, Phone } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

interface NavbarProps {
  onSearch: (query: string) => void;
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
    <button onClick={closeMenu} className="flex items-center gap-2 text-sm font-semibold hover:text-brand-accent transition-colors text-left">
      <Info className="w-4 h-4 lg:hidden" />
      <span>About</span>
    </button>
    <button onClick={closeMenu} className="flex items-center gap-2 text-sm font-semibold hover:text-brand-accent transition-colors text-left">
      <Phone className="w-4 h-4 lg:hidden" />
      <span>Contact</span>
    </button>
  </>
);

export default function Navbar({ onSearch }: NavbarProps) {
  const [searchValue, setSearchValue] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

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
      <nav className="h-16 border-b border-brand-border flex items-center justify-between px-4 md:px-10 bg-white sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-2 lg:gap-4">
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

          <Link to="/" className="logo font-display font-bold text-lg md:text-2xl text-brand-accent tracking-tighter whitespace-nowrap">
            Raj Kirana Store
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
          <Link 
            to="/admin" 
            onClick={() => setIsMenuOpen(false)}
            className="flex items-center gap-2 p-2 px-3 md:px-4 hover:bg-brand-accent hover:text-white rounded-md transition-all text-brand-muted border border-brand-border lg:border-none"
          >
            <UserIcon className="w-5 h-5" />
            <span className="text-xs font-bold hidden md:inline">Admin</span>
          </Link>
        </div>

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
                <div className="pt-6 border-t border-brand-border">
                  <Link 
                    to="/admin" 
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-3 w-full bg-brand-accent text-white p-4 rounded-xl font-bold text-sm shadow-lg justify-center active:scale-95 transition-transform"
                  >
                    <UserIcon className="w-5 h-5" />
                    Admin Portal
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Mobile/Tablet Search Bar - Visible below navbar on smaller screens */}
      {!isSubPage && (
        <div className="lg:hidden bg-white border-b border-brand-border p-3 px-4 md:px-10 sticky top-16 z-40 animate-fade-in">
          <SearchBar value={searchValue} onChange={handleSearchChange} onSubmit={handleSearchSubmit} />
        </div>
      )}
    </>
  );
}
