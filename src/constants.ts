export const CATEGORIES = [
  "Daily Essentials (Rozana ka Saaman)",
  "Groceries & Staples (Rashan)",
  "Personal Care (Khud ki Dekhbhal)",
  "Household Needs (Ghar ki Safai)",
  "Home Essentials (Ghar Ki Jarurat)",
  "Beverages (Peene wali cheezein)",
  "Snacks & Branded Foods",
  "Cosmetics (Shringar ka Saaman)",
  "Stationery (Lekhan Samagri)"
] as const;

export type Category = typeof CATEGORIES[number];
