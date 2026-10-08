import React, { useMemo, useState } from 'react';
import { Plus, Copy } from 'lucide-react';
import {
  Page, Card, Btn, Field, NumberInput, Badge, ProgressBar, EmptyState, Stat,
} from '../../../components/ui';
import { useLive } from '../../../hooks/useLive';
import { db } from '../../../storage/db';
import { toast } from '../../../lib/toast';
import { fmtMoney, parseAmount, todayISO, monthKey, monthLabel } from '../../../lib/format';
import { EXPENSE_CATEGORIES, getTransactions, summarize } from '../../../lib/money';

interface Budget {
  id: string;
  month: string; // YYYY-MM
  total: number;
  categories: Record<string, number>;
  savingsTarget: number;
}

function emptyBudget(month: string): Budget {
  return { id: month, month, total: 0, categories: {}, savingsTarget: 0 };
}

export default function BudgetsPage() {
  const [month, setMonth] = useState(monthKey(todayISO()));
  const { data: stored } = useLive(() => db.get<Budget>('budgets', month), [month]);
  const { data: txns } = useLive(() => getTransactions(), []);

  const [draft, setDraft] = useState<Budget | null>(null);
  const budget = draft ?? stored ?? emptyBudget(month);

  const startEditing = () => setDraft({ ...(stored ?? emptyBudget(month)) });
  const cancel = () => setDraft(null);

  // Reset draft when switching month
  const [lastMonth, setLastMonth] = useState(month);
  if (month !== lastMonth) {
    setLastMonth(month);
    setDraft(null);
  }

  const actuals = useMemo(() => {
    const rows = txns ?? [];
    return summarize(rows, `${month}-01`, `${month}-31`);
  }, [txns, month]);

  const setTotal = (raw: string) => {
    const n = parseAmount(raw);
    setDraft((d) => (d ? { ...d, total: n === null ? 0 : n } : d));
  };
  const setCat = (cat: string, raw: string) => {
    const n = parseAmount(raw);
    setDraft((d) => (d ? { ...d, categories: { ...d.categories, [cat]: n === null || n < 0 ? 0 : n } } : d));
  };
  const setSavings = (raw: string) => {
    const n = parseAmount(raw);
    setDraft((d) => (d ? { ...d, savingsTarget: n === null ? 0 : n } : d));
  };

  const save = async () => {
    if (!draft) return;
    try {
      await db.set('budgets', month, { ...draft, id: month, month });
      setDraft(null);
      toast.success(`Budget saved for ${monthLabel(month)}.`);
    } catch {
      toast.error('Could not save budget. Please try again.');
    }
  };

  const copyPrevious = async () => {
    const [y, m] = month.split('-').map(Number);
    const prev = new Date(y, m - 2, 1);
    const prevKey = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
    const prevBudget = await db.get<Budget>('budgets', prevKey);
    if (!prevBudget || (!prevBudget.total && Object.keys(prevBudget.categories).length === 0)) {
      toast.error(`No budget found for ${monthLabel(prevKey)}.`);
      return;
    }
    setDraft({ ...prevBudget, id: month, month });
    toast.success(`Copied budget from ${monthLabel(prevKey)}. Review and save.`);
  };

  const hasBudget = (stored && (stored.total > 0 || Object.keys(stored.categories).length > 0)) || !!draft;
  const spent = actuals.expense;
  const remaining = budget.total - spent;
  const pctUsed = budget.total > 0 ? (spent / budget.total) * 100 : 0;

  return (
    <Page
      title="Budgets"
      subtitle={`Monthly spending plan for ${monthLabel(month)}.`}
      actions={
        <input
          type="month" className="input" style={{ width: 'auto' }} value={month}
          onChange={(e) => e.target.value && setMonth(e.target.value)} aria-label="Budget month"
        />
      }
    >
      {!hasBudget && !draft ? (
        <EmptyState
          title={`No budget for ${monthLabel(month)} yet`}
          text="Set a monthly total and per-category limits. We will track your spending against them automatically."
          action={
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
              <Btn variant="primary" icon={<Plus size={16} />} onClick={startEditing}>Create budget</Btn>
              <Btn variant="secondary" icon={<Copy size={16} />} onClick={copyPrevious}>Copy previous month</Btn>
            </div>
          }
        />
      ) : (
        <div className="grid cols-2">
          <Card
            title="Budget plan"
            actions={!draft && <Btn variant="secondary" size="sm" onClick={startEditing}>Edit</Btn>}
          >
            {draft ? (
              <div className="grid">
                <Field label="Monthly budget total" required>
                  <NumberInput value={draft.total || ''} onChange={(e) => setTotal(e.target.value)} placeholder="e.g. 100000" />
                </Field>
                <Field label="Savings target" hint="How much you aim to save this month">
                  <NumberInput value={draft.savingsTarget || ''} onChange={(e) => setSavings(e.target.value)} placeholder="e.g. 20000" />
                </Field>
                <h4 style={{ margin: '4px 0 0' }}>Category limits</h4>
                {EXPENSE_CATEGORIES.map((c) => (
                  <Field key={c} label={c}>
                    <NumberInput
                      value={draft.categories[c] || ''}
                      onChange={(e) => setCat(c, e.target.value)}
                      placeholder="No limit"
                    />
                  </Field>
                ))}
                <div style={{ display: 'flex', gap: 8 }}>
                  <Btn variant="primary" onClick={save}>Save budget</Btn>
                  <Btn variant="ghost" onClick={cancel}>Cancel</Btn>
                </div>
              </div>
            ) : (
              <>
                <div className="grid cols-3" style={{ marginBottom: 12 }}>
                  <Stat label="Budget" value={fmtMoney(budget.total)} tone="navy" />
                  <Stat label="Spent" value={fmtMoney(spent)} tone={pctUsed > 100 ? 'red' : 'gold'} />
                  <Stat label="Remaining" value={fmtMoney(remaining)} tone={remaining < 0 ? 'red' : 'green'} />
                </div>
                <ProgressBar value={spent} max={Math.max(1, budget.total)} />
                <p className="muted small" style={{ marginTop: 6 }}>
                  {budget.total > 0 ? `${Math.min(999, pctUsed).toFixed(1)}% used` : 'No total set'} · Savings target {fmtMoney(budget.savingsTarget)}
                </p>
                {Object.entries(budget.categories).filter(([, v]) => v > 0).length > 0 && (
                  <>
                    <h4 style={{ marginTop: 16 }}>Category limits</h4>
                    {Object.entries(budget.categories)
                      .filter(([, v]) => v > 0)
                      .map(([cat, limit]) => {
                        const used = actuals.byCat[cat] || 0;
                        const over = used > limit;
                        return (
                          <div key={cat} style={{ marginBottom: 12 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                              <span style={{ fontWeight: 600 }}>{cat}</span>
                              <span>
                                <span className="num muted small">{fmtMoney(used)} / {fmtMoney(limit)}</span>{' '}
                                {over && <Badge tone="red">Over budget</Badge>}
                              </span>
                            </div>
                            <ProgressBar value={used} max={limit} />
                          </div>
                        );
                      })}
                  </>
                )}
              </>
            )}
          </Card>

          <Card title="Spending vs plan" subtitle="Actual expenses this month by category">
            {Object.keys(actuals.byCat).length === 0 ? (
              <p className="muted">No expenses recorded for {monthLabel(month)} yet.</p>
            ) : (
              Object.entries(actuals.byCat)
                .sort((a, b) => b[1] - a[1])
                .map(([cat, amt]) => {
                  const limit = budget.categories[cat] || 0;
                  const over = limit > 0 && amt > limit;
                  return (
                    <div key={cat} className="kv">
                      <span className="k">
                        {cat} {over && <Badge tone="red">over</Badge>}
                        {limit > 0 && <span className="muted"> · limit {fmtMoney(limit)}</span>}
                      </span>
                      <span className="v num">{fmtMoney(amt)}</span>
                    </div>
                  );
                })
            )}
            {budget.savingsTarget > 0 && (
              <div style={{ marginTop: 16 }}>
                <h4>Savings target</h4>
                <ProgressBar value={Math.max(0, actuals.savings)} max={budget.savingsTarget} />
                <p className="muted small" style={{ marginTop: 6 }}>
                  Saved {fmtMoney(actuals.savings)} of {fmtMoney(budget.savingsTarget)} target
                </p>
              </div>
            )}
          </Card>
        </div>
      )}
    </Page>
  );
}
