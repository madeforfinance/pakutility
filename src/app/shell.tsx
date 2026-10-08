import React, { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Search, Plus, Moon, Sun, MonitorSmartphone } from 'lucide-react';
import { CATEGORIES } from '../lib/tools';
import { ALL_TOOLS, findToolByPath } from './registry';
import { DynIcon } from '../components/DynIcon';
import { Modal, SearchInput } from '../components/ui';
import { useSettings } from './settings';
import { db, subscribe } from '../storage/db';
import { fmtMoney } from '../lib/format';

function useDebounced<T>(v: T, ms: number): T {
  const [d, setD] = useState(v);
  useEffect(() => {
    const t = setTimeout(() => setD(v), ms);
    return () => clearTimeout(t);
  }, [v, ms]);
  return d;
}

/* ---------------- Global search ---------------- */
interface SearchHit { title: string; sub: string; path: string; icon: string; kind: string }

function SearchModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState('');
  const dq = useDebounced(q.trim().toLowerCase(), 180);
  const [hits, setHits] = useState<SearchHit[]>([]);
  const nav = useNavigate();

  useEffect(() => {
    if (!open) {
      setQ('');
      setHits([]);
      return;
    }
    if (!dq) {
      setHits([]);
      return;
    }
    let alive = true;
    (async () => {
      const out: SearchHit[] = [];
      for (const t of ALL_TOOLS) {
        const hay = `${t.name} ${t.description} ${t.keywords.join(' ')}`.toLowerCase();
        if (hay.includes(dq)) out.push({ title: t.name, sub: t.description, path: t.path, icon: t.icon, kind: 'Tool' });
        if (out.length >= 12) break;
      }
      const match = (rows: any[], title: (r: any) => string, sub: (r: any) => string, path: string, icon: string, kind: string) => {
        for (const r of rows) {
          if (`${title(r)} ${sub(r)}`.toLowerCase().includes(dq) && out.length < 30) {
            out.push({ title: title(r), sub: sub(r), path, icon, kind });
          }
        }
      };
      try {
        const [txns, notes, tasks, customers, products, vehicles] = await Promise.all([
          db.all<any>('transactions'), db.all<any>('notes'), db.all<any>('tasks'),
          db.all<any>('customers'), db.all<any>('products'), db.all<any>('vehicles'),
        ]);
        match(txns.slice(-80), (r) => `${r.type === 'income' ? 'Income' : 'Expense'}: ${r.category}`, (r) => `${fmtMoney(r.amount)} on ${r.date}`, '/finance/transactions', 'ArrowLeftRight', 'Transaction');
        match(notes, (r) => r.title || 'Untitled note', (r) => (r.body || '').slice(0, 70), '/productivity/notes', 'StickyNote', 'Note');
        match(tasks, (r) => r.title, (r) => (r.dueDate ? `Due ${r.dueDate}` : 'No due date'), '/productivity/tasks', 'CheckSquare', 'Task');
        match(customers, (r) => r.name, (r) => r.phone || 'Customer', '/business/customers', 'Users', 'Customer');
        match(products, (r) => r.name, (r) => fmtMoney(r.price), '/business/products', 'Package', 'Product');
        match(vehicles, (r) => r.name, (r) => r.plate || 'Vehicle', '/vehicle/vehicles', 'Car', 'Vehicle');
      } catch {
        /* search stays tool-only on error */
      }
      if (alive) setHits(out);
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dq, open ]);

  const go = (path: string) => {
    onClose();
    nav(path);
  };

  return (
    <Modal open={open} onClose={onClose} title="Search PakUtility">
      <SearchInput value={q} onChange={setQ} placeholder="Try 'fuel', 'tax', 'invoice'…" />
      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', maxHeight: 380, overflowY: 'auto' }}>
        {dq && hits.length === 0 && <p className="muted" style={{ textAlign: 'center', padding: 20 }}>No results for &ldquo;{q}&rdquo;.</p>}
        {!dq && <p className="muted" style={{ textAlign: 'center', padding: 20 }}>Search tools, transactions, notes, tasks, customers and more.</p>}
        {hits.map((h, i) => (
          <button key={i} className="list-row" onClick={() => go(h.path)}>
            <span className="lr-ic"><DynIcon name={h.icon} /></span>
            <span className="lr-main">
              <span className="lr-title">{h.title}</span>
              <span className="lr-sub">{h.sub}</span>
            </span>
            <span className="lr-right"><span className="badge b-gray">{h.kind}</span></span>
          </button>
        ))}
      </div>
    </Modal>
  );
}

/* ---------------- Quick add ---------------- */
const QUICK_ACTIONS = [
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

function QuickAdd({ open, onClose }: { open: boolean; onClose: () => void }) {
  const nav = useNavigate();
  return (
    <Modal open={open} onClose={onClose} title="Quick add">
      <div className="qa-grid">
        {QUICK_ACTIONS.map((a) => (
          <button key={a.label} className="qa-item" onClick={() => { onClose(); nav(a.path); }}>
            <span className="qa-ic"><DynIcon name={a.icon} /></span>
            {a.label}
          </button>
        ))}
      </div>
    </Modal>
  );
}

/* ---------------- Shell ---------------- */
const SIDEBAR_NAV = [
  { to: '/', label: 'Dashboard', icon: 'LayoutDashboard', end: true },
  ...CATEGORIES.map((c) => ({ to: c.path, label: c.name, icon: c.icon, end: false })),
  { to: '/settings', label: 'Settings', icon: 'Settings', end: false },
];

export function Shell() {
  const loc = useLocation();
  const nav = useNavigate();
  const { prefs, update } = useSettings();
  const [searchOpen, setSearchOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const tool = findToolByPath(loc.pathname);
    if (!tool) return;
    (async () => {
      try {
        await db.put('recentTools', { id: tool.id, at: new Date().toISOString(), name: tool.name, path: tool.path, icon: tool.icon });
        const all = await db.all<any>('recentTools');
        if (all.length > 24) {
          const sorted = all.sort((a, b) => (a.at < b.at ? -1 : 1));
          for (const old of sorted.slice(0, all.length - 24)) await db.remove('recentTools', old.id);
        }
      } catch { /* non-fatal */ }
    })();
  }, [loc.pathname]);

  const cycleTheme = () => {
    const next = prefs.theme === 'light' ? 'dark' : prefs.theme === 'dark' ? 'system' : 'light';
    update({ theme: next });
  };
  const themeIcon = useMemo(
    () => (prefs.theme === 'dark' ? <Moon /> : prefs.theme === 'light' ? <Sun /> : <MonitorSmartphone />),
    [prefs.theme],
  );

  const bnActive = (to: string) => (to === '/' ? loc.pathname === '/' : loc.pathname.startsWith(to));

  return (
    <div className="shell">
      <aside className="sidebar" aria-label="Main navigation">
        <div className="brand-block">
          <img src="/icons/icon-192.png" alt="PakUtility logo" />
          <div className="brand-text">
            <div className="brand-name">PakUtility</div>
            <div className="brand-sub">Developed by <b>ASNA Consultancy</b></div>
          </div>
        </div>
        <nav className="nav-scroll">
          <div className="nav-label">Menu</div>
          {SIDEBAR_NAV.slice(0, 1).map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <DynIcon name={n.icon} /><span className="lbl">{n.label}</span>
            </NavLink>
          ))}
          <div className="nav-label">Categories</div>
          {SIDEBAR_NAV.slice(1, -1).map((n) => (
            <NavLink key={n.to} to={n.to} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <DynIcon name={n.icon} /><span className="lbl">{n.label}</span>
            </NavLink>
          ))}
          <div className="nav-label">System</div>
          {SIDEBAR_NAV.slice(-1).map((n) => (
            <NavLink key={n.to} to={n.to} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <DynIcon name={n.icon} /><span className="lbl">{n.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="mobile-brand">
            <img src="/icons/icon-192.png" alt="PakUtility logo" />
            <div>
              <div className="mb-dev">Developed by <b>ASNA Consultancy</b></div>
              <div className="mb-name">PakUtility</div>
            </div>
          </div>
          <button className="search-trigger" onClick={() => setSearchOpen(true)} aria-label="Search (Ctrl+K)">
            <Search size={17} />
            <span className="st-text">Search tools, transactions, notes…</span>
            <kbd>Ctrl K</kbd>
          </button>
          <div className="topbar-actions">
            <button className="icon-btn" onClick={cycleTheme} aria-label={`Theme: ${prefs.theme}. Activate to change.`} title={`Theme: ${prefs.theme}`}>
              {themeIcon}
            </button>
          </div>
        </header>

        <main className="content">
          <React.Suspense fallback={
            <div className="grid cols-3">
              <div className="skel" style={{ height: 120 }} />
              <div className="skel" style={{ height: 120 }} />
              <div className="skel" style={{ height: 120 }} />
            </div>
          }>
            <Outlet />
          </React.Suspense>
        </main>

        <nav className="bottom-nav" aria-label="Mobile navigation">
          <div className="bn-grid">
            <button className={`bn-item${bnActive('/') ? ' active' : ''}`} onClick={() => nav('/')}>
              <DynIcon name="LayoutDashboard" /><span>Home</span>
            </button>
            <button className={`bn-item${bnActive('/tools') ? ' active' : ''}`} onClick={() => nav('/tools')}>
              <DynIcon name="Wrench" /><span>Tools</span>
            </button>
            <button className="bn-item bn-add" onClick={() => setAddOpen(true)} aria-label="Quick add">
              <span className="fab-mini"><Plus /></span><span>Add</span>
            </button>
            <button className={`bn-item${bnActive('/activity') ? ' active' : ''}`} onClick={() => nav('/activity')}>
              <DynIcon name="History" /><span>Activity</span>
            </button>
            <button className={`bn-item${bnActive('/more') ? ' active' : ''}`} onClick={() => nav('/more')}>
              <DynIcon name="LayoutDashboard" /><span>More</span>
            </button>
          </div>
        </nav>
      </div>

      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
      <QuickAdd open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}

export function useRecentTools() {
  const [recent, setRecent] = useState<any[]>([]);
  useEffect(() => {
    let alive = true;
    const load = () => {
      db.all<any>('recentTools')
        .then((rows) => { if (alive) setRecent(rows.sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 8)); })
        .catch(() => {});
    };
    load();
    const unsub = subscribe(load);
    return () => { alive = false; unsub(); };
  }, []);
  return recent;
}

export function useFavorites() {
  const [favs, setFavs] = useState<Set<string>>(new Set());
  useEffect(() => {
    let alive = true;
    const load = () => {
      db.all<any>('favorites')
        .then((rows) => { if (alive) setFavs(new Set(rows.map((r) => r.id))); })
        .catch(() => {});
    };
    load();
    const unsub = subscribe(load);
    return () => { alive = false; unsub(); };
  }, []);
  const toggle = async (toolId: string) => {
    if (favs.has(toolId)) {
      await db.remove('favorites', toolId);
      setFavs((s) => { const n = new Set(s); n.delete(toolId); return n; });
    } else {
      await db.add('favorites', { id: toolId });
      setFavs((s) => new Set(s).add(toolId));
    }
  };
  return { favs, toggle };
}
