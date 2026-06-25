export const CATEGORIES = [
  "Daily Essentials",
  "Groceries & Staples",
  "Personal Care",
  "Home Essentials",
  "Beverages",
  "Cosmetics",
  "Stationery"
] as const;

export type Category = typeof CATEGORIES[number];
