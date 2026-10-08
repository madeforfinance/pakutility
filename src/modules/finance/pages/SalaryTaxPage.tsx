import React, { useMemo, useState } from 'react';
import { Page, Card, Field, NumberInput } from '../../../components/ui';
import { fmtMoney, fmtPct, parseAmount } from '../../../lib/format';
import { computeSlabTax, salarySlabs } from '../lib/tax';
import { TaxDisclaimer } from '../components/TaxDisclaimer';

export default function SalaryTaxPage() {
  const [raw, setRaw] = useState('150000');

  const { error, result } = useMemo(() => {
    const monthly = parseAmount(raw);
    if (monthly === null) return { error: 'Please enter a valid salary amount.', result: null };
    if (monthly < 0) return { error: 'Salary cannot be negative.', result: null };
    const annual = monthly * 12;
    const tax = computeSlabTax(annual, salarySlabs());
    const monthlyTax = tax.total / 12;
    return {
      error: '',
      result: { monthly, annual, total: tax.total, effective: tax.effective, monthlyTax, takeHome: Math.max(0, monthly - monthlyTax) },
    };
  }, [raw]);

  return (
    <Page title="Salary Tax Calculator" subtitle="Monthly salary tax and take-home pay estimate.">
      <div className="grid cols-2">
        <div>
          <Card title="Your salary">
            <Field label="Monthly gross salary" error={error} required>
              <NumberInput value={raw} onChange={(e) => setRaw(e.target.value)} placeholder="e.g. 150000" />
            </Field>
          </Card>
          <div style={{ marginTop: 16 }}>
            <TaxDisclaimer />
          </div>
        </div>
        <div className="result-panel" aria-live="polite">
          <div className="rp-label">Monthly take-home (est.)</div>
          {result ? (
            <>
              <div className="rp-value num">{fmtMoney(result.takeHome)}</div>
              <div className="kv"><span className="k">Monthly income tax</span><span className="v num">{fmtMoney(result.monthlyTax)}</span></div>
              <div className="kv"><span className="k">Annual tax</span><span className="v num">{fmtMoney(result.total)}</span></div>
              <div className="kv"><span className="k">Effective rate</span><span className="v num">{fmtPct(result.effective)}</span></div>
            </>
          ) : (
            <p style={{ color: '#b9c4d8', margin: 0 }}>Enter a valid salary to see the estimate.</p>
          )}
        </div>
      </div>
    </Page>
  );
}
