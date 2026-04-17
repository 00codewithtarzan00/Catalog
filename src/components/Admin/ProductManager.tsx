import React, { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot, query, orderBy, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { Product } from '../../types';
import { Plus, Edit2, Trash2, X, Image as ImageIcon, Upload } from 'lucide-react';
import { formatPrice } from '../../lib/utils';

export default function ProductManager() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Partial<Product> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
    }, err => handleFirestoreError(err, OperationType.LIST, 'products'));
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 800000) {
        alert("Image too large. Please use a file under 800KB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setCurrentProduct(prev => ({ ...prev, imageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProduct?.name || !currentProduct?.price || !currentProduct?.category) return;

    try {
      const data = {
        ...currentProduct,
        price: Number(currentProduct.price),
        mrp: Number(currentProduct.mrp || currentProduct.price),
        createdAt: currentProduct.id ? currentProduct.createdAt : Date.now(),
        available: currentProduct.available ?? true,
      };

      if (currentProduct.id) {
        await updateDoc(doc(db, 'products', currentProduct.id), data);
      } else {
        await addDoc(collection(db, 'products'), data);
      }
      setIsEditing(false);
      setCurrentProduct(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'products');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'products', id));
      setDeleteConfirmId(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'products');
    }
  };

  const toggleAvailability = async (product: Product) => {
    try {
      await updateDoc(doc(db, 'products', product.id), {
        available: !product.available
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'products');
    }
  };

  return (
    <div className="animate-fade-in">
      <header className="flex justify-between items-end mb-8 border-b border-brand-border pb-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-brand-accent">Live Inventory</h1>
          <p className="text-sm text-brand-muted mt-1">Manage rates and availability of stock items.</p>
        </div>
        <button
          onClick={() => {
            setCurrentProduct({ available: true, imageUrl: '' });
            setIsEditing(true);
          }}
          className="editorial-btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add Product
        </button>
      </header>

      {/* Grid of Products for Admin */}
      <div className="grid grid-cols-1 gap-4">
        {products.map((p) => (
          <div key={p.id} className="bg-white editorial-card p-4 flex items-center gap-6">
            <div className="w-16 h-16 bg-gray-100 rounded flex-shrink-0 overflow-hidden">
              <img src={p.imageUrl || 'https://picsum.photos/seed/gro/100/100'} alt={p.name} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] uppercase font-bold text-brand-muted bg-gray-100 px-1.5 py-0.5 rounded">
                  {p.category}
                </span>
                <h3 className="font-bold text-sm tracking-tight">{p.name}</h3>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-brand-accent">{formatPrice(p.price)}</span>
                  {p.mrp && p.mrp > p.price && (
                    <span className="text-[10px] text-gray-400 line-through">{formatPrice(p.mrp)}</span>
                  )}
                </div>
                <span className="text-gray-400 truncate max-w-xs">{p.description}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold uppercase ${p.available ? 'text-green-600' : 'text-red-600'}`}>
                  {p.available ? 'Available' : 'Unavailable'}
                </span>
                <button
                  onClick={() => toggleAvailability(p)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${p.available ? 'bg-brand-accent' : 'bg-gray-300'}`}
                >
                  <div className={`absolute top-1 left-1 bg-white w-3 h-3 rounded-full transition-transform ${p.available ? 'translate-x-5' : ''}`} />
                </button>
              </div>

              <div className="flex gap-1">
                <button
                  onClick={() => {
                    setCurrentProduct(p);
                    setIsEditing(true);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-full text-brand-muted transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                
                {deleteConfirmId === p.id ? (
                  <div className="flex items-center gap-1 animate-fade-in">
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="text-[10px] bg-red-600 text-white px-2 py-1 rounded font-bold uppercase"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(null)}
                      className="text-[10px] bg-gray-200 text-gray-800 px-2 py-1 rounded font-bold uppercase"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteConfirmId(p.id)}
                    className="p-2 hover:bg-gray-100 rounded-full text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Tooltip Placeholder/Form */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSave}
            className="bg-white w-full max-w-lg editorial-card p-8 animate-slide-up"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-display font-bold">{currentProduct?.id ? 'Edit Rate' : 'Add New Product'}</h2>
              <button type="button" onClick={() => setIsEditing(false)} className="text-brand-muted hover:text-black">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-brand-muted">Category</label>
                  <input
                    required
                    className="editorial-input"
                    placeholder="e.g. Pulses, Spices"
                    value={currentProduct?.category || ''}
                    onChange={e => setCurrentProduct({ ...currentProduct, category: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-brand-muted">Marked Price (MRP)</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    className="editorial-input"
                    placeholder="MRP ₹"
                    value={currentProduct?.mrp || ''}
                    onChange={e => setCurrentProduct({ ...currentProduct, mrp: parseFloat(e.target.value) })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-brand-muted">Selling Price (Rate)</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    className="editorial-input"
                    placeholder="Rate ₹"
                    value={currentProduct?.price || ''}
                    onChange={e => setCurrentProduct({ ...currentProduct, price: parseFloat(e.target.value) })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-brand-muted">Product Name</label>
                  <input
                    required
                    className="editorial-input"
                    placeholder="e.g. Master Gold Tea"
                    value={currentProduct?.name || ''}
                    onChange={e => setCurrentProduct({ ...currentProduct, name: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-brand-muted">Description</label>
                <textarea
                  className="editorial-input min-h-[80px]"
                  placeholder="Details like weight, age, or brand..."
                  value={currentProduct?.description || ''}
                  onChange={e => setCurrentProduct({ ...currentProduct, description: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-brand-muted">Image URL or Upload</label>
                <div className="flex gap-2">
                  <input
                    className="editorial-input h-10"
                    placeholder="https://..."
                    value={currentProduct?.imageUrl || ''}
                    onChange={e => setCurrentProduct({ ...currentProduct, imageUrl: e.target.value })}
                  />
                  <button 
                    type="button" 
                    onClick={() => fileInputRef.current?.click()}
                    className="editorial-btn-secondary h-10 px-3 flex items-center justify-center"
                    title="Upload File"
                  >
                    <Upload className="w-4 h-4" />
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleFileUpload} 
                  />
                  <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center flex-shrink-0 border border-brand-border">
                    {currentProduct?.imageUrl ? <img src={currentProduct.imageUrl} className="w-full h-full object-cover" /> : <ImageIcon className="w-4 h-4 text-gray-400" />}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <button
                type="submit"
                className="flex-1 editorial-btn-primary"
              >
                Save Changes
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="flex-1 editorial-btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
