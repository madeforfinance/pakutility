import React, { useMemo, useState } from 'react';
import { Trash2, ChevronLeft, ChevronRight, ReceiptText } from 'lucide-react';
import { db } from '../../../storage/db';
import { useLive } from '../../../hooks/useLive';
import {
  Page, Card, Btn, IconBtn, Field, NumberInput, TextInput, Select, Textarea,
  ConfirmDialog, EmptyState, Badge, Stat,
} from '../../../components/ui';
import { DynIcon } from '../../../components/DynIcon';
import { BarChart } from '../../../components/charts';
import { toast } from '../../../lib/toast';
import {
  fmtMoney, fmtDate, todayISO, monthKey, monthLabel, parseAmount,
} from '../../../lib/format';
import { addTransaction, getTransactions, Txn } from '../../../lib/money';

const TYPES = [
  { type: 'Electricity', icon: 'Zap', cat: 'Utilities' },
  { type: 'Gas', icon: 'Flame', cat: 'Utilities' },
  { type: 'Water', icon: 'Droplets', cat: 'Utilities' },
  { type: 'Internet', icon: 'Wifi', cat: 'Utilities' },
  { type: 'Mobile', icon: 'Phone', cat: 'Utilities' },
  { type: 'Grocery', icon: 'ShoppingCart', cat: 'Food' },
  { type: 'School', icon: 'Backpack', cat: 'Education' },
  { type: 'Transport', icon: 'Bus', cat: 'Transport' },
  { type: 'Maintenance', icon: 'Wrench', cat: 'Bills' },
  { type: 'Healthcare', icon: 'HeartPulse', cat: 'Healthcare' },
  { type: 'Other', icon: 'Tag', cat: 'Other' },
] as const;

const PREFIX = /^\[HE:([^\]]+)\]\s?/;

function heType(t: Txn): string {
  const m = PREFIX.exec(t.note || '');
  return m ? m[1] : 'Other';
}
function heNote(t: Txn): string {
  return (t.note || '').replace(PREFIX, '').trim();
}
function iconFor(type: string): string {
  return TYPES.find((t) => t.type === type)?.icon || 'Tag';
}

function shiftMonth(key: string, delta: number): string {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function HouseholdExpensesPage() {
  const { data: txns } = useLive(() => getTransactions(), []);
  const [type, setType] = useState<string>('Electricity');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [month, setMonth] = useState(monthKey(todayISO()));
  const [deleteTarget, setDeleteTarget] = useState<Txn | null>(null);

  const mine = useMemo(() => (txns || []).filter((t) => t.source === 'household:expenses'), [txns]);

  const monthly = useMemo(() => {
    const inMonth = mine.filter((t) => monthKey(t.date) === month);
    const byType: Record<string, number> = {};
    let total = 0;
    for (const t of inMonth) {
      const k = heType(t);
      byType[k] = (byType[k] || 0) + t.amount;
      total += t.amount;
    }
    return { inMonth, byType, total, count: inMonth.length };
  }, [mine, month]);

  const chartData = useMemo(
    () =>
      Object.entries(monthly.byType)
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value),
    [monthly],
  );

  const recent = useMemo(() => mine.slice(0, 20), [mine]);

  async function submit() {
    const amt = parseAmount(amount);
    if (amt === null || amt <= 0) {
      setError('Please enter a valid amount.');
      return;
    }
    if (!date) {
      setError('Please pick a date.');
      return;
    }
    const def = TYPES.find((t) => t.type === type)!;
    const cleanNote = note.trim();
    await addTransaction({
      type: 'expense',
      amount: amt,
      category: def.cat,
      date,
      note: `[HE:${type}]${cleanNote ? ' ' + cleanNote : ''}`,
      method: 'Cash',
      source: 'household:expenses',
    });
    setAmount('');
    setNote('');
    setDate(todayISO());
    setError('');
    toast.success(`${type} expense recorded.`);
  }

  return (
    <Page
      title="Household Expenses"
      subtitle="Home bills and running costs — synced with Money → Expenses."
    >
      <div className="grid cols-2">
        <Card title="Add expense">
          <Field label="Type" required>
            <Select value={type} onChange={(e) => setType(e.target.value)}>
              {TYPES.map((t) => <option key={t.type} value={t.type}>{t.type}</option>)}
            </Select>
          </Field>
          <div className="form-row">
            <Field label="Amount" required error={error || undefined}>
              <NumberInput value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" autoFocus />
            </Field>
            <Field label="Date" required>
              <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
          </div>
          <Field label="Note">
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="e.g. September bijli bill" />
          </Field>
          <Btn variant="primary" onClick={submit} block>Save expense</Btn>
          <p className="muted small" style={{ marginBottom: 0 }}>
            Also appears in Money → Expenses under “{TYPES.find((t) => t.type === type)?.cat}”.
          </p>
        </Card>

        <Card
          title="Monthly summary"
          actions={
            <div className="row-actions">
              <IconBtn label="Previous month" onClick={() => setMonth(shiftMonth(month, -1))}><ChevronLeft size={16} /></IconBtn>
              <span className="muted small" style={{ fontWeight: 700 }}>{monthLabel(month)}</span>
              <IconBtn label="Next month" onClick={() => setMonth(shiftMonth(month, 1))}><ChevronRight size={16} /></IconBtn>
            </div>
          }
        >
          <Stat label="Total this month" value={fmtMoney(monthly.total)} sub={`${monthly.count} expenses`} tone="navy" />
          {chartData.length > 0 ? (
            <div style={{ marginTop: 12 }}>
              <BarChart data={chartData} money height={200} />
            </div>
          ) : (
            <p className="muted">No household expenses recorded for {monthLabel(month)}.</p>
          )}
        </Card>
      </div>

      <Card title="Recent household expenses">
        {recent.length === 0 ? (
          <EmptyState
            icon={<ReceiptText size={40} />}
            title="No household expenses yet"
            text="Record your bijli, gas, water and other home bills above — they stay in sync with your finance records."
          />
        ) : (
          <div className="list">
            {recent.map((t) => {
              const ht = heType(t);
              const n = heNote(t);
              return (
                <div className="list-row" key={t.id}>
                  <div className="lr-ic"><DynIcon name={iconFor(ht)} size={19} /></div>
                  <div className="lr-main">
                    <div className="lr-title">{ht}</div>
                    <div className="lr-sub">
                      {fmtDate(t.date)}
                      {n ? ` · ${n}` : ''}
                    </div>
                    <div style={{ marginTop: 4 }}>
                      <Badge tone="blue">{t.category}</Badge>
                    </div>
                  </div>
                  <div className="lr-right">
                    <div className="num" style={{ fontWeight: 700 }}>{fmtMoney(t.amount)}</div>
                    <div className="row-actions" style={{ justifyContent: 'flex-end', marginTop: 4 }}>
                      <IconBtn label={`Delete ${ht} expense`} onClick={() => setDeleteTarget(t)}><Trash2 size={15} /></IconBtn>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete expense?"
        message={deleteTarget ? `Delete the ${fmtMoney(deleteTarget.amount)} ${heType(deleteTarget)} expense from ${fmtDate(deleteTarget.date)}? It will also be removed from Money → Expenses.` : ''}
        onConfirm={async () => {
          if (deleteTarget) {
            await db.remove('transactions', deleteTarget.id);
            toast.success('Expense deleted.');
          }
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </Page>
  );
}
