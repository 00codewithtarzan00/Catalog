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

const getCategoryIcon = (category: string | null) => {
  if (!category) return <Grid className="w-4 h-4" />;
  const catLower = category.toLowerCase();
  if (catLower.includes("daily") || catLower.includes("rozana")) return <ShoppingBag className="w-4 h-4" />;
  if (catLower.includes("grocer") || catLower.includes("rashan")) return <ShoppingBasket className="w-4 h-4" />;
  if (catLower.includes("personal") || catLower.includes("dekhbhal")) return <Heart className="w-4 h-4" />;
  if (catLower.includes("home") || catLower.includes("ghar")) return <HomeIcon className="w-4 h-4" />;
  if (catLower.includes("beverage") || catLower.includes("peene")) return <CupSoda className="w-4 h-4" />;
  if (catLower.includes("cosmetic") || catLower.includes("shringar")) return <Sparkles className="w-4 h-4" />;
  if (catLower.includes("stationery") || catLower.includes("lekhan")) return <Pencil className="w-4 h-4" />;
  return <ShoppingBag className="w-4 h-4" />;
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

      {/* Banner Section */}
      {config.bannerType && config.bannerType !== 'none' && config.bannerUrl && (
        <section className="w-full overflow-hidden bg-gray-100 border-b border-brand-border h-[150px] sm:h-[220px] md:h-[300px] lg:h-[350px] relative z-20">
          <div className="w-full h-full relative">
            {config.bannerType === 'image' ? (
              <img 
                src={config.bannerUrl} 
                alt="Store Banner" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <video 
                src={config.bannerUrl} 
                className="w-full h-full object-cover"
                autoPlay 
                loop 
                muted 
                playsInline
                controls={false}
              />
            )}
          </div>
        </section>
      )}

      {/* Categories Filter Section - Compact, Slim & Solid Style */}
      <section className="sticky top-16 z-30 border-b border-brand-border py-1.5 shadow-sm bg-white bg-opacity-95 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 md:px-10 relative z-10">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 scrollbar-hide no-scrollbar -mx-4 px-4 overflow-y-visible">
            {/* All Categories */}
            <button
              onClick={() => setSelectedCategory(null)}
              className={`flex items-center gap-1.5 px-3 py-1 md:py-1.5 rounded-full border transition-all duration-300 flex-shrink-0 ${
                !selectedCategory
                  ? 'bg-brand-accent border-brand-accent text-white shadow-sm'
                  : 'bg-gray-50 border-brand-border text-brand-muted hover:bg-gray-100'
              }`}
            >
              {showIcons && (
                <span className={!selectedCategory ? 'text-white' : 'text-brand-accent/70'}>
                  {getCategoryIcon(null)}
                </span>
              )}
              <span className="text-[10px] md:text-[11px] font-bold tracking-wider uppercase whitespace-nowrap">
                ALL ITEMS
              </span>
            </button>

            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat;

              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`flex items-center gap-1.5 px-3 py-1 md:py-1.5 rounded-full border transition-all duration-300 flex-shrink-0 ${
                    isSelected
                      ? 'bg-brand-accent border-brand-accent text-white shadow-sm'
                      : 'bg-gray-50 border-brand-border text-brand-muted hover:bg-gray-100'
                  }`}
                >
                  {showIcons && (
                    <span className={isSelected ? 'text-white' : 'text-brand-accent/70'}>
                      {getCategoryIcon(cat)}
                    </span>
                  )}
                  <span className="text-[10px] md:text-[11px] font-bold tracking-wider uppercase whitespace-nowrap">
                    {cat.split('(')[0].trim().toUpperCase()}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Main Product Feed */}

      {/* Dhamaka Deals Section - Grid Layout */}
      {!selectedCategory && isSearchEmpty && (isInitialLoad || specialItems.length > 0) && (
        <section className="bg-blue-100/50 py-5 px-4 md:px-10 border-b border-brand-accent/5 shadow-inner">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-1.5 mb-4 justify-center lg:justify-start">
              <Star className="w-4 h-4 text-brand-accent fill-brand-accent animate-pulse" />
              <h2 className="font-display text-base md:text-lg font-bold text-brand-accent tracking-normal uppercase underline decoration-2 underline-offset-4 decoration-brand-accent/20">Dhamaka Deals (Special Offers)</h2>
            </div>
            
            {isInitialLoad ? (
               <div className="grid grid-cols-1 md:grid-cols-2 lg:max-w-6xl gap-4">
                 {[1, 2].map(i => (
                   <div key={i} className="bg-white p-3 border-2 border-brand-accent/20 animate-pulse flex flex-row gap-4 h-[120px] md:h-[140px] shadow-sm">
                     <div className="w-20 md:w-28 h-20 md:h-28 bg-gray-100 shrink-0" />
                     <div className="flex-1 space-y-2 py-1">
                       <div className="h-3 bg-gray-100 w-20" />
                       <div className="h-4 bg-gray-100 w-3/4" />
                       <div className="h-6 bg-gray-100 w-24 mt-auto" />
                     </div>
                   </div>
                 ))}
               </div>
            ) : (
              <div className={`grid gap-4 ${specialItems.length === 1 ? 'grid-cols-1 max-w-2xl mx-auto' : 'grid-cols-1 md:grid-cols-2 lg:max-w-6xl'}`}>
                {specialItems.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={() => setSelectedProduct(item)}
                    className="bg-white p-3 border-2 border-brand-accent relative flex flex-row gap-4 shadow-md overflow-hidden group min-h-[120px] md:min-h-[140px] cursor-pointer hover:shadow-lg transition-all"
                  >
                    <div className="absolute top-0 right-0 bg-brand-accent text-white text-[9px] md:text-[10px] uppercase font-bold px-2 py-0.5 shadow-sm z-10 leading-none">
                      {Math.round(((item.mrp - item.price) / item.mrp) * 100)}% OFF
                    </div>
                    
                    <div className="w-20 md:w-28 h-20 md:h-28 overflow-hidden bg-gray-50 flex-shrink-0 flex items-center justify-center p-1 border border-gray-100 rounded-sm">
                      {item.imageUrl ? (
                        <img 
                          src={item.imageUrl} 
                          alt={item.name} 
                          className="w-full h-full object-contain p-1 transition-transform group-hover:scale-105"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <Star className="w-6 h-6 text-brand-accent/20" />
                      )}
                    </div>
                    
                    <div className="flex-1 flex flex-col justify-between py-0.5 min-w-0">
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                          <span className="text-[8px] md:text-[10px] uppercase font-bold text-brand-accent leading-none">{item.category}</span>
                          <span className="text-[8px] md:text-[10px] uppercase font-bold text-white bg-brand-accent px-1 rounded animate-pulse leading-none">Save ₹{item.mrp - item.price}</span>
                        </div>
                        <h3 className="font-display text-xs md:text-base font-bold mb-0.5 leading-tight break-words line-clamp-2 h-[28px] md:h-auto overflow-hidden text-brand-text">{item.name}</h3>
                        {item.showQuantity && item.quantityValue && (
                          <div className="mb-0.5">
                            <span className="text-[9px] md:text-xs font-semibold text-[#666] whitespace-nowrap inline-flex">
                              {item.quantityValue} {formatQuantityUnit(item.quantityUnit || 'g')}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-end gap-2 mt-1">
                        <div className="flex flex-col">
                           <span className="text-[9px] md:text-xs text-brand-muted line-through font-bold leading-none">{formatPrice(item.mrp)}</span>
                           <span className="text-base md:text-xl font-display font-black text-brand-accent leading-none mt-1">{formatPrice(item.price)}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      <main className="flex-1 px-4 md:px-10 py-10 max-w-7xl mx-auto w-full">
        {selectedCategory && (
          <div className="mb-8 border-l-4 border-brand-accent pl-4 py-2 bg-brand-accent/5">
              <h2 className="text-xl font-display font-bold text-brand-accent">{selectedCategory}</h2>
              <p className="text-xs text-brand-muted">{filteredProducts.length} items available in this section</p>
          </div>
        )}
        
        {isInitialLoad ? (
          <div className="grid grid-cols-3 md:grid-cols-4 gap-1.5 md:gap-6">
            {[...Array(9)].map((_, i) => (
              <div key={i} className="editorial-card animate-pulse bg-white">
                <div className="aspect-square bg-gray-100" />
                <div className="p-1.5 md:p-4 space-y-1.5 md:space-y-3">
                  <div className="h-2 bg-gray-100 rounded w-1/2" />
                  <div className="h-3 bg-gray-100 rounded w-3/4" />
                  <div className="h-4 bg-gray-100 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : displayProducts.length > 0 ? (
          <div className="grid grid-cols-3 md:grid-cols-4 gap-1.5 md:gap-6">
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
