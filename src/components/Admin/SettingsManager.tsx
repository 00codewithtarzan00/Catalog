import React, { useState, useEffect, useRef } from 'react';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { StoreConfig } from '../../types';
import { Save, Image as ImageIcon, Type, Upload, ChevronDown, ChevronUp } from 'lucide-react';
import { CATEGORIES } from '../../constants';

export default function SettingsManager() {
  const [config, setConfig] = useState<StoreConfig>({
    logoUrl: '',
    heroImageUrl: '',
    heroSlogan: '',
    aboutText: '',
    categoryImages: {}
  });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showCategorySettings, setShowCategorySettings] = useState(false);
  
  const logoFileRef = useRef<HTMLInputElement>(null);
  const heroFileRef = useRef<HTMLInputElement>(null);
  const categoryFileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    return onSnapshot(doc(db, 'config', 'global'), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as StoreConfig;
        setConfig({
          ...data,
          categoryImages: data.categoryImages || {}
        });
      }
    });
  }, []);

  const [uploading, setUploading] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, field: string, isCategory: boolean = false) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1000000) { 
        alert("Image quality is too high! Please use an image smaller than 1MB for fast loading.");
        return;
      }
      
      setUploading(field);
      const reader = new FileReader();
      
      reader.onloadend = () => {
        const result = reader.result as string;
        if (isCategory) {
          setConfig(prev => ({
            ...prev,
            categoryImages: {
              ...(prev.categoryImages || {}),
              [field]: result
            }
          }));
        } else {
          setConfig(prev => ({ ...prev, [field]: result }));
        }
        setUploading(null);
        e.target.value = '';
      };

      reader.onerror = () => {
        alert("Failed to read image file.");
        setUploading(null);
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
            <h3 className="text-xs uppercase font-bold tracking-widest text-brand-muted mb-4 pb-1">
              Store Branding
            </h3>

            <div className="space-y-3">
              <label className="text-xs font-bold flex items-center gap-2">
                <ImageIcon className="w-3.5 h-3.5" /> Logo Appearance
              </label>
              <div className="flex gap-4 items-start">
                {/* Preview Box */}
                <div className="w-12 h-12 bg-gray-50 border border-brand-border rounded flex-shrink-0 overflow-hidden flex items-center justify-center">
                  {config.logoUrl ? (
                    <img src={config.logoUrl} alt="Logo Preview" className="w-full h-full object-contain" />
                  ) : (
                    <ImageIcon className="w-4 h-4 text-gray-300" />
                  )}
                </div>
                
                <div className="flex-1 space-y-1">
                  <div className="flex gap-2">
                    <input
                      className="editorial-input h-10"
                      placeholder="Paste Link or Upload"
                      value={config.logoUrl || ''}
                      onChange={e => setConfig({ ...config, logoUrl: e.target.value })}
                    />
                    <button 
                      type="button" 
                      disabled={uploading === 'logoUrl'}
                      onClick={() => logoFileRef.current?.click()}
                      className="editorial-btn-secondary h-10 px-3 flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
                    >
                      <Upload className={`w-4 h-4 ${uploading === 'logoUrl' ? 'animate-bounce' : ''}`} /> 
                      <span className="text-[10px] hidden md:inline">
                        {uploading === 'logoUrl' ? 'Reading...' : 'Upload'}
                      </span>
                    </button>
                  </div>
                  <input 
                    type="file" 
                    ref={logoFileRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={(e) => handleFileUpload(e, 'logoUrl')} 
                  />
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <label className="text-xs font-bold flex items-center gap-2">
                <ImageIcon className="w-3.5 h-3.5" /> Hero Background
              </label>
              <div className="flex gap-4 items-start">
                {/* Preview Box */}
                <div className="w-12 h-12 bg-gray-50 border border-brand-border rounded flex-shrink-0 overflow-hidden flex items-center justify-center">
                  {config.heroImageUrl ? (
                    <img src={config.heroImageUrl} alt="Bg Preview" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-4 h-4 text-gray-300" />
                  )}
                </div>

                <div className="flex-1 space-y-1">
                  <div className="flex gap-2">
                    <input
                      className="editorial-input h-10"
                      placeholder="Paste Link or Upload"
                      value={config.heroImageUrl || ''}
                      onChange={e => setConfig({ ...config, heroImageUrl: e.target.value })}
                    />
                    <button 
                      type="button" 
                      disabled={uploading === 'heroImageUrl'}
                      onClick={() => heroFileRef.current?.click()}
                      className="editorial-btn-secondary h-10 px-3 flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
                    >
                      <Upload className={`w-4 h-4 ${uploading === 'heroImageUrl' ? 'animate-bounce' : ''}`} /> 
                      <span className="text-[10px] hidden md:inline">
                        {uploading === 'heroImageUrl' ? 'Reading...' : 'Upload'}
                      </span>
                    </button>
                  </div>
                  <input 
                    type="file" 
                    ref={heroFileRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={(e) => handleFileUpload(e, 'heroImageUrl')} 
                  />
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-bold flex items-center gap-2">
                <Type className="w-3.5 h-3.5" /> Slogan
              </label>
              <input
                className="editorial-input"
                placeholder="Quality You Trust, Freshness You Deserve"
                value={config.heroSlogan || ''}
                onChange={e => setConfig({ ...config, heroSlogan: e.target.value })}
              />
              <p className="text-[10px] text-brand-muted leading-tight">
                This slogan appears in the header section of your homepage.
              </p>
            </div>

            {/* Category Images Section */}
            <div className="pt-4 border-t border-brand-border">
              <button 
                type="button"
                onClick={() => setShowCategorySettings(!showCategorySettings)}
                className="flex items-center justify-between w-full py-2 hover:bg-gray-50 transition-colors rounded px-2 -mx-2"
              >
                <h3 className="text-xs uppercase font-bold tracking-widest text-brand-muted flex items-center gap-2">
                  <ImageIcon className="w-3.5 h-3.5" /> Category Icons (Amazon Style)
                </h3>
                {showCategorySettings ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showCategorySettings && (
                <div className="mt-6 space-y-6">
                  {CATEGORIES.map((cat) => (
                    <div key={cat} className="p-4 bg-gray-50 border border-brand-border rounded-lg space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-brand-accent uppercase tracking-tight truncate max-w-[70%]">
                          {cat}
                        </label>
                      </div>
                      
                      <div className="flex gap-4 items-center">
                        <div className="w-16 h-16 bg-white border border-brand-border rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center p-0.5 shadow-sm">
                          {config.categoryImages?.[cat] ? (
                            <img src={config.categoryImages[cat]} alt={cat} className="w-full h-full object-cover rounded-full" />
                          ) : (
                            <div className="text-[10px] text-gray-300 font-bold text-center">No Image</div>
                          )}
                        </div>

                        <div className="flex-1 space-y-2">
                          <div className="flex gap-2">
                            <input
                              className="editorial-input h-9 px-3 text-[11px]"
                              placeholder="Image URL"
                              value={config.categoryImages?.[cat] || ''}
                              onChange={e => setConfig(prev => ({
                                ...prev,
                                categoryImages: {
                                  ...(prev.categoryImages || {}),
                                  [cat]: e.target.value
                                }
                              }))}
                            />
                            <button 
                              type="button"
                              onClick={() => categoryFileRefs.current[cat]?.click()}
                              disabled={uploading === cat}
                              className="editorial-btn-secondary h-9 px-3 flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
                            >
                              <Upload className={`w-3.5 h-3.5 ${uploading === cat ? 'animate-bounce' : ''}`} />
                            </button>
                          </div>
                          <input 
                            type="file" 
                            ref={el => { categoryFileRefs.current[cat] = el; }}
                            className="hidden" 
                            accept="image/*" 
                            onChange={(e) => handleFileUpload(e, cat, true)} 
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-gray-50 p-6 flex items-center justify-end border-t">
          <button
            type="submit"
            disabled={loading || uploading !== null}
            className={`flex items-center gap-2 editorial-btn-primary ${saved ? 'bg-blue-600' : ''} disabled:opacity-50`}
          >
            <Save className="w-4 h-4" />
            {loading ? 'Saving...' : uploading ? 'Wait for upload...' : saved ? 'Updated' : 'Update'}
          </button>
        </div>
      </form>
    </div>
  );
}
