import React from 'react';
import { ToolDef, RouteDef } from '../../lib/tools';

export const tools: ToolDef[] = [
  {
    id: 'grocery-lists',
    name: 'Grocery Lists',
    category: 'household',
    description:
      'Create shopping lists with quantities, prices and categories. Tick off purchased items and record the spend straight into your expenses.',
    icon: 'ShoppingCart',
    path: '/household/grocery',
    keywords: ['shopping', 'sabzi', 'ration', 'grocery', 'list', 'bazaar', 'khareedari', 'saman'],
  },
  {
    id: 'home-inventory',
    name: 'Home Inventory',
    category: 'household',
    description:
      'Track pantry and household stock with low-stock, expiring-soon and expired alerts so nothing runs out or goes to waste.',
    icon: 'Package',
    path: '/household/inventory',
    keywords: ['stock', 'pantry', 'store', 'inventory', 'expiry', 'ghar', 'rashan'],
  },
  {
    id: 'household-expenses',
    name: 'Household Expenses',
    category: 'household',
    description:
      'Record electricity, gas, water, internet and other home bills. Saved automatically in Money → Expenses too.',
    icon: 'Home',
    path: '/household/expenses',
    keywords: ['bijli', 'gas', 'utility bills', 'bills', 'pani', 'internet', 'ghar kharch', 'mobile'],
  },
];

export const routes: RouteDef[] = [
  { path: '/household/grocery', element: React.lazy(() => import('./pages/GroceryPage')) },
  { path: '/household/inventory', element: React.lazy(() => import('./pages/InventoryPage')) },
  { path: '/household/expenses', element: React.lazy(() => import('./pages/HouseholdExpensesPage')) },
];
