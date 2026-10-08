import React from 'react';
import { Info } from 'lucide-react';
import { TAX_DISCLAIMER, TAX_YEAR } from '../lib/tax';

export function TaxDisclaimer() {
  return (
    <div
      className="card"
      style={{ borderLeft: '4px solid var(--gold)', display: 'flex', gap: 12, alignItems: 'flex-start' }}
      role="note"
    >
      <Info size={20} style={{ flexShrink: 0, color: 'var(--gold-deep)', marginTop: 2 }} />
      <div>
        <strong>Tax year {TAX_YEAR} — estimates only.</strong>
        <p className="muted small" style={{ margin: '4px 0 0' }}>{TAX_DISCLAIMER}</p>
      </div>
    </div>
  );
}
