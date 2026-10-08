import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Pencil, Trash2, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import {
  Page, Card, Btn, IconBtn, Field, TextInput, NumberInput, Select,
  Modal, ConfirmDialog, EmptyState, SearchInput, Segmented, Badge, Stat,
} from '../../../components/ui';
import { useLive } from '../../../hooks/useLive';
import { db } from '../../../storage/db';
import { toast } from '../../../lib/toast';
import {
  fmtMoney, fmtDate, fmtMoneyFull, parseAmount, todayISO, monthKey, monthLabel,
} from '../../../lib/format';
import {
  EXPENSE_CATEGORIES, INCOME_CATEGORIES, PAYMENT_METHODS,
  addTransaction, getTransactions, summarize, Txn,
} from '../../../lib/money';

interface FormState {
  type: 'income' | 'expense';
  amount: string;
  category: string;
  date: string;
  note: string;
  method: string;
}

const blankForm = (type: 'income' | 'expense' = 'expense'): FormState => ({
  type, amount: '', category: type === 'income' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0],
  date: todayISO(), note: '', method: 'Cash',
});

export default function TransactionsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: txns } = useLive(() => getTransactions(), []);

  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [catFilter, setCatFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState(monthKey(todayISO()));
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'newest' | 'oldest' | 'high' | 'low'>('newest');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Txn | null>(null);
  const [form, setForm] = useState<FormState>(blankForm());
  const [formError, setFormError] = useState('');
  const [confirmId, setConfirmId] = useState<string | null>(null);

  // Deep link: /finance/transactions?new=expense|income
  useEffect(() => {
    const n = searchParams.get('new');
    if (n === 'expense' || n === 'income') {
      setEditing(null);
      setForm(blankForm(n));
      setFormError('');
      setModalOpen(true);
      searchParams.delete('new');
      setSearchParams(searchParams, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const allCats = useMemo(
    () => ['all', ...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES.filter((c) => !EXPENSE_CATEGORIES.includes(c))],
    []
  );

  const filtered = useMemo(() => {
    let rows = txns ?? [];
    if (typeFilter !== 'all') rows = rows.filter((t) => t.type === typeFilter);
    if (catFilter !== 'all') rows = rows.filter((t) => t.category === catFilter);
    if (monthFilter) rows = rows.filter((t) => monthKey(t.date) === monthFilter);
    const q = query.trim().toLowerCase();
    if (q) rows = rows.filter((t) => `${t.note} ${t.category} ${t.method} ${t.amount}`.toLowerCase().includes(q));
    const sorted = [...rows];
    switch (sort) {
      case 'oldest': sorted.sort((a, b) => (a.date < b.date ? -1 : 1)); break;
      case 'high': sorted.sort((a, b) => b.amount - a.amount); break;
      case 'low': sorted.sort((a, b) => a.amount - b.amount); break;
      default: sorted.sort((a, b) => (a.date < b.date ? 1 : -1));
    }
    return sorted;
  }, [txns, typeFilter, catFilter, monthFilter, query, sort]);

  const summary = useMemo(() => {
    const rows = txns ?? [];
    if (!monthFilter) return summarize(rows, '0000-01-01', '9999-12-31');
    return summarize(rows, `${monthFilter}-01`, `${monthFilter}-31`);
  }, [txns, monthFilter]);

  const openAdd = (type: 'income' | 'expense') => {
    setEditing(null);
    setForm(blankForm(type));
    setFormError('');
    setModalOpen(true);
  };
  const openEdit = (t: Txn) => {
    setEditing(t);
    setForm({
      type: t.type, amount: String(t.amount), category: t.category,
      date: t.date, note: t.note, method: t.method,
    });
    setFormError('');
    setModalOpen(true);
  };

  const save = async () => {
    const amount = parseAmount(form.amount);
    if (amount === null || amount <= 0) {
      setFormError('Please enter a valid amount greater than zero.');
      return;
    }
    if (!form.date) {
      setFormError('Please choose a date.');
      return;
    }
    try {
      if (editing) {
        await db.put('transactions', {
          ...editing, type: form.type, amount, category: form.category,
          date: form.date, note: form.note.trim(), method: form.method,
        });
        toast.success('Transaction updated.');
      } else {
        await addTransaction({
          type: form.type, amount, category: form.category,
          date: form.date, note: form.note.trim(), method: form.method,
        });
        toast.success(form.type === 'income' ? 'Income added.' : 'Expense added.');
      }
      setModalOpen(false);
    } catch {
      toast.error('Could not save. Please try again.');
    }
  };

  const remove = async () => {
    if (!confirmId) return;
    try {
      await db.remove('transactions', confirmId);
      toast.success('Transaction deleted.');
    } catch {
      toast.error('Could not delete. Please try again.');
    }
    setConfirmId(null);
  };

  const cats = form.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  return (
    <Page
      title="Transactions"
      subtitle="Income and expenses — the single shared money record."
      actions={
        <>
          <Btn variant="secondary" icon={<Plus size={16} />} onClick={() => openAdd('income')}>Income</Btn>
          <Btn variant="primary" icon={<Plus size={16} />} onClick={() => openAdd('expense')}>Expense</Btn>
        </>
      }
    >
      <div className="grid cols-3" style={{ marginBottom: 16 }}>
        <Stat label={`Income · ${monthFilter ? monthLabel(monthFilter) : 'all time'}`} value={fmtMoney(summary.income)}
          icon={<ArrowDownCircle size={18} />} tone="green" />
        <Stat label="Expenses" value={fmtMoney(summary.expense)} icon={<ArrowUpCircle size={18} />} tone="red" />
        <Stat label="Savings" value={fmtMoney(summary.savings)}
          sub={summary.savings >= 0 ? 'You saved this month' : 'Spending exceeded income'}
          tone={summary.savings >= 0 ? 'navy' : 'red'} />
      </div>

      <Card>
        <div className="grid cols-4" style={{ marginBottom: 12 }}>
          <Segmented
            options={[{ value: 'all', label: 'All' }, { value: 'income', label: 'Income' }, { value: 'expense', label: 'Expense' }]}
            value={typeFilter} onChange={setTypeFilter}
          />
          <Select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} aria-label="Category filter">
            {allCats.map((c) => <option key={c} value={c}>{c === 'all' ? 'All categories' : c}</option>)}
          </Select>
          <TextInput type="month" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} aria-label="Month filter" />
          <Select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} aria-label="Sort">
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="high">Amount: high to low</option>
            <option value="low">Amount: low to high</option>
          </Select>
        </div>
        <div style={{ maxWidth: 420, marginBottom: 4 }}>
          <SearchInput value={query} onChange={setQuery} placeholder="Search note, category, method…" />
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            title={txns && txns.length > 0 ? 'No matches' : 'No transactions yet'}
            text={txns && txns.length > 0
              ? 'Try changing the filters.'
              : 'Start tracking your spending to understand where your money goes.'}
            action={<Btn variant="primary" icon={<Plus size={16} />} onClick={() => openAdd('expense')}>Add expense</Btn>}
          />
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr><th>Date</th><th>Details</th><th>Category</th><th>Method</th><th style={{ textAlign: 'right' }}>Amount</th><th /></tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.id}>
                    <td className="num" style={{ whiteSpace: 'nowrap' }}>{fmtDate(t.date)}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{t.note || (t.type === 'income' ? 'Income' : 'Expense')}</div>
                      {t.source && <div className="muted small">via {t.source.replace(':', ' › ')}</div>}
                    </td>
                    <td><Badge tone={t.type === 'income' ? 'green' : 'blue'}>{t.category}</Badge></td>
                    <td className="muted">{t.method}</td>
                    <td className="num" style={{ textAlign: 'right', fontWeight: 700, color: t.type === 'income' ? 'var(--green)' : 'inherit' }}>
                      {t.type === 'income' ? '+' : '−'}{fmtMoneyFull(t.amount)}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <IconBtn label="Edit" onClick={() => openEdit(t)}><Pencil size={16} /></IconBtn>
                      <IconBtn label="Delete" onClick={() => setConfirmId(t.id)}><Trash2 size={16} /></IconBtn>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit transaction' : form.type === 'income' ? 'Add income' : 'Add expense'}
        actions={
          <>
            <Btn variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Btn>
            <Btn variant="primary" onClick={save}>Save</Btn>
          </>
        }
      >
        <div className="grid">
          <Segmented
            options={[{ value: 'expense', label: 'Expense' }, { value: 'income', label: 'Income' }]}
            value={form.type}
            onChange={(v) => setForm((s) => ({ ...s, type: v, category: v === 'income' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0] }))}
          />
          <Field label="Amount" error={formError} required>
            <NumberInput value={form.amount} onChange={(e) => setForm((s) => ({ ...s, amount: e.target.value }))} placeholder="0" />
          </Field>
          <div className="grid cols-2">
            <Field label="Category" required>
              <Select value={form.category} onChange={(e) => setForm((s) => ({ ...s, category: e.target.value }))}>
                {cats.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </Field>
            <Field label="Date" required>
              <TextInput type="date" value={form.date} onChange={(e) => setForm((s) => ({ ...s, date: e.target.value }))} />
            </Field>
          </div>
          <Field label="Payment method">
            <Select value={form.method} onChange={(e) => setForm((s) => ({ ...s, method: e.target.value }))}>
              {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
            </Select>
          </Field>
          <Field label="Note">
            <TextInput value={form.note} onChange={(e) => setForm((s) => ({ ...s, note: e.target.value }))} placeholder="e.g. Monthly groceries" maxLength={120} />
          </Field>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirmId}
        title="Delete transaction?"
        message="This will permanently remove the transaction. This cannot be undone."
        onConfirm={remove}
        onCancel={() => setConfirmId(null)}
      />
    </Page>
  );
}
