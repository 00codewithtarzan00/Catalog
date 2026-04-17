import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Settings, LogOut, Bell } from 'lucide-react';
import ProductManager from './ProductManager';
import SettingsManager from './SettingsManager';
import NoticeManager from './NoticeManager';
import Navbar from '../Home/Navbar';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { StoreConfig } from '../../types';

interface AdminDashboardProps {
  onLogout: () => void;
}

export default function AdminDashboard({ onLogout }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'inventory' | 'settings' | 'notices'>('inventory');
  const [config, setConfig] = useState<StoreConfig>({});
  const navigate = useNavigate();

  useEffect(() => {
    return onSnapshot(doc(db, 'config', 'global'), (snap) => {
      if (snap.exists()) setConfig(snap.data() as StoreConfig);
    });
  }, []);

  const handleLogout = () => {
    onLogout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar onSearch={() => {}} config={config} />
      
      <div className="flex flex-1 flex-col overflow-hidden pb-16 md:pb-20">
        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-10">
          <div className="max-w-5xl mx-auto">
            {activeTab === 'inventory' && <ProductManager />}
            {activeTab === 'notices' && <NoticeManager />}
            {activeTab === 'settings' && <SettingsManager />}
          </div>
        </main>

        {/* Bottom Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 bg-brand-accent text-white flex items-center justify-around p-2 md:p-4 shadow-top z-50">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${activeTab === 'inventory' ? 'bg-white text-brand-accent' : 'text-white/70'}`}
          >
            <Package className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-tighter">Inventory</span>
          </button>
          
          <button
            onClick={() => setActiveTab('notices')}
            className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${activeTab === 'notices' ? 'bg-white text-brand-accent' : 'text-white/70'}`}
          >
            <Bell className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-tighter">Notices</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${activeTab === 'settings' ? 'bg-white text-brand-accent' : 'text-white/70'}`}
          >
            <Settings className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-tighter">Settings</span>
          </button>

          <button
            onClick={handleLogout}
            className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl text-white/70 hover:text-white"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-tighter">Exit</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
