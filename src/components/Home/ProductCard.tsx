import React from 'react';
import { Product } from '../../types';
import { formatPrice } from '../../lib/utils';
import { motion } from 'motion/react';

interface ProductCardProps {
  product: Product;
  key?: React.Key;
}

export default function ProductCard({ product }: ProductCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`editorial-card group ${!product.available ? 'opacity-75' : ''}`}
    >
      <div className="relative aspect-square overflow-hidden bg-gray-50 border-b border-brand-border">
        <img
          src={product.imageUrl || `https://picsum.photos/seed/${product.id}/400/400`}
          alt={product.name}
          referrerPolicy="no-referrer"
          className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${!product.available ? 'grayscale brightness-90' : ''}`}
        />

        {!product.available && (
          <div className="absolute top-2 right-2 bg-gray-600 text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded-sm">
            Unavailable
          </div>
        )}

        {product.available && (
          <div className="absolute top-2 right-2 bg-green-100 text-green-800 text-[10px] uppercase font-bold px-2 py-0.5 rounded-sm">
            In Stock
          </div>
        )}
      </div>

      <div className="p-4 flex flex-col h-40">
        <div className="text-[10px] uppercase tracking-wider text-brand-muted font-semibold mb-1">
          {product.category}
        </div>
        <h3 className="font-display font-bold text-base line-clamp-1 mb-1">
          {product.name}
        </h3>
        <p className="text-xs text-brand-muted line-clamp-2 mb-auto leading-tight">
          {product.description}
        </p>
        <div className="mt-4 flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-xl text-brand-accent">
              {formatPrice(product.price)}
            </span>
            {product.mrp && product.mrp > product.price && (
              <span className="text-xs text-brand-muted line-through">
                {formatPrice(product.mrp)}
              </span>
            )}
          </div>
          {product.mrp && product.mrp > product.price && (
            <span className="text-[10px] font-bold text-green-600 uppercase">
              {Math.round(((product.mrp - product.price) / product.mrp) * 100)}% OFF
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
