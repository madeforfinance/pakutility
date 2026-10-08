/* Business module — tool registry + lazy routes. */
import React from 'react';
import { ToolDef, RouteDef } from '../../lib/tools';
import './business.css';

export const tools: ToolDef[] = [
  {
    id: 'business-dashboard',
    name: 'Business Dashboard',
    category: 'business',
    description: 'Revenue, profit, margins, top products and recent sales at a glance.',
    icon: 'Store',
    path: '/business/dashboard',
    keywords: ['revenue', 'profit', 'margin', 'sales summary', 'dukan', 'karobar', 'business report'],
  },
  {
    id: 'customers',
    name: 'Customers',
    category: 'business',
    description: 'Manage customers with contact details and per-customer sales totals.',
    icon: 'Users',
    path: '/business/customers',
    keywords: ['customer', 'client', 'grahak', 'contacts', 'address book'],
  },
  {
    id: 'products',
    name: 'Products & Inventory',
    category: 'business',
    description: 'Product catalog with prices, costs, stock levels and low-stock alerts.',
    icon: 'Package',
    path: '/business/products',
    keywords: ['product', 'stock', 'inventory', 'sku', 'maal', 'price list'],
  },
  {
    id: 'sales',
    name: 'Record Sale',
    category: 'business',
    description: 'Record a sale — stock drops automatically and revenue posts to finance.',
    icon: 'ShoppingCart',
    path: '/business/sales',
    keywords: ['sale', 'sell', 'bikri', 'frokht', 'record sale', 'pos'],
  },
  {
    id: 'invoices',
    name: 'Invoices',
    category: 'business',
    description: 'Create professional invoices with items, tax and discounts — print or PDF.',
    icon: 'Receipt',
    path: '/business/invoices',
    keywords: ['invoice', 'bill', 'challan', 'bill banana', 'invoice generator'],
  },
  {
    id: 'quotations',
    name: 'Quotations',
    category: 'business',
    description: 'Send polished quotations and convert accepted ones to invoices in one tap.',
    icon: 'FileText',
    path: '/business/quotations',
    keywords: ['quotation', 'quote', 'estimate', 'rate list', 'qist', 'proposal'],
  },
  {
    id: 'receipts',
    name: 'Receipts',
    category: 'business',
    description: 'Payment receipts with amount in words — print or download as PDF.',
    icon: 'FileCheck',
    path: '/business/receipts',
    keywords: ['receipt', 'payment received', 'raseed', 'payment proof'],
  },
  {
    id: 'business-reports',
    name: 'Business Reports',
    category: 'business',
    description: 'Monthly revenue and profit charts, product mix and sales CSV export.',
    icon: 'BarChart3',
    path: '/business/reports',
    keywords: ['report', 'analytics', 'monthly sales', 'export csv', 'charts', 'hisab'],
  },
];

export const routes: RouteDef[] = [
  { path: '/business/dashboard', element: React.lazy(() => import('./pages/DashboardPage')) },
  { path: '/business/customers', element: React.lazy(() => import('./pages/CustomersPage')) },
  { path: '/business/products', element: React.lazy(() => import('./pages/ProductsPage')) },
  { path: '/business/sales', element: React.lazy(() => import('./pages/SalesPage')) },
  { path: '/business/invoices', element: React.lazy(() => import('./pages/InvoicesPage')) },
  { path: '/business/quotations', element: React.lazy(() => import('./pages/QuotationsPage')) },
  { path: '/business/receipts', element: React.lazy(() => import('./pages/ReceiptsPage')) },
  { path: '/business/reports', element: React.lazy(() => import('./pages/ReportsPage')) },
];
