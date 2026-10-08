/* Shared finance domain model — ALL modules use this. No duplicate expense DBs. */
import { db, uid } from '../storage/db';
import { todayISO, nowISO } from './format';

export const EXPENSE_CATEGORIES = [
  'Food', 'Transport', 'Utilities', 'Rent', 'Education', 'Healthcare',
  'Shopping', 'Entertainment', 'Bills', 'Family', 'Business', 'Investment', 'Other',
];

export const INCOME_CATEGORIES = [
  'Salary', 'Business', 'Freelance', 'Investment', 'Rental', 'Gift', 'Other',
];

export const PAYMENT_METHODS = [
  'Cash', 'Bank Transfer', 'Debit Card', 'Credit Card', 'JazzCash', 'EasyPaisa', 'Cheque', 'Other',
];

export interface Txn {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  date: string; // YYYY-MM-DD
  note: string;
  method: string;
  source?: string; // e.g. 'household:grocery', 'vehicle:fuel', 'business:sale'
  sourceId?: string;
  createdAt: string;
}

export async function addTransaction(t: {
  type: 'income' | 'expense';
  amount: number;
  category: string;
  date?: string;
  note?: string;
  method?: string;
  source?: string;
  sourceId?: string;
}): Promise<string> {
  const txn: Txn = {
    id: uid('txn_'),
    type: t.type,
    amount: t.amount,
    category: t.category,
    date: t.date || todayISO(),
    note: t.note || '',
    method: t.method || 'Cash',
    source: t.source,
    sourceId: t.sourceId,
    createdAt: nowISO(),
  };
  await db.add('transactions', txn);
  return txn.id;
}

export async function getTransactions(): Promise<Txn[]> {
  const rows = await db.all<Txn>('transactions');
  return rows.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function summarize(txns: Txn[], fromISO: string, toISO: string) {
  let income = 0;
  let expense = 0;
  const byCat: Record<string, number> = {};
  for (const t of txns) {
    if (t.date < fromISO || t.date > toISO) continue;
    if (t.type === 'income') income += t.amount;
    else {
      expense += t.amount;
      byCat[t.category] = (byCat[t.category] || 0) + t.amount;
    }
  }
  return { income, expense, savings: income - expense, byCat };
}
