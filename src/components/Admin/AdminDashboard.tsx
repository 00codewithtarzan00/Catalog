import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Settings, LogOut, Bell } from 'lucide-react';
import ProductManager from './ProductManager';
import SettingsManager from './SettingsManager';
import NoticeManager from './NoticeManager';
import Navbar from '../Home/Navbar';

interface AdminDashboardProps {
  onLogout: () => void;
}

export default function AdminDashboard({ onLogout }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'inventory' | 'settings' | 'notices'>('inventory');
  const navigate = useNavigate();

  const handleLogout = () => {
    onLogout();
    navigate('/');
  };

  return (
    <div className="min-h-screens bg-gray-50 flex flex-col h-screen">
      <Navbar onSearch={() => {}} />
      
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-16 md:w-64 bg-brand-accent text-white flex flex-col pt-8">
          <div className="px-4 md:px-8 mb-12 hidden md:block">
            <div className="font-display font-bold text-2xl tracking-tighter">Dashboard</div>
            <p className="text-[10px] uppercase opacity-60 tracking-widest mt-1">Admin Panel</p>
          </div>

          <nav className="flex-1 px-2 md:px-4 space-y-2">
            <button
              onClick={() => setActiveTab('inventory')}
              title="Inventory"
              className={`w-full flex items-center justify-center md:justify-start gap-3 px-3 md:px-4 py-3 rounded-md text-sm font-medium transition-colors ${activeTab === 'inventory' ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}
            >
              <Package className="w-4 h-4" />
              <span className="hidden md:inline">Inventory List</span>
            </button>
            <button
              onClick={() => setActiveTab('notices')}
              title="Notices"
              className={`w-full flex items-center justify-center md:justify-start gap-3 px-3 md:px-4 py-3 rounded-md text-sm font-medium transition-colors ${activeTab === 'notices' ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}
            >
              <Bell className="w-4 h-4" />
              <span className="hidden md:inline">Notices</span>
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              title="Settings"
              className={`w-full flex items-center justify-center md:justify-start gap-3 px-3 md:px-4 py-3 rounded-md text-sm font-medium transition-colors ${activeTab === 'settings' ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}
            >
              <Settings className="w-4 h-4" />
              <span className="hidden md:inline">Global Settings</span>
            </button>
          </nav>

          <div className="p-2 md:p-4 border-t border-white/10">
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="w-full flex items-center justify-center md:justify-start gap-3 px-3 md:px-4 py-3 rounded-md text-sm font-medium text-white/60 hover:bg-white/5 hover:text-white transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden md:inline">Sign Out</span>
            </button>
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-10">
          <div className="max-w-5xl mx-auto">
            {activeTab === 'inventory' && <ProductManager />}
            {activeTab === 'notices' && <NoticeManager />}
            {activeTab === 'settings' && <SettingsManager />}
          </div>
        </main>
      </div>
    </div>
  );
}
