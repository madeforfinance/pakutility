export interface GroceryItem {
  id: string;
  name: string;
  qty: number;
  unit: string;
  price: number;
  category: string;
  done: boolean;
}

export interface GroceryList {
  id: string;
  name: string;
  createdAt: string;
  items: GroceryItem[];
}

export interface InventoryItem {
  id: string;
  name: string;
  qty: number;
  unit: string;
  minQty: number;
  purchaseDate: string;
  expiryDate: string;
  note: string;
}

export const GROCERY_CATEGORIES = [
  'Grocery',
  'Vegetables',
  'Fruits',
  'Meat',
  'Dairy',
  'Cleaning',
  'Personal Care',
  'Kitchen',
  'Other',
];

export const GROCERY_UNITS = ['pcs', 'kg', 'g', 'L', 'ml', 'pack', 'dozen', 'box'];
