import React, { useState, useEffect, useRef } from 'react';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { StoreConfig } from '../../types';
import { Save, Image as ImageIcon, Type, Upload, ChevronDown, ChevronUp, Video } from 'lucide-react';
import { CATEGORIES } from '../../constants';
import { compressImage } from '../../lib/utils';

export default function SettingsManager() {
  const [config, setConfig] = useState<StoreConfig>({
    logoUrl: '',
    heroImageUrl: '',
    aboutText: '',
    categoryImages: {},
    allCategoriesImageUrl: '',
    bannerType: 'none',
    bannerUrl: ''
  });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showCategorySettings, setShowCategorySettings] = useState(false);
  
  const logoFileRef = useRef<HTMLInputElement>(null);
  const heroFileRef = useRef<HTMLInputElement>(null);
  const bannerFileRef = useRef<HTMLInputElement>(null);
  const allCatFileRef = useRef<HTMLInputElement>(null);
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
      setUploading(field);

      const processResult = (result: string) => {
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

      if (file.size > 1024 * 1024) { // More than 1MB
        compressImage(file)
          .then(compressedUrl => {
            processResult(compressedUrl);
          })
          .catch(() => {
            const reader = new FileReader();
            reader.onloadend = () => {
              processResult(reader.result as string);
            };
            reader.onerror = () => {
              alert("Failed to read file.");
              setUploading(null);
            };
            reader.readAsDataURL(file);
          });
      } else {
        const reader = new FileReader();
        reader.onloadend = () => {
          processResult(reader.result as string);
        };
        reader.onerror = () => {
          alert("Failed to read file.");
          setUploading(null);
        };
        reader.readAsDataURL(file);
      }
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
            
            <div className="space-y-3 pt-2">
              <label className="text-xs font-bold flex items-center gap-2">
                <ImageIcon className="w-3.5 h-3.5" /> Home Page Background
              </label>
              <div className="flex gap-4 items-start">
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
                      placeholder="Background Image URL"
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
                  <p className="text-[10px] text-brand-muted italic leading-none">
                    This image will appear blurred behind the category filters.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-brand-border">
              <label className="text-xs font-bold flex items-center gap-2 text-brand-accent">
                <Video className="w-4 h-4" /> Home Page Banner (Image/Video)
              </label>
              <div className="space-y-3">
                <div className="flex gap-4 items-center">
                  <span className="text-[11px] font-bold text-gray-500 uppercase">Banner Mode:</span>
                  <div className="flex gap-2">
                    {(['none', 'image', 'video'] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setConfig({ ...config, bannerType: mode })}
                        className={`px-3 py-1.5 rounded text-xs font-bold uppercase transition-all ${
                          (config.bannerType || 'none') === mode
                            ? 'bg-brand-accent text-white shadow-sm'
                            : 'bg-gray-100 hover:bg-gray-200 text-brand-muted'
                        }`}
                      >
                        {mode === 'none' ? 'No Banner' : mode === 'image' ? 'Image' : 'Video'}
                      </button>
                    ))}
                  </div>
                </div>

                {(config.bannerType && config.bannerType !== 'none') && (
                  <div className="flex gap-4 items-start pt-2">
                    {/* Preview Box */}
                    <div className="w-16 h-12 bg-gray-50 border border-brand-border rounded flex-shrink-0 overflow-hidden flex items-center justify-center">
                      {config.bannerUrl ? (
                        config.bannerType === 'image' ? (
                          <img src={config.bannerUrl} alt="Banner Preview" className="w-full h-full object-cover" />
                        ) : (
                          <video src={config.bannerUrl} muted loop autoPlay className="w-full h-full object-cover" />
                        )
                      ) : (
                        <div className="text-[10px] text-gray-300 font-bold uppercase">No Media</div>
                      )}
                    </div>

                    <div className="flex-1 space-y-1">
                      <div className="flex gap-2">
                        <input
                          className="editorial-input h-10"
                          placeholder={config.bannerType === 'image' ? "Banner Image URL or Base64" : "Direct Video Link (e.g. mp4, webm) or Base64"}
                          value={config.bannerUrl || ''}
                          onChange={e => setConfig({ ...config, bannerUrl: e.target.value })}
                        />
                        <button
                          type="button"
                          disabled={uploading === 'bannerUrl'}
                          onClick={() => bannerFileRef.current?.click()}
                          className="editorial-btn-secondary h-10 px-3 flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
                        >
                          <Upload className={`w-4 h-4 ${uploading === 'bannerUrl' ? 'animate-bounce' : ''}`} />
                          <span className="text-[10px] hidden md:inline">
                            {uploading === 'bannerUrl' ? 'Reading...' : 'Upload'}
                          </span>
                        </button>
                      </div>
                      <input
                        type="file"
                        ref={bannerFileRef}
                        className="hidden"
                        accept={config.bannerType === 'image' ? "image/*" : "video/*"}
                        onChange={(e) => handleFileUpload(e, 'bannerUrl')}
                      />
                      <p className="text-[10px] text-brand-muted italic leading-tight">
                        {config.bannerType === 'image' 
                          ? "Upload an image of aspect ratio (approx. 3:1 or wide) for best look." 
                          : "Upload a highly compressed video (<1MB) or paste an online mp4/webm direct URL."}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="pt-4 border-t border-brand-border">
              <button 
                type="button"
                onClick={() => setShowCategorySettings(!showCategorySettings)}
                className="flex items-center justify-between w-full py-2 hover:bg-gray-50 transition-colors rounded px-2 -mx-2"
              >
                <h3 className="text-xs uppercase font-bold tracking-widest text-brand-muted flex items-center gap-2">
                  <ImageIcon className="w-3.5 h-3.5" /> Category Icons
                </h3>
                {showCategorySettings ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showCategorySettings && (
                <div className="mt-6 space-y-6">
                  {/* All Items Category */}
                  <div className="p-4 bg-brand-accent/5 border border-brand-accent/20 rounded-lg space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-brand-accent uppercase tracking-tight">
                        All Items (Sab Saaman)
                      </label>
                    </div>
                    
                    <div className="flex gap-4 items-center">
                      <div className="w-16 h-16 bg-white border border-brand-accent rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center p-0.5 shadow-sm">
                        {config.allCategoriesImageUrl ? (
                          <img src={config.allCategoriesImageUrl} alt="All Items" className="w-full h-full object-cover rounded-full" />
                        ) : (
                          <div className="text-[10px] text-gray-300 font-bold text-center">No Image</div>
                        )}
                      </div>

                      <div className="flex-1 space-y-2">
                        <div className="flex gap-2">
                          <input
                            className="editorial-input h-9 px-3 text-[11px]"
                            placeholder="Image URL"
                            value={config.allCategoriesImageUrl || ''}
                            onChange={e => setConfig(prev => ({ ...prev, allCategoriesImageUrl: e.target.value }))}
                          />
                          <button 
                            type="button"
                            onClick={() => allCatFileRef.current?.click()}
                            disabled={uploading === 'allCategoriesImageUrl'}
                            className="editorial-btn-secondary h-9 px-3 flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
                          >
                            <Upload className={`w-3.5 h-3.5 ${uploading === 'allCategoriesImageUrl' ? 'animate-bounce' : ''}`} />
                          </button>
                        </div>
                        <input 
                          type="file" 
                          ref={allCatFileRef}
                          className="hidden" 
                          accept="image/*" 
                          onChange={(e) => handleFileUpload(e, 'allCategoriesImageUrl')} 
                        />
                      </div>
                    </div>
                  </div>

                  <div className="h-px bg-brand-border my-4" />

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

        <div className="bg-gray-50 p-6 flex items-center justify-end border-t sticky bottom-0 z-10">
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
