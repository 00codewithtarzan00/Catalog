import React from 'react';
import { Product } from '../../types';
import { formatPrice } from '../../lib/utils';
import { motion } from 'motion/react';

interface ProductCardProps {
  product: Product;
  onClick: (product: Product) => void;
}

export default function ProductCard({ product, onClick }: ProductCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => onClick(product)}
      className={`editorial-card group cursor-pointer ${!product.available ? 'opacity-75' : ''}`}
    >
      <div className="relative aspect-[4/3] md:aspect-square overflow-hidden bg-gray-50 border-b border-brand-border flex items-center justify-center">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            referrerPolicy="no-referrer"
            loading="lazy"
            className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${!product.available ? 'grayscale brightness-90' : ''}`}
          />
        ) : (
          <div className="w-full h-full bg-gray-50 flex items-center justify-center">
            <span className="text-xl md:text-3xl font-black text-brand-accent/10 italic">RK</span>
          </div>
        )}

        {!product.available && (
          <div className="absolute top-1 md:top-2 right-1 md:right-2 bg-gray-600 text-white text-[8px] md:text-[10px] uppercase font-bold px-1 md:px-2 py-0.5 rounded-sm">
            Unavailable
          </div>
        )}

        {product.available && (
          <div className="absolute top-1 md:top-2 right-1 md:right-2 bg-blue-100 text-blue-800 text-[8px] md:text-[10px] uppercase font-bold px-1 md:px-2 py-0.5 rounded-sm">
            In Stock
          </div>
        )}
      </div>

      <div className="p-2 md:p-4 flex flex-col min-h-0 md:min-h-32">
        <div className="text-[8px] md:text-[10px] uppercase tracking-wider text-brand-muted font-semibold mb-0">
          {product.category}
        </div>
        <h3 className="font-display font-medium text-[13px] md:text-lg leading-tight line-clamp-2 mb-1 md:mb-2 text-brand-text">
          {product.name}
        </h3>
        
        <div className="mt-auto flex flex-col">
          <div className="flex items-center gap-1 md:gap-2">
            <span className="font-display font-bold text-base md:text-xl text-brand-accent">
              {formatPrice(product.price)}
            </span>
            {product.mrp && product.mrp > product.price && (
              <span className="text-[9px] md:text-xs text-brand-muted line-through">
                {formatPrice(product.mrp)}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
