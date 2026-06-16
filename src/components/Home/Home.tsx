import { useState, useEffect, useRef, useCallback } from 'react';
import { collection, onSnapshot, query, orderBy, doc, limit, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { Product, StoreConfig } from '../../types';
import { CATEGORIES } from '../../constants';
import Navbar from './Navbar';
import ProductCard from './ProductCard';
import { formatPrice, formatQuantityUnit } from '../../lib/utils';
import { motion } from 'motion/react';
import { Star, X, Grid, ShoppingBag, ShoppingBasket, Heart, Home as HomeIcon, CupSoda, Sparkles, Pencil } from 'lucide-react';

const getCategoryIcon = (category: string | null, sizeClass = "w-5 h-5 md:w-4 h-4") => {
  if (!category) return <Grid className={sizeClass} />;
  const catLower = category.toLowerCase();
  if (catLower.includes("daily") || catLower.includes("rozana")) return <ShoppingBag className={sizeClass} />;
  if (catLower.includes("grocer") || catLower.includes("rashan")) return <ShoppingBasket className={sizeClass} />;
  if (catLower.includes("personal") || catLower.includes("dekhbhal")) return <Heart className={sizeClass} />;
  if (catLower.includes("home") || catLower.includes("ghar")) return <HomeIcon className={sizeClass} />;
  if (catLower.includes("beverage") || catLower.includes("peene")) return <CupSoda className={sizeClass} />;
  if (catLower.includes("cosmetic") || catLower.includes("shringar")) return <Sparkles className={sizeClass} />;
  if (catLower.includes("stationery") || catLower.includes("lekhan")) return <Pencil className={sizeClass} />;
  return <ShoppingBag className={sizeClass} />;
};

const getTextSizeClasses = (size: string | undefined, isTextBanner: boolean = false) => {
  if (isTextBanner) {
    switch (size) {
      case 'xs': return 'text-[9px] sm:text-[10px] md:text-xs';
      case 'sm': return 'text-[10px] sm:text-xs md:text-sm';
      case 'md': return 'text-xs sm:text-sm md:text-base';
      case 'lg': return 'text-sm sm:text-base md:text-lg';
      case 'xl': return 'text-base sm:text-lg md:text-xl';
      case '2xl': return 'text-lg sm:text-xl md:text-2xl';
      case '3xl': return 'text-xl sm:text-2xl md:text-3xl';
      default: return 'text-xs sm:text-sm';
    }
  } else {
    switch (size) {
      case 'xs': return 'text-[8px] sm:text-[10px] md:text-xs';
      case 'sm': return 'text-[10px] sm:text-xs md:text-sm';
      case 'md': return 'text-xs sm:text-sm md:text-base';
      case 'lg': return 'text-sm sm:text-base md:text-lg';
      case 'xl': return 'text-base sm:text-lg md:text-xl';
      case '2xl': return 'text-lg sm:text-xl md:text-2xl';
      case '3xl': return 'text-xl sm:text-2xl md:text-3xl';
      default: return 'text-[10px] sm:text-xs md:text-sm';
    }
  }
};

const renderBanner = (banner: any, isBanner2: boolean = false) => {
  if (!banner || banner.type === 'none') return null;

  const urls = banner.urls && banner.urls.length > 0 
    ? banner.urls.filter(Boolean) 
    : (banner.url ? [banner.url] : []);

  if (urls.length === 0 && banner.type !== 'text') return null;

  const isMarqueeEnabled = isBanner2 
    ? (banner.enableMarquee === true) 
    : (banner.enableMarquee !== false);

  const isLTR = banner.marqueeDirection === 'ltr';
  const animationClass = isLTR ? 'animate-marquee-ltr' : 'animate-marquee-rtl';

  if (banner.type === 'text') {
    const textValue = banner.text || 'Special Offer';
    const repeats = Array(8).fill(textValue);
    return (
      <section 
        className="w-full overflow-hidden select-none relative border-y border-brand-border z-20 flex items-center shadow-sm" 
        style={{ backgroundColor: banner.bgColor || '#0047AB', color: banner.textColor || '#ffffff' }}
      >
        <div className="py-2.5 w-full overflow-hidden relative">
          {!isMarqueeEnabled ? (
            <div className={`w-full text-center font-bold uppercase tracking-widest px-4 py-1 ${getTextSizeClasses(banner.textSize, true)}`}>
              <span>✨ {textValue} ✨</span>
            </div>
          ) : (
            <div 
              key={`marquee-text-${banner.marqueeSpeed}-${isLTR}`}
              className={`${animationClass} hover:[animation-play-state:paused] flex whitespace-nowrap gap-16 font-bold uppercase tracking-widest shrink-0 ${getTextSizeClasses(banner.textSize, true)}`}
              style={{ 
                animation: `${isLTR ? "marquee-ltr" : "marquee-rtl"} ${banner.marqueeSpeed || 25}s linear infinite`,
                animationDuration: banner.marqueeSpeed ? `${banner.marqueeSpeed}s` : "25s",
                "--marquee-duration": banner.marqueeSpeed ? `${banner.marqueeSpeed}s` : "25s"
              } as React.CSSProperties}
            >
              {/* Set 1 */}
              <div className="flex gap-16 shrink-0">
                {repeats.map((t, idx) => (
                  <span key={`set1-${idx}`} className="flex items-center gap-2">
                    <span>✨</span>
                    <span>{t}</span>
                  </span>
                ))}
              </div>
              {/* Set 2 */}
              <div className="flex gap-16 shrink-0" aria-hidden="true">
                {repeats.map((t, idx) => (
                  <span key={`set2-${idx}`} className="flex items-center gap-2">
                    <span>✨</span>
                    <span>{t}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    );
  }

  if (banner.type === 'image' || banner.type === 'video') {
    let marqueeUrls = [...urls];
    if (marqueeUrls.length > 0 && isMarqueeEnabled) {
      while (marqueeUrls.length < 15) {
        marqueeUrls = [...marqueeUrls, ...urls];
      }
    }

    return (
      <section className="w-full overflow-hidden bg-black border-b border-brand-border min-h-[130px] sm:min-h-[180px] md:min-h-[240px] relative z-20">
        <div className="w-full relative overflow-hidden flex items-center bg-black">
          {!isMarqueeEnabled ? (
            /* Static images/videos side-by-side with 3px black gap/line */
            <div className="w-full flex flex-wrap sm:flex-nowrap gap-[3px] bg-black">
              {urls.map((url, idx) => (
                <div key={idx} className="flex-1 min-w-[150px] sm:min-w-0 h-[130px] sm:h-[180px] md:h-[240px] relative shrink-0 bg-black">
                  {banner.type === 'image' ? (
                    <img src={url} alt={`Static Banner-${idx}`} className="w-full h-full object-fill bg-black" referrerPolicy="no-referrer" />
                  ) : (
                    <video src={url} className="w-full h-full object-fill bg-black" autoPlay loop playsInline muted />
                  )}
                </div>
              ))}
            </div>
          ) : (
            /* Seamless continuous marquee of images/videos with 3px black gap/line */
            <div 
              key={`marquee-media-${banner.marqueeSpeed}-${isLTR}`}
              className={`${animationClass} hover:[animation-play-state:paused] flex shrink-0 h-[130px] sm:h-[180px] md:h-[240px] gap-[3px] bg-black`}
              style={{ 
                animation: `${isLTR ? "marquee-ltr" : "marquee-rtl"} ${banner.marqueeSpeed || 25}s linear infinite`,
                animationDuration: banner.marqueeSpeed ? `${banner.marqueeSpeed}s` : "25s",
                "--marquee-duration": banner.marqueeSpeed ? `${banner.marqueeSpeed}s` : "25s"
              } as React.CSSProperties}
            >
              {/* Set 1 */}
              <div className="flex gap-[3px] shrink-0 h-full bg-black">
                {marqueeUrls.map((url, idx) => (
                  <div key={`set1-${idx}`} className="h-full relative w-[240px] sm:w-[350px] md:w-[450px] shrink-0 bg-black">
                    {banner.type === 'image' ? (
                      <img src={url} alt={`Banner Set1-${idx}`} className="w-full h-full object-fill bg-black" referrerPolicy="no-referrer" />
                    ) : (
                      <video src={url} className="w-full h-full object-fill bg-black" autoPlay loop playsInline muted />
                    )}
                  </div>
                ))}
              </div>
              {/* Set 2 */}
              <div className="flex gap-[3px] shrink-0 h-full bg-black" aria-hidden="true">
                {marqueeUrls.map((url, idx) => (
                  <div key={`set2-${idx}`} className="h-full relative w-[240px] sm:w-[350px] md:w-[450px] shrink-0 bg-black">
                    {banner.type === 'image' ? (
                      <img src={url} alt={`Banner Set2-${idx}`} className="w-full h-full object-fill bg-black" referrerPolicy="no-referrer" />
                    ) : (
                      <video src={url} className="w-full h-full object-fill bg-black" autoPlay loop playsInline muted />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Content text overlay */}
          {banner.text && (
            <div className="absolute inset-x-0 bottom-0 flex justify-center p-3 select-none z-30 pointer-events-none bg-gradient-to-t from-black/40 to-transparent">
              <h3 
                className={`font-bold uppercase tracking-widest leading-snug text-center font-display drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] max-w-[95%] ${getTextSizeClasses(banner.textSize, false)}`}
                style={{ color: banner.textColor || '#ffffff' }}
              >
                {banner.text}
              </h3>
            </div>
          )}
        </div>
      </section>
    );
  }

  return null;
};

interface HomeProps {
  config: StoreConfig;
}

export default function Home({ config }: HomeProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [visibleItems, setVisibleItems] = useState(12);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const showIcons = true;
  
  const [dataStatus, setDataStatus] = useState({ 
    products: false, 
    logo: true, // simplified
    configReceived: true, // simplified
    prodImages: true  // simplified
  });
  
  const observer = useRef<IntersectionObserver | null>(null);
  const loaderRef = useRef<HTMLDivElement>(null);

  const isSearchEmpty = searchQuery.trim() === '';

  useEffect(() => {
    // Dynamic SEO update
    document.title = "Raj Kirana Store";
    
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Daily essentials aur kirana items ke liye sabse sasti aur achhi jagah.');
    }

    const metaKeywords = document.querySelector('meta[name="keywords"]');
    if (metaKeywords) {
      metaKeywords.setAttribute('content', 'Raj Kirana Store, Grocery Store, Rashan shop, Daily Essentials, General Store, Online Kirana');
    }
  }, []);

  useEffect(() => {
    // Sync Products with dynamic limit for pagination
    let productsQuery = query(
      collection(db, 'products'), 
      orderBy('createdAt', 'desc'),
      limit(isSearchEmpty ? 100 : 1000)
    );

    if (selectedCategory) {
      productsQuery = query(
        collection(db, 'products'),
        where('category', '==', selectedCategory),
        orderBy('createdAt', 'desc'),
        limit(visibleItems + 1)
      );
    }

    const unsubProducts = onSnapshot(
      productsQuery,
      (snapshot) => {
        const prodData = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Product));
        // Sort: special items first, then by date
        const sortedData = prodData.sort((a, b) => {
          if (a.isSpecial && !b.isSpecial) return -1;
          if (!a.isSpecial && b.isSpecial) return 1;
          return b.createdAt - a.createdAt;
        });
        setProducts(sortedData);
        setDataStatus(prev => ({ ...prev, products: true }));
      },
      (error) => handleFirestoreError(error, OperationType.GET, 'products')
    );

    return () => {
      unsubProducts();
    };
  }, [visibleItems, selectedCategory, isSearchEmpty]);

  // SIGNAL READY WHEN ALL KEY ASSETS ARE FULLY LOADED
  useEffect(() => {
    if (dataStatus.products) {
      setIsInitialLoad(false);
    }
  }, [dataStatus.products]);

  // Search & Category Logic
  const filteredProducts = products.filter((p) => {
    const matchesSearch = isSearchEmpty || (
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    const matchesCategory = !selectedCategory || p.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const specialItems = products.filter(p => p.isSpecial).slice(0, 2);
  
  // Responsive slice limit - only update if width changes to avoid scroll-induced resets on mobile
  useEffect(() => {
    let lastWidth = window.innerWidth;
    
    const handleResize = () => {
      const currentWidth = window.innerWidth;
      if (currentWidth !== lastWidth) {
        lastWidth = currentWidth;
        setVisibleItems(currentWidth < 1024 ? 6 : 12);
      }
    };
    
    // Initial set
    setVisibleItems(window.innerWidth < 1024 ? 6 : 12);
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const hasMore = products.length > visibleItems;

  const lastElementRef = useCallback((node: HTMLDivElement | null) => {
    if (isInitialLoad) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        // Debounce or slightly delay to prevent multiple calls
        setVisibleItems(prev => prev + 8);
      }
    }, { rootMargin: '200px' });

    if (node) observer.current.observe(node);
  }, [hasMore, isInitialLoad]);
  const displayProducts = isSearchEmpty
    ? products.slice(0, visibleItems)
    : filteredProducts.slice(0, visibleItems);

  return (
    <div className={`min-h-screen flex flex-col ${selectedProduct ? 'overflow-hidden' : ''}`}>
      <Navbar onSearch={setSearchQuery} config={config} />

      {/* Banner Section (Top Banner) */}
      {renderBanner(config.banner1 || (config.bannerType && config.bannerType !== 'none' && config.bannerUrl ? { type: config.bannerType, url: config.bannerUrl, text: '' } : null))}

      {/* Categories Filter Section - Compact, Slim & Solid Style */}
      <section className="sticky top-16 z-30 border-b border-brand-border py-2 md:py-1.5 shadow-sm bg-gray-100 bg-opacity-95 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 md:px-10 relative z-10">
          <div className="flex items-center gap-1.5 md:gap-2 overflow-x-auto pb-1 pt-0.5 scrollbar-hide no-scrollbar -mx-4 px-4 overflow-y-visible">
            {/* All Categories */}
            <button
              onClick={() => setSelectedCategory(null)}
              className={`flex flex-col md:flex-row items-center justify-center text-center gap-1 md:gap-1.5 px-2.5 py-1.5 md:px-3 md:py-1.5 min-w-[64px] md:min-w-0 rounded-xl md:rounded-full border transition-all duration-300 flex-shrink-0 ${
                !selectedCategory
                  ? 'bg-brand-accent border-brand-accent text-white shadow-sm'
                  : 'bg-white border-brand-border text-brand-muted hover:bg-gray-50'
              }`}
            >
              {showIcons && (
                <span className={!selectedCategory ? 'text-white' : 'text-brand-accent/70'}>
                  {getCategoryIcon(null)}
                </span>
              )}
              <span className="text-[11px] sm:text-xs md:text-[11px] font-bold tracking-wider uppercase whitespace-nowrap leading-none">
                ALL ITEMS
              </span>
            </button>

            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat;

              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`flex flex-col md:flex-row items-center justify-center text-center gap-1 md:gap-1.5 px-2.5 py-1.5 md:px-3 md:py-1.5 min-w-[64px] md:min-w-0 rounded-xl md:rounded-full border transition-all duration-300 flex-shrink-0 ${
                    isSelected
                      ? 'bg-brand-accent border-brand-accent text-white shadow-sm'
                      : 'bg-white border-brand-border text-brand-muted hover:bg-gray-50'
                  }`}
                >
                  {showIcons && (
                    <span className={isSelected ? 'text-white' : 'text-brand-accent/70'}>
                      {getCategoryIcon(cat)}
                    </span>
                  )}
                  <span className="text-[11px] sm:text-xs md:text-[11px] font-bold tracking-wider uppercase whitespace-nowrap leading-none">
                    {cat.split('(')[0].trim().toUpperCase()}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Banner Section 2 (Below Category Bar) */}
      {renderBanner(config.banner2, true)}

      {/* Main Product Feed */}



      <main className="flex-1 px-4 md:px-10 py-10 max-w-7xl mx-auto w-full">
        {selectedCategory && (
          <div className="mb-8 border-l-4 border-brand-accent pl-4 py-2 bg-brand-accent/5">
              <h2 className="text-xl font-display font-bold text-brand-accent">{selectedCategory}</h2>
              <p className="text-xs text-brand-muted">{filteredProducts.length} items available in this section</p>
          </div>
        )}
        
        {isInitialLoad ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="editorial-card animate-pulse bg-white">
                <div className="aspect-square bg-gray-100" />
                <div className="p-3 md:p-4 space-y-2 md:space-y-3">
                  <div className="h-2 bg-gray-100 rounded w-1/2" />
                  <div className="h-4 bg-gray-100 rounded w-3/4" />
                  <div className="h-5 md:h-6 bg-gray-100 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : displayProducts.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-6">
            {displayProducts.map((p) => (
              <ProductCard key={p.id} product={p} onClick={setSelectedProduct} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-gray-50 editorial-card mx-2">
            <h3 className="font-display text-2xl text-brand-muted">
              {searchQuery ? `No products found for "${searchQuery}"` : "No products"}
            </h3>
            {searchQuery && (
              <p className="mt-2 text-sm text-gray-400">Try searching for something else like "Rice" or "Oil".</p>
            )}
          </div>
        )}

        {hasMore && (
          <div ref={lastElementRef} className="mt-12 py-10 flex flex-col items-center justify-center gap-4">
            <div className="w-8 h-8 border-2 border-brand-accent/20 border-t-brand-accent rounded-full animate-spin" />
            <p className="text-[10px] uppercase font-bold tracking-widest text-brand-muted animate-pulse">
              Fetching more products...
            </p>
          </div>
        )}
      </main>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedProduct(null)}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative bg-white w-full max-w-2xl editorial-card overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[90vh]"
          >
            <button 
              onClick={() => setSelectedProduct(null)}
              className="absolute top-4 right-4 z-20 w-8 h-8 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md hover:bg-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-full md:w-[280px] lg:w-[320px] h-[220px] md:h-[280px] lg:h-[320px] bg-gray-50 flex-shrink-0 flex items-center justify-center border-b md:border-b-0 md:border-r border-brand-border overflow-hidden">
              {selectedProduct.imageUrl ? (
                <img 
                  src={selectedProduct.imageUrl} 
                  alt={selectedProduct.name} 
                  className="w-full h-full object-contain p-4 transition-all duration-300 hover:scale-105"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 opacity-10">
                  <Star className="w-20 h-20 text-brand-accent" />
                  <span className="font-display font-black text-4xl italic tracking-tighter">RK</span>
                </div>
              )}
            </div>

            <div className="p-6 md:p-8 flex flex-col flex-1 overflow-y-auto">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-brand-accent">
                  {selectedProduct.category}
                </span>
              </div>
              <h2 className="text-2xl md:text-3xl font-display font-bold mb-2 leading-tight">
                {selectedProduct.name}
              </h2>
              {selectedProduct.showQuantity && selectedProduct.quantityValue && (
                <div className="mb-4">
                  <span className="text-sm font-medium text-[#666] inline-flex">
                    Net Qty: {selectedProduct.quantityValue} {formatQuantityUnit(selectedProduct.quantityUnit || 'g')}
                  </span>
                </div>
              )}
              
              <div className="flex items-center gap-3 mb-6">
                <span className="text-3xl font-display font-bold text-brand-accent">
                  {formatPrice(selectedProduct.price)}
                </span>
                {selectedProduct.mrp && selectedProduct.mrp > selectedProduct.price && (
                  <div className="flex flex-col">
                    <span className="text-xs text-brand-muted line-through">
                      {formatPrice(selectedProduct.mrp)}
                    </span>
                    <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold">
                      SAVE {formatPrice(selectedProduct.mrp - selectedProduct.price)}
                    </span>
                  </div>
                )}
              </div>

              <div className="border-t border-brand-border pt-6 mt-auto">
                <h4 className="text-[10px] uppercase font-bold text-gray-400 mb-2">Description</h4>
                <p className="text-sm md:text-base text-brand-muted leading-relaxed italic">
                  {selectedProduct.description || "No specific details available for this item."}
                </p>
              </div>

              {!selectedProduct.available && (
                <div className="mt-6 p-3 bg-red-50 text-red-600 text-xs font-bold uppercase tracking-wider rounded text-center">
                  Currently Out of Stock
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}

      <footer className="border-t border-brand-border py-10 px-6 text-center text-xs text-brand-muted uppercase tracking-[0.2em]">
        &copy; {new Date().getFullYear()} Raj Kirana Store &bull; Quality and Freshness
      </footer>
    </div>
  );
}
