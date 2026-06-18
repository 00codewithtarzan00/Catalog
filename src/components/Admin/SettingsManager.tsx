import React, { useState, useEffect, useRef } from "react";
import { doc, setDoc, onSnapshot, collection, getDocs, updateDoc } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../../firebase";
import { StoreConfig } from "../../types";
import {
  Save,
  Image as ImageIcon,
  Type,
  Upload,
  ChevronDown,
  ChevronUp,
  Video,
  Check,
  Zap,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { CATEGORIES } from "../../constants";
import { compressImage, compressBase64Image } from "../../lib/utils";

interface SettingsInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> {
  value: string;
  onChange: (val: string) => void;
}

const SettingsInput: React.FC<SettingsInputProps> = ({ value, onChange, ...props }) => {
  const [localVal, setLocalVal] = useState(value);

  useEffect(() => {
    setLocalVal(value);
  }, [value]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localVal !== value) {
        onChange(localVal);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [localVal, onChange, value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalVal(e.target.value);
  };

  const handleBlur = () => {
    if (localVal !== value) {
      onChange(localVal);
    }
  };

  return (
    <input
      {...props}
      value={localVal}
      onChange={handleChange}
      onBlur={handleBlur}
    />
  );
};

export default function SettingsManager() {
  const [config, setConfig] = useState<StoreConfig>({
    logoUrl: "",
    heroImageUrl: "",
    aboutText: "",
    categoryImages: {},
    allCategoriesImageUrl: "",
    bannerType: "none",
    bannerUrl: "",
    banner1: {
      type: "none",
      url: "",
      text: "",
      bgColor: "#0047AB",
      textColor: "#ffffff",
    },
    banner2: {
      type: "none",
      url: "",
      text: "",
      bgColor: "#0047AB",
      textColor: "#ffffff",
    },
  });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const logoFileRef = useRef<HTMLInputElement>(null);
  const heroFileRef = useRef<HTMLInputElement>(null);
  const banner1FileRef = useRef<HTMLInputElement>(null);
  const banner2FileRef = useRef<HTMLInputElement>(null);
  const allCatFileRef = useRef<HTMLInputElement>(null);
  const categoryFileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    return onSnapshot(doc(db, "config", "global"), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as StoreConfig;
        setConfig({
          ...data,
          categoryImages: data.categoryImages || {},
          banner1: data.banner1 || {
            type: data.bannerType || "none",
            url: data.bannerUrl || "",
            text: "",
            bgColor: "#0047AB",
            textColor: "#ffffff",
          },
          banner2: data.banner2 || {
            type: "none",
            url: "",
            text: "",
            bgColor: "#0047AB",
            textColor: "#ffffff",
          },
        });
      }
    });
  }, []);

  const [uploading, setUploading] = useState<string | null>(null);
  const [compressionStats, setCompressionStats] = useState<Record<string, { originalSize: string; compressedSize: string; ratio: string }>>({});

  // Database Optimizer States
  const [dbProducts, setDbProducts] = useState<any[]>([]);
  const [scannedItems, setScannedItems] = useState<{
    id: string;
    name: string;
    type: "setting" | "product";
    sizeKB: number;
    rawStr: string;
    meta?: any;
  }[]>([]);
  const [scanStatus, setScanStatus] = useState<"idle" | "scanning" | "done" | "optimizing" | "success">("idle");
  const [optimizerProgress, setOptimizerProgress] = useState(0);
  const [optimizedLog, setOptimizedLog] = useState<{ name: string; oldSize: string; newSize: string }[]>([]);
  const [savingsText, setSavingsText] = useState("");

  const scanDatabaseImages = async () => {
    setScanStatus("scanning");
    try {
      const items: any[] = [];

      // 1. Check StoreConfig logoUrl
      if (config.logoUrl && config.logoUrl.startsWith("data:image/")) {
        const size = (config.logoUrl.length * 0.75) / 1024;
        if (size > 50) {
          items.push({ id: "logoUrl", name: "Store Logo (लोगो)", type: "setting", sizeKB: size, rawStr: config.logoUrl });
        }
      }

      // 2. Check StoreConfig heroImageUrl
      if (config.heroImageUrl && config.heroImageUrl.startsWith("data:image/")) {
        const size = (config.heroImageUrl.length * 0.75) / 1024;
        if (size > 80) {
          items.push({ id: "heroImageUrl", name: "Hero Background (मुख्य बैनर)", type: "setting", sizeKB: size, rawStr: config.heroImageUrl });
        }
      }

      // 3. Check StoreConfig categoryImages
      if (config.categoryImages) {
        Object.entries(config.categoryImages).forEach(([catName, imgUrl]) => {
          if (imgUrl && imgUrl.startsWith("data:image/")) {
            const size = (imgUrl.length * 0.75) / 1024;
            if (size > 60) {
              items.push({ 
                id: `category-${catName}`, 
                name: `Category: ${catName} (श्रेणी चित्र)`, 
                type: "setting", 
                sizeKB: size, 
                rawStr: imgUrl,
                meta: { catName }
              });
            }
          }
        });
      }

      // 4. Check StoreConfig banner1.urls
      if (config.banner1?.urls) {
        config.banner1.urls.forEach((url, idx) => {
          if (url && url.startsWith("data:image/")) {
            const size = (url.length * 0.75) / 1024;
            if (size > 80) {
              items.push({
                id: `banner1-${idx}`,
                name: `Banner 1: Slider Image #${idx + 1} (प्रथम बैनर)`,
                type: "setting",
                sizeKB: size,
                rawStr: url,
                meta: { bannerIdx: idx }
              });
            }
          }
        });
      }

      // 5. Check StoreConfig banner2.urls
      if (config.banner2?.urls) {
        config.banner2.urls.forEach((url, idx) => {
          if (url && url.startsWith("data:image/")) {
            const size = (url.length * 0.75) / 1024;
            if (size > 80) {
              items.push({
                id: `banner2-${idx}`,
                name: `Banner 2: Slider Image #${idx + 1} (द्वितीय बैनर)`,
                type: "setting",
                sizeKB: size,
                rawStr: url,
                meta: { bannerIdx: idx }
              });
            }
          }
        });
      }

      // 6. Fetch products from db and scan
      const prodSnap = await getDocs(collection(db, "products"));
      const prodsList = prodSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      setDbProducts(prodsList);

      prodsList.forEach((prod) => {
        if (prod.imageUrl && prod.imageUrl.startsWith("data:image/")) {
          const size = (prod.imageUrl.length * 0.75) / 1024;
          if (size > 80) {
            items.push({
              id: `product-${prod.id}`,
              name: `Product: ${prod.name} (उत्पाद चित्र)`,
              type: "product",
              sizeKB: size,
              rawStr: prod.imageUrl,
              meta: { prodId: prod.id, prodData: prod }
            });
          }
        }
      });

      setScannedItems(items);
      setScanStatus("done");
    } catch (err) {
      console.error("Database scan failed:", err);
      setScanStatus("idle");
    }
  };

  // Run automatically when config has loaded
  useEffect(() => {
    if (config.logoUrl || config.heroImageUrl) {
      scanDatabaseImages();
    }
  }, [config.logoUrl, config.heroImageUrl]);

  const optimizeDatabaseImages = async () => {
    if (scannedItems.length === 0) return;
    setScanStatus("optimizing");
    setOptimizerProgress(0);
    const logs: typeof optimizedLog = [];
    let originalTotalSize = 0;
    let compressedTotalSize = 0;

    // Create mutable copy of current StoreConfig for consecutive updates
    let updatedConfig = { ...config };

    for (let i = 0; i < scannedItems.length; i++) {
      const item = scannedItems[i];
      originalTotalSize += item.sizeKB;
      try {
        // Determine contextual limits to preserve absolute crisp detail & resolution
        let maxW = 1200;
        let maxH = 1200;
        let qual = 0.82;
        if (item.id === "logoUrl") {
          maxW = 500;
          maxH = 500;
          qual = 0.90;
        } else if (item.id === "heroImageUrl" || item.id.startsWith("banner1-") || item.id.startsWith("banner2-")) {
          maxW = 1600;
          maxH = 700;
          qual = 0.85;
        } else if (item.id.startsWith("category-")) {
          maxW = 600;
          maxH = 600;
          qual = 0.85;
        }

        const compressedUrl = await compressBase64Image(item.rawStr, maxW, maxH, qual);
        const newSizeKB = (compressedUrl.length * 0.75) / 1024;
        compressedTotalSize += newSizeKB;

        logs.push({
          name: item.name,
          oldSize: `${item.sizeKB.toFixed(1)} KB`,
          newSize: `${newSizeKB.toFixed(1)} KB`,
        });

        if (item.type === "setting") {
          if (item.id === "logoUrl") {
            updatedConfig.logoUrl = compressedUrl;
          } else if (item.id === "heroImageUrl") {
            updatedConfig.heroImageUrl = compressedUrl;
          } else if (item.id.startsWith("category-")) {
            const catName = item.meta.catName;
            updatedConfig.categoryImages = {
              ...(updatedConfig.categoryImages || {}),
              [catName]: compressedUrl,
            };
          } else if (item.id.startsWith("banner1-")) {
            const idx = item.meta.bannerIdx;
            if (updatedConfig.banner1?.urls) {
              const updatedUrls = [...updatedConfig.banner1.urls];
              updatedUrls[idx] = compressedUrl;
              updatedConfig.banner1 = {
                ...updatedConfig.banner1,
                urls: updatedUrls,
              };
            }
          } else if (item.id.startsWith("banner2-")) {
            const idx = item.meta.bannerIdx;
            if (updatedConfig.banner2?.urls) {
              const updatedUrls = [...updatedConfig.banner2.urls];
              updatedUrls[idx] = compressedUrl;
              updatedConfig.banner2 = {
                ...updatedConfig.banner2,
                urls: updatedUrls,
              };
            }
          }
        } else if (item.type === "product") {
          const prodId = item.meta.prodId;
          const prodData = item.meta.prodData;
          await updateDoc(doc(db, "products", prodId), {
            ...prodData,
            imageUrl: compressedUrl
          });
        }
      } catch (err) {
        console.error(`Optimization failed for ${item.name}:`, err);
        compressedTotalSize += item.sizeKB;
      }

      setOptimizerProgress(Math.round(((i + 1) / scannedItems.length) * 100));
      await new Promise((resolve) => setTimeout(resolve, 60));
    }

    // Save final optimized config to settings collection
    try {
      await setDoc(doc(db, "config", "global"), updatedConfig);
      setConfig(updatedConfig);
    } catch (err) {
      console.error("Failed to save final optimized settings config:", err);
    }

    const savedMB = ((originalTotalSize - compressedTotalSize) / 1024).toFixed(2);
    const savingsPercent = Math.round((1 - (compressedTotalSize / originalTotalSize)) * 100);
    setSavingsText(`Successfully saved ${savedMB} MB of database space! Settings edits will now save instantly.`);
    setOptimizedLog(logs);
    setScanStatus("success");
    setScannedItems([]);
  };

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: string,
    isCategory: boolean = false,
    index?: number,
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const uploadKey = index !== undefined ? `${field}-${index}` : field;
      setUploading(uploadKey);

      const originalSizeKB = file.size / 1024;

      const processResult = (result: string) => {
        if (isCategory) {
          setConfig((prev) => ({
            ...prev,
            categoryImages: {
              ...(prev.categoryImages || {}),
              [field]: result,
            },
          }));
        } else if (field === "banner1") {
          setConfig((prev) => {
            const b1 = prev.banner1 || {
              type: "none",
              url: "",
              text: "",
              bgColor: "#0047AB",
              textColor: "#ffffff",
            };
            if (index !== undefined) {
              const currentUrls = [...(b1.urls || (b1.url ? [b1.url] : []))];
              currentUrls[index] = result;
              return {
                ...prev,
                banner1: {
                  ...b1,
                  urls: currentUrls,
                  url: currentUrls[0] || "",
                },
              };
            } else {
              return {
                ...prev,
                banner1: {
                  ...b1,
                  url: result,
                  urls: b1.urls ? [result, ...b1.urls.slice(1)] : [result],
                },
              };
            }
          });
        } else if (field === "banner2") {
          setConfig((prev) => {
            const b2 = prev.banner2 || {
              type: "none",
              url: "",
              text: "",
              bgColor: "#0047AB",
              textColor: "#ffffff",
            };
            if (index !== undefined) {
              const currentUrls = [...(b2.urls || (b2.url ? [b2.url] : []))];
              currentUrls[index] = result;
              return {
                ...prev,
                banner2: {
                  ...b2,
                  urls: currentUrls,
                  url: currentUrls[0] || "",
                },
              };
            } else {
              return {
                ...prev,
                banner2: {
                  ...b2,
                  url: result,
                  urls: b2.urls ? [result, ...b2.urls.slice(1)] : [result],
                },
              };
            }
          });
        } else {
          setConfig((prev) => ({ ...prev, [field]: result }));
        }
        setUploading(null);
        e.target.value = "";
      };

      if (file.type.startsWith("image/")) {
        // Dynamic adaptive compression rule based on upload context - Upgraded for Premium High-Definition Quality
        let maxW = 1200;
        let maxH = 1200;
        let quality = 0.85;

        if (field === "logoUrl") {
          maxW = 500;
          maxH = 500;
          quality = 0.90; // Extremely high quality for crisp details on critical branding elements
        } else if (field === "heroImageUrl" || field === "banner1" || field === "banner2") {
          maxW = 1600;
          maxH = 700;
          quality = 0.85; // Wider widescreen dimensions for banner slides to look perfect on Retina & 4K displays
        } else if (isCategory) {
          maxW = 600;
          maxH = 600;
          quality = 0.85; // Beautifully optimized high-resolution thumbnail images for category navigation
        }

        compressImage(file, maxW, maxH, quality)
          .then((compressedUrl) => {
            processResult(compressedUrl);
            const compressedSizeKB = (compressedUrl.length * 0.75) / 1024;
            const savingsPercent = Math.max(0, Math.round((1 - (compressedSizeKB / originalSizeKB)) * 100));
            setCompressionStats((prev) => ({
              ...prev,
              [uploadKey]: {
                originalSize: originalSizeKB < 1024 ? `${originalSizeKB.toFixed(1)} KB` : `${(originalSizeKB/1024).toFixed(2)} MB`,
                compressedSize: `${compressedSizeKB.toFixed(1)} KB`,
                ratio: `${savingsPercent}%`,
              },
            }));
          })
          .catch(() => {
            const reader = new FileReader();
            reader.onloadend = () => {
              processResult(reader.result as string);
              setCompressionStats((prev) => {
                const copy = { ...prev };
                delete copy[uploadKey];
                return copy;
              });
            };
            reader.onerror = () => {
              alert("Failed to read file.");
              setUploading(null);
            };
            reader.readAsDataURL(file);
          });
      } else {
        // For video files or other media, prevent crashing Firestore due to 1MB document size limit
        if (file.size > 1024 * 1024) {
          alert("Video files must be under 1MB to fit within Firestore limits.");
          setUploading(null);
          return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
          processResult(reader.result as string);
          setCompressionStats((prev) => {
            const copy = { ...prev };
            delete copy[uploadKey];
            return copy;
          });
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
      await setDoc(doc(db, "config", "global"), config);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "config/global");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <header className="mb-8 border-b border-brand-border pb-4">
        <h1 className="text-3xl font-display font-bold text-brand-accent">
          Global Settings
        </h1>
        <p className="text-sm text-brand-muted mt-1">
          Customize your storefront branding and message.
        </p>
      </header>

      {/* ⚠️ Database Speed & Image Optimizer Panel */}
      <div className="mb-8 bg-slate-50 border border-slate-200 rounded-xl p-6 max-w-2xl animate-fade-in shadow-sm">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
            <Zap className="w-6 h-6 animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold font-display text-slate-900 flex items-center gap-2">
              डेटाबेस स्पीड और इमेज ऑप्टिमाइज़र (Database Optimizer)
            </h2>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              पुराने भारी और बिना कंप्रेस किए हुए चित्र वेबसाइट को लोड होने में बहुत अधिक समय लगवाते हैं और सेटिंग्स को सेव/अपडेट होने में बहुत धीमा कर देते हैं। इस यूटिलिटी की मदद से आप उन्हें एक क्लिक में ऑटो-ऑप्टिमाइज़ कर सकते हैं!
            </p>

            {scanStatus === "scanning" && (
              <div className="mt-4 flex items-center gap-3 text-sm text-slate-500 font-medium">
                <RefreshCw className="w-4 h-4 animate-spin text-indigo-500" />
                <span>डेटाबेस इमेज स्कैन की जा रही हैं... (Scanning database...)</span>
              </div>
            )}

            {scanStatus === "done" && (
              <div className="mt-4 space-y-3">
                {scannedItems.length === 0 ? (
                  <div className="bg-emerald-50 border border-emerald-100 p-3.5 rounded-lg flex items-center gap-2.5 text-emerald-800 text-xs font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>✨ बेहतरीन! कोई भारी इमेज नहीं मिली। आपका डेटाबेस पूरी तरह से ऑप्टिमाइज़्ड और सुपर-फ़ास्ट है!</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="bg-amber-50 border border-amber-100 p-3.5 rounded-lg flex items-start gap-3 text-amber-800 text-xs">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500 mt-0.5" />
                      <div>
                        <p className="font-bold">
                          {scannedItems.length} भारी / अनकंप्रेस्ड इमेज मिलीं! (Heavy images detected)
                        </p>
                        <p className="mt-1 opacity-90">
                          कुल आकार: <strong>{(scannedItems.reduce((acc, curr) => acc + curr.sizeKB, 0) / 1024).toFixed(2)} MB</strong>. 
                          ये इमेज आपके सेटिंग मैनेजर को धीमा कर रही हैं। कृपया नीचे बटन दबाकर इन्हें ऑप्टिमाइज़ करें:
                        </p>
                      </div>
                    </div>

                    {/* Expandable list of heavy items */}
                    <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-lg bg-white p-2.5 space-y-1.5 divide-y divide-slate-100">
                      {scannedItems.map((item) => (
                        <div key={item.id} className="flex items-center justify-between text-[11px] text-slate-600 pt-1.5 first:pt-0">
                          <span className="font-mono truncate max-w-[70%]">{item.name}</span>
                          <span className="text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded font-bold font-mono">
                            {item.sizeKB < 1024 ? `${item.sizeKB.toFixed(1)} KB` : `${(item.sizeKB / 1024).toFixed(1)} MB`}
                          </span>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={optimizeDatabaseImages}
                      className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs px-4 py-2.5 rounded-md shadow-sm transition"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      अभी ऑटो-ऑप्टिमाइज़ और कंप्रेस करें (Optimize & Compress Now)
                    </button>
                  </div>
                )}
              </div>
            )}

            {scanStatus === "optimizing" && (
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-xs font-bold text-slate-700 font-mono">
                  <span>इमेज कंप्रेशन जारी है... (Compressing in progress)</span>
                  <span>{optimizerProgress}%</span>
                </div>
                <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-indigo-600 h-full transition-all duration-300 rounded-full" 
                    style={{ width: `${optimizerProgress}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-400 italic">
                  डेटाबेस को अपडेट किया जा रहा है, कृपया ब्राउज़र बंद न करें...
                </p>
              </div>
            )}

            {scanStatus === "success" && (
              <div className="mt-4 space-y-3">
                <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-lg text-emerald-800 text-xs space-y-2">
                  <p className="font-bold flex items-center gap-2 text-sm">
                    <span className="flex items-center justify-center w-5 h-5 bg-emerald-500 text-white rounded-full text-[10px]">✓</span>
                    इमेज ऑप्टिमाइज़ेशन सफलतापूर्वक पूरा हुआ! (Successfully Completed!)
                  </p>
                  <p>{savingsText}</p>
                </div>

                <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-lg bg-white p-2.5 space-y-1 text-[10px] text-slate-500 font-mono divide-y divide-slate-100">
                  <div className="font-bold text-slate-700 pb-1 flex justify-between">
                    <span>आइटम का नाम</span>
                    <span>आकार बदलाव (Size Saved)</span>
                  </div>
                  {optimizedLog.map((log, idx) => (
                    <div key={idx} className="flex justify-between py-1">
                      <span className="truncate max-w-[60%]">{log.name}</span>
                      <span>{log.oldSize} → <strong className="text-emerald-600">{log.newSize}</strong></span>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={scanDatabaseImages}
                  className="inline-flex items-center gap-1.5 border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs px-3.5 py-2 rounded font-medium transition"
                >
                  <RefreshCw className="w-3 h-3" />
                  फिर से स्कैन करें (Scan Again)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <form
        onSubmit={handleSave}
        className="bg-white editorial-card overflow-hidden max-w-2xl"
      >
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
                    <img
                      src={config.logoUrl}
                      alt="Logo Preview"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <ImageIcon className="w-4 h-4 text-gray-300" />
                  )}
                </div>

                <div className="flex-1 space-y-1">
                  <div className="flex gap-2">
                    <SettingsInput
                      className="editorial-input h-10"
                      placeholder="Paste Link or Upload"
                      value={config.logoUrl || ""}
                      onChange={(val) =>
                        setConfig({ ...config, logoUrl: val })
                      }
                    />
                    <button
                      type="button"
                      disabled={uploading === "logoUrl"}
                      onClick={() => logoFileRef.current?.click()}
                      className="editorial-btn-secondary h-10 px-3 flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
                    >
                      <Upload
                        className={`w-4 h-4 ${uploading === "logoUrl" ? "animate-bounce" : ""}`}
                      />
                      <span className="text-[10px] hidden md:inline">
                        {uploading === "logoUrl" ? "Reading..." : "Upload"}
                      </span>
                    </button>
                  </div>
                  <input
                    type="file"
                    ref={logoFileRef}
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, "logoUrl")}
                  />
                  {compressionStats["logoUrl"] && (
                    <p className="text-[9px] text-emerald-600 bg-emerald-50 border border-emerald-100/80 px-2.5 py-1.5 rounded-md flex items-center gap-1.5 mt-1 font-mono tracking-tight animate-fade-in w-fit">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Auto-Optimized: <strong>{compressionStats["logoUrl"].ratio} smaller</strong> ({compressionStats["logoUrl"].originalSize} → {compressionStats["logoUrl"].compressedSize})
                    </p>
                  )}
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
                    <img
                      src={config.heroImageUrl}
                      alt="Bg Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ImageIcon className="w-4 h-4 text-gray-300" />
                  )}
                </div>

                <div className="flex-1 space-y-1">
                  <div className="flex gap-2">
                    <SettingsInput
                      className="editorial-input h-10"
                      placeholder="Background Image URL"
                      value={config.heroImageUrl || ""}
                      onChange={(val) =>
                        setConfig({ ...config, heroImageUrl: val })
                      }
                    />
                    <button
                      type="button"
                      disabled={uploading === "heroImageUrl"}
                      onClick={() => heroFileRef.current?.click()}
                      className="editorial-btn-secondary h-10 px-3 flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
                    >
                      <Upload
                        className={`w-4 h-4 ${uploading === "heroImageUrl" ? "animate-bounce" : ""}`}
                      />
                      <span className="text-[10px] hidden md:inline">
                        {uploading === "heroImageUrl" ? "Reading..." : "Upload"}
                      </span>
                    </button>
                  </div>
                  <input
                    type="file"
                    ref={heroFileRef}
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, "heroImageUrl")}
                  />
                  {compressionStats["heroImageUrl"] && (
                    <p className="text-[9px] text-emerald-600 bg-emerald-50 border border-emerald-100/80 px-2.5 py-1.5 rounded-md flex items-center gap-1.5 mt-1 font-mono tracking-tight animate-fade-in w-fit">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Auto-Optimized: <strong>{compressionStats["heroImageUrl"].ratio} smaller</strong> ({compressionStats["heroImageUrl"].originalSize} → {compressionStats["heroImageUrl"].compressedSize})
                    </p>
                  )}
                  <p className="text-[10px] text-brand-muted italic leading-none">
                    This image will appear blurred behind the category filters.
                  </p>
                </div>
              </div>
            </div>

            {/* Banner 1 (Top Banner) */}
            <div className="space-y-4 pt-4 border-t border-brand-border">
              <label className="text-sm font-bold flex items-center gap-2 text-brand-accent">
                <Video className="w-4 h-4" /> Banner 1 (Top Banner - Above
                Categories)
              </label>
              <div className="space-y-3 bg-gray-55/55 p-4 border border-brand-border rounded">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <span className="text-[10px] font-bold text-gray-500 uppercase">
                    Banner Mode:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {(["none", "image", "video", "text"] as const).map(
                      (mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() =>
                            setConfig({
                              ...config,
                              banner1: {
                                ...(config.banner1 || { type: "none" }),
                                type: mode,
                              },
                            })
                          }
                          className={`px-2.5 py-1.5 rounded text-[10px] font-bold uppercase transition-all ${
                            (config.banner1?.type || "none") === mode
                              ? "bg-brand-accent text-white shadow-sm"
                              : "bg-white border border-brand-border hover:bg-gray-100 text-brand-muted"
                          }`}
                        >
                          {mode === "none"
                            ? "Disabled"
                            : mode === "image"
                              ? "Image"
                              : mode === "video"
                                ? "Video"
                                : "Text Only"}
                        </button>
                      ),
                    )}
                  </div>
                </div>

                {(config.banner1?.type === "image" ||
                  config.banner1?.type === "video") &&
                  (() => {
                    const items =
                      config.banner1?.urls ||
                      (config.banner1?.url ? [config.banner1.url] : [""]);
                    return (
                      <div className="space-y-3 pt-2 animate-fade-in">
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                          Banner Media List ({items.length} items)
                        </div>

                        {/* Full width preview for Ticked Image */}
                        {items.length > 1 && (
                          <div className="mb-4 overflow-hidden rounded border border-brand-border bg-black relative w-full aspect-[21/9] flex items-center justify-center shadow-sm">
                            {(() => {
                              const selectedIdx = config.banner1?.selectedUrlIdx ?? 0;
                              const selectedUrl = items[selectedIdx] || items[0] || "";
                              return selectedUrl ? (
                                config.banner1?.type === "image" ? (
                                  <img
                                    src={selectedUrl}
                                    alt="Selected Ticked Preview"
                                    className="w-full h-full object-fill select-none"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <video
                                    src={selectedUrl}
                                    muted
                                    loop
                                    autoPlay
                                    className="w-full h-full object-fill"
                                  />
                                )
                              ) : (
                                <div className="text-gray-400 font-mono text-[10px] uppercase font-bold">
                                  Empty Slot
                                </div>
                              );
                            })()}
                            <div className="absolute top-2 left-2 bg-brand-accent/90 backdrop-blur-sm px-2 py-0.5 rounded text-[9px] uppercase tracking-wider font-bold text-white border border-brand-accent/25">
                              Ticked Preview (Full Width)
                            </div>
                          </div>
                        )}

                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                          {items.map((url, idx) => {
                            const uploadKey = `banner1-${idx}`;
                            const isUploading = uploading === uploadKey;
                            const isTicked = (config.banner1?.selectedUrlIdx ?? 0) === idx;
                            return (
                              <div
                                key={idx}
                                className="flex gap-3 items-center bg-gray-55/55 p-2.5 rounded border border-brand-border animate-fade-in"
                              >
                                {/* Checkbox in front of each image */}
                                {items.length > 1 && (
                                  <div className="flex items-center justify-center shrink-0 pr-1">
                                    <input
                                      type="checkbox"
                                      checked={isTicked}
                                      onChange={() => {
                                        setConfig({
                                          ...config,
                                          banner1: {
                                            ...(config.banner1 || { type: "image" }),
                                            selectedUrlIdx: idx,
                                          },
                                        });
                                      }}
                                      className="w-4 h-4 rounded-full border-gray-300 text-brand-accent focus:ring-brand-accent cursor-pointer accent-brand-accent"
                                    />
                                  </div>
                                )}

                                {/* Miniature thumbnail shown only if NOT more than 1 image */}
                                {items.length <= 1 && (
                                  <div className="w-14 h-10 bg-white border border-brand-border rounded flex-shrink-0 overflow-hidden flex items-center justify-center">
                                    {url ? (
                                      config.banner1?.type === "image" ? (
                                        <img
                                          src={url}
                                          alt={`Preview ${idx}`}
                                          className="w-full h-full object-cover"
                                        />
                                      ) : (
                                        <video
                                          src={url}
                                          muted
                                          loop
                                          autoPlay
                                          className="w-full h-full object-cover"
                                        />
                                      )
                                    ) : (
                                      <div className="text-[8px] text-gray-300 font-bold uppercase mt-1">
                                        Empty
                                      </div>
                                    )}
                                  </div>
                                )}

                                <div className="flex-1 space-y-1">
                                  <div className="flex gap-2">
                                    <SettingsInput
                                      className="editorial-input h-8 text-[11px]"
                                      placeholder={
                                        config.banner1?.type === "image"
                                          ? "Image URL or Base64"
                                          : "Video direct URL (mp4)"
                                      }
                                      value={url || ""}
                                      onChange={(val) => {
                                        const newUrls = [...items];
                                        newUrls[idx] = val;
                                        setConfig({
                                          ...config,
                                          banner1: {
                                            ...(config.banner1 || {
                                              type: "image",
                                            }),
                                            urls: newUrls,
                                            url: newUrls[0] || "",
                                          },
                                        });
                                      }}
                                    />

                                    <button
                                      type="button"
                                      disabled={!!uploading}
                                      onClick={() =>
                                        document
                                          .getElementById(
                                            `upload-banner1-${idx}`,
                                          )
                                          ?.click()
                                      }
                                      className="editorial-btn-secondary h-8 px-2 flex items-center justify-center shrink-0 disabled:opacity-50 text-[10px]"
                                      title="Upload file"
                                    >
                                      <Upload
                                        className={`w-3.5 h-3.5 ${isUploading ? "animate-bounce" : ""}`}
                                      />
                                    </button>
                                    <input
                                      type="file"
                                      id={`upload-banner1-${idx}`}
                                      className="hidden"
                                      accept={
                                        config.banner1?.type === "image"
                                          ? "image/*"
                                          : "video/*"
                                      }
                                      onChange={(e) =>
                                        handleFileUpload(
                                          e,
                                          "banner1",
                                          false,
                                          idx,
                                        )
                                      }
                                    />
                                    {compressionStats[uploadKey] && (
                                      <div className="text-[9px] text-emerald-600 bg-emerald-50 border border-emerald-100/80 px-2 py-1 rounded inline-flex items-center gap-1 mt-1 font-mono tracking-tight animate-fade-in w-fit">
                                        ✓ Optimized: <strong>{compressionStats[uploadKey].ratio} smaller</strong> ({compressionStats[uploadKey].originalSize} → {compressionStats[uploadKey].compressedSize})
                                      </div>
                                    )}

                                    <button
                                      type="button"
                                      onClick={() => {
                                        const newUrls = items.filter(
                                          (_, i) => i !== idx,
                                        );
                                        setConfig({
                                          ...config,
                                          banner1: {
                                            ...(config.banner1 || {
                                              type: "image",
                                            }),
                                            urls: newUrls,
                                            url: newUrls[0] || "",
                                          },
                                        });
                                      }}
                                      className="editorial-btn-secondary h-8 px-2 text-red-500 hover:text-red-700 hover:border-red-200 flex items-center justify-center shrink-0 text-[10px]"
                                      title="Remove item"
                                    >
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        strokeWidth={2}
                                        stroke="currentColor"
                                        className="w-3.5 h-3.5"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                                        />
                                      </svg>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            const newUrls = [...items, ""];
                            setConfig({
                              ...config,
                              banner1: {
                                ...(config.banner1 || { type: "image" }),
                                urls: newUrls,
                                url: newUrls[0] || "",
                              },
                            });
                          }}
                          className="w-full py-1.5 border border-dashed border-brand-border hover:border-brand-accent rounded text-[10px] font-bold uppercase tracking-wider text-brand-muted hover:text-brand-accent transition-all flex items-center justify-center gap-1 bg-white"
                        >
                          + Add{" "}
                          {config.banner1?.type === "image" ? "Image" : "Video"}
                        </button>
                      </div>
                    );
                  })()}

                 {config.banner1?.type !== "none" && (
                  <div className="space-y-3 pt-1 animate-fade-in">
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-gray-400">
                          Banner Display Text (Optional/Marquee)
                        </label>
                        <SettingsInput
                          className="editorial-input h-9 text-xs"
                          placeholder="Enter banner ticker or badge text..."
                          value={config.banner1?.text || ""}
                          onChange={(val) =>
                            setConfig({
                              ...config,
                              banner1: {
                                ...(config.banner1 || { type: "none" }),
                                text: val,
                              },
                            })
                          }
                        />
                      </div>
                      
                      {config.banner1?.text && (
                        <div className="grid grid-cols-2 gap-3 pt-1 animate-fade-in">
                          <div className="space-y-1">
                            <label className="text-[9px] uppercase font-bold text-gray-400">
                              Text Color
                            </label>
                            <SettingsInput
                              type="color"
                              className="w-full h-9 rounded border border-brand-border cursor-pointer p-0.5 bg-white shrink-0"
                              value={config.banner1?.textColor || "#ffffff"}
                              onChange={(val) =>
                                setConfig({
                                  ...config,
                                  banner1: {
                                    ...(config.banner1 || { type: "none" }),
                                    textColor: val,
                                  },
                                })
                              }
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] uppercase font-bold text-gray-400">
                              Text Size
                            </label>
                            <select
                              className="editorial-input h-9 text-xs bg-white"
                              value={config.banner1?.textSize || "sm"}
                              onChange={(e) =>
                                setConfig({
                                  ...config,
                                  banner1: {
                                    ...(config.banner1 || { type: "none" }),
                                    textSize: e.target.value,
                                  },
                                })
                              }
                            >
                              <option value="xs">Extra Small (Sabse Chhota)</option>
                              <option value="sm">Small (Chhota - Default)</option>
                              <option value="md">Medium (Medium)</option>
                              <option value="lg">Large (Bada)</option>
                              <option value="xl">Extra Large (Sabse Bada)</option>
                              <option value="2xl">2X Large</option>
                              <option value="3xl">3X Large</option>
                            </select>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-brand-border/45 mt-2">
                      <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-2">
                        Banner 1 Display & Animation Style
                      </div>
                      <div className="space-y-3 bg-white p-2.5 border border-brand-border rounded">
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-brand-dark">
                            Select Animation Style:
                          </label>
                          <select
                            className="editorial-input h-9 text-[11px] bg-white cursor-pointer"
                            value={config.banner1?.style === 'spotlight' ? 'carousel' : (config.banner1?.style || (config.banner1?.enableMarquee !== false ? "marquee" : "carousel"))}
                            onChange={(e) =>
                              setConfig({
                                ...config,
                                banner1: {
                                  ...(config.banner1 || { type: "none" }),
                                  style: e.target.value as any,
                                  enableMarquee: e.target.value === "marquee"
                                },
                              })
                            }
                          >
                            <option value="marquee">Continuous Scroll/Moving Loop (Marquee)</option>
                            <option value="carousel">Standard Carousel (Slide Banner with Arrows & Dots)</option>
                            <option value="grid">Static Grid Showcase (Side-by-side Images)</option>
                          </select>
                        </div>

                        {(config.banner1?.style === "marquee" || (!config.banner1?.style && config.banner1?.enableMarquee !== false)) && (
                          <div className="space-y-3 pt-2 border-t border-dashed border-gray-200">
                            {/* Direction Selection */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-brand-border/45">
                              <span className="text-[11px] font-bold text-brand-dark">
                                Scroll Direction:
                              </span>
                              <div className="flex items-center gap-3">
                                <label className="flex items-center gap-1 cursor-pointer text-[11px] text-brand-dark select-none font-medium">
                                  <input
                                    type="radio"
                                    name="banner1-direction"
                                    value="rtl"
                                    checked={
                                      (config.banner1?.marqueeDirection ||
                                        "rtl") === "rtl"
                                    }
                                    onChange={() =>
                                      setConfig({
                                        ...config,
                                        banner1: {
                                          ...(config.banner1 || { type: "none" }),
                                          marqueeDirection: "rtl",
                                        },
                                      })
                                    }
                                    className="accent-brand-accent h-3.5 w-3.5"
                                  />
                                  Right to Left
                                </label>
                                <label className="flex items-center gap-1 cursor-pointer text-[11px] text-brand-dark select-none font-medium">
                                  <input
                                    type="radio"
                                    name="banner1-direction"
                                    value="ltr"
                                    checked={
                                      config.banner1?.marqueeDirection === "ltr"
                                    }
                                    onChange={() =>
                                      setConfig({
                                        ...config,
                                        banner1: {
                                          ...(config.banner1 || { type: "none" }),
                                          marqueeDirection: "ltr",
                                        },
                                      })
                                    }
                                    className="accent-brand-accent h-3.5 w-3.5"
                                  />
                                  Left to Right
                                </label>
                              </div>
                            </div>

                            {/* Speed input control */}
                            <div className="flex items-center justify-between gap-4">
                              <label className="text-[11px] font-bold text-brand-dark flex flex-col">
                                <span>Scroll Speed (seconds)</span>
                                <span className="text-[9px] text-gray-400 font-normal">
                                  Less seconds = faster scroll. Default: 25.
                                </span>
                              </label>
                              <div className="flex items-center gap-2 w-28 shrink-0">
                                <input
                                  type="number"
                                  min="1"
                                  max="120"
                                  placeholder="25"
                                  className="editorial-input h-8 text-[11px] text-center"
                                  value={config.banner1?.marqueeSpeed ?? ""}
                                  onChange={(e) => {
                                    const val =
                                      e.target.value === ""
                                        ? ""
                                        : Math.max(
                                            1,
                                            parseInt(e.target.value) || 1,
                                          );
                                    setConfig({
                                      ...config,
                                      banner1: {
                                        ...(config.banner1 || { type: "none" }),
                                        marqueeSpeed:
                                          val === "" ? undefined : val,
                                      },
                                    });
                                  }}
                                />
                                <span className="text-[11px] text-brand-muted font-bold">
                                  sec
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {config.banner1?.type === "text" && (
                  <div className="grid grid-cols-2 gap-3 pt-1 animate-fade-in">
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-bold text-gray-400">
                        BG Color
                      </label>
                      <SettingsInput
                        type="color"
                        className="w-full h-8 rounded border border-brand-border cursor-pointer p-0.5 bg-white"
                        value={config.banner1?.bgColor || "#0047AB"}
                        onChange={(val) =>
                          setConfig({
                            ...config,
                            banner1: {
                              ...(config.banner1 || { type: "text" }),
                              bgColor: val,
                            },
                          })
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-bold text-gray-400">
                        Text Color
                      </label>
                      <SettingsInput
                        type="color"
                        className="w-full h-8 rounded border border-brand-border cursor-pointer p-0.5 bg-white"
                        value={config.banner1?.textColor || "#ffffff"}
                        onChange={(val) =>
                          setConfig({
                            ...config,
                            banner1: {
                              ...(config.banner1 || { type: "text" }),
                              textColor: val,
                            },
                          })
                        }
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Banner 2 (Bottom Banner) */}
            <div className="space-y-4 pt-4 border-t border-brand-border">
              <label className="text-sm font-bold flex items-center gap-2 text-brand-accent">
                <Video className="w-4 h-4" /> Banner 2 (Bottom Banner - Below
                Categories)
              </label>
              <div className="space-y-3 bg-gray-55/55 p-4 border border-brand-border rounded">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <span className="text-[10px] font-bold text-gray-500 uppercase">
                    Banner Mode:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {(["none", "image", "video", "text"] as const).map(
                      (mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() =>
                            setConfig({
                              ...config,
                              banner2: {
                                ...(config.banner2 || { type: "none" }),
                                type: mode,
                              },
                            })
                          }
                          className={`px-2.5 py-1.5 rounded text-[10px] font-bold uppercase transition-all ${
                            (config.banner2?.type || "none") === mode
                              ? "bg-brand-accent text-white shadow-sm"
                              : "bg-white border border-brand-border hover:bg-gray-100 text-brand-muted"
                          }`}
                        >
                          {mode === "none"
                            ? "Disabled"
                            : mode === "image"
                              ? "Image"
                              : mode === "video"
                                ? "Video"
                                : "Text Only"}
                        </button>
                      ),
                    )}
                  </div>
                </div>

                {(config.banner2?.type === "image" ||
                  config.banner2?.type === "video") &&
                  (() => {
                    const items =
                      config.banner2?.urls ||
                      (config.banner2?.url ? [config.banner2.url] : [""]);
                    return (
                      <div className="space-y-3 pt-2 animate-fade-in">
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                          Banner Media List ({items.length} items)
                        </div>

                        {/* Full width preview for Ticked Image */}
                        {items.length > 1 && (
                          <div className="mb-4 overflow-hidden rounded border border-brand-border bg-black relative w-full aspect-[21/9] flex items-center justify-center shadow-sm">
                            {(() => {
                              const selectedIdx = config.banner2?.selectedUrlIdx ?? 0;
                              const selectedUrl = items[selectedIdx] || items[0] || "";
                              return selectedUrl ? (
                                config.banner2?.type === "image" ? (
                                  <img
                                    src={selectedUrl}
                                    alt="Selected Ticked Preview"
                                    className="w-full h-full object-fill select-none"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <video
                                    src={selectedUrl}
                                    muted
                                    loop
                                    autoPlay
                                    className="w-full h-full object-fill"
                                  />
                                )
                              ) : (
                                <div className="text-gray-400 font-mono text-[10px] uppercase font-bold">
                                  Empty Slot
                                </div>
                              );
                            })()}
                            <div className="absolute top-2 left-2 bg-brand-accent/90 backdrop-blur-sm px-2 py-0.5 rounded text-[9px] uppercase tracking-wider font-bold text-white border border-brand-accent/25">
                              Ticked Preview (Full Width)
                            </div>
                          </div>
                        )}

                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                          {items.map((url, idx) => {
                            const uploadKey = `banner2-${idx}`;
                            const isUploading = uploading === uploadKey;
                            const isTicked = (config.banner2?.selectedUrlIdx ?? 0) === idx;
                            return (
                              <div
                                key={idx}
                                className="flex gap-3 items-center bg-gray-55/55 p-2.5 rounded border border-brand-border animate-fade-in"
                              >
                                {/* Checkbox in front of each image */}
                                {items.length > 1 && (
                                  <div className="flex items-center justify-center shrink-0 pr-1">
                                    <input
                                      type="checkbox"
                                      checked={isTicked}
                                      onChange={() => {
                                        setConfig({
                                          ...config,
                                          banner2: {
                                            ...(config.banner2 || { type: "image" }),
                                            selectedUrlIdx: idx,
                                          },
                                        });
                                      }}
                                      className="w-4 h-4 rounded-full border-gray-300 text-brand-accent focus:ring-brand-accent cursor-pointer accent-brand-accent"
                                    />
                                  </div>
                                )}

                                {/* Miniature thumbnail shown only if NOT more than 1 image */}
                                {items.length <= 1 && (
                                  <div className="w-14 h-10 bg-white border border-brand-border rounded flex-shrink-0 overflow-hidden flex items-center justify-center">
                                    {url ? (
                                      config.banner2?.type === "image" ? (
                                        <img
                                          src={url}
                                          alt={`Preview ${idx}`}
                                          className="w-full h-full object-cover"
                                        />
                                      ) : (
                                        <video
                                          src={url}
                                          muted
                                          loop
                                          autoPlay
                                          className="w-full h-full object-cover"
                                        />
                                      )
                                    ) : (
                                      <div className="text-[8px] text-gray-300 font-bold uppercase mt-1">
                                        Empty
                                      </div>
                                    )}
                                  </div>
                                )}

                                <div className="flex-1 space-y-1">
                                  <div className="flex gap-2">
                                    <SettingsInput
                                      className="editorial-input h-8 text-[11px]"
                                      placeholder={
                                        config.banner2?.type === "image"
                                          ? "Image URL or Base64"
                                          : "Video direct URL (mp4)"
                                      }
                                      value={url || ""}
                                      onChange={(val) => {
                                        const newUrls = [...items];
                                        newUrls[idx] = val;
                                        setConfig({
                                          ...config,
                                          banner2: {
                                            ...(config.banner2 || {
                                              type: "image",
                                            }),
                                            urls: newUrls,
                                            url: newUrls[0] || "",
                                          },
                                        });
                                      }}
                                    />

                                    <button
                                      type="button"
                                      disabled={!!uploading}
                                      onClick={() =>
                                        document
                                          .getElementById(
                                            `upload-banner2-${idx}`,
                                          )
                                          ?.click()
                                      }
                                      className="editorial-btn-secondary h-8 px-2 flex items-center justify-center shrink-0 disabled:opacity-50 text-[10px]"
                                      title="Upload file"
                                    >
                                      <Upload
                                        className={`w-3.5 h-3.5 ${isUploading ? "animate-bounce" : ""}`}
                                      />
                                    </button>
                                    <input
                                      type="file"
                                      id={`upload-banner2-${idx}`}
                                      className="hidden"
                                      accept={
                                        config.banner2?.type === "image"
                                          ? "image/*"
                                          : "video/*"
                                      }
                                      onChange={(e) =>
                                        handleFileUpload(
                                          e,
                                          "banner2",
                                          false,
                                          idx,
                                        )
                                      }
                                    />
                                    {compressionStats[uploadKey] && (
                                      <div className="text-[9px] text-emerald-600 bg-emerald-50 border border-emerald-100/80 px-2 py-1 rounded inline-flex items-center gap-1 mt-1 font-mono tracking-tight animate-fade-in w-fit">
                                        ✓ Optimized: <strong>{compressionStats[uploadKey].ratio} smaller</strong> ({compressionStats[uploadKey].originalSize} → {compressionStats[uploadKey].compressedSize})
                                      </div>
                                    )}

                                    <button
                                      type="button"
                                      onClick={() => {
                                        const newUrls = items.filter(
                                          (_, i) => i !== idx,
                                        );
                                        setConfig({
                                          ...config,
                                          banner2: {
                                            ...(config.banner2 || {
                                              type: "image",
                                            }),
                                            urls: newUrls,
                                            url: newUrls[0] || "",
                                          },
                                        });
                                      }}
                                      className="editorial-btn-secondary h-8 px-2 text-red-500 hover:text-red-700 hover:border-red-200 flex items-center justify-center shrink-0 text-[10px]"
                                      title="Remove item"
                                    >
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        strokeWidth={2}
                                        stroke="currentColor"
                                        className="w-3.5 h-3.5"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                                        />
                                      </svg>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            const newUrls = [...items, ""];
                            setConfig({
                              ...config,
                              banner2: {
                                ...(config.banner2 || { type: "image" }),
                                urls: newUrls,
                                url: newUrls[0] || "",
                              },
                            });
                          }}
                          className="w-full py-1.5 border border-dashed border-brand-border hover:border-brand-accent rounded text-[10px] font-bold uppercase tracking-wider text-brand-muted hover:text-brand-accent transition-all flex items-center justify-center gap-1 bg-white"
                        >
                          + Add{" "}
                          {config.banner2?.type === "image" ? "Image" : "Video"}
                        </button>
                      </div>
                    );
                  })()}

                 {config.banner2?.type !== "none" && (
                  <div className="space-y-3 pt-1 animate-fade-in">
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-gray-400">
                          Banner Display Text (Optional/Marquee)
                        </label>
                        <SettingsInput
                          className="editorial-input h-9 text-xs"
                          placeholder="Enter banner ticker or badge text..."
                          value={config.banner2?.text || ""}
                          onChange={(val) =>
                            setConfig({
                              ...config,
                              banner2: {
                                ...(config.banner2 || { type: "none" }),
                                text: val,
                              },
                            })
                          }
                        />
                      </div>
                      
                      {config.banner2?.text && (
                        <div className="grid grid-cols-2 gap-3 pt-1 animate-fade-in">
                          <div className="space-y-1">
                            <label className="text-[9px] uppercase font-bold text-gray-450">
                              Text Color
                            </label>
                            <SettingsInput
                              type="color"
                              className="w-full h-9 rounded border border-brand-border cursor-pointer p-0.5 bg-white shrink-0"
                              value={config.banner2?.textColor || "#ffffff"}
                              onChange={(val) =>
                                setConfig({
                                  ...config,
                                  banner2: {
                                    ...(config.banner2 || { type: "none" }),
                                    textColor: val,
                                  },
                                })
                              }
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] uppercase font-bold text-gray-400">
                              Text Size
                            </label>
                            <select
                              className="editorial-input h-9 text-xs bg-white"
                              value={config.banner2?.textSize || "sm"}
                              onChange={(e) =>
                                setConfig({
                                  ...config,
                                  banner2: {
                                    ...(config.banner2 || { type: "none" }),
                                    textSize: e.target.value,
                                  },
                                })
                              }
                            >
                              <option value="xs">Extra Small (Sabse Chhota)</option>
                              <option value="sm">Small (Chhota - Default)</option>
                              <option value="md">Medium (Medium)</option>
                              <option value="lg">Large (Bada)</option>
                              <option value="xl">Extra Large (Sabse Bada)</option>
                              <option value="2xl">2X Large</option>
                              <option value="3xl">3X Large</option>
                            </select>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-brand-border/45 mt-2">
                      <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-2">
                        Banner 2 Display & Animation Style
                      </div>
                      <div className="space-y-3 bg-white p-2.5 border border-brand-border rounded">
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-brand-dark">
                            Select Animation Style:
                          </label>
                           <select
                            className="editorial-input h-9 text-[11px] bg-white cursor-pointer"
                            value={config.banner2?.style === 'spotlight' ? 'carousel' : (config.banner2?.style || (config.banner2?.enableMarquee === true ? "marquee" : "carousel"))}
                            onChange={(e) =>
                              setConfig({
                                ...config,
                                banner2: {
                                  ...(config.banner2 || { type: "none" }),
                                  style: e.target.value as any,
                                  enableMarquee: e.target.value === "marquee"
                                },
                              })
                            }
                          >
                            <option value="marquee">Continuous Scroll/Moving Loop (Marquee)</option>
                            <option value="carousel">Standard Carousel (Slide Banner with Arrows & Dots)</option>
                            <option value="grid">Static Grid Showcase (Side-by-side Images)</option>
                          </select>
                        </div>

                        {(config.banner2?.style === "marquee" || (!config.banner2?.style && config.banner2?.enableMarquee === true)) && (
                          <div className="space-y-3 pt-2 border-t border-dashed border-gray-200">
                            {/* Direction Selection */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-brand-border/45">
                              <span className="text-[11px] font-bold text-brand-dark">
                                Scroll Direction:
                              </span>
                              <div className="flex items-center gap-3">
                                <label className="flex items-center gap-1 cursor-pointer text-[11px] text-brand-dark select-none font-medium">
                                  <input
                                    type="radio"
                                    name="banner2-direction"
                                    value="rtl"
                                    checked={
                                      (config.banner2?.marqueeDirection ||
                                        "rtl") === "rtl"
                                    }
                                    onChange={() =>
                                      setConfig({
                                        ...config,
                                        banner2: {
                                          ...(config.banner2 || { type: "none" }),
                                          marqueeDirection: "rtl",
                                        },
                                      })
                                    }
                                    className="accent-brand-accent h-3.5 w-3.5"
                                  />
                                  Right to Left
                                </label>
                                <label className="flex items-center gap-1 cursor-pointer text-[11px] text-brand-dark select-none font-medium">
                                  <input
                                    type="radio"
                                    name="banner2-direction"
                                    value="ltr"
                                    checked={
                                      config.banner2?.marqueeDirection === "ltr"
                                    }
                                    onChange={() =>
                                      setConfig({
                                        ...config,
                                        banner2: {
                                          ...(config.banner2 || { type: "none" }),
                                          marqueeDirection: "ltr",
                                        },
                                      })
                                    }
                                    className="accent-brand-accent h-3.5 w-3.5"
                                  />
                                  Left to Right
                                </label>
                              </div>
                            </div>

                            {/* Speed input control */}
                            <div className="flex items-center justify-between gap-4">
                              <label className="text-[11px] font-bold text-brand-dark flex flex-col">
                                <span>Scroll Speed (seconds)</span>
                                <span className="text-[9px] text-gray-400 font-normal">
                                  Less seconds = faster scroll. Default: 25.
                                </span>
                              </label>
                              <div className="flex items-center gap-2 w-28 shrink-0">
                                <input
                                  type="number"
                                  min="1"
                                  max="120"
                                  placeholder="25"
                                  className="editorial-input h-8 text-[11px] text-center"
                                  value={config.banner2?.marqueeSpeed ?? ""}
                                  onChange={(e) => {
                                    const val =
                                      e.target.value === ""
                                        ? ""
                                        : Math.max(
                                            1,
                                            parseInt(e.target.value) || 1,
                                          );
                                    setConfig({
                                      ...config,
                                      banner2: {
                                        ...(config.banner2 || { type: "none" }),
                                        marqueeSpeed:
                                          val === "" ? undefined : val,
                                      },
                                    });
                                  }}
                                />
                                <span className="text-[11px] text-brand-muted font-bold">
                                  sec
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {config.banner2?.type === "text" && (
                  <div className="grid grid-cols-2 gap-3 pt-1 animate-fade-in">
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-bold text-gray-400">
                        BG Color
                      </label>
                      <SettingsInput
                        type="color"
                        className="w-full h-8 rounded border border-brand-border cursor-pointer p-0.5 bg-white"
                        value={config.banner2?.bgColor || "#0047AB"}
                        onChange={(val) =>
                          setConfig({
                            ...config,
                            banner2: {
                              ...(config.banner2 || { type: "text" }),
                              bgColor: val,
                            },
                          })
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-bold text-gray-400">
                        Text Color
                      </label>
                      <SettingsInput
                        type="color"
                        className="w-full h-8 rounded border border-brand-border cursor-pointer p-0.5 bg-white"
                        value={config.banner2?.textColor || "#ffffff"}
                        onChange={(val) =>
                          setConfig({
                            ...config,
                            banner2: {
                              ...(config.banner2 || { type: "text" }),
                              textColor: val,
                            },
                          })
                        }
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>



          </div>
        </div>

        <div className="bg-gray-50 p-6 flex items-center justify-end border-t sticky bottom-0 z-10">
          <button
            type="submit"
            disabled={loading || uploading !== null}
            className={`flex items-center gap-2 editorial-btn-primary ${saved ? "bg-blue-600" : ""} disabled:opacity-50`}
          >
            <Save className="w-4 h-4" />
            {loading
              ? "Saving..."
              : uploading
                ? "Wait for upload..."
                : saved
                  ? "Updated"
                  : "Update"}
          </button>
        </div>
      </form>
    </div>
  );
}
