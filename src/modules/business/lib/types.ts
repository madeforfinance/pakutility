/* Business module shared types — match CONTRACTS.md §5 exactly. */

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  note: string;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  cost: number;
  qty: number;
  category: string;
}

export interface Sale {
  id: string;
  productId?: string;
  productName: string;
  qty: number;
  price: number;
  cost: number;
  date: string; // YYYY-MM-DD
  customerId?: string;
  note: string;
}

export interface DocItem {
  desc: string;
  qty: number;
  rate: number;
  discount: number; // percent 0–100
}

export interface Invoice {
  id: string;
  number: string;
  customerId: string;
  customerName: string;
  date: string;
  dueDate: string;
  items: DocItem[];
  taxRate: number; // percent
  notes: string;
  status: 'draft' | 'sent' | 'paid';
}

export interface Quotation {
  id: string;
  number: string;
  customerId: string;
  customerName: string;
  date: string;
  validUntil: string;
  items: DocItem[];
  taxRate: number;
  notes: string;
  status: 'draft' | 'sent' | 'accepted';
}

export interface ReceiptDoc {
  id: string;
  number: string;
  customerName: string;
  amount: number;
  method: string;
  date: string;
  description: string;
}

export const LOW_STOCK_AT = 5;
