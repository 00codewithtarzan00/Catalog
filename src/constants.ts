export const CATEGORIES = [
  "Daily Essentials (Rozana ka Saaman)",
  "Groceries & Staples (Rashan)",
  "Personal Care (Khud ki Dekhbhal)",
  "Home Essentials (Ghar Ki Jarurat)",
  "Beverages (Peene wali cheezein)",
  "Cosmetics (Shringar ka Saaman)",
  "Stationery (Lekhan Samagri)"
] as const;

export type Category = typeof CATEGORIES[number];
