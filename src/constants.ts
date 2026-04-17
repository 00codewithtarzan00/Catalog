export const CATEGORIES = [
  "Daily Essentials (Rozana ka Saaman)",
  "Groceries & Staples (Rashan)",
  "Personal Care (Khud ki Dekhbhal)",
  "Household Needs (Ghar ki Safai)",
  "Beverages (Peene wali cheezein)",
  "Snacks & Branded Foods",
  "Cosmetics (Shringar ka Saaman)"
] as const;

export type Category = typeof CATEGORIES[number];
