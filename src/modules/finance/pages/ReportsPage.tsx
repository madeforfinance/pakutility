import React, { useMemo, useState } from 'react';
import { Page, Card, EmptyState, Stat } from '../../../components/ui';
import { BarChart, LineChart, DonutChart } from '../../../components/charts';
import { useLive } from '../../../hooks/useLive';
import { fmtMoney, fmtMoneyFull, todayISO, monthKey, monthLabel } from '../../../lib/format';
import { getTransactions, summarize } from '../../../lib/money';

function lastMonths(n: number, anchor: string): string[] {
  const [y, m] = anchor.split('-').map(Number);
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(y, m - 1 - i, 1);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return out;
}

export default function ReportsPage() {
  const [month, setMonth] = useState(monthKey(todayISO()));
  const { data: txns } = useLive(() => getTransactions(), []);
  const rows = txns ?? [];

  const summary = useMemo(
    () => summarize(rows, `${month}-01`, `${month}-31`),
    [rows, month]
  );

  const months = useMemo(() => lastMonths(6, month), [month]);

  const trend = useMemo(() => {
    const income = months.map((mk) => {
      const s = summarize(rows, `${mk}-01`, `${mk}-31`);
      return s.income;
    });
    const expense = months.map((mk) => summarize(rows, `${mk}-01`, `${mk}-31`).expense);
    const net = income.map((v, i) => v - expense[i]);
    return { income, expense, net };
  }, [rows, months]);

  const donutData = useMemo(
    () =>
      Object.entries(summary.byCat)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([label, value]) => ({ label, value })),
    [summary]
  );

  const hasData = rows.length > 0;

  return (
    <Page
      title="Reports & Charts"
      subtitle="Visual summary of your money."
      actions={
        <input
          type="month" className="input" style={{ width: 'auto' }} value={month}
          onChange={(e) => e.target.value && setMonth(e.target.value)} aria-label="Report month"
        />
      }
    >
      {!hasData ? (
        <EmptyState
          title="No data to report yet"
          text="Add income and expenses, then come back for charts and trends."
        />
      ) : (
        <>
          <div className="grid cols-3" style={{ marginBottom: 16 }}>
            <Stat label={`Income · ${monthLabel(month)}`} value={fmtMoney(summary.income)} tone="green" />
            <Stat label="Expenses" value={fmtMoney(summary.expense)} tone="red" />
            <Stat label="Net savings" value={fmtMoney(summary.savings)} tone={summary.savings >= 0 ? 'navy' : 'red'} />
          </div>
          <div className="grid cols-2">
            <Card title={`Spending by category · ${monthLabel(month)}`}>
              {donutData.length === 0 ? (
                <p className="muted">No expenses this month.</p>
              ) : (
                <>
                  <DonutChart data={donutData} money />
                  <div style={{ marginTop: 12 }}>
                    {donutData.map((d) => (
                      <div className="kv" key={d.label}>
                        <span className="k">{d.label}</span>
                        <span className="v num">{fmtMoneyFull(d.value)}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </Card>
            <Card title="Net savings trend" subtitle="Last 6 months">
              <LineChart
                data={months.map((mk, i) => ({ label: monthLabel(mk), value: trend.net[i] }))}
                money
              />
            </Card>
            <Card title="Income — last 6 months">
              <BarChart
                data={months.map((mk, i) => ({ label: monthLabel(mk), value: trend.income[i] }))}
                money
              />
            </Card>
            <Card title="Expenses — last 6 months">
              <BarChart
                data={months.map((mk, i) => ({ label: monthLabel(mk), value: trend.expense[i] }))}
                money
              />
            </Card>
          </div>
        </>
      )}
    </Page>
  );
}
