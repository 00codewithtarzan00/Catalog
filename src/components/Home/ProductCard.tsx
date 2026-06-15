import React from 'react';
import { Product } from '../../types';
import { formatPrice, formatQuantityUnit } from '../../lib/utils';
import { motion } from 'motion/react';

interface ProductCardProps {
  product: Product;
  onClick: (product: Product) => void;
}

export default function ProductCard({ product, onClick }: ProductCardProps) {
  const discountPercent = product.mrp && product.mrp > product.price
    ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => onClick(product)}
      className={`editorial-card group cursor-pointer ${!product.available ? 'opacity-75' : ''}`}
    >
      <div className="relative aspect-square overflow-hidden bg-gray-50 border-b border-brand-border flex items-center justify-center">
        {discountPercent > 0 && (
          <div className="absolute top-1 md:top-2 left-1 md:left-2 bg-red-600 text-white text-[7px] xs:text-[8px] md:text-[10px] uppercase font-bold px-1.5 md:px-2 py-0.5 rounded-sm z-10 shadow-sm leading-none">
            {discountPercent}% OFF
          </div>
        )}

        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            referrerPolicy="no-referrer"
            loading="lazy"
            className={`w-full h-full object-contain p-1 md:p-2 transition-transform duration-500 group-hover:scale-105 ${!product.available ? 'grayscale brightness-90' : ''}`}
          />
        ) : (
          <div className="w-full h-full bg-gray-50 flex items-center justify-center">
            <span className="text-xl md:text-3xl font-black text-brand-accent/10 italic">RK</span>
          </div>
        )}

        {!product.available && (
          <div className="absolute top-1 md:top-2 right-1 md:right-2 bg-gray-600 text-white text-[7px] xs:text-[8px] md:text-[10px] uppercase font-bold px-1.5 md:px-2 py-0.5 rounded-sm leading-none">
            Unavailable
          </div>
        )}

        {product.available && (
          <div className="absolute top-1 md:top-2 right-1 md:right-2 bg-blue-100 text-blue-800 text-[7px] xs:text-[8px] md:text-[10px] uppercase font-bold px-1.5 md:px-2 py-0.5 rounded-sm leading-none">
            In Stock
          </div>
        )}
      </div>

      <div className="p-1.5 md:p-4 flex flex-col min-h-0 md:min-h-32">
        <div className="flex items-center justify-between mb-0.5 md:mb-1 gap-1">
          <span className="text-[7px] xs:text-[8px] md:text-[10px] uppercase tracking-wider text-brand-muted font-semibold truncate leading-none">
            {product.category}
          </span>
        </div>
        <h3 className="font-display font-medium text-[9px] xs:text-[11px] md:text-base leading-tight md:leading-snug line-clamp-2 text-brand-text mb-1 h-[24px] xs:h-[30px] md:h-auto overflow-hidden">
          {product.name}
        </h3>
        {product.showQuantity && product.quantityValue && (
          <div className="mb-1 md:mb-2">
            <span className="text-[8px] xs:text-[10px] md:text-xs font-medium text-[#666] whitespace-nowrap leading-none block">
              {product.quantityValue} {formatQuantityUnit(product.quantityUnit || 'g')}
            </span>
          </div>
        )}
        
        <div className="mt-auto flex flex-col justify-end pt-1">
          <div className="flex flex-col xs:flex-row xs:items-center gap-0.5 xs:gap-1.5 md:gap-2">
            <span className="font-display font-bold text-[10px] xs:text-xs md:text-lg text-brand-accent leading-none">
              {formatPrice(product.price)}
            </span>
            {product.mrp && product.mrp > product.price && (
              <span className="text-[8px] xs:text-[10px] text-brand-muted line-through font-medium leading-none">
                {formatPrice(product.mrp)}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
