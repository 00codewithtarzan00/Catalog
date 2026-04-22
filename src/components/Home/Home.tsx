import { useState, useEffect, useRef, useCallback } from 'react';
import { collection, onSnapshot, query, orderBy, doc, limit, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { Product, StoreConfig } from '../../types';
import { CATEGORIES } from '../../constants';
import Navbar from './Navbar';
import ProductCard from './ProductCard';
import { formatPrice } from '../../lib/utils';
import { motion } from 'motion/react';
import { Star, X } from 'lucide-react';

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

      {/* Categories Filter Section - Amazon/Flipkart style with background */}
      <section className="relative border-b border-brand-border py-1 md:py-2">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <img 
            src={config.heroImageUrl || "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=2000"} 
            alt="Background" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px]" />
        </div>

        <div className="max-w-7xl mx-auto px-4 md:px-10 relative z-10 pt-2 pb-0">
          <div className="flex items-center gap-6 overflow-x-auto pb-2 pt-1 scrollbar-hide no-scrollbar -mx-4 px-4 overflow-y-visible">
            {/* All Categories */}
            <button
              onClick={() => setSelectedCategory(null)}
              className="flex flex-col items-center gap-2 group min-w-[70px] md:min-w-[90px] flex-shrink-0"
            >
              <div className={`w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center p-0.5 border-2 transition-all duration-300 ${!selectedCategory ? 'border-brand-accent scale-110 shadow-lg' : 'border-transparent'}`}>
                <div className="w-full h-full rounded-full bg-gray-100 overflow-hidden flex items-center justify-center">
                  {config.allCategoriesImageUrl ? (
                    <img 
                      src={config.allCategoriesImageUrl} 
                      alt="All"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full bg-brand-accent/10 flex items-center justify-center">
                      <Star className="w-6 h-6 text-brand-accent/40" />
                    </div>
                  )}
                </div>
              </div>
              <span className={`text-[10px] md:text-xs font-bold text-center tracking-tight transition-colors ${!selectedCategory ? 'text-brand-accent' : 'text-brand-muted group-hover:text-brand-accent'}`}>
                All items
              </span>
            </button>

            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat;
              const catImageUrl = config.categoryImages?.[cat];

              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className="flex flex-col items-center gap-2 group min-w-[70px] md:min-w-[90px] flex-shrink-0"
                >
                  <div className={`w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center p-0.5 border-2 transition-all duration-300 ${isSelected ? 'border-brand-accent scale-110 shadow-lg' : 'border-transparent'}`}>
                    <div className="w-full h-full rounded-full bg-gray-100 overflow-hidden flex items-center justify-center">
                      {catImageUrl ? (
                        <img 
                          src={catImageUrl} 
                          alt={cat}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full bg-brand-accent/5 flex items-center justify-center">
                          <span className="text-xl font-bold text-brand-accent/20">{cat.charAt(0)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <span className={`text-[10px] md:text-xs font-bold text-center tracking-tight transition-colors line-clamp-2 leading-tight px-1 ${isSelected ? 'text-brand-accent' : 'text-brand-muted group-hover:text-brand-accent'}`}>
                    {cat.split(' (')[0]}
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
        <section className="bg-blue-100/50 py-12 px-4 md:px-10 border-b border-brand-accent/5 shadow-inner">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-2 mb-8 justify-center lg:justify-start">
              <Star className="w-5 h-5 text-brand-accent fill-brand-accent animate-pulse" />
              <h2 className="font-display text-2xl font-bold text-brand-accent tracking-tight uppercase underline decoration-2 underline-offset-8 decoration-brand-accent/20">Dhamaka Deals (Special Offers)</h2>
            </div>
            
            {isInitialLoad ? (
               <div className="grid grid-cols-1 md:grid-cols-2 lg:max-w-6xl gap-6">
                 {[1, 2].map(i => (
                   <div key={i} className="bg-white p-6 border-2 border-brand-accent/20 animate-pulse flex flex-col md:flex-row gap-6 h-[220px]">
                     <div className="w-full md:w-40 aspect-square bg-gray-100 shrink-0" />
                     <div className="flex-1 space-y-4 py-2">
                       <div className="h-3 bg-gray-100 w-24" />
                       <div className="h-8 bg-gray-100 w-3/4" />
                       <div className="h-4 bg-gray-100 w-1/2" />
                       <div className="h-10 bg-gray-100 w-32 mt-auto" />
                     </div>
                   </div>
                 ))}
               </div>
            ) : (
              <div className={`grid gap-6 ${specialItems.length === 1 ? 'grid-cols-1 max-w-3xl mx-auto' : 'grid-cols-1 md:grid-cols-2 lg:max-w-6xl'}`}>
                {specialItems.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={() => setSelectedProduct(item)}
                    className="bg-white p-6 border-2 border-brand-accent relative flex flex-col md:flex-row gap-6 shadow-xl overflow-hidden group min-h-[220px] cursor-pointer hover:shadow-2xl transition-all"
                  >
                    <div className="absolute -top-10 -right-10 bg-brand-accent text-white w-24 h-24 flex items-end justify-center pb-4 rotate-45 transform font-bold text-sm z-10">
                      {Math.round(((item.mrp - item.price) / item.mrp) * 100)}% 
                    </div>
                    
                    <div className="w-full md:w-40 aspect-square overflow-hidden bg-gray-50 flex-shrink-0 flex items-center justify-center">
                      {item.imageUrl ? (
                        <img 
                          src={item.imageUrl} 
                          alt={item.name} 
                          className="w-full h-full object-cover transition-transform group-hover:scale-110"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <Star className="w-12 h-12 text-brand-accent/10" />
                      )}
                    </div>
                    
                    <div className="flex-1 flex flex-col justify-center py-2">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] uppercase font-bold text-brand-accent">{item.category}</span>
                        <span className="text-[10px] uppercase font-bold text-white bg-brand-accent px-1 rounded animate-pulse">Save ₹{item.mrp - item.price}</span>
                      </div>
                      <h3 className="font-display text-2xl font-bold mb-2 leading-tight break-words">{item.name}</h3>
                      <p className="text-sm text-brand-muted mb-6 font-sans leading-relaxed italic break-words line-clamp-2">"{item.description}"</p>
                      
                      <div className="flex items-end gap-3 mt-auto">
                        <div className="flex flex-col">
                           <span className="text-xs text-brand-muted line-through font-bold">{formatPrice(item.mrp)}</span>
                           <span className="text-4xl font-display font-black text-brand-accent">{formatPrice(item.price)}</span>
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
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="editorial-card animate-pulse bg-white">
                <div className="aspect-[3/2] md:aspect-square bg-gray-100" />
                <div className="p-1.5 md:p-4 space-y-1.5 md:space-y-3">
                  <div className="h-1.5 bg-gray-100 rounded w-1/2" />
                  <div className="h-3 bg-gray-100 rounded w-3/4" />
                  <div className="h-3 md:h-6 bg-gray-100 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : displayProducts.length > 0 ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
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

            <div className="w-full md:w-1/2 aspect-square bg-gray-50 flex-shrink-0 flex items-center justify-center border-b md:border-b-0 md:border-r border-brand-border">
              {selectedProduct.imageUrl ? (
                <img 
                  src={selectedProduct.imageUrl} 
                  alt={selectedProduct.name} 
                  className="w-full h-full object-cover"
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
              <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-brand-accent mb-2">
                {selectedProduct.category}
              </div>
              <h2 className="text-2xl md:text-3xl font-display font-bold mb-4 leading-tight">
                {selectedProduct.name}
              </h2>
              
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
