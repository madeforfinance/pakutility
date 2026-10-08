import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Page, SearchInput } from '../components/ui';
import { DynIcon } from '../components/DynIcon';
import { searchTools, searchData, SearchHit } from '../app/searchLib';

export default function SearchPage() {
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<SearchHit[]>([]);
  const nav = useNavigate();

  useEffect(() => {
    const query = q.trim();
    if (!query) { setHits([]); return; }
    let alive = true;
    const t = setTimeout(async () => {
      const tools = searchTools(query, 20);
      const data = await searchData(query, 20);
      if (alive) setHits([...tools, ...data]);
    }, 200);
    return () => { alive = false; clearTimeout(t); };
  }, [q]);

  return (
    <Page title="Search" subtitle="Find tools, transactions, notes, tasks, customers and more.">
      <SearchInput value={q} onChange={setQ} placeholder="Try 'fuel', 'tax', 'invoice'…" />
      <div style={{ marginTop: 14 }}>
        {q.trim() && hits.length === 0 && <p className="muted" style={{ textAlign: 'center', padding: 30 }}>No results.</p>}
        {!q.trim() && <p className="muted" style={{ textAlign: 'center', padding: 30 }}>Type to search across everything.</p>}
        {hits.map((h, i) => (
          <button key={i} className="list-row" onClick={() => nav(h.path)}>
            <span className="lr-ic"><DynIcon name={h.icon} /></span>
            <span className="lr-main">
              <span className="lr-title">{h.title}</span>
              <span className="lr-sub">{h.sub}</span>
            </span>
            <span className="lr-right"><span className="badge b-gray">{h.kind}</span></span>
          </button>
        ))}
      </div>
    </Page>
  );
}
