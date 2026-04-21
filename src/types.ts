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
  createdAt: number;
}

export interface Notice {
  id: string;
  title: string;
  content: string;
  createdAt: number;
}

export interface StoreConfig {
  logoUrl?: string;
  heroImageUrl?: string;
  heroSlogan?: string;
  aboutText?: string;
  categoryImages?: Record<string, string>; // Maps category name to image URL
  allCategoriesImageUrl?: string;
}
