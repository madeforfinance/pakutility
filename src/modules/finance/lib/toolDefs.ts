/* All finance ToolDefs in one place — imported by index.ts and by hub pages. */
import { ToolDef } from '../../../lib/tools';
import { CALC_TOOLS } from './calcTools';

export const PAGE_TOOLS: ToolDef[] = [
  {
    id: 'transactions',
    name: 'Transactions',
    category: 'finance',
    description: 'Track income and expenses with categories, filters and search.',
    icon: 'ArrowLeftRight',
    path: '/finance/transactions',
    keywords: ['expense', 'income', 'kharcha', 'transactions', 'spending', 'ledger'],
  },
  {
    id: 'budgets',
    name: 'Budgets',
    category: 'finance',
    description: 'Monthly budget with category limits and savings targets.',
    icon: 'PiggyBank',
    path: '/finance/budgets',
    keywords: ['budget', 'limit', 'savings target', 'plan', 'kharch'],
  },
  {
    id: 'finance-reports',
    name: 'Reports & Charts',
    category: 'finance',
    description: 'Spending breakdown, income vs expense trends and savings.',
    icon: 'BarChart3',
    path: '/finance/reports',
    keywords: ['reports', 'charts', 'graphs', 'analysis', 'trends'],
  },
  {
    id: 'pakistan-tax',
    name: 'Pakistan Tax',
    category: 'finance',
    description: 'Income, salary, sales & withholding tax calculators (FBR).',
    icon: 'Landmark',
    path: '/finance/tax',
    keywords: ['FBR', 'tax', 'tax year', 'income tax', 'Pakistan tax'],
  },
  {
    id: 'income-tax',
    name: 'Income Tax Calculator',
    category: 'finance',
    description: 'Annual income tax with slab-wise breakdown (salaried & business).',
    icon: 'FileText',
    path: '/finance/tax/income',
    keywords: ['income tax', 'FBR', 'slab', 'annual tax', 'tax year'],
  },
  {
    id: 'salary-tax',
    name: 'Salary Tax Calculator',
    category: 'finance',
    description: 'Monthly salary tax and take-home pay estimate.',
    icon: 'Banknote',
    path: '/finance/tax/salary',
    keywords: ['salary tax', 'take home', 'monthly tax', 'tankhwa'],
  },
  {
    id: 'sales-tax',
    name: 'Sales Tax Calculator',
    category: 'finance',
    description: 'Add or extract sales tax (GST) on any amount.',
    icon: 'Percent',
    path: '/finance/tax/sales',
    keywords: ['sales tax', 'GST', 'general sales tax', 'inclusive', 'exclusive'],
  },
  {
    id: 'withholding-tax',
    name: 'Withholding Tax Calculator',
    category: 'finance',
    description: 'WHT by FBR section — bank profit, bills, property and more.',
    icon: 'FileWarning',
    path: '/finance/tax/withholding',
    keywords: ['withholding', 'WHT', 'advance tax', 'section 236', 'FBR'],
  },
  {
    id: 'zakat-calculator',
    name: 'Zakat Calculator',
    category: 'finance',
    description: 'Zakat on cash, bank, investments, gold and silver with nisab check.',
    icon: 'Moon',
    path: '/finance/zakat',
    keywords: ['zakat', 'nisab', '2.5%', 'zakaat'],
  },
];

export const HUB_TOOL: ToolDef = {
  id: 'calculators-hub',
  name: 'All Calculators',
  category: 'finance',
  description: 'Everyday money calculators in one searchable hub.',
  icon: 'Calculator',
  path: '/finance/calculators',
  keywords: ['calculators', 'all', 'hisab', 'math'],
};

export const TOOLS: ToolDef[] = [HUB_TOOL, ...CALC_TOOLS, ...PAGE_TOOLS];

export const TAX_TOOLS: ToolDef[] = PAGE_TOOLS.filter((t) =>
  ['income-tax', 'salary-tax', 'sales-tax', 'withholding-tax'].includes(t.id)
);
