import React, { useMemo, useState } from 'react';
import { Page, Card, Field, NumberInput, Segmented } from '../../../components/ui';
import { fmtMoney, fmtMoneyFull, fmtPct, parseAmount } from '../../../lib/format';
import { computeSlabTax, salarySlabs, businessSlabs } from '../lib/tax';
import { TaxDisclaimer } from '../components/TaxDisclaimer';

export default function IncomeTaxPage() {
  const [kind, setKind] = useState<'salary' | 'business'>('salary');
  const [incomeRaw, setIncomeRaw] = useState('1800000');

  const { error, result } = useMemo(() => {
    const income = parseAmount(incomeRaw);
    if (income === null) return { error: 'Please enter a valid income amount.', result: null };
    if (income < 0) return { error: 'Income cannot be negative.', result: null };
    return {
      error: '',
      result: { income, ...computeSlabTax(income, kind === 'salary' ? salarySlabs() : businessSlabs()) },
    };
  }, [incomeRaw, kind]);

  return (
    <Page title="Income Tax Calculator" subtitle="Annual income tax with a slab-wise breakdown.">
      <div className="grid cols-2">
        <div>
          <Card title="Your income">
            <div className="grid">
              <Segmented
                options={[{ value: 'salary', label: 'Salaried' }, { value: 'business', label: 'Business / Individual' }]}
                value={kind} onChange={setKind}
              />
              <Field label="Annual taxable income" error={error} required>
                <NumberInput value={incomeRaw} onChange={(e) => setIncomeRaw(e.target.value)} placeholder="e.g. 1800000" />
              </Field>
            </div>
          </Card>
          <div style={{ marginTop: 16 }}>
            <TaxDisclaimer />
          </div>
        </div>
        <div className="result-panel" aria-live="polite">
          <div className="rp-label">Estimated annual tax</div>
          {result ? (
            <>
              <div className="rp-value num">{fmtMoney(result.total)}</div>
              <div className="kv"><span className="k">Effective tax rate</span><span className="v num">{fmtPct(result.effective)}</span></div>
              <div className="kv"><span className="k">After-tax income</span><span className="v num">{fmtMoney(result.income - result.total)}</span></div>
              <div className="kv"><span className="k">Monthly equivalent</span><span className="v num">{fmtMoney(result.total / 12)}</span></div>
            </>
          ) : (
            <p style={{ color: '#b9c4d8', margin: 0 }}>Enter a valid income to see the estimate.</p>
          )}
        </div>
      </div>

      {result && (
        <Card title="Slab-wise breakdown" subtitle={kind === 'salary' ? 'Salaried person slabs' : 'Business / individual slabs'}>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr><th>Slab</th><th style={{ textAlign: 'right' }}>Taxable in slab</th><th style={{ textAlign: 'right' }}>Rate</th><th style={{ textAlign: 'right' }}>Tax</th></tr>
              </thead>
              <tbody>
                {result.rows.map((r, i) => (
                  <tr key={i}>
                    <td className="num">{r.range}</td>
                    <td className="num" style={{ textAlign: 'right' }}>{fmtMoneyFull(r.taxable)}</td>
                    <td className="num" style={{ textAlign: 'right' }}>{fmtPct(r.rate * 100)}</td>
                    <td className="num" style={{ textAlign: 'right', fontWeight: 700 }}>{fmtMoneyFull(r.tax)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </Page>
  );
}
