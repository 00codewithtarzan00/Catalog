import React, { useState, useEffect, useRef } from 'react';
import { Product } from '../../types';
import { formatPrice, formatQuantityUnit, cleanCategoryName } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Star, 
  Eye, 
  Sliders, 
  LayoutGrid,
  CheckCircle2,
  Pin
} from 'lucide-react';
import ProductCard from './ProductCard';

interface ProductFeedLayoutsProps {
  layout: 'standard_grid' | 'carousel' | 'coverflow' | 'hover_swap' | 'accordion' | 'static_showcase' | 'story_banner';
  products: Product[];
  onProductClick: (product: Product) => void;
}

// -------------------------------------------------------------
// 1. CAROUSEL LAYOUT
// -------------------------------------------------------------
function ProductCarousel({ products, onProductClick }: { products: Product[], onProductClick: (p: Product) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (containerRef.current) {
      const scrollAmount = direction === 'left' ? -containerRef.current.offsetWidth * 0.75 : containerRef.current.offsetWidth * 0.75;
      containerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <div className="relative group w-full px-1">
      <div 
        ref={containerRef}
        className="flex items-stretch gap-4 md:gap-6 overflow-x-auto pb-4 scrollbar-hide no-scrollbar scroll-smooth snap-x snap-mandatory"
      >
        {products.map((p) => (
          <div key={p.id} className="w-[185px] xs:w-[210px] sm:w-[240px] md:w-[280px] shrink-0 snap-start">
            <ProductCard product={p} onClick={onProductClick} />
          </div>
        ))}
      </div>
      <button 
        type="button"
        onClick={() => scroll('left')}
        className="absolute -left-2 sm:-left-4 top-1/2 -translate-y-1/2 z-10 w-9 h-9 bg-white border border-brand-border rounded-full flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-gray-50 focus:opacity-100"
      >
        <ChevronLeft className="w-4 h-4 text-brand-dark" />
      </button>
      <button 
        type="button"
        onClick={() => scroll('right')}
        className="absolute -right-2 sm:-right-4 top-1/2 -translate-y-1/2 z-10 w-9 h-9 bg-white border border-brand-border rounded-full flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-gray-50 focus:opacity-100"
      >
        <ChevronRight className="w-4 h-4 text-brand-dark" />
      </button>
    </div>
  );
}

// -------------------------------------------------------------
// 2. 3D COVERFLOW CAROUSEL
// -------------------------------------------------------------
function CoverflowCarousel({ products, onProductClick }: { products: Product[], onProductClick: (p: Product) => void }) {
  const [activeIndex, setActiveIndex] = useState(0);

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % products.length);
  };

  const handlePrev = () => {
    setActiveIndex((prev) => (prev - 1 + products.length) % products.length);
  };

  if (products.length === 0) return null;

  return (
    <div className="relative w-full max-w-4xl mx-auto py-8 flex flex-col items-center select-none overflow-hidden">
      <div className="relative w-full flex items-center justify-center h-[340px] md:h-[390px] perspective-1000">
        {products.map((product, idx) => {
          let offset = idx - activeIndex;
          const count = products.length;
          
          if (offset < -count / 2) offset += count;
          if (offset > count / 2) offset -= count;

          const distance = Math.abs(offset);
          const isActive = idx === activeIndex;

          if (distance > 2) return null;

          const scale = isActive ? 1.05 : distance === 1 ? 0.8 : 0.65;
          const rotateY = isActive ? 0 : offset > 0 ? -28 : 28;
          const translateZ = isActive ? 0 : -120;
          const translateX = offset * (window.innerWidth < 640 ? 110 : 210); 
          const zIndex = 10 - distance;
          const opacity = isActive ? 1 : distance === 1 ? 0.65 : 0.3;

          return (
            <motion.div
              key={product.id}
              onClick={() => {
                if (isActive) {
                  onProductClick(product);
                } else {
                  setActiveIndex(idx);
                }
              }}
              style={{
                zIndex,
                transformStyle: 'preserve-3d',
              }}
              animate={{
                scale,
                rotateY,
                x: translateX,
                z: translateZ,
                opacity,
              }}
              transition={{
                type: 'spring',
                stiffness: 110,
                damping: 18
              }}
              className={`absolute cursor-pointer w-[180px] xs:w-[210px] sm:w-[240px] md:w-[270px] h-full ${isActive ? 'shadow-xl ring-1 ring-brand-accent/20 rounded-xl bg-white' : ''}`}
            >
              <div className="h-full pointer-events-none">
                <ProductCard product={product} onClick={() => {}} />
              </div>
              {!isActive && (
                <div className="absolute inset-0 bg-transparent rounded-xl z-20" />
              )}
            </motion.div>
          );
        })}
      </div>

      <div className="flex items-center gap-6 mt-6">
        <button 
          type="button"
          onClick={handlePrev}
          className="w-9 h-9 bg-white border border-brand-border rounded-full flex items-center justify-center shadow hover:bg-gray-50 transition-colors"
        >
          <ChevronLeft className="w-4 h-4 text-brand-dark" />
        </button>
        <span className="text-[11px] font-mono font-bold tracking-widest text-brand-muted select-none">
          {activeIndex + 1} / {products.length}
        </span>
        <button 
          type="button"
          onClick={handleNext}
          className="w-9 h-9 bg-white border border-brand-border rounded-full flex items-center justify-center shadow hover:bg-gray-50 transition-colors"
        >
          <ChevronRight className="w-4 h-4 text-brand-dark" />
        </button>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 3. HOVER SWAP (3D FLIP) CARD
// -------------------------------------------------------------
function FlipProductCard({ product, onProductClick }: { product: Product, onProductClick: (p: Product) => void }) {
  const [isFlipped, setIsFlipped] = useState(false);
  const discountPercent = product.mrp && product.mrp > product.price
    ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
    : 0;

  return (
    <div 
      className="perspective-1000 h-[360px] sm:h-[390px] md:h-[410px] cursor-pointer"
      onMouseEnter={() => setIsFlipped(true)}
      onMouseLeave={() => setIsFlipped(false)}
      onClick={() => onProductClick(product)}
    >
      <motion.div
        className="relative w-full h-full duration-500"
        style={{ transformStyle: 'preserve-3d' }}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ type: 'spring', stiffness: 90, damping: 16 }}
      >
        {/* Front */}
        <div 
          className="absolute inset-0 w-full h-full bg-white rounded-xl border border-brand-border flex flex-col overflow-hidden backface-hidden shadow-sm"
        >
          <div className="relative aspect-square w-full overflow-hidden bg-gray-50 border-b border-brand-border flex items-center justify-center flex-shrink-0">
            {discountPercent > 0 && (
              <div className="absolute top-2 left-2 bg-red-650 bg-red-600 text-white text-[9px] uppercase font-bold px-2 py-0.5 rounded-sm z-10">
                {discountPercent}% OFF
              </div>
            )}
            {product.imageUrl ? (
              <img src={product.imageUrl} alt={product.name} className="w-full h-full object-contain p-2" />
            ) : (
              <div className="w-full h-full bg-gray-50 flex items-center justify-center text-brand-accent/10 font-bold font-display italic text-2xl">RK</div>
            )}
          </div>
          <div className="p-4 flex flex-col flex-1">
            <span className="text-[10px] uppercase tracking-wider text-brand-muted font-bold mb-1 block leading-none">{cleanCategoryName(product.category)}</span>
            <h3 className="font-display font-medium text-sm sm:text-base text-brand-text mb-2 line-clamp-2 h-10 overflow-hidden leading-tight">{product.name}</h3>
            {product.showQuantity && product.quantityValue && (
              <span className="text-xs font-semibold text-[#888] leading-none block mb-1">{product.quantityValue} {formatQuantityUnit(product.quantityUnit || 'g')}</span>
            )}
            <div className="mt-auto pt-1 flex items-baseline gap-1.5">
              <span className="font-display font-bold text-base sm:text-lg text-brand-accent leading-none">{formatPrice(product.price)}</span>
              {product.mrp && product.mrp > product.price && (
                <span className="text-xs text-brand-muted line-through font-medium leading-none">{formatPrice(product.mrp)}</span>
              )}
            </div>
          </div>
        </div>

        {/* Back */}
        <div 
          className="absolute inset-0 w-full h-full bg-slate-900 border border-slate-800 p-5 flex flex-col overflow-hidden backface-hidden shadow-lg transform rotateY-180 text-white"
        >
          <div className="flex flex-col h-full justify-between">
            <div>
              <div className="flex items-center gap-1.5 mb-2.5">
                <span className="bg-brand-accent text-white font-mono text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded tracking-wider">{cleanCategoryName(product.category)}</span>
                {discountPercent > 0 && (
                  <span className="bg-red-600 text-white font-mono text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded">SAVE {formatPrice(product.mrp! - product.price)}</span>
                )}
              </div>

              <h4 className="font-display font-bold text-sm sm:text-base line-clamp-2 text-white mb-2 leading-tight">{product.name}</h4>
              
              {product.showQuantity && product.quantityValue && (
                <span className="text-xs font-medium text-slate-400 mb-2 block">{product.quantityValue} {formatQuantityUnit(product.quantityUnit || 'g')}</span>
              )}

              <p className="text-xs text-slate-300 italic line-clamp-4 leading-relaxed mt-2.5">
                {product.description || "Ghar ki rasoi ke liye sabse upyogi aur shudh item, humesha saste damo par uplabdh."}
              </p>
            </div>

            <div className="border-t border-slate-800/80 pt-3">
              <div className="flex items-center justify-between mb-3">
                <div className="flex flex-col">
                  <span className="text-[8px] uppercase tracking-wider text-slate-400 font-bold font-mono">Retail Price</span>
                  <span className="font-display font-semibold text-base text-[#0DF]">{formatPrice(product.price)}</span>
                </div>
                {product.mrp && product.mrp > product.price && (
                  <div className="flex flex-col items-end">
                    <span className="text-[8px] uppercase tracking-wider text-slate-400 font-bold font-mono">MRP</span>
                    <span className="text-xs text-slate-400 line-through">{formatPrice(product.mrp)}</span>
                  </div>
                )}
              </div>

              <button 
                type="button"
                className="w-full h-8 flex items-center justify-center gap-1 bg-slate-800 border border-slate-700 hover:bg-slate-700 hover:border-slate-600 py-1 px-3 rounded text-xs font-extrabold uppercase tracking-wider text-[#0DF] transition-all duration-300"
              >
                <Eye className="w-3.5 h-3.5" /> View Details
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function GridHoverSwap({ products, onProductClick }: { products: Product[], onProductClick: (p: Product) => void }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-6 animate-fade-in w-full">
      {products.map((p) => (
        <FlipProductCard key={p.id} product={p} onProductClick={onProductClick} />
      ))}
    </div>
  );
}

// -------------------------------------------------------------
// 4. ACCORDION SLIDER (EXPANDABLE PANELS)
// -------------------------------------------------------------
function AccordionSlider({ products, onProductClick }: { products: Product[], onProductClick: (p: Product) => void }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const itemsToShow = products.slice(0, 6);

  if (itemsToShow.length === 0) return null;

  return (
    <div className="flex flex-col md:flex-row h-[360px] md:h-[440px] w-full gap-3 overflow-hidden select-none rounded-xl">
      {itemsToShow.map((product, idx) => {
        const isActive = idx === activeIndex;
        return (
          <motion.div
            key={product.id}
            onClick={() => setActiveIndex(idx)}
            onHoverStart={() => {
              if (window.innerWidth >= 768) {
                setActiveIndex(idx);
              }
            }}
            animate={{
              flex: isActive ? 3.5 : 1,
            }}
            transition={{
              type: 'spring',
              stiffness: 110,
              damping: 18
            }}
            className={`relative min-w-[65px] md:min-w-[90px] h-full cursor-pointer overflow-hidden border border-brand-border rounded-xl flex ${isActive ? 'bg-gradient-to-r from-white to-gray-50/50 shadow-md ring-1 ring-brand-accent/5' : 'bg-gray-100 hover:bg-gray-50 transition-all'}`}
          >
            <div className="flex w-full h-full relative">
              {/* Product Image Panel */}
              <div className="w-[100px] md:w-[150px] lg:w-[180px] h-full flex-shrink-0 flex items-center justify-center bg-gray-50 relative border-r border-brand-border/40">
                {product.imageUrl ? (
                  <img src={product.imageUrl} alt={product.name} className="w-full h-full object-contain p-3" />
                ) : (
                  <div className="w-full h-full bg-slate-100 flex items-center justify-center text-brand-accent/5 italic font-black text-2xl font-display">RK</div>
                )}
                {product.mrp && product.mrp > product.price && (
                  <div className="absolute top-2 left-2 bg-red-600 text-white text-[8px] uppercase font-bold px-1.5 py-0.5 rounded z-10 shrink-0">
                    Sasta
                  </div>
                )}
              </div>

              {/* Product Description Panel - Only visible when active */}
              <div className={`p-4 md:p-6 flex flex-col justify-between flex-1 overflow-hidden transition-all duration-300 ${isActive ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-6 pointer-events-none'}`}>
                <div>
                  <span className="text-[9px] uppercase tracking-widest text-[#999] font-bold block mb-1">{cleanCategoryName(product.category)}</span>
                  <h3 className="font-display font-bold text-base md:text-lg text-brand-dark leading-tight line-clamp-2 mb-2">{product.name}</h3>
                  {product.showQuantity && product.quantityValue && (
                     <span className="text-xs font-semibold text-[#666] leading-none mb-3 block">Weight: {product.quantityValue} {formatQuantityUnit(product.quantityUnit || 'g')}</span>
                  )}
                  <p className="text-xs text-brand-muted italic mt-1.5 leading-relaxed max-w-sm line-clamp-3">
                    {product.description || "Shudh aur swasth kirana swad. Raj Kirana me humesha saste aur behad sasti kimato par milega."}
                  </p>
                </div>

                <div className="mt-auto border-t border-brand-border/45 pt-3">
                  <div className="flex items-baseline gap-2 mb-2.5">
                    <span className="font-display font-semibold text-lg md:text-xl text-brand-accent leading-none">{formatPrice(product.price)}</span>
                    {product.mrp && product.mrp > product.price && (
                      <span className="text-xs text-brand-muted line-through leading-none font-medium">{formatPrice(product.mrp)}</span>
                    )}
                  </div>
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onProductClick(product);
                    }}
                    className="editorial-btn-primary py-1.5 px-3.5 text-xs font-bold uppercase tracking-wider h-8 inline-flex gap-1 items-center shrink-0"
                  >
                    Details <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Vertical Title overlay for collapsed panels */}
              {!isActive && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center bg-transparent gap-2">
                  <div className="w-9 h-9 bg-white/75 backdrop-blur-sm rounded-full flex items-center justify-center border p-1 shadow-sm">
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.name} className="w-full h-full object-contain" />
                    ) : (
                      <Star className="w-3.5 h-3.5 text-brand-accent" />
                    )}
                  </div>
                  <span className="font-display font-bold text-[10px] md:text-xs text-brand-dark vertical-rl tracking-wider uppercase select-none leading-none max-h-[140px] truncate">
                    {product.name}
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// -------------------------------------------------------------
// 5. STATIC SPOTLIGHT SHOWCASE (PIN SELECTED ITEM)
// -------------------------------------------------------------
function StaticSpotlightShowcase({ products, onProductClick }: { products: Product[], onProductClick: (p: Product) => void }) {
  const [selectedId, setSelectedId] = useState<string>(products[0]?.id || '');

  const activeProduct = products.find(p => p.id === selectedId) || products[0];

  if (products.length === 0) return null;

  return (
    <div className="w-full flex flex-col lg:flex-row gap-6 items-stretch select-none">
      {/* Pinned Image Showcase Frame */}
      <div className="lg:w-[40%] bg-white border border-brand-border rounded-2xl p-6 shadow-sm flex flex-col justify-between relative overflow-hidden transition-all duration-300">
        <div className="absolute top-4 right-4 bg-emerald-50 text-emerald-800 text-[10px] uppercase font-mono font-black tracking-wider px-2.5 py-1 rounded-full flex items-center gap-1 border border-emerald-200 z-10 shadow-sm leading-none">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Pinned / Locked
        </div>

        {activeProduct && (
          <div className="flex flex-col h-full justify-between items-center text-center">
            <div className="w-full aspect-square bg-gray-50/40 rounded-xl flex items-center justify-center p-4 border border-gray-100 overflow-hidden relative mt-8">
              {activeProduct.imageUrl ? (
                <img 
                  src={activeProduct.imageUrl} 
                  alt={activeProduct.name} 
                  className="max-h-full max-w-full object-contain drop-shadow-md select-none transition-transform duration-300 hover:scale-105" 
                />
              ) : (
                <Star className="w-20 h-20 text-brand-accent/20" />
              )}
            </div>

            <div className="mt-5 w-full text-left space-y-1">
              <span className="text-[9px] uppercase font-bold tracking-widest text-[#999]">{cleanCategoryName(activeProduct.category)}</span>
              <h4 className="font-display font-semibold text-base sm:text-lg text-brand-dark leading-snug line-clamp-2">{activeProduct.name}</h4>
              {activeProduct.showQuantity && activeProduct.quantityValue && (
                <p className="text-xs font-semibold text-brand-muted capitalize">Weight/Size: {activeProduct.quantityValue} {formatQuantityUnit(activeProduct.quantityUnit || 'g')}</p>
              )}
              {activeProduct.description && (
                <p className="text-xs text-brand-muted/95 leading-relaxed italic line-clamp-3 mt-1.5">{activeProduct.description}</p>
              )}
            </div>

            <div className="mt-5 w-full border-t border-brand-border/60 pt-4 flex items-center justify-between">
              <div>
                <span className="text-[9px] uppercase tracking-wider text-[#999] font-bold block leading-none">Price Each</span>
                <span className="font-display font-black text-xl text-brand-accent mt-1 block leading-none">{formatPrice(activeProduct.price)}</span>
                {activeProduct.mrp && activeProduct.mrp > activeProduct.price && (
                  <span className="text-[11px] text-[#999] line-through font-mono mt-1 block leading-none">{formatPrice(activeProduct.mrp)}</span>
                )}
              </div>
              <button 
                type="button"
                onClick={() => onProductClick(activeProduct)}
                className="editorial-btn-primary h-9 px-4 text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1 mr-1"
              >
                Details <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Interactive Selection Grid */}
      <div className="flex-1 flex flex-col gap-4">
        <div className="border-b pb-2 flex items-center justify-between">
          <div>
            <h4 className="font-display font-bold text-sm tracking-tight text-brand-dark">Tick Product below to Pin Preview</h4>
            <p className="text-[10px] text-gray-400 mt-0.5">Click any circle to display and lock that item's image in the main Showcase.</p>
          </div>
          <span className="bg-brand-accent/5 ring-1 ring-brand-accent/20 text-brand-accent px-2 py-0.5 rounded text-[10px] uppercase font-mono font-bold tracking-wider">
            Total {products.length} Items
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4 overflow-y-auto max-h-[480px] p-0.5 scrollbar-thin">
          {products.map((p) => {
            const isSelected = p.id === selectedId;
            return (
              <div 
                key={p.id}
                onClick={() => setSelectedId(p.id)}
                className={`relative bg-white border rounded-xl overflow-hidden cursor-pointer transition-all duration-250 flex flex-col justify-between ${isSelected ? 'border-brand-accent ring-2 ring-brand-accent/20 scale-[0.98]' : 'border-brand-border hover:border-gray-300'}`}
              >
                {/* Checkbox Tick Circle */}
                <div 
                  className={`absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center transition-all duration-200 z-10 ${isSelected ? 'bg-brand-accent text-white scale-110 shadow-sm' : 'bg-white/80 border border-brand-border text-transparent'}`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>

                <div className="aspect-square bg-gray-50/50 flex items-center justify-center p-2 relative flex-shrink-0 border-b border-brand-border/40">
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt={p.name} className="max-h-full max-w-full object-contain select-none" />
                  ) : (
                    <div className="text-brand-accent/10 font-bold tracking-tight text-center">RK</div>
                  )}
                </div>

                <div className="p-3 flex flex-col justify-between flex-1">
                  <div>
                    <span className="text-[8px] uppercase tracking-wider text-[#999] font-bold block mb-0.5 leading-none">{cleanCategoryName(p.category)}</span>
                    <h5 className="font-display font-semibold text-xs text-brand-dark line-clamp-2 leading-snug h-8 overflow-hidden">{p.name}</h5>
                  </div>
                  <div className="mt-3 flex items-baseline justify-between">
                    <span className="font-display font-semibold text-xs text-brand-accent">{formatPrice(p.price)}</span>
                    {p.mrp && p.mrp > p.price && (
                      <span className="text-[9px] text-[#999] line-through font-mono">{formatPrice(p.mrp)}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 6. INSTAGRAM STORY-STYLE TAPPING BANNER
// -------------------------------------------------------------
function StoryStyleTappingBanner({ products, onProductClick }: { products: Product[], onProductClick: (p: Product) => void }) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const storyProducts = products.slice(0, 8);

  const duration = 4500;

  useEffect(() => {
    if (activeIdx === null) return;
    
    setProgress(0);
    const intervalTime = 40; 
    const step = (intervalTime / duration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          if (activeIdx < storyProducts.length - 1) {
            setActiveIdx(activeIdx + 1);
            return 0;
          } else {
            setActiveIdx(null);
            return 0;
          }
        }
        return prev + step;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [activeIdx, storyProducts.length]);

  const handleLeftTap = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeIdx === null) return;
    if (activeIdx > 0) {
      setActiveIdx(activeIdx - 1);
    } else {
      setActiveIdx(null);
    }
  };

  const handleRightTap = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeIdx === null) return;
    if (activeIdx < storyProducts.length - 1) {
      setActiveIdx(activeIdx + 1);
    } else {
      setActiveIdx(null);
    }
  };

  if (storyProducts.length === 0) return null;

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Story Bubbles */}
      <div className="flex gap-4 md:gap-5 pb-1 overflow-x-auto no-scrollbar scrollbar-hide -mx-4 px-4 py-3 bg-gray-55 border bg-white border-brand-border/60 rounded-xl max-w-full">
        {storyProducts.map((p, idx) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setActiveIdx(idx)}
            className="flex flex-col items-center gap-1.5 focus:outline-none shrink-0 cursor-pointer"
          >
            <div className="relative p-0.5 rounded-full ring-2 ring-red-500 hover:ring-brand-accent transition-all duration-300">
              <div className="w-12 h-12 xs:w-14 xs:h-14 bg-white rounded-full p-1 border overflow-hidden flex items-center justify-center">
                {p.imageUrl ? (
                  <img src={p.imageUrl} alt={p.name} className="w-full h-full object-contain rounded-full" />
                ) : (
                  <Star className="w-4 h-4 text-brand-accent" />
                )}
              </div>
              <div className="absolute -bottom-1 right-0 bg-red-600 text-[8px] text-white font-black uppercase px-1 rounded-full border border-white leading-none tracking-tight">
                Sale
              </div>
            </div>
            <span className="text-[10px] md:text-[11px] font-bold text-center text-brand-dark max-w-[65px] truncate select-none leading-tight">
              {p.name.split(' ')[0]}
            </span>
          </button>
        ))}
      </div>

      <p className="text-[10px] text-brand-muted font-mono text-center md:text-left select-none uppercase font-semibold flex items-center justify-center md:justify-start gap-1">
        ✨ Click standard circle above to launch tapping stories!
      </p>

      {/* Story Overlay modal */}
      <AnimatePresence>
        {activeIdx !== null && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
            <div className="absolute inset-0 cursor-pointer" onClick={() => setActiveIdx(null)} />

            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              className="relative w-full max-w-sm h-[80vh] bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col z-[101]"
            >
              {/* Tap zones */}
              <div className="absolute inset-0 z-20 flex">
                <div className="w-[30%] h-full cursor-w-resize" onClick={handleLeftTap} />
                <div className="w-[70%] h-full cursor-e-resize" onClick={handleRightTap} />
              </div>

              {/* Progress bars */}
              <div className="absolute top-4 inset-x-4 z-30 flex gap-1">
                {storyProducts.map((_, idx) => {
                  let fill = 0;
                  if (idx < activeIdx) fill = 100;
                  else if (idx === activeIdx) fill = progress;
                  
                  return (
                    <div key={idx} className="h-0.5 flex-1 bg-white/20 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-white transition-all ease-linear"
                        style={{ 
                          width: `${fill}%`,
                          transitionDuration: idx === activeIdx ? '40ms' : '0ms'
                        }}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Header */}
              <div className="absolute top-8 inset-x-4 z-30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-white border p-0.5 overflow-hidden">
                    <img src={storyProducts[activeIdx].imageUrl} alt="ST" className="w-full h-full object-contain rounded-full" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-white leading-none">Raj Kirana Offers</p>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">{cleanCategoryName(storyProducts[activeIdx].category)}</p>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => setActiveIdx(null)}
                  className="w-7 h-7 bg-white/10 rounded-full flex items-center justify-center text-white font-extrabold focus:outline-none hover:bg-white/20 transition-colors z-40"
                >
                  ✕
                </button>
              </div>

              {/* Content Panel */}
              <div className="flex-1 flex flex-col justify-center items-center p-6 bg-gradient-to-b from-slate-900 via-[#0A0D18] to-[#04060C] text-center select-none pt-16">
                <div className="w-44 h-44 xs:w-48 xs:h-48 bg-slate-800/20 rounded-full flex items-center justify-center relative p-5 border border-slate-700/30">
                  {storyProducts[activeIdx].imageUrl ? (
                    <motion.img 
                      key={activeIdx}
                      initial={{ scale: 0.85, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      src={storyProducts[activeIdx].imageUrl} 
                      alt="Story Item" 
                      className="w-full h-full object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.5)]"
                    />
                  ) : (
                    <Star className="w-20 h-20 text-brand-accent" />
                  )}
                </div>

                <div className="mt-6 space-y-2 max-w-[240px]">
                  <span className="font-mono text-[9px] uppercase tracking-wider font-extrabold text-brand-accent bg-brand-accent/10 px-2 py-0.5 rounded">Story Offer Deal</span>
                  <h4 className="font-display font-extrabold text-base xs:text-lg text-white leading-snug line-clamp-2">
                    {storyProducts[activeIdx].name}
                  </h4>
                  {storyProducts[activeIdx].showQuantity && storyProducts[activeIdx].quantityValue && (
                    <p className="text-xs font-semibold text-slate-400 capitalize">Qty: {storyProducts[activeIdx].quantityValue} {formatQuantityUnit(storyProducts[activeIdx].quantityUnit || 'g')}</p>
                  )}
                </div>

                {/* Bottom Bar */}
                <div className="mt-auto w-full bg-slate-850/60 border border-slate-800 rounded-xl p-3 flex items-center justify-between backdrop-blur-sm relative z-30">
                  <div className="text-left">
                    <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider block leading-none">Deal Price</span>
                    <p className="font-display font-black text-lg text-[#0EF] mt-0.5 leading-none">{formatPrice(storyProducts[activeIdx].price)}</p>
                    {storyProducts[activeIdx].mrp && storyProducts[activeIdx].mrp > storyProducts[activeIdx].price && (
                      <span className="text-[9px] text-slate-400 font-semibold font-mono block mt-1 leading-none">Save {formatPrice(storyProducts[activeIdx].mrp - storyProducts[activeIdx].price)}</span>
                    )}
                  </div>
                  <button 
                    type="button"
                    onClick={() => {
                      onProductClick(storyProducts[activeIdx!]);
                      setActiveIdx(null);
                    }}
                    className="h-8 px-3.5 bg-[#0EF] hover:bg-[#0DC] font-extrabold text-slate-950 rounded-lg text-xs uppercase tracking-wider transition-all duration-300 z-40 shrink-0"
                  >
                    Details
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// -------------------------------------------------------------
// MAIN CONTROLLER COMPONENT
// -------------------------------------------------------------
export default function ProductFeedLayouts({ layout, products, onProductClick }: ProductFeedLayoutsProps) {
  switch (layout) {
    case 'carousel':
      return <ProductCarousel products={products} onProductClick={onProductClick} />;
    
    case 'coverflow':
      return <CoverflowCarousel products={products} onProductClick={onProductClick} />;
    
    case 'hover_swap':
      return <GridHoverSwap products={products} onProductClick={onProductClick} />;
    
    case 'accordion':
      return <AccordionSlider products={products} onProductClick={onProductClick} />;
    
    case 'static_showcase':
      return <StaticSpotlightShowcase products={products} onProductClick={onProductClick} />;
    
    case 'story_banner':
      return <StoryStyleTappingBanner products={products} onProductClick={onProductClick} />;
    
    case 'standard_grid':
    default:
      return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-6">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} onClick={onProductClick} />
          ))}
        </div>
      );
  }
}
