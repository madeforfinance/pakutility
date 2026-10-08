import React, { useState } from 'react';
import { Page, SearchInput } from '../../../components/ui';
import { ToolCard } from '../../../components/ToolCard';
import { CALC_DEFS } from '../lib/calcs';
import { CALC_TOOLS } from '../lib/calcTools';

export default function CalculatorsHub() {
  const [q, setQ] = useState('');
  const query = q.trim().toLowerCase();
  const tools = CALC_TOOLS.filter((t) => {
    if (!query) return true;
    const def = CALC_DEFS[t.id.replace(/-calculator$/, '').replace(/-calc$/, '')];
    const hay = `${t.name} ${t.description} ${t.keywords.join(' ')} ${def?.keywords.join(' ') ?? ''}`.toLowerCase();
    return query.split(/\s+/).every((w) => hay.includes(w));
  });

  return (
    <Page title="Calculators" subtitle="Everyday money math — instant, private, offline.">
      <div style={{ maxWidth: 420, marginBottom: 16 }}>
        <SearchInput value={q} onChange={setQ} placeholder="Search calculators…" />
      </div>
      {tools.length === 0 ? (
        <p className="muted">No calculators match “{q}”.</p>
      ) : (
        <div className="tool-grid">
          {tools.map((t) => (
            <ToolCard key={t.id} tool={t} />
          ))}
        </div>
      )}
    </Page>
  );
}
