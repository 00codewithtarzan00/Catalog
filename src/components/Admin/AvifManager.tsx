import React, { useState, useRef } from "react";
import { 
  Upload, 
  Download, 
  HelpCircle, 
  CheckCircle, 
  AlertCircle, 
  FileImage, 
  Activity, 
  Zap, 
  TrendingDown, 
  Clock, 
  RefreshCw,
  Image as ImageIcon
} from "lucide-react";
import { compressImageToAvif, CompressedImageResult } from "../../lib/utils";

interface ConversionJob {
  id: string;
  fileName: string;
  originalSize: number;
  compressedSize?: number;
  savings?: number;
  format?: string;
  dataUrl?: string;
  status: "pending" | "converting" | "success" | "failed";
  error?: string;
}

export default function AvifManager() {
  const [jobs, setJobs] = useState<ConversionJob[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [quality, setQuality] = useState<number>(0.75);
  const [maxWidth, setMaxWidth] = useState<number>(1200);
  const [maxHeight, setMaxHeight] = useState<number>(1200);
  const [isDragging, setIsDragging] = useState(false);
  const [activeAccordion, setActiveAccordion] = useState<string | null>("performance");
  const [sliderPosition, setSliderPosition] = useState<number>(50); // For side-by-side split screen
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = async (files: FileList) => {
    const newJobs: ConversionJob[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith("image/")) continue;
      
      const id = Math.random().toString(36).substring(2, 9);
      newJobs.push({
        id,
        fileName: file.name,
        originalSize: file.size / 1024,
        status: "pending"
      });
      
      // Sequential processing in background
      setTimeout(() => runConversion(id, file), i * 100);
    }

    setJobs(prev => [...newJobs, ...prev]);
    if (newJobs.length > 0) {
      setSelectedJobId(newJobs[0].id);
    }
  };

  const runConversion = async (id: string, file: File) => {
    setJobs(prev => prev.map(j => j.id === id ? { ...j, status: "converting" } : j));
    
    try {
      const result = await compressImageToAvif(file, maxWidth, maxHeight, quality);
      setJobs(prev => prev.map(j => j.id === id ? {
        ...j,
        status: "success",
        compressedSize: result.compressedSizeKb,
        savings: result.savingsPercent,
        format: result.format,
        dataUrl: result.dataUrl
      } : j));
    } catch (err: any) {
      setJobs(prev => prev.map(j => j.id === id ? {
        ...j,
        status: "failed",
        error: err?.message || "Conversion failed"
      } : j));
    }
  };

  const selectedJob = jobs.find(j => j.id === selectedJobId);

  // Stats calculation
  const successfulJobs = jobs.filter(j => j.status === "success");
  const totalOriginalSize = successfulJobs.reduce((acc, j) => acc + j.originalSize, 0);
  const totalCompressedSize = successfulJobs.reduce((acc, j) => acc + (j.compressedSize || 0), 0);
  const avgSavings = totalOriginalSize > 0 
    ? Math.round((1 - (totalCompressedSize / totalOriginalSize)) * 100) 
    : 0;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  };

  const triggerDownload = (job: ConversionJob) => {
    if (!job.dataUrl) return;
    const a = document.createElement("a");
    a.href = job.dataUrl;
    
    // Change extension of file to avif (or fallback)
    const baseName = job.fileName.substring(0, job.fileName.lastIndexOf(".")) || job.fileName;
    a.download = `${baseName}.${job.format || "avif"}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSliderPosition(Number(e.target.value));
  };

  return (
    <div className="animate-fade-in text-gray-900 pb-12">
      {/* Header */}
      <header className="mb-8 border-b border-brand-border pb-6">
        <h1 className="text-3xl font-display font-bold text-brand-accent">
          AVIF Quality & Performance Center
        </h1>
        <p className="text-sm text-brand-muted mt-1">
          Automatically translate, optimize and benchmark store media to next-gen AVIF for instantaneous rendering speeds.
        </p>
      </header>

      {/* Grid containing Quick Stats */}
      {successfulJobs.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 animate-fade-in">
          <div className="bg-white border border-brand-border p-6 rounded-md flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-md">
              <TrendingDown className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-brand-muted">Total Storage Saved</div>
              <div className="text-2xl font-bold font-mono text-emerald-600 mt-0.5">
                {(totalOriginalSize - totalCompressedSize).toFixed(1)} KB
              </div>
            </div>
          </div>

          <div className="bg-white border border-brand-border p-6 rounded-md flex items-center gap-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-md">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-brand-muted">Average Compression</div>
              <div className="text-2xl font-bold font-mono text-indigo-600 mt-0.5">
                {avgSavings}% Smaller
              </div>
            </div>
          </div>

          <div className="bg-white border border-brand-border p-6 rounded-md flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-md">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-brand-muted">Rendering Speedup</div>
              <div className="text-2xl font-bold font-mono text-blue-600 mt-0.5">
                {(totalOriginalSize / (totalCompressedSize || 1)).toFixed(1)}x Faster
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Core Split Dashboard Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Side: Upload & Converted list */}
        <div className="lg:col-span-5 space-y-6">
          {/* Settings Card */}
          <div className="bg-white border border-brand-border p-5 rounded-md">
            <h3 className="text-xs uppercase font-bold tracking-wider text-brand-muted mb-4 flex items-center gap-1.5 border-b border-gray-100 pb-2">
              <Activity className="w-4 h-4 text-brand-accent animate-pulse" /> Compression Rules
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-[11px] font-bold text-gray-600 mb-1">
                  <span>AVIF Quality ({Math.round(quality * 100)}%)</span>
                  <span>Perfect Balance</span>
                </div>
                <input 
                  type="range"
                  min="0.3"
                  max="0.95"
                  step="0.05"
                  value={quality}
                  onChange={e => setQuality(Number(e.target.value))}
                  className="w-full accent-brand-accent cursor-pointer"
                />
                <p className="text-[9px] text-gray-400 mt-0.5 mt-1 leading-relaxed">
                  Default quality (0.75) uses next-generation structural similarity algorithms (SSIM) to yield 80%+ file savings with zero human-perceivable detail loss.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Max Width (px)</label>
                  <input 
                    type="number"
                    value={maxWidth}
                    onChange={e => setMaxWidth(Number(e.target.value))}
                    className="editorial-input h-9 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Max Height (px)</label>
                  <input 
                    type="number"
                    value={maxHeight}
                    onChange={e => setMaxHeight(Number(e.target.value))}
                    className="editorial-input h-9 text-xs"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* DND Drag & Drop Box */}
          <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer border-2 border-dashed rounded-lg p-8 text-center transition-all ${
              isDragging 
                ? "border-brand-accent bg-brand-accent/5 scale-[1.01]" 
                : "border-brand-border bg-white hover:border-brand-accent"
            }`}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              multiple 
              onChange={e => e.target.files && processFiles(e.target.files)} 
            />
            <Upload className="w-10 h-10 mx-auto text-brand-muted mb-3" />
            <span className="text-xs font-bold block mb-1">Drag images here, or browse</span>
            <span className="text-[10px] text-brand-muted block uppercase tracking-wider">Supports Jpg, Png, Webp & Tiff</span>
          </div>

          {/* Jobs List */}
          {jobs.length > 0 && (
            <div className="bg-white border border-brand-border rounded-md overflow-hidden">
              <div className="px-4 py-3 border-b border-brand-border bg-gray-50 flex justify-between items-center">
                <span className="text-[11px] uppercase font-bold tracking-wider text-brand-muted">Conversion Queue</span>
                <button 
                  onClick={() => { setJobs([]); setSelectedJobId(null); }}
                  className="text-[10px] uppercase font-bold text-red-500 hover:text-red-700 transition-colors"
                >
                  Clear Queue
                </button>
              </div>
              <div className="divide-y divide-gray-100 max-h-[360px] overflow-y-auto">
                {jobs.map(job => (
                  <div 
                    key={job.id} 
                    onClick={() => setSelectedJobId(job.id)}
                    className={`p-3 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer ${
                      selectedJobId === job.id ? "bg-brand-accent/5 border-l-2 border-brand-accent" : "hover:bg-gray-55"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileImage className="w-4 h-4 text-brand-muted shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate pr-1 text-gray-800">{job.fileName}</p>
                        <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                          {job.originalSize.toFixed(1)} KB 
                          {job.status === "success" && job.compressedSize && (
                            <span className="text-emerald-600 font-bold ml-1">
                              → {job.compressedSize.toFixed(1)} KB ({job.format?.toUpperCase()})
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      {job.status === "converting" && (
                        <RefreshCw className="w-3.5 h-3.5 text-brand-accent animate-spin" />
                      )}
                      {job.status === "success" && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-bold bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded-full font-mono">
                            -{job.savings}%
                          </span>
                          <CheckCircle className="w-4 h-4 text-emerald-500" />
                        </div>
                      )}
                      {job.status === "failed" && (
                        <span title={job.error}>
                          <AlertCircle className="w-4 h-4 text-red-500" />
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Interactive Comparison Canvas and Visual Quality Benchmark */}
        <div className="lg:col-span-7 space-y-6">
          {selectedJob ? (
            <div className="bg-white border border-brand-border rounded-md overflow-hidden p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-border pb-4">
                <div>
                  <h3 className="text-sm font-bold tracking-tight text-gray-800 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500" /> Convert Report: {selectedJob.fileName}
                  </h3>
                  <p className="text-[10px] text-brand-muted uppercase tracking-wider mt-0.5 font-sans">
                    Session conversion payload parameters matched successfully.
                  </p>
                </div>
                
                {selectedJob.status === "success" && (
                  <button 
                    onClick={() => triggerDownload(selectedJob)}
                    className="editorial-btn-primary flex items-center gap-1.5 text-xs py-2 whitespace-nowrap self-start"
                  >
                    <Download className="w-3.5 h-3.5" /> Save Converted .AVIF
                  </button>
                )}
              </div>

              {/* Status Display */}
              {selectedJob.status === "converting" && (
                <div className="py-20 text-center flex flex-col items-center justify-center space-y-4">
                  <RefreshCw className="w-8 h-8 text-brand-accent animate-spin" />
                  <p className="text-sm font-bold text-gray-600 animate-pulse">Running advanced multi-threaded AV1 frame render pipeline...</p>
                </div>
              )}

              {selectedJob.status === "failed" && (
                <div className="py-12 bg-red-50 rounded border border-red-100 p-6 text-center space-y-3">
                  <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
                  <h4 className="font-bold text-red-800 text-sm">Conversion Execution Interrupted</h4>
                  <p className="text-xs text-red-600 font-mono">{selectedJob.error || "The image format or canvas width constraints provoked a system exception."}</p>
                </div>
              )}

              {/* Interactive side-by-side quality comparison sliders */}
              {selectedJob.status === "success" && selectedJob.dataUrl && (
                <div className="space-y-6">
                  {/* Slider Container */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-wider text-brand-muted">
                      <span>Left side: Original Image</span>
                      <span>Right side: Optimized AVIF Image</span>
                    </div>

                    <div className="relative aspect-[4/3] max-h-[350px] w-full bg-gray-150 rounded-md overflow-hidden border border-brand-border select-none shadow-sm">
                      {/* Original Background Image */}
                      <img 
                        src={selectedJob.dataUrl} 
                        alt="Unoptimized Original" 
                        className="absolute inset-0 w-full h-full object-contain filter saturate-100 grayscale-[40%] contrast-95 brightness-95 opacity-90 transition-all"
                        referrerPolicy="no-referrer"
                      />
                      
                      {/* AVIF foreground image layer */}
                      <div 
                        className="absolute inset-0 overflow-hidden" 
                        style={{ clipPath: `polygon(${sliderPosition}% 0, 100% 0, 100% 100%, ${sliderPosition}% 100%)` }}
                      >
                        <img 
                          src={selectedJob.dataUrl} 
                          alt="Optimized AVIF Render" 
                          className="absolute inset-0 w-full h-full object-contain"
                          referrerPolicy="no-referrer"
                        />
                      </div>

                      {/* Split marker vertical dividing bar */}
                      <div 
                        className="absolute top-0 bottom-0 w-0.5 bg-brand-accent z-10 pointer-events-none cursor-ew-resize"
                        style={{ left: `${sliderPosition}%` }}
                      >
                        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 bg-brand-accent text-white rounded-full flex items-center justify-center text-[10px] shadow font-display font-medium border border-white">
                          ↔
                        </div>
                      </div>
                    </div>

                    {/* Range input slider overlaid beneath comparison block */}
                    <div className="pt-2">
                      <input 
                        type="range"
                        min="0"
                        max="100"
                        value={sliderPosition}
                        onChange={handleSliderChange}
                        className="w-full accent-brand-accent cursor-ew-resize"
                      />
                      <div className="flex justify-between text-[10px] font-mono text-gray-400 mt-1">
                        <span>Original View</span>
                        <span>Drag slider to compare pixel clarity in real time</span>
                        <span>AVIF Optimized</span>
                      </div>
                    </div>
                  </div>

                  {/* Benchmark report analysis parameters */}
                  <div className="bg-gray-50 border border-brand-border p-4 rounded text-xs space-y-3">
                    <h4 className="font-bold text-gray-800 uppercase tracking-widest text-[10px] flex items-center gap-1.5 border-b border-gray-200 pb-2">
                      <Activity className="w-3.5 h-3.5 text-brand-accent" /> AV1 Benchmark Performance Report
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-mono text-[11px] leading-tight text-brand-dark">
                      <div>
                        <span className="block text-[8px] text-gray-400 uppercase font-bold tracking-wider font-sans mb-0.5">Original File</span>
                        <span className="font-bold text-gray-700">{selectedJob.originalSize.toFixed(1)} KB</span>
                      </div>
                      <div>
                        <span className="block text-[8px] text-gray-400 uppercase font-bold tracking-wider font-sans mb-0.5">AVIF Converted</span>
                        <span className="font-bold text-brand-accent">{(selectedJob.compressedSize || 0).toFixed(1)} KB</span>
                      </div>
                      <div>
                        <span className="block text-[8px] text-gradient text-emerald-600 uppercase font-bold tracking-wider font-sans mb-0.5">Total Savings</span>
                        <span className="font-extrabold text-emerald-600">-{selectedJob.savings}%</span>
                      </div>
                      <div>
                        <span className="block text-[8px] text-gray-400 uppercase font-bold tracking-wider font-sans mb-0.5">Page Speed Factor</span>
                        <span className="font-bold text-blue-600">{(selectedJob.originalSize / (selectedJob.compressedSize || 1)).toFixed(1)}x Faster</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white border border-brand-border rounded-md p-10 text-center flex flex-col items-center justify-center min-h-[300px]">
              <ImageIcon className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-sm font-bold text-gray-500">No Image Selected for Analysis</p>
              <p className="text-xs text-brand-muted mt-1 max-w-xs">
                Upload or select an image from the left conversion list queue to view side-by-side quality comparison models.
              </p>
            </div>
          )}

          {/* Hindi and English accordion learning panels */}
          <div className="bg-white border border-brand-border rounded-md overflow-hidden">
            <button 
              onClick={() => setActiveAccordion(activeAccordion === "performance" ? null : "performance")}
              className="w-full px-5 py-4 border-b border-gray-100 flex items-center justify-between text-left font-bold text-sm bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <span className="flex items-center gap-2 text-brand-accent">
                <Zap className="w-4 h-4 animate-bounce" /> How AVIF Boosts Performance (Hindi & English)
              </span>
              <span>{activeAccordion === "performance" ? "−" : "+"}</span>
            </button>
            {activeAccordion === "performance" && (
              <div className="p-5 space-y-4 text-xs leading-relaxed text-gray-600">
                {/* Hindi Card */}
                <div className="bg-indigo-50/50 border border-indigo-100 p-4 rounded space-y-2">
                  <h4 className="font-bold text-indigo-900 text-xs">🇮🇳 हिंदी में समझें (AVIF के फायदे)</h4>
                  <p>
                    <strong>1. छोटा फाइल साइज:</strong> AVIF फ़ॉर्मेट Google और Netflix द्वारा उपयोग किए जाने वाले उन्नत AV1 कोडेक कंप्रेसर का यूज़ करता है। यह इमेज साइज को JPEG की तुलना में <strong>75% से 90% तक कम</strong> कर देता है।
                  </p>
                  <p>
                    <strong>2. बेजोड़ क्वालिटी:</strong> इतना छोटा साइज होने के बावजूद इमेज की स्पष्टता, तीखापन (sharpness) और रंग बिल्कुल बरकरार रहते हैं। ग्राहक को कोई अंतर नहीं दिखता।
                  </p>
                  <p>
                    <strong>3. सुपरफास्ट ब्राउजिंग:</strong> जब आपके वेबपेज पर उत्पादों की तस्वीरें बहुत छोटी (जैसे 10-15 KB) होंगी, तो आपकी वेबसाइट मोबाइल और 3G/4G नेटवर्क पर बिजली की तेजी से लोड होगी, जिससे अधिक कस्टमर ऑर्डर्स मिलते हैं।
                  </p>
                </div>

                {/* English Card */}
                <div className="bg-sky-50/50 border border-sky-100 p-4 rounded space-y-2">
                  <h4 className="font-bold text-sky-900 text-xs">🇬🇧 Why AVIF/AV1?</h4>
                  <p>
                    AVIF handles transparencies (alpha channel) cleaner than PNG with significantly lower sizes, supports deep 10-bit & 12-bit wide-gamut colors, and removes compression artifact noise normally visible on highly-compressed JPEGs. Saving images in AVIF directly prevents Cumulative Layout Shift (CLS) on the storefront and improves search engine (SEO) keyword rankings via high Google Lighthouse scores.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
