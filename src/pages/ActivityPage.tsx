import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Page, Card, Badge, EmptyState } from '../components/ui';
import { DynIcon } from '../components/DynIcon';
import { useLive } from '../hooks/useLive';
import { db } from '../storage/db';
import { fmtMoney, fmtDate, todayISO, daysUntil, timeAgo } from '../lib/format';

export default function ActivityPage() {
  const nav = useNavigate();
  const { data } = useLive(async () => {
    const [txns, tasks, notes, events, exams, sales] = await Promise.all([
      db.all<any>('transactions'), db.all<any>('tasks'), db.all<any>('notes'),
      db.all<any>('events'), db.all<any>('exams'), db.all<any>('sales'),
    ]);
    return { txns, tasks, notes, events, exams, sales };
  }, []);
  const d = data || { txns: [], tasks: [], notes: [], events: [], exams: [], sales: [] };

  const recentTx = [...d.txns].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 8);
  const dueTasks = d.tasks.filter((t) => !t.done && t.dueDate && t.dueDate <= todayISO()).slice(0, 8);
  const recentNotes = [...d.notes].sort((a, b) => ((a.updatedAt || '') < (b.updatedAt || '') ? 1 : -1)).slice(0, 5);
  const upcoming = [
    ...d.events.filter((e) => e.date >= todayISO()).map((e) => ({ title: e.title, date: e.date, sub: e.kind || 'Event', path: '/productivity/calendar' })),
    ...d.exams.filter((e) => e.date >= todayISO()).map((e) => ({ title: e.title, date: e.date, sub: 'Exam', path: '/student/planner' })),
  ].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 8);
  const recentSales = [...d.sales].sort((a, b) => ((a.date || '') < (b.date || '') ? 1 : -1)).slice(0, 5);

  const empty = recentTx.length + dueTasks.length + recentNotes.length + upcoming.length + recentSales.length === 0;

  return (
    <Page title="Activity" subtitle="Your recent and upcoming activity across PakUtility.">
      {empty && (
        <EmptyState icon={<DynIcon name="History" />} title="Nothing here yet"
          text="As you add transactions, tasks, notes and sales, your activity feed will appear here."
          action={<button className="btn btn-primary btn-sm" onClick={() => nav('/tools')}>Explore tools</button>} />
      )}
      <div className="grid cols-2">
        {dueTasks.length > 0 && (
          <Card title="Due tasks" actions={<button className="btn btn-ghost btn-sm" onClick={() => nav('/productivity/tasks')}>View</button>}>
            <div className="list">{dueTasks.map((t) => (
              <div key={t.id} className="list-row">
                <span className="lr-ic"><DynIcon name="CheckSquare" /></span>
                <span className="lr-main"><span className="lr-title">{t.title}</span><span className="lr-sub">Due {fmtDate(t.dueDate)}</span></span>
                <span className="lr-right">{t.dueDate < todayISO() ? <Badge tone="red">Overdue</Badge> : <Badge tone="amber">Due</Badge>}</span>
              </div>))}
            </div>
          </Card>
        )}
        {upcoming.length > 0 && (
          <Card title="Coming up">
            <div className="list">{upcoming.map((e, i) => (
              <button key={i} className="list-row" onClick={() => nav(e.path)}>
                <span className="lr-ic"><DynIcon name="CalendarDays" /></span>
                <span className="lr-main"><span className="lr-title">{e.title}</span><span className="lr-sub">{e.sub} • {fmtDate(e.date)}</span></span>
                <span className="lr-right"><Badge tone="blue">{daysUntil(e.date) === 0 ? 'Today' : `${daysUntil(e.date)}d`}</Badge></span>
              </button>))}
            </div>
          </Card>
        )}
        {recentTx.length > 0 && (
          <Card title="Recent transactions" actions={<button className="btn btn-ghost btn-sm" onClick={() => nav('/finance/transactions')}>View</button>}>
            <div className="list">{recentTx.map((t) => (
              <div key={t.id} className="list-row">
                <span className="lr-ic"><DynIcon name={t.type === 'income' ? 'TrendingUp' : 'TrendingDown'} /></span>
                <span className="lr-main"><span className="lr-title">{t.category}</span><span className="lr-sub">{fmtDate(t.date)}{t.note ? ` • ${t.note.slice(0, 28)}` : ''}</span></span>
                <span className="lr-right num" style={{ fontWeight: 700, color: t.type === 'income' ? 'var(--success)' : undefined }}>{t.type === 'income' ? '+' : '−'}{fmtMoney(t.amount)}</span>
              </div>))}
            </div>
          </Card>
        )}
        {recentSales.length > 0 && (
          <Card title="Recent sales" actions={<button className="btn btn-ghost btn-sm" onClick={() => nav('/business/sales')}>View</button>}>
            <div className="list">{recentSales.map((s) => (
              <div key={s.id} className="list-row">
                <span className="lr-ic"><DynIcon name="ShoppingCart" /></span>
                <span className="lr-main"><span className="lr-title">{s.productName} × {s.qty}</span><span className="lr-sub">{fmtDate(s.date)}</span></span>
                <span className="lr-right num" style={{ fontWeight: 700 }}>{fmtMoney(s.qty * s.price)}</span>
              </div>))}
            </div>
          </Card>
        )}
        {recentNotes.length > 0 && (
          <Card title="Recent notes" actions={<button className="btn btn-ghost btn-sm" onClick={() => nav('/productivity/notes')}>View</button>}>
            <div className="list">{recentNotes.map((n) => (
              <button key={n.id} className="list-row" onClick={() => nav('/productivity/notes')}>
                <span className="lr-ic"><DynIcon name="StickyNote" /></span>
                <span className="lr-main"><span className="lr-title">{n.title || 'Untitled'}</span><span className="lr-sub">{timeAgo(n.updatedAt)}</span></span>
              </button>))}
            </div>
          </Card>
        )}
      </div>
    </Page>
  );
}
