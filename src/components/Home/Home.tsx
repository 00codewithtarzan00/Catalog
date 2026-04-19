import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, doc, limit, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { Product, Notice, StoreConfig } from '../../types';
import { CATEGORIES } from '../../constants';
import Navbar from './Navbar';
import Hero from './Hero';
import NoticeArea from './NoticeArea';
import ProductCard from './ProductCard';
import { formatPrice } from '../../lib/utils';
import { motion } from 'motion/react';
import { Star, X } from 'lucide-react';

interface HomeProps {
  config: StoreConfig;
  onReady: () => void;
}

export default function Home({ config, onReady }: HomeProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [visibleItems, setVisibleItems] = useState(12);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  const [dataStatus, setDataStatus] = useState({ 
    products: false, 
    notices: false, 
    hero: false, 
    logo: false, 
    configReceived: false,
    prodImages: false 
  });

  const isSearchEmpty = searchQuery.trim() === '';

  // CORE ASSET PRELOADING (Hero & Logo)
  useEffect(() => {
    if (Object.keys(config).length > 0) {
      setDataStatus(prev => ({ ...prev, configReceived: true }));
      
      const preloadImage = (url: string, key: 'hero' | 'logo') => {
        const img = new Image();
        img.src = url;
        img.onload = () => setDataStatus(prev => ({ ...prev, [key]: true }));
        img.onerror = () => setDataStatus(prev => ({ ...prev, [key]: true }));
      };

      if (config.heroImageUrl) preloadImage(config.heroImageUrl, 'hero');
      else setDataStatus(prev => ({ ...prev, hero: true }));

      if (config.logoUrl) preloadImage(config.logoUrl, 'logo');
      else setDataStatus(prev => ({ ...prev, logo: true }));
    }
  }, [config]);

  // PRODUCT IMAGE PRELOADING
  useEffect(() => {
    if (products.length > 0) {
      const topProducts = products.slice(0, 4); // Preload first 4 product images
      let loadedCount = 0;
      
      if (topProducts.filter(p => p.imageUrl).length === 0) {
        setDataStatus(prev => ({ ...prev, prodImages: true }));
        return;
      }

      topProducts.forEach(p => {
        if (p.imageUrl) {
          const img = new Image();
          img.src = p.imageUrl;
          img.onload = () => {
            loadedCount++;
            if (loadedCount >= topProducts.filter(p => p.imageUrl).length) {
              setDataStatus(prev => ({ ...prev, prodImages: true }));
            }
          };
          img.onerror = () => {
            loadedCount++;
            if (loadedCount >= topProducts.filter(p => p.imageUrl).length) {
              setDataStatus(prev => ({ ...prev, prodImages: true }));
            }
          };
        }
      });
    }
  }, [products]);

  useEffect(() => {
    // Sync Products with dynamic limit for pagination
    let productsQuery = query(
      collection(db, 'products'), 
      orderBy('createdAt', 'desc'),
      limit(isSearchEmpty ? visibleItems + 1 : 1000)
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
        setProducts(prodData);
        setDataStatus(prev => ({ ...prev, products: true }));
      },
      (error) => handleFirestoreError(error, OperationType.GET, 'products')
    );

    // Sync Notices
    const noticesQuery = query(collection(db, 'notices'), orderBy('createdAt', 'desc'));
    const unsubNotices = onSnapshot(
      noticesQuery,
      (snapshot) => {
        const noticeData = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Notice));
        setNotices(noticeData);
        setDataStatus(prev => ({ ...prev, notices: true }));
      },
      (error) => handleFirestoreError(error, OperationType.GET, 'notices')
    );

    return () => {
      unsubProducts();
      unsubNotices();
    };
  }, [visibleItems, selectedCategory, isSearchEmpty]);

  // SIGNAL READY WHEN ALL KEY ASSETS ARE FULLY LOADED
  useEffect(() => {
    const { configReceived, products, notices, hero, logo, prodImages } = dataStatus;
    if (configReceived && products && notices && hero && logo && prodImages) {
      // Allow DOM to paint
      const timer = setTimeout(onReady, 600);
      return () => clearTimeout(timer);
    }
  }, [dataStatus, onReady]);

  const latestNotice = notices.length > 0 ? notices[0] : null;

  // Search & Category Logic
  const filteredProducts = products.filter((p) => {
    const matchesSearch = isSearchEmpty || (
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase())
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
  const displayProducts = isSearchEmpty
    ? products.slice(0, visibleItems)
    : filteredProducts.slice(0, visibleItems);

  return (
    <div className={`min-h-screen flex flex-col ${selectedProduct ? 'overflow-hidden' : ''}`}>
      <Navbar onSearch={setSearchQuery} config={config} />
      <Hero config={config} />
      <NoticeArea currentNotice={latestNotice} />

      {/* Categories Filter Section */}
      <section className="bg-white border-b border-brand-border py-6 px-4 md:px-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <h2 className="text-[10px] uppercase font-bold tracking-[0.2em] text-brand-muted shrink-0">Browse Shop</h2>
          <div className="relative w-full max-w-sm">
            <select
              onChange={(e) => setSelectedCategory(e.target.value === 'all' ? null : e.target.value)}
              value={selectedCategory || 'all'}
              className="w-full h-11 px-4 bg-gray-50 border border-brand-border rounded-md font-sans text-sm font-semibold appearance-none cursor-pointer focus:outline-none focus:border-brand-accent transition-colors"
            >
              <option value="all">All Categories (Sab Saaman)</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-brand-accent">
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>
        </div>
      </section>

      {/* Special Discounted Section */}
      {specialItems.length > 0 && (
        <section className="bg-brand-accent/5 py-12 px-4 md:px-10 border-b border-brand-border">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-2 mb-8 justify-center lg:justify-start">
              <Star className="w-5 h-5 text-brand-accent fill-brand-accent" />
              <h2 className="font-display text-2xl font-bold text-brand-accent tracking-tight underline decoration-1 underline-offset-8">Dhamaka Deals (Special Offers)</h2>
            </div>
            
            <div className={`grid gap-6 ${specialItems.length === 1 ? 'grid-cols-1 max-w-3xl mx-auto' : 'grid-cols-1 md:grid-cols-2 lg:max-w-6xl'}`}>
              {specialItems.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={() => setSelectedProduct(item)}
                  className="bg-white p-6 border-2 border-brand-accent relative flex flex-col md:flex-row gap-6 shadow-xl overflow-hidden group min-h-[220px] cursor-pointer"
                >
                  <div className="absolute -top-10 -right-10 bg-brand-accent text-white w-24 h-24 flex items-end justify-center pb-4 rotate-45 transform font-bold text-sm">
                    {Math.round(((item.mrp - item.price) / item.mrp) * 100)}% 
                  </div>
                  
                  <div className="w-full md:w-40 aspect-square overflow-hidden bg-gray-50 flex-shrink-0">
                    <img 
                      src={item.imageUrl || `https://picsum.photos/seed/${item.id}/400/400`} 
                      alt={item.name} 
                      className="w-full h-full object-cover transition-transform group-hover:scale-110"
                    />
                  </div>
                  
                  <div className="flex-1 flex flex-col justify-center py-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] uppercase font-bold text-brand-accent">{item.category}</span>
                      <span className="text-[10px] uppercase font-bold text-white bg-brand-accent px-1 rounded animate-pulse">Save ₹{item.mrp - item.price}</span>
                    </div>
                    <h3 className="font-display text-2xl font-bold mb-2 leading-tight break-words">{item.name}</h3>
                    <p className="text-sm text-brand-muted mb-6 font-sans leading-relaxed italic break-words">"{item.description}"</p>
                    
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
        
        {displayProducts.length > 0 ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
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
          <div className="mt-12 text-center">
            <button
              onClick={() => setVisibleItems(prev => prev + 6)}
              className="editorial-btn-primary"
            >
              See More
            </button>
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

            <div className="w-full md:w-1/2 aspect-square bg-gray-50 flex-shrink-0">
              <img 
                src={selectedProduct.imageUrl || `https://picsum.photos/seed/${selectedProduct.id}/600/600`} 
                alt={selectedProduct.name} 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
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
