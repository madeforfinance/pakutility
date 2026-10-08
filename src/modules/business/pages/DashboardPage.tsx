/* Business dashboard: revenue, profit, margins, top products, recent sales. */
import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../../../storage/db';
import { useLive } from '../../../hooks/useLive';
import { Page, Card, Stat, EmptyState, Badge } from '../../../components/ui';
import { DynIcon } from '../../../components/DynIcon';
import { LineChart } from '../../../components/charts';
import { fmtMoney, fmtPct, fmtDate, monthKey, monthLabel } from '../../../lib/format';
import type { Txn } from '../../../lib/money';
import type { Sale, Product } from '../lib/types';
import { saleRevenue, saleProfit } from '../lib/docs';

function lastMonths(n: number): string[] {
  const out: string[] = [];
  const d = new Date();
  d.setDate(1);
  for (let i = n - 1; i >= 0; i--) {
    const t = new Date(d.getFullYear(), d.getMonth() - i, 1);
    out.push(`${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}`);
  }
  return out;
}

export default function DashboardPage() {
  const { data, loading } = useLive(
    async () => ({
      sales: await db.all<Sale>('sales'),
      products: await db.all<Product>('products'),
      txns: await db.all<Txn>('transactions'),
    }),
    [],
  );

  const m = useMemo(() => {
    const sales = data?.sales || [];
    const txns = data?.txns || [];
    const revenue = sales.reduce((s, x) => s + saleRevenue(x.qty, x.price), 0);
    const cogs = sales.reduce((s, x) => s + x.qty * x.cost, 0);
    const gross = revenue - cogs;
    const otherExp = txns
      .filter((t) => t.type === 'expense' && t.category === 'Business' && t.source !== 'business:cogs')
      .reduce((s, t) => s + t.amount, 0);
    const net = gross - otherExp;
    const margin = revenue > 0 ? (net / revenue) * 100 : 0;

    const months = lastMonths(6);
    const revByMonth = months.map((mk) => ({
      label: monthLabel(mk),
      value: sales.filter((s) => monthKey(s.date) === mk).reduce((s, x) => s + saleRevenue(x.qty, x.price), 0),
    }));
    const profitByMonth = months.map((mk) => ({
      label: monthLabel(mk),
      value: sales.filter((s) => monthKey(s.date) === mk).reduce((s, x) => s + saleProfit(x.qty, x.price, x.cost), 0),
    }));

    const revByProduct: Record<string, { name: string; revenue: number; qty: number }> = {};
    for (const s of sales) {
      const k = s.productId || s.productName;
      if (!revByProduct[k]) revByProduct[k] = { name: s.productName, revenue: 0, qty: 0 };
      revByProduct[k].revenue += saleRevenue(s.qty, s.price);
      revByProduct[k].qty += s.qty;
    }
    const topProducts = Object.values(revByProduct).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
    const recent = [...sales].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 8);

    return { sales, revenue, cogs, gross, otherExp, net, margin, revByMonth, profitByMonth, topProducts, recent };
  }, [data]);

  if (loading) return <Page title="Business Dashboard"><p>Loading…</p></Page>;

  return (
    <Page
      title="Business Dashboard"
      subtitle="Revenue, profit and sales at a glance"
      actions={
        <Link to="/business/sales" className="btn btn-primary">
          <DynIcon name="Plus" size={16} /> Record sale
        </Link>
      }
    >
      {m.sales.length === 0 ? (
        <EmptyState
          icon={<DynIcon name="Store" size={30} />}
          title="No sales yet"
          text="Record your first sale to see revenue, profit and trends here."
          action={<Link to="/business/sales" className="btn btn-primary">Record sale</Link>}
        />
      ) : (
        <>
          <div className="biz-stat-grid">
            <Stat label="Total revenue" value={fmtMoney(m.revenue)} icon={<DynIcon name="TrendingUp" size={18} />} tone="navy" />
            <Stat label="Gross profit" value={fmtMoney(m.gross)} sub={`COGS ${fmtMoney(m.cogs)}`} icon={<DynIcon name="Coins" size={18} />} tone="gold" />
            <Stat label="Net profit" value={fmtMoney(m.net)} sub={m.otherExp > 0 ? `Other expenses ${fmtMoney(m.otherExp)}` : 'No other expenses'} icon={<DynIcon name="Wallet" size={18} />} tone="green" />
            <Stat label="Net margin" value={fmtPct(m.margin)} sub={`${m.sales.length} sales`} icon={<DynIcon name="Percent" size={18} />} tone="blue" />
          </div>

          <div className="biz-grid-2">
            <Card title="Revenue — last 6 months">
              <LineChart data={m.revByMonth} money />
            </Card>
            <Card title="Gross profit — last 6 months">
              <LineChart data={m.profitByMonth} money />
            </Card>
          </div>

          <div className="biz-grid-2">
            <Card title="Top products by revenue">
              {m.topProducts.length === 0 ? (
                <p className="muted">No product sales yet.</p>
              ) : (
                <div className="biz-rank">
                  {m.topProducts.map((p, i) => (
                    <div className="biz-rank-row" key={i}>
                      <span className="biz-rank-num">{i + 1}</span>
                      <span className="biz-rank-name">{p.name}<small>{p.qty} sold</small></span>
                      <span className="biz-rank-val">{fmtMoney(p.revenue)}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
            <Card title="Recent sales" actions={<Link to="/business/sales" className="biz-link">View all</Link>}>
              <div className="biz-mini">
                {m.recent.map((s) => (
                  <div className="biz-mini-row" key={s.id}>
                    <div>
                      <strong>{s.productName}</strong>
                      <small>{fmtDate(s.date)} · {s.qty} × {fmtMoney(s.price)}</small>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <strong>{fmtMoney(saleRevenue(s.qty, s.price))}</strong>
                      <small><Badge tone={saleProfit(s.qty, s.price, s.cost) >= 0 ? 'green' : 'red'}>+{fmtMoney(saleProfit(s.qty, s.price, s.cost))}</Badge></small>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </>
      )}
    </Page>
  );
}
