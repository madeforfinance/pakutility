import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings2, ArrowUp, ArrowDown, Eye, EyeOff, Plus } from 'lucide-react';
import { useLive } from '../hooks/useLive';
import { db } from '../storage/db';
import { useSettings } from '../app/settings';
import { useFavorites, useRecentTools } from '../app/shell';
import { toolById } from '../app/searchLib';
import { Card, Btn, Modal, Badge, ProgressBar, EmptyState } from '../components/ui';
import { DynIcon } from '../components/DynIcon';
import { ToolCard } from '../components/ToolCard';
import { summarize } from '../lib/money';
import { hijriToday, fmtHijri } from '../lib/islamic';
import { fmtMoney, fmtDateLong, todayISO, daysUntil, monthKey, timeAgo } from '../lib/format';
import { toast } from '../lib/toast';

const QUICK = [
  { label: 'Calculator', icon: 'Calculator', path: '/tools/calculator' },
  { label: 'Expense', icon: 'TrendingDown', path: '/finance/transactions?new=expense' },
  { label: 'Income', icon: 'TrendingUp', path: '/finance/transactions?new=income' },
  { label: 'Task', icon: 'CheckSquare', path: '/productivity/tasks?new=1' },
  { label: 'Note', icon: 'StickyNote', path: '/productivity/notes?new=1' },
  { label: 'Grocery', icon: 'ShoppingCart', path: '/household/grocery?new=1' },
  { label: 'Invoice', icon: 'Receipt', path: '/business/invoices?new=1' },
  { label: 'Fuel', icon: 'Fuel', path: '/vehicle/fuel?new=1' },
  { label: 'Documents', icon: 'FileText', path: '/documents/templates' },
];

const CARD_DEFS = [
  { id: 'actions', title: 'Quick actions' },
  { id: 'tasks', title: "Today's tasks" },
  { id: 'reminders', title: 'Upcoming reminders' },
  { id: 'finance', title: 'This month' },
  { id: 'budget', title: 'Budget' },
  { id: 'recentTx', title: 'Recent transactions' },
  { id: 'favorites', title: 'Favorite tools' },
  { id: 'recent', title: 'Recently used' },
  { id: 'dates', title: 'Upcoming dates' },
  { id: 'stock', title: 'Low stock & expiring' },
  { id: 'docs', title: 'Document expiry' },
  { id: 'exams', title: 'Upcoming exams' },
  { id: 'maint', title: 'Vehicle maintenance' },
];

interface DashData {
  txns: any[]; tasks: any[]; reminders: any[]; events: any[];
  budgets: any[]; inventory: any[]; documents: any[]; exams: any[];
  maintenance: any[]; grocery: any[];
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return 'Good night';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function Dashboard() {
  const nav = useNavigate();
  const { prefs, update } = useSettings();
  const { favs } = useFavorites();
  const recent = useRecentTools();
  const [customize, setCustomize] = useState(false);

  const { data, loading } = useLive<DashData>(async () => {
    const [txns, tasks, reminders, events, budgets, inventory, documents, exams, maintenance, grocery] = await Promise.all([
      db.all<any>('transactions'), db.all<any>('tasks'), db.all<any>('reminders'),
      db.all<any>('events'), db.all<any>('budgets'), db.all<any>('inventory'),
      db.all<any>('documents'), db.all<any>('exams'), db.all<any>('maintenance'),
      db.all<any>('groceryLists'),
    ]);
    return { txns, tasks, reminders, events, budgets, inventory, documents, exams, maintenance, grocery };
  }, []);

  const layout: { id: string; visible: boolean }[] = useMemo(() => {
    const saved = (prefs as any).dashCards as { id: string; visible: boolean }[] | undefined;
    if (Array.isArray(saved) && saved.length) {
      const ids = new Set(saved.map((s) => s.id));
      const missing = CARD_DEFS.filter((c) => !ids.has(c.id)).map((c) => ({ id: c.id, visible: true }));
      return [...saved.filter((s) => CARD_DEFS.some((c) => c.id === s.id)), ...missing];
    }
    return CARD_DEFS.map((c) => ({ id: c.id, visible: true }));
  }, [prefs]);

  const saveLayout = (l: { id: string; visible: boolean }[]) => update({ dashCards: l } as any);

  const d = data || { txns: [], tasks: [], reminders: [], events: [], budgets: [], inventory: [], documents: [], exams: [], maintenance: [], grocery: [] };
  const mk = monthKey(todayISO());
  const ms = summarize(d.txns, `${mk}-01`, `${mk}-31`);
  const budget = d.budgets.find((b) => b.month === mk);
  const todayTasks = d.tasks.filter((t) => !t.done && t.dueDate && t.dueDate <= todayISO()).slice(0, 5);
  const upcomingRem = d.reminders.filter((r) => !r.done && r.date >= todayISO()).sort((a, b) => (a.date < b.date ? -1 : 1)).slice(0, 5);
  const recentTx = [...d.txns].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 5);
  const favTools = [...favs].map(toolById).filter(Boolean).slice(0, 8);
  const upcomingDates = [
    ...d.events.filter((e) => e.date >= todayISO()).map((e) => ({ title: e.title, date: e.date, kind: e.kind || 'Event' })),
    ...d.exams.filter((e) => e.date >= todayISO()).map((e) => ({ title: e.title, date: e.date, kind: 'Exam' })),
  ].sort((a, b) => (a.date < b.date ? -1 : 1)).slice(0, 5);
  const lowStock = d.inventory.filter((i) => Number(i.qty) <= Number(i.minQty || 0)).slice(0, 5);
  const expiringInv = d.inventory.filter((i) => {
    const du = daysUntil(i.expiryDate);
    return du !== null && du >= 0 && du <= 14;
  }).slice(0, 5);
  const expDocs = d.documents.map((x) => ({ ...x, du: daysUntil(x.expiryDate) }))
    .filter((x) => x.du !== null && x.du <= 60).sort((a, b) => (a.du as number) - (b.du as number)).slice(0, 5);
  const upcomingExams = d.exams.filter((e) => e.date >= todayISO()).sort((a, b) => (a.date < b.date ? -1 : 1)).slice(0, 4);
  const maintDue = d.maintenance.filter((m) => {
    const du = daysUntil(m.nextDue);
    return du !== null && du <= 30;
  }).slice(0, 5);
  const hijri = fmtHijri(hijriToday(prefs.hijriAdjustment || 0));

  const renderCard = (id: string) => {
    switch (id) {
      case 'actions':
        return (
          <Card title="Quick actions">
            <div className="qa-grid">
              {QUICK.map((a) => (
                <button key={a.label} className="qa-item" onClick={() => nav(a.path)}>
                  <span className="qa-ic"><DynIcon name={a.icon} /></span>{a.label}
                </button>
              ))}
            </div>
          </Card>
        );
      case 'tasks':
        return (
          <Card title="Today's tasks" actions={<Btn size="sm" variant="ghost" onClick={() => nav('/productivity/tasks')}>View all</Btn>}>
            {todayTasks.length === 0 ? <p className="muted small" style={{ margin: 0 }}>Nothing due. Enjoy your day.</p> :
              <div className="list">{todayTasks.map((t) => (
                <button key={t.id} className="list-row" onClick={() => nav('/productivity/tasks')}>
                  <span className="lr-ic"><DynIcon name="CheckSquare" /></span>
                  <span className="lr-main"><span className="lr-title">{t.title}</span>
                    <span className="lr-sub">{t.dueDate < todayISO() ? 'Overdue' : 'Due today'}{t.priority ? ` • ${t.priority}` : ''}</span></span>
                  <span className="lr-right">{t.dueDate < todayISO() ? <Badge tone="red">Overdue</Badge> : <Badge tone="amber">Today</Badge>}</span>
                </button>))}
              </div>}
          </Card>
        );
      case 'reminders':
        return (
          <Card title="Upcoming reminders" actions={<Btn size="sm" variant="ghost" onClick={() => nav('/productivity/reminders')}>View all</Btn>}>
            {upcomingRem.length === 0 ? <p className="muted small" style={{ margin: 0 }}>No upcoming reminders.</p> :
              <div className="list">{upcomingRem.map((r) => (
                <div key={r.id} className="list-row">
                  <span className="lr-ic"><DynIcon name="Bell" /></span>
                  <span className="lr-main"><span className="lr-title">{r.title}</span>
                    <span className="lr-sub">{r.date}{r.time ? ` • ${r.time}` : ''}</span></span>
                </div>))}
              </div>}
          </Card>
        );
      case 'finance':
        return (
          <Card title="This month" actions={<Btn size="sm" variant="ghost" onClick={() => nav('/finance/reports')}>Reports</Btn>}>
            <div className="grid cols-3">
              <div className="stat"><span className="stat-label">Income</span><span className="stat-value num" style={{ color: 'var(--success)', fontSize: 20 }}>{fmtMoney(ms.income)}</span></div>
              <div className="stat"><span className="stat-label">Spent</span><span className="stat-value num" style={{ color: 'var(--danger)', fontSize: 20 }}>{fmtMoney(ms.expense)}</span></div>
              <div className="stat"><span className="stat-label">Saved</span><span className="stat-value num" style={{ fontSize: 20 }}>{fmtMoney(ms.savings)}</span></div>
            </div>
          </Card>
        );
      case 'budget':
        if (!budget) return (
          <Card title="Budget">
            <EmptyState icon={<DynIcon name="PiggyBank" />} title="No budget set" text="Set a monthly budget to track spending against it." action={<Btn size="sm" variant="primary" onClick={() => nav('/finance/budgets')}>Set budget</Btn>} />
          </Card>
        );
        const pct = budget.total ? (ms.expense / budget.total) * 100 : 0;
        return (
          <Card title="Budget" actions={<Btn size="sm" variant="ghost" onClick={() => nav('/finance/budgets')}>Manage</Btn>}>
            <div className="kv"><span className="k">Budget</span><span className="v num">{fmtMoney(budget.total)}</span></div>
            <div className="kv"><span className="k">Spent</span><span className="v num">{fmtMoney(ms.expense)}</span></div>
            <div className="kv"><span className="k">Remaining</span><span className="v num">{fmtMoney(budget.total - ms.expense)}</span></div>
            <div style={{ marginTop: 10 }}><ProgressBar value={ms.expense} max={budget.total || 1} /></div>
            <p className="small muted" style={{ margin: '8px 0 0' }}>{pct.toFixed(1)}% used</p>
          </Card>
        );
      case 'recentTx':
        return (
          <Card title="Recent transactions" actions={<Btn size="sm" variant="ghost" onClick={() => nav('/finance/transactions')}>View all</Btn>}>
            {recentTx.length === 0 ? <p className="muted small" style={{ margin: 0 }}>No transactions yet.</p> :
              <div className="list">{recentTx.map((t) => (
                <div key={t.id} className="list-row">
                  <span className="lr-ic"><DynIcon name={t.type === 'income' ? 'TrendingUp' : 'TrendingDown'} /></span>
                  <span className="lr-main"><span className="lr-title">{t.category}</span>
                    <span className="lr-sub">{t.date}{t.note ? ` • ${t.note.slice(0, 30)}` : ''}</span></span>
                  <span className="lr-right num" style={{ fontWeight: 700, color: t.type === 'income' ? 'var(--success)' : 'var(--danger)' }}>
                    {t.type === 'income' ? '+' : '−'}{fmtMoney(t.amount)}</span>
                </div>))}
              </div>}
          </Card>
        );
      case 'favorites':
        return (
          <Card title="Favorite tools" actions={<Btn size="sm" variant="ghost" onClick={() => nav('/tools')}>All tools</Btn>}>
            {favTools.length === 0 ? <p className="muted small" style={{ margin: 0 }}>Tap the heart on any tool to pin it here.</p> :
              <div className="tool-grid">{favTools.map((t) => t && <ToolCard key={t.id} tool={t} />)}</div>}
          </Card>
        );
      case 'recent':
        return (
          <Card title="Recently used">
            {recent.length === 0 ? <p className="muted small" style={{ margin: 0 }}>Tools you open will appear here.</p> :
              <div className="chip-row">{recent.map((r) => (
                <button key={r.id} className="chip" onClick={() => nav(r.path)}>{r.name}</button>
              ))}</div>}
          </Card>
        );
      case 'dates':
        return (
          <Card title="Upcoming dates">
            {upcomingDates.length === 0 ? <p className="muted small" style={{ margin: 0 }}>No upcoming events or exams.</p> :
              <div className="list">{upcomingDates.map((e, i) => (
                <div key={i} className="list-row">
                  <span className="lr-ic"><DynIcon name="CalendarDays" /></span>
                  <span className="lr-main"><span className="lr-title">{e.title}</span><span className="lr-sub">{e.kind}</span></span>
                  <span className="lr-right"><Badge tone="blue">{daysUntil(e.date) === 0 ? 'Today' : `${daysUntil(e.date)}d`}</Badge></span>
                </div>))}
              </div>}
          </Card>
        );
      case 'stock':
        return (
          <Card title="Low stock & expiring" actions={<Btn size="sm" variant="ghost" onClick={() => nav('/household/inventory')}>Inventory</Btn>}>
            {lowStock.length === 0 && expiringInv.length === 0 ? <p className="muted small" style={{ margin: 0 }}>All stocked up.</p> :
              <div className="list">
                {lowStock.map((s) => (
                  <div key={s.id} className="list-row">
                    <span className="lr-ic"><DynIcon name="Package" /></span>
                    <span className="lr-main"><span className="lr-title">{s.name}</span><span className="lr-sub">Qty {s.qty} {s.unit}</span></span>
                    <span className="lr-right"><Badge tone="amber">Low stock</Badge></span>
                  </div>))}
                {expiringInv.map((s) => (
                  <div key={`e${s.id}`} className="list-row">
                    <span className="lr-ic"><DynIcon name="CalendarDays" /></span>
                    <span className="lr-main"><span className="lr-title">{s.name}</span><span className="lr-sub">Expires {s.expiryDate}</span></span>
                    <span className="lr-right"><Badge tone="amber">Expiring</Badge></span>
                  </div>))}
              </div>}
          </Card>
        );
      case 'docs':
        return (
          <Card title="Document expiry" actions={<Btn size="sm" variant="ghost" onClick={() => nav('/documents/expiry')}>View all</Btn>}>
            {expDocs.length === 0 ? <p className="muted small" style={{ margin: 0 }}>No documents expiring soon.</p> :
              <div className="list">{expDocs.map((x) => (
                <div key={x.id} className="list-row">
                  <span className="lr-ic"><DynIcon name="IdCard" /></span>
                  <span className="lr-main"><span className="lr-title">{x.title}</span><span className="lr-sub">{x.kind}</span></span>
                  <span className="lr-right">{(x.du as number) < 0 ? <Badge tone="red">Expired</Badge> : <Badge tone="amber">{x.du}d left</Badge>}</span>
                </div>))}
              </div>}
          </Card>
        );
      case 'exams':
        return (
          <Card title="Upcoming exams" actions={<Btn size="sm" variant="ghost" onClick={() => nav('/student/planner')}>Planner</Btn>}>
            {upcomingExams.length === 0 ? <p className="muted small" style={{ margin: 0 }}>No exams scheduled.</p> :
              <div className="list">{upcomingExams.map((e) => (
                <div key={e.id} className="list-row">
                  <span className="lr-ic"><DynIcon name="GraduationCap" /></span>
                  <span className="lr-main"><span className="lr-title">{e.title}</span><span className="lr-sub">{e.date}</span></span>
                  <span className="lr-right"><Badge tone="blue">{daysUntil(e.date) === 0 ? 'Today' : `${daysUntil(e.date)}d`}</Badge></span>
                </div>))}
              </div>}
          </Card>
        );
      case 'maint':
        return (
          <Card title="Vehicle maintenance" actions={<Btn size="sm" variant="ghost" onClick={() => nav('/vehicle/maintenance')}>View all</Btn>}>
            {maintDue.length === 0 ? <p className="muted small" style={{ margin: 0 }}>No maintenance due soon.</p> :
              <div className="list">{maintDue.map((m) => (
                <div key={m.id} className="list-row">
                  <span className="lr-ic"><DynIcon name="Wrench" /></span>
                  <span className="lr-main"><span className="lr-title">{m.kind}</span><span className="lr-sub">Due {m.nextDue || '—'}</span></span>
                </div>))}
              </div>}
          </Card>
        );
      default:
        return null;
    }
  };

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>{greeting()}, welcome back</h1>
          <p>{fmtDateLong(todayISO())} &nbsp;•&nbsp; {hijri}</p>
        </div>
        <div className="page-actions">
          <Btn variant="secondary" size="sm" icon={<Settings2 size={16} />} onClick={() => setCustomize(true)}>Customize</Btn>
        </div>
      </div>

      {loading ? (
        <div className="grid cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="skel" style={{ height: 150 }} />)}
        </div>
      ) : (
        <div className="grid cols-2">
          {layout.filter((l) => l.visible).map((l) => (
            <div key={l.id}>{renderCard(l.id)}</div>
          ))}
        </div>
      )}

      <p className="tiny muted" style={{ textAlign: 'center', marginTop: 26 }}>
        PakUtility • Developed by <b>ASNA Consultancy</b> • Your data stays on your device
      </p>

      <Modal open={customize} onClose={() => setCustomize(false)} title="Customize dashboard">
        <p className="muted small">Show, hide and reorder dashboard cards.</p>
        <div className="list">
          {layout.map((l, i) => {
            const def = CARD_DEFS.find((c) => c.id === l.id)!;
            return (
              <div key={l.id} className="list-row">
                <button className="icon-btn" aria-label={l.visible ? 'Hide' : 'Show'}
                  onClick={() => { const n = [...layout]; n[i] = { ...n[i], visible: !n[i].visible }; saveLayout(n); }}>
                  {l.visible ? <Eye size={17} /> : <EyeOff size={17} />}
                </button>
                <span className="lr-main"><span className="lr-title">{def.title}</span></span>
                <span className="lr-right" style={{ display: 'flex', gap: 6 }}>
                  <button className="icon-btn" aria-label="Move up" disabled={i === 0}
                    onClick={() => { const n = [...layout]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; saveLayout(n); }}>
                    <ArrowUp size={16} />
                  </button>
                  <button className="icon-btn" aria-label="Move down" disabled={i === layout.length - 1}
                    onClick={() => { const n = [...layout]; [n[i + 1], n[i]] = [n[i], n[i + 1]]; saveLayout(n); }}>
                    <ArrowDown size={16} />
                  </button>
                </span>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
          <Btn variant="primary" onClick={() => { setCustomize(false); toast.success('Dashboard updated'); }}>Done</Btn>
        </div>
      </Modal>
    </div>
  );
}

export function DashboardFab() {
  const nav = useNavigate();
  return (
    <button className="fab only-mobile" aria-label="Quick add" onClick={() => nav('/finance/transactions?new=expense')}>
      <Plus />
    </button>
  );
}
void timeAgo;
