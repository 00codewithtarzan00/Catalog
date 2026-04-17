import React, { useState, useEffect, useRef } from 'react';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { StoreConfig } from '../../types';
import { Save, Image as ImageIcon, Type, Upload } from 'lucide-react';

export default function SettingsManager() {
  const [config, setConfig] = useState<StoreConfig>({
    logoUrl: '',
    heroImageUrl: '',
    heroSlogan: '',
    aboutText: ''
  });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const logoFileRef = useRef<HTMLInputElement>(null);
  const heroFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return onSnapshot(doc(db, 'config', 'global'), (snap) => {
      if (snap.exists()) setConfig(snap.data() as StoreConfig);
    });
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'logoUrl' | 'heroImageUrl') => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 800000) { // Limit to ~800KB for Base64 Firestore friendliness
        alert("File is too large. Please select an image smaller than 800KB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setConfig(prev => ({ ...prev, [field]: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSaved(false);
    try {
      await setDoc(doc(db, 'config', 'global'), config);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'config/global');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <header className="mb-8 border-b border-brand-border pb-4">
        <h1 className="text-3xl font-display font-bold text-brand-accent">Global Settings</h1>
        <p className="text-sm text-brand-muted mt-1">Customize your storefront branding and message.</p>
      </header>

      <form onSubmit={handleSave} className="bg-white editorial-card overflow-hidden max-w-2xl">
        <div className="p-8 space-y-6">
          <div className="space-y-6">
            <h3 className="text-xs uppercase font-bold tracking-widest text-brand-muted mb-4 border-b pb-1">
              Store Branding
            </h3>
            
            <div className="space-y-3">
              <label className="text-xs font-bold flex items-center gap-2">
                <ImageIcon className="w-3.5 h-3.5" /> Logo Appearance
              </label>
              <div className="flex gap-4 items-end">
                <div className="flex-1 space-y-1">
                  <span className="text-[10px] text-gray-400">URL path or Upload File</span>
                  <input
                    className="editorial-input"
                    placeholder="https://..."
                    value={config.logoUrl || ''}
                    onChange={e => setConfig({ ...config, logoUrl: e.target.value })}
                  />
                </div>
                <button 
                  type="button" 
                  onClick={() => logoFileRef.current?.click()}
                  className="editorial-btn-secondary p-2.5 flex items-center justify-center gap-2"
                >
                  <Upload className="w-4 h-4" /> <span className="text-xs hidden md:inline">Upload</span>
                </button>
                <input 
                  type="file" 
                  ref={logoFileRef} 
                  className="hidden" 
                  accept="image/*" 
                  onChange={(e) => handleFileUpload(e, 'logoUrl')} 
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold flex items-center gap-2">
                <ImageIcon className="w-3.5 h-3.5" /> Hero Background Image
              </label>
              <div className="flex gap-4 items-end">
                <div className="flex-1 space-y-1">
                  <span className="text-[10px] text-gray-400">URL path or Upload File</span>
                  <input
                    className="editorial-input"
                    placeholder="https://images.unsplash.com/..."
                    value={config.heroImageUrl || ''}
                    onChange={e => setConfig({ ...config, heroImageUrl: e.target.value })}
                  />
                </div>
                <button 
                  type="button" 
                  onClick={() => heroFileRef.current?.click()}
                  className="editorial-btn-secondary p-2.5 flex items-center justify-center gap-2"
                >
                  <Upload className="w-4 h-4" /> <span className="text-xs hidden md:inline">Upload</span>
                </button>
                <input 
                  type="file" 
                  ref={heroFileRef} 
                  className="hidden" 
                  accept="image/*" 
                  onChange={(e) => handleFileUpload(e, 'heroImageUrl')} 
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold flex items-center gap-2">
                <Type className="w-3.5 h-3.5" /> Hero Slogan
              </label>
              <input
                className="editorial-input"
                placeholder="Quality You Trust, Freshness You Deserve"
                value={config.heroSlogan || ''}
                onChange={e => setConfig({ ...config, heroSlogan: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-dashed border-brand-border">
            <h3 className="text-xs uppercase font-bold tracking-widest text-brand-muted mb-4 border-b pb-1">
              Content Areas
            </h3>

            <div className="space-y-2">
              <label className="text-xs font-bold flex items-center gap-2">
                <Type className="w-3.5 h-3.5" /> About Store Teaser
              </label>
              <textarea
                className="editorial-input min-h-[100px]"
                placeholder="Tell customers about your stores history or quality promise..."
                value={config.aboutText || ''}
                onChange={e => setConfig({ ...config, aboutText: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div className="bg-gray-50 p-6 flex items-center justify-between border-t">
          <p className="text-[10px] text-gray-400 italic max-w-[200px]">
            Images uploaded as files are converted to Base64 (Limit 800KB).
          </p>
          <button
            type="submit"
            disabled={loading}
            className={`flex items-center gap-2 editorial-btn-primary ${saved ? 'bg-green-600' : ''}`}
          >
            <Save className="w-4 h-4" />
            {loading ? 'Saving...' : saved ? 'Settings Saved!' : 'Save Store Config'}
          </button>
        </div>
      </form>
    </div>
  );
}
