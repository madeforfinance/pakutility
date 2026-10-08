import React, { useMemo, useState } from 'react';
import { Page, Card, Field, NumberInput, Badge } from '../../../components/ui';
import { fmtMoney, fmtPct, parseAmount } from '../../../lib/format';
import { computeZakat, ZAKAT_RATE, ZAKAT_NISAB_DEFAULT, ZAKAT_NOTE } from '../lib/tax';

const FIELDS = [
  { key: 'cash', label: 'Cash in hand' },
  { key: 'bank', label: 'Bank balance' },
  { key: 'investments', label: 'Investments / shares' },
  { key: 'gold', label: 'Gold value' },
  { key: 'silver', label: 'Silver value' },
  { key: 'debts', label: 'Debts owed by you' },
] as const;

export default function ZakatPage() {
  const [vals, setVals] = useState<Record<string, string>>({ cash: '', bank: '', investments: '', gold: '', silver: '', debts: '' });
  const [nisabRaw, setNisabRaw] = useState(String(ZAKAT_NISAB_DEFAULT));

  const { error, result } = useMemo(() => {
    const nums: Record<string, number> = {};
    for (const f of FIELDS) {
      const raw = (vals[f.key] ?? '').trim();
      if (raw === '') {
        nums[f.key] = 0;
        continue;
      }
      const n = parseAmount(raw);
      if (n === null || n < 0) return { error: `Please enter a valid amount for “${f.label}”.`, result: null };
      nums[f.key] = n;
    }
    const nisab = parseAmount(nisabRaw);
    if (nisab === null || nisab <= 0) return { error: 'Please enter a valid nisab value.', result: null };
    const zakatable = nums.cash + nums.bank + nums.investments + nums.gold + nums.silver;
    const net = zakatable - nums.debts;
    const { due, aboveNisab } = computeZakat(net, nisab);
    return { error: '', result: { zakatable, debts: nums.debts, net, nisab, due, aboveNisab } };
  }, [vals, nisabRaw]);

  return (
    <Page title="Zakat Calculator" subtitle="Zakat on wealth held for a lunar year, with nisab check.">
      <div className="grid cols-2">
        <Card title="Your assets & liabilities">
          <div className="grid">
            {FIELDS.map((f) => (
              <Field key={f.key} label={f.label}>
                <NumberInput
                  value={vals[f.key]}
                  onChange={(e) => setVals((s) => ({ ...s, [f.key]: e.target.value }))}
                  placeholder="0"
                />
              </Field>
            ))}
            <Field label="Nisab (Rs.)" error={error} hint="Nisab changes with gold/silver prices — verify and update it.">
              <NumberInput value={nisabRaw} onChange={(e) => setNisabRaw(e.target.value)} />
            </Field>
            <p className="muted small" style={{ margin: 0 }}>{ZAKAT_NOTE}</p>
          </div>
        </Card>
        <div className="result-panel" aria-live="polite">
          <div className="rp-label">Zakat due ({fmtPct(ZAKAT_RATE * 100, 2)})</div>
          {result ? (
            <>
              <div className="rp-value num">{fmtMoney(result.due)}</div>
              <div className="kv"><span className="k">Net zakatable wealth</span><span className="v num">{fmtMoney(result.net)}</span></div>
              <div className="kv"><span className="k">Nisab threshold</span><span className="v num">{fmtMoney(result.nisab)}</span></div>
              <div className="kv">
                <span className="k">Status</span>
                <span className="v">
                  {result.aboveNisab
                    ? <Badge tone="green">Above nisab — zakat due</Badge>
                    : <Badge tone="amber">Below nisab — no zakat</Badge>}
                </span>
              </div>
            </>
          ) : (
            <p style={{ color: '#b9c4d8', margin: 0 }}>Enter your assets to calculate zakat.</p>
          )}
        </div>
      </div>
    </Page>
  );
}
