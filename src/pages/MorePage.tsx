import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Page, Card } from '../components/ui';
import { DynIcon } from '../components/DynIcon';
import { CATEGORIES } from '../lib/tools';
import { ALL_TOOLS } from '../app/registry';

const SYSTEM_LINKS = [
  { label: 'Settings', icon: 'Settings', path: '/settings', desc: 'Appearance, data & privacy' },
  { label: 'Backup & restore', icon: 'Download', path: '/settings#data', desc: 'Export or import your data' },
  { label: 'Tool directory', icon: 'Wrench', path: '/tools', desc: 'Browse all tools' },
  { label: 'Activity', icon: 'History', path: '/activity', desc: 'Recent & upcoming' },
];

export default function MorePage() {
  const nav = useNavigate();
  return (
    <Page title="More" subtitle="All categories and system sections.">
      <h3 style={{ margin: '4px 0 12px' }}>Categories</h3>
      <div className="tool-grid" style={{ marginBottom: 24 }}>
        {CATEGORIES.map((c) => {
          const count = ALL_TOOLS.filter((t) => t.category === c.id).length;
          return (
            <div key={c.id} className="tool-card" role="link" tabIndex={0}
              onClick={() => nav(c.path)}
              onKeyDown={(e) => { if (e.key === 'Enter') nav(c.path); }}>
              <span className="tc-ic"><DynIcon name={c.icon} /></span>
              <span className="tc-name">{c.name}</span>
              <span className="tc-desc">{count} tools</span>
            </div>
          );
        })}
      </div>
      <h3 style={{ margin: '4px 0 12px' }}>System</h3>
      <Card>
        <div className="list">
          {SYSTEM_LINKS.map((s) => (
            <button key={s.label} className="list-row" onClick={() => nav(s.path)}>
              <span className="lr-ic"><DynIcon name={s.icon} /></span>
              <span className="lr-main"><span className="lr-title">{s.label}</span><span className="lr-sub">{s.desc}</span></span>
              <span className="lr-right"><DynIcon name="ChevronRight" size={17} /></span>
            </button>
          ))}
        </div>
      </Card>
      <p className="tiny muted" style={{ textAlign: 'center', marginTop: 24 }}>
        PakUtility • Developed by <b>ASNA Consultancy</b>
      </p>
    </Page>
  );
}
