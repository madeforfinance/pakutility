/* Tool registry — every module registers its tools here.
   Drives: global search, favorites, recently-used, tool directory, dashboard. */
import React from 'react';

export type CategoryId =
  | 'finance' | 'household' | 'student' | 'professional' | 'business'
  | 'vehicle' | 'islamic' | 'documents' | 'productivity' | 'tools';

export interface ToolDef {
  id: string; // unique, e.g. 'emi-calculator'
  name: string;
  category: CategoryId;
  description: string;
  icon: string; // lucide-react icon name, e.g. 'Calculator'
  path: string; // e.g. '/tools/emi'
  keywords: string[]; // extra search terms
}

export interface RouteDef {
  path: string;
  element: React.LazyExoticComponent<React.ComponentType<any>>;
}

export const CATEGORIES: { id: CategoryId; name: string; tagline: string; icon: string; path: string }[] = [
  { id: 'finance', name: 'Money & Finance', tagline: 'Calculators, expenses, budgets & Pakistan taxes', icon: 'Wallet', path: '/c/finance' },
  { id: 'household', name: 'Household', tagline: 'Grocery, inventory & home expenses', icon: 'Home', path: '/c/household' },
  { id: 'student', name: 'Student', tagline: 'GPA, attendance, planner & study tools', icon: 'GraduationCap', path: '/c/student' },
  { id: 'professional', name: 'Professional', tagline: 'Work hours, leave, freelancing & timers', icon: 'Briefcase', path: '/c/professional' },
  { id: 'business', name: 'Business', tagline: 'Customers, products, sales & invoices', icon: 'Store', path: '/c/business' },
  { id: 'vehicle', name: 'Vehicle & Travel', tagline: 'Fuel, trips, maintenance & reminders', icon: 'Car', path: '/c/vehicle' },
  { id: 'islamic', name: 'Islamic & Pakistan', tagline: 'Hijri calendar, prayer, Qibla & holidays', icon: 'Moon', path: '/c/islamic' },
  { id: 'documents', name: 'Documents', tagline: 'Letters, certificates & expiry tracker', icon: 'FileText', path: '/c/documents' },
  { id: 'productivity', name: 'Productivity', tagline: 'Notes, tasks & calendar', icon: 'CheckSquare', path: '/c/productivity' },
  { id: 'tools', name: 'Quick Tools', tagline: 'Everyday converters & generators', icon: 'Wrench', path: '/c/tools' },
];

export function categoryById(id: CategoryId) {
  return CATEGORIES.find((c) => c.id === id)!;
}
