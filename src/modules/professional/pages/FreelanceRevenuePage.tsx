/* Freelance Revenue — monthly income chart, totals and averages. */
import React, { useMemo } from 'react';
import { LineChart as LineChartIcon, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLive } from '../../../hooks/useLive';
import { Page, Card, Btn, EmptyState, Stat } from '../../../components/ui';
import { fmtMoney, fmtMoneyFull, fmtDate, monthLabel } from '../../../lib/format';
import { getTransactions, Txn } from '../../../lib/money';
import { BarChart } from '../../../components/charts';

function monthOffsetKey(off: number): string {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() + off, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function FreelanceRevenuePage() {
  const { data: txns } = useLive(() => getTransactions(), []);

  const mine = useMemo(
    () => (txns || []).filter((t: Txn) => t.type === 'income'
      && (t.category === 'Freelance' || t.source === 'professional:freelance')),
    [txns],
  );

  const months = useMemo(() => {
    const arr: { key: string; label: string; value: number }[] = [];
    for (let off = -5; off <= 0; off++) {
      const key = monthOffsetKey(off);
      const value = mine.filter((t) => t.date.slice(0, 7) === key).reduce((s, t) => s + t.amount, 0);
      arr.push({ key, label: monthLabel(key), value });
    }
    return arr;
  }, [mine]);

  const total = months.reduce((s, m) => s + m.value, 0);
  const avg = total / months.length;
  const best = months.reduce((b, m) => (m.value > b.value ? m : b), months[0]);

  return (
    <Page title="Freelance Revenue" subtitle="Your freelance income trend, totals and monthly average.">
      {mine.length === 0 ? (
        <Card>
          <EmptyState icon={<LineChartIcon size={28} />} title="No freelance income yet"
            text="Record freelance payments as income (category Freelance) in Money → Income, and they will chart here automatically."
            action={<Link to="/finance/transactions?new=income"><Btn variant="primary" icon={<Plus size={16} />}>Add income</Btn></Link>} />
        </Card>
      ) : (
        <>
          <div className="grid cols-3">
            <Card><Stat label="Last 6 months" value={fmtMoney(total)} icon={<LineChartIcon size={20} />} tone="navy" /></Card>
            <Card><Stat label="Monthly average" value={fmtMoney(avg)} tone="gold" /></Card>
            <Card><Stat label="Best month" value={fmtMoney(best.value)} sub={best.label} tone="green" /></Card>
          </div>
          <Card title="Monthly income" subtitle="Last 6 months">
            <BarChart data={months.map((m) => ({ label: m.label, value: m.value }))} money />
          </Card>
          <Card title="Recent freelance income">
            <div className="table-wrap">
              <table className="data">
                <thead><tr><th>Date</th><th>Note</th><th style={{ textAlign: 'right' }}>Amount</th></tr></thead>
                <tbody>
                  {mine.slice(0, 10).map((t) => (
                    <tr key={t.id}>
                      <td>{fmtDate(t.date)}</td>
                      <td><strong>{t.note || t.category}</strong></td>
                      <td style={{ textAlign: 'right' }} className="num">{fmtMoneyFull(t.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </Page>
  );
}
