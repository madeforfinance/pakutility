/* Business reports: date range, monthly revenue/profit charts, product mix, CSV export. */
import React, { useMemo, useState } from 'react';
import { db } from '../../../storage/db';
import { useLive } from '../../../hooks/useLive';
import { Page, Card, Btn, Field, TextInput, EmptyState } from '../../../components/ui';
import { DynIcon } from '../../../components/DynIcon';
import { toast } from '../../../lib/toast';
import { fmtMoney, fmtDate, monthLabel, addDaysISO, todayISO } from '../../../lib/format';
import type { Sale } from '../lib/types';
import { saleRevenue, saleProfit, downloadCsv } from '../lib/docs';
import { BarChart, DonutChart } from '../../../components/charts';

function monthKeysBetween(fromISO: string, toISO: string): string[] {
  const out: string[] = [];
  const d = new Date(fromISO.slice(0, 4) + '-' + fromISO.slice(5, 7) + '-01T00:00:00');
  const end = toISO.slice(0, 7);
  for (let i = 0; i < 24; i++) {
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (key > end) break;
    out.push(key);
    d.setMonth(d.getMonth() + 1);
  }
  return out;
}

export default function ReportsPage() {
  const { data } = useLive(
    async () => ({ sales: await db.all<Sale>('sales') }),
    [],
  );
  const allSales = data?.sales || [];

  const [from, setFrom] = useState(addDaysISO(todayISO(), -90));
  const [to, setTo] = useState(todayISO());

  const sales = useMemo(
    () => allSales.filter((s) => s.date >= from && s.date <= to).sort((a, b) => (a.date < b.date ? 1 : -1)),
    [allSales, from, to],
  );

  const m = useMemo(() => {
    const months = monthKeysBetween(from, to);
    const byMonth = (fn: (s: Sale) => number) =>
      months.map((mk) => ({
        label: monthLabel(mk),
        value: sales.filter((s) => s.date.slice(0, 7) === mk).reduce((t, s) => t + fn(s), 0),
      }));
    const revByMonth = byMonth((s) => saleRevenue(s.qty, s.price));
    const profitByMonth = byMonth((s) => saleProfit(s.qty, s.price, s.cost));

    const byProduct: Record<string, number> = {};
    for (const s of sales) byProduct[s.productName] = (byProduct[s.productName] || 0) + saleRevenue(s.qty, s.price);
    const sorted = Object.entries(byProduct).sort((a, b) => b[1] - a[1]);
    const top = sorted.slice(0, 8);
    const rest = sorted.slice(8).reduce((t, [, v]) => t + v, 0);
    const donut = top.map(([label, value]) => ({ label, value }));
    if (rest > 0) donut.push({ label: 'Other', value: rest });

    const revenue = sales.reduce((t, s) => t + saleRevenue(s.qty, s.price), 0);
    const profit = sales.reduce((t, s) => t + saleProfit(s.qty, s.price, s.cost), 0);
    return { revByMonth, profitByMonth, donut, revenue, profit };
  }, [sales, from, to]);

  const exportSales = () => {
    if (!sales.length) {
      toast.error('No sales in this period to export.');
      return;
    }
    downloadCsv(`pakutility-sales-${from}-to-${to}.csv`, [
      ['Date', 'Product', 'Qty', 'Price', 'Cost', 'Revenue', 'Profit', 'Note'],
      ...sales.map((s) => [
        s.date, s.productName, s.qty, s.price, s.cost,
        saleRevenue(s.qty, s.price), saleProfit(s.qty, s.price, s.cost), s.note || '',
      ]),
    ]);
    toast.success('Sales CSV downloaded');
  };

  return (
    <Page
      title="Business Reports"
      subtitle="Filter by date, visualize and export"
      actions={<Btn variant="secondary" icon={<DynIcon name="Download" size={15} />} onClick={exportSales}>Export CSV</Btn>}
    >
      <Card>
        <div className="biz-form-2" style={{ maxWidth: 560 }}>
          <Field label="From"><TextInput type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} /></Field>
          <Field label="To"><TextInput type="date" value={to} min={from} max={todayISO()} onChange={(e) => setTo(e.target.value)} /></Field>
        </div>
        <p className="muted" style={{ margin: '4px 0 0' }}>
          {sales.length} sale{sales.length === 1 ? '' : 's'} · Revenue {fmtMoney(m.revenue)} · Profit {fmtMoney(m.profit)}
          {from && to && <> · {fmtDate(from)} to {fmtDate(to)}</>}
        </p>
      </Card>

      {allSales.length === 0 ? (
        <EmptyState
          icon={<DynIcon name="BarChart3" size={30} />}
          title="No sales to report"
          text="Record some sales first — reports, charts and CSV export will appear here."
        />
      ) : sales.length === 0 ? (
        <EmptyState
          icon={<DynIcon name="BarChart3" size={30} />}
          title="No sales in this period"
          text="Try widening the date range."
        />
      ) : (
        <>
          <div className="biz-grid-2">
            <Card title="Revenue by month"><BarChart data={m.revByMonth} money /></Card>
            <Card title="Profit by month"><BarChart data={m.profitByMonth} money /></Card>
          </div>
          <Card title="Sales by product">
            {m.donut.length ? (
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <DonutChart data={m.donut} money />
              </div>
            ) : (
              <p className="muted">No data.</p>
            )}
          </Card>
        </>
      )}
    </Page>
  );
}
