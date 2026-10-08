import React, { useMemo, useState } from 'react';
import { Page, Tabs, SearchInput } from '../components/ui';
import { ToolCard } from '../components/ToolCard';
import { CATEGORIES } from '../lib/tools';
import { ALL_TOOLS } from '../app/registry';
import { useFavorites } from '../app/shell';
import { DynIcon } from '../components/DynIcon';

export default function ToolDirectory() {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');
  const [favOnly, setFavOnly] = useState(false);
  const { favs } = useFavorites();

  const tools = useMemo(() => {
    const query = q.trim().toLowerCase();
    return ALL_TOOLS.filter((t) => {
      if (cat !== 'all' && t.category !== cat) return false;
      if (favOnly && !favs.has(t.id)) return false;
      if (!query) return true;
      return `${t.name} ${t.description} ${t.keywords.join(' ')}`.toLowerCase().includes(query);
    });
  }, [q, cat, favOnly, favs]);

  return (
    <Page title="Tool directory" subtitle={`${ALL_TOOLS.length} tools across ${CATEGORIES.length} categories. Tap the heart to favorite.`}>
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 240px' }}>
          <SearchInput value={q} onChange={setQ} placeholder="Search tools…" />
        </div>
        <button className={`chip${favOnly ? ' active' : ''}`} onClick={() => setFavOnly(!favOnly)}>
          ♥ Favorites
        </button>
      </div>
      <Tabs
        tabs={[{ value: 'all', label: 'All' }, ...CATEGORIES.map((c) => ({ value: c.id, label: c.name }))]}
        value={cat}
        onChange={setCat}
      />
      {tools.length === 0 ? (
        <p className="muted" style={{ textAlign: 'center', padding: 40 }}>No tools match your search.</p>
      ) : (
        <div className="tool-grid">
          {tools.map((t) => <ToolCard key={t.id} tool={t} />)}
        </div>
      )}
      <div style={{ marginTop: 28 }}>
        <h3 style={{ marginBottom: 12 }}>Browse by category</h3>
        <div className="tool-grid">
          {CATEGORIES.map((c) => (
            <a key={c.id} href={c.path} onClick={(e) => { e.preventDefault(); setCat(c.id); window.scrollTo(0, 0); }}
              className="tool-card" style={{ cursor: 'pointer' }}>
              <span className="tc-ic gold"><DynIcon name={c.icon} /></span>
              <span className="tc-name">{c.name}</span>
              <span className="tc-desc">{c.tagline}</span>
            </a>
          ))}
        </div>
      </div>
    </Page>
  );
}
