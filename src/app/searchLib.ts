/* Shared search logic used by the search modal and the search page. */
import { db } from '../storage/db';
import { ALL_TOOLS } from './registry';
import { ToolDef } from '../lib/tools';
import { fmtMoney } from '../lib/format';

export interface SearchHit {
  title: string;
  sub: string;
  path: string;
  icon: string;
  kind: string;
}

export function searchTools(q: string, limit = 40): SearchHit[] {
  const query = q.trim().toLowerCase();
  if (!query) return [];
  const out: SearchHit[] = [];
  for (const t of ALL_TOOLS) {
    const hay = `${t.name} ${t.description} ${t.keywords.join(' ')}`.toLowerCase();
    if (hay.includes(query)) {
      out.push({ title: t.name, sub: t.description, path: t.path, icon: t.icon, kind: 'Tool' });
      if (out.length >= limit) break;
    }
  }
  return out;
}

export async function searchData(q: string, limit = 30): Promise<SearchHit[]> {
  const query = q.trim().toLowerCase();
  if (!query) return [];
  const out: SearchHit[] = [];
  const match = (rows: any[], title: (r: any) => string, sub: (r: any) => string, path: string, icon: string, kind: string) => {
    for (const r of rows) {
      if (out.length >= limit) break;
      if (`${title(r)} ${sub(r)}`.toLowerCase().includes(query)) {
        out.push({ title: title(r), sub: sub(r), path, icon, kind });
      }
    }
  };
  try {
    const [txns, notes, tasks, customers, products, vehicles, docs] = await Promise.all([
      db.all<any>('transactions'), db.all<any>('notes'), db.all<any>('tasks'),
      db.all<any>('customers'), db.all<any>('products'), db.all<any>('vehicles'),
      db.all<any>('documents'),
    ]);
    match(txns.slice(-100), (r) => `${r.type === 'income' ? 'Income' : 'Expense'}: ${r.category}`, (r) => `${fmtMoney(r.amount)} on ${r.date} ${r.note || ''}`, '/finance/transactions', 'ArrowLeftRight', 'Transaction');
    match(notes, (r) => r.title || 'Untitled note', (r) => (r.body || '').slice(0, 70), '/productivity/notes', 'StickyNote', 'Note');
    match(tasks, (r) => r.title, (r) => (r.dueDate ? `Due ${r.dueDate}` : 'No due date'), '/productivity/tasks', 'CheckSquare', 'Task');
    match(customers, (r) => r.name, (r) => r.phone || 'Customer', '/business/customers', 'Users', 'Customer');
    match(products, (r) => r.name, (r) => fmtMoney(r.price), '/business/products', 'Package', 'Product');
    match(vehicles, (r) => r.name, (r) => r.plate || 'Vehicle', '/vehicle/vehicles', 'Car', 'Vehicle');
    match(docs, (r) => r.title, (r) => `${r.kind || ''} expires ${r.expiryDate || ''}`, '/documents/expiry', 'IdCard', 'Document');
  } catch {
    /* ignore */
  }
  return out;
}

export function toolById(id: string): ToolDef | undefined {
  return ALL_TOOLS.find((t) => t.id === id);
}
