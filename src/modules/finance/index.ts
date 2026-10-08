/* Finance module — calculators, transactions, budgets, reports, Pakistan tax. */
import React from 'react';
import { ToolDef, RouteDef } from '../../lib/tools';
import { TOOLS } from './lib/toolDefs';

export const tools: ToolDef[] = TOOLS;

export const routes: RouteDef[] = [
  { path: '/finance/calculators', element: React.lazy(() => import('./pages/CalculatorsHub')) },
  { path: '/finance/calc/:id', element: React.lazy(() => import('./pages/CalcPage')) },
  { path: '/finance/transactions', element: React.lazy(() => import('./pages/TransactionsPage')) },
  { path: '/finance/budgets', element: React.lazy(() => import('./pages/BudgetsPage')) },
  { path: '/finance/reports', element: React.lazy(() => import('./pages/ReportsPage')) },
  { path: '/finance/tax', element: React.lazy(() => import('./pages/TaxHubPage')) },
  { path: '/finance/tax/income', element: React.lazy(() => import('./pages/IncomeTaxPage')) },
  { path: '/finance/tax/salary', element: React.lazy(() => import('./pages/SalaryTaxPage')) },
  { path: '/finance/tax/sales', element: React.lazy(() => import('./pages/SalesTaxPage')) },
  { path: '/finance/tax/withholding', element: React.lazy(() => import('./pages/WithholdingPage')) },
  { path: '/finance/zakat', element: React.lazy(() => import('./pages/ZakatPage')) },
];
