/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Product {
  id: string;
  name: string;
  price: number; // This will be the Selling Price
  mrp: number;   // This will be the Marked Price
  description: string;
  category: string;
  imageUrl: string;
  available: boolean;
  isSpecial?: boolean; // Featured special discount items
  showQuantity?: boolean;
  quantityValue?: number;
  quantityUnit?: string;
  createdAt: number;
}

export interface Notice {
  id: string;
  title: string;
  content: string;
  createdAt: number;
}

export interface BannerSetting {
  type: 'none' | 'image' | 'video' | 'text';
  url?: string;
  urls?: string[];
  text?: string;
  bgColor?: string;
  textColor?: string;
  textSize?: string;
  enableMarquee?: boolean;
  style?: 'marquee' | 'spotlight' | 'grid';
  marqueeDirection?: 'ltr' | 'rtl';
  marqueeSpeed?: number;
}

export interface StoreConfig {
  logoUrl?: string;
  heroImageUrl?: string;
  aboutText?: string;
  categoryImages?: Record<string, string>; // Maps category name to image URL
  allCategoriesImageUrl?: string;
  bannerType?: 'none' | 'image' | 'video';
  bannerUrl?: string;
  banner1?: BannerSetting;
  banner2?: BannerSetting;
  productLayout?: 'standard_grid' | 'carousel' | 'coverflow' | 'hover_swap' | 'accordion' | 'static_showcase' | 'story_banner';
}
