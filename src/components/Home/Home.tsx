import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, doc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { Product, Notice, StoreConfig } from '../../types';
import Navbar from './Navbar';
import Hero from './Hero';
import NoticeArea from './NoticeArea';
import ProductCard from './ProductCard';

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [config, setConfig] = useState<StoreConfig>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    // Sync Products
    const productsQuery = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    const unsubProducts = onSnapshot(
      productsQuery,
      (snapshot) => {
        const prodData = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Product));
        setProducts(prodData);
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
      },
      (error) => handleFirestoreError(error, OperationType.GET, 'notices')
    );

    // Sync Config
    const unsubConfig = onSnapshot(
      doc(db, 'config', 'global'),
      (snapshot) => {
        if (snapshot.exists()) {
          setConfig(snapshot.data() as StoreConfig);
        }
      },
      (error) => handleFirestoreError(error, OperationType.GET, 'config/global')
    );

    return () => {
      unsubProducts();
      unsubNotices();
      unsubConfig();
    };
  }, []);

  const latestNotice = notices.length > 0 ? notices[0] : null;

  // Search Logic
  const filteredProducts = products.filter((p) => {
    const term = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(term) ||
      p.description.toLowerCase().includes(term) ||
      p.category.toLowerCase().includes(term)
    );
  });

  // If searching for unavailable item, show categorization
  const isSearchEmpty = searchQuery.trim() === '';
  
  // Responsive slice limit
  const [initialLimit, setInitialLimit] = useState(12);
  
  useEffect(() => {
    const handleResize = () => {
      setInitialLimit(window.innerWidth < 1024 ? 6 : 12);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const displayProducts = isSearchEmpty
    ? (showAll ? filteredProducts : filteredProducts.slice(0, initialLimit))
    : filteredProducts;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar onSearch={setSearchQuery} />
      <Hero config={config} />
      <NoticeArea currentNotice={latestNotice} />

      <main className="flex-1 px-4 md:px-10 py-10 max-w-7xl mx-auto w-full">
        {displayProducts.length > 0 ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {displayProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-gray-50 editorial-card mx-2">
            <h3 className="font-display text-2xl text-brand-muted">No products found for "{searchQuery}"</h3>
            <p className="mt-2 text-sm text-gray-400">Try searching for something else like "Rice" or "Oil".</p>
          </div>
        )}

        {isSearchEmpty && !showAll && products.length > initialLimit && (
          <div className="mt-12 text-center">
            <button
              onClick={() => setShowAll(true)}
              className="editorial-btn-primary"
            >
              See All {products.length} Products
            </button>
          </div>
        )}
      </main>

      <footer className="border-t border-brand-border py-10 px-6 text-center text-xs text-brand-muted uppercase tracking-[0.2em]">
        &copy; {new Date().getFullYear()} Raj Kirana Store &bull; Quality and Freshness
      </footer>
    </div>
  );
}
