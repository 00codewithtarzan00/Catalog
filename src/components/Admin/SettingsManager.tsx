import React, { useState, useEffect, useRef } from "react";
import { doc, setDoc, onSnapshot } from "firebase/firestore";
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
} from "lucide-react";
import { CATEGORIES } from "../../constants";
import { compressImage, compressImageToAvif } from "../../lib/utils";

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
  const [compressionStats, setCompressionStats] = useState<Record<string, { originalSize: string; compressedSize: string; ratio: string; format?: string }>>({});

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
        // Dynamic adaptive compression rule based on upload context
        let maxW = 600;
        let maxH = 600;
        let quality = 0.65;

        if (field === "logoUrl") {
          maxW = 240;
          maxH = 240;
          quality = 0.75; // high quality for crisp details on critical identity elements
        } else if (field === "heroImageUrl" || field === "banner1" || field === "banner2") {
          maxW = 1200;
          maxH = 500;
          quality = 0.65; // wider bounds for banners to look perfect on desktop, compressed heavily for page speed
        } else if (isCategory) {
          maxW = 400;
          maxH = 400;
          quality = 0.65; // optimized round avatars/cards/thumbnails
        }

        compressImageToAvif(file, maxW, maxH, quality)
          .then((result) => {
            processResult(result.dataUrl);
            setCompressionStats((prev) => ({
              ...prev,
              [uploadKey]: {
                originalSize: originalSizeKB < 1024 ? `${originalSizeKB.toFixed(1)} KB` : `${(originalSizeKB/1024).toFixed(2)} MB`,
                compressedSize: `${result.compressedSizeKb.toFixed(1)} KB`,
                ratio: `${result.savingsPercent}%`,
                format: result.format,
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
                      Auto-Optimized ({compressionStats["logoUrl"].format?.toUpperCase()}): <strong>{compressionStats["logoUrl"].ratio} smaller</strong> ({compressionStats["logoUrl"].originalSize} → {compressionStats["logoUrl"].compressedSize})
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
                      Auto-Optimized ({compressionStats["heroImageUrl"].format?.toUpperCase()}): <strong>{compressionStats["heroImageUrl"].ratio} smaller</strong> ({compressionStats["heroImageUrl"].originalSize} → {compressionStats["heroImageUrl"].compressedSize})
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
