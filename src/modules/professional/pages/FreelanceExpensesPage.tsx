/* Freelance Expenses — log business expenses, synced into Money → Expenses. */
import React, { useMemo, useState } from 'react';
import { Trash2, Plus, TrendingDown } from 'lucide-react';
import { db } from '../../../storage/db';
import { useLive } from '../../../hooks/useLive';
import {
  Page, Card, Btn, IconBtn, Field, TextInput, NumberInput, Select,
  ConfirmDialog, EmptyState, Stat,
} from '../../../components/ui';
import { toast } from '../../../lib/toast';
import { parseAmount, fmtMoney, fmtMoneyFull, fmtDate, todayISO } from '../../../lib/format';
import { EXPENSE_CATEGORIES, PAYMENT_METHODS, addTransaction, getTransactions, Txn } from '../../../lib/money';

const SOURCE = 'professional:freelance';

export default function FreelanceExpensesPage() {
  const { data: txns } = useLive(() => getTransactions(), []);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Business');
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState('');
  const [method, setMethod] = useState('Cash');
  const [err, setErr] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const mine = useMemo(
    () => (txns || []).filter((t: Txn) => t.type === 'expense' && t.source === SOURCE),
    [txns],
  );
  const total = mine.reduce((s, t) => s + t.amount, 0);

  const add = async () => {
    const a = parseAmount(amount);
    if (a === null || a <= 0) {
      setErr('Please enter a valid amount above zero.');
      return;
    }
    if (!date) {
      setErr('Please pick a date.');
      return;
    }
    setErr('');
    await addTransaction({
      type: 'expense',
      amount: a,
      category,
      date,
      note: note.trim().slice(0, 200) || 'Freelance expense',
      method,
      source: SOURCE,
    });
    setAmount('');
    setNote('');
    toast.success('Expense recorded in Money → Expenses.');
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    await db.remove('transactions', deleteId);
    setDeleteId(null);
    toast.success('Expense deleted.');
  };

  return (
    <Page title="Freelance Expenses" subtitle="Log freelance business costs — they appear in Money → Expenses automatically.">
      <div className="grid cols-2">
        <Card title="Add expense">
          <Field label="Amount" required error={err || undefined}>
            <NumberInput value={amount} placeholder="e.g. 3500"
              onChange={(e) => { setAmount(e.target.value); setErr(''); }} />
          </Field>
          <div className="grid cols-2">
            <Field label="Category">
              <Select value={category} onChange={(e) => setCategory(e.target.value)}>
                {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </Field>
            <Field label="Date">
              <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
          </div>
          <Field label="Payment method">
            <Select value={method} onChange={(e) => setMethod(e.target.value)}>
              {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
            </Select>
          </Field>
          <Field label="Note">
            <TextInput value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Internet bill, domain renewal" maxLength={200} />
          </Field>
          <Btn variant="primary" icon={<Plus size={16} />} onClick={add}>Add expense</Btn>
        </Card>

        <Card title="Summary">
          <Stat label="Total freelance expenses" value={fmtMoney(total)}
            sub={`${mine.length} entr${mine.length === 1 ? 'y' : 'ies'}`}
            icon={<TrendingDown size={20} />} tone="red" />
          <p className="muted small" style={{ marginTop: 10 }}>
            These expenses are stored in the shared Money ledger with source “professional:freelance”,
            so budgets and reports stay consistent.
          </p>
        </Card>
      </div>

      <Card title="Expense history" subtitle="Synced with Money → Expenses">
        {mine.length === 0 ? (
          <EmptyState title="No freelance expenses yet"
            text="Log your first business expense above — internet, tools, workspace, travel." />
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>Date</th><th>Note</th><th>Category</th><th style={{ textAlign: 'right' }}>Amount</th><th><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>
                {mine.map((t) => (
                  <tr key={t.id}>
                    <td>{fmtDate(t.date)}</td>
                    <td><strong>{t.note}</strong><div className="muted small">{t.method}</div></td>
                    <td>{t.category}</td>
                    <td style={{ textAlign: 'right' }} className="num">{fmtMoneyFull(t.amount)}</td>
                    <td>
                      <div className="row-actions">
                        <IconBtn label={`Delete expense ${t.note}`} onClick={() => setDeleteId(t.id)}>
                          <Trash2 size={16} />
                        </IconBtn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <ConfirmDialog open={!!deleteId} title="Delete expense"
        message="This expense will be removed from Money → Expenses as well."
        onConfirm={confirmDelete} onCancel={() => setDeleteId(null)} />
    </Page>
  );
}
