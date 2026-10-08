import React, { useState } from 'react';
import { Page, Card, Field, NumberInput, Segmented, Btn } from '../../../components/ui';
import { parseAmount, fmtMoney, fmtNum, fmtPct } from '../../../lib/format';

type Method = 'straight' | 'declining';

export default function DepreciationPage() {
  const [price, setPrice] = useState('');
  const [years, setYears] = useState('5');
  const [salvage, setSalvage] = useState('');
  const [rate, setRate] = useState('20');
  const [method, setMethod] = useState<Method>('straight');

  const p = parseAmount(price);
  const y = parseAmount(years);
  const s = salvage === '' ? (p !== null ? p * 0.1 : 0) : parseAmount(salvage);
  const r = parseAmount(rate);

  const priceErr = price !== '' && (p === null || p <= 0) ? 'Please enter a valid purchase price.' : '';
  const yearsErr = years !== '' && (y === null || y < 1 || y > 50 || !Number.isInteger(y)) ? 'Enter whole years (1–50).' : '';
  const salvageErr = salvage !== '' && (s === null || s < 0) ? 'Please enter a valid salvage value.' : '';
  const rateErr = rate !== '' && (r === null || r <= 0 || r >= 100) ? 'Enter a rate between 0 and 100.' : '';

  const valid = p !== null && p > 0 && y !== null && Number.isInteger(y) && y >= 1 && y <= 50 &&
    s !== null && s >= 0 && s < p && (method === 'straight' || (r !== null && r > 0 && r < 100));

  interface Row { year: number; dep: number; value: number; }
  let rows: Row[] = [];
  let totalDep = 0;
  let currentValue = 0;
  if (valid) {
    if (method === 'straight') {
      const annual = (p! - s!) / y!;
      let v = p!;
      for (let i = 1; i <= y!; i++) {
        v = Math.max(v - annual, s!);
        rows.push({ year: i, dep: annual, value: v });
      }
      totalDep = p! - v;
      currentValue = v;
    } else {
      const f = r! / 100;
      let v = p!;
      for (let i = 1; i <= y!; i++) {
        const dep = v * f;
        v = Math.max(v - dep, 0);
        rows.push({ year: i, dep, value: v });
      }
      totalDep = p! - v;
      currentValue = v;
    }
  }

  const reset = () => { setPrice(''); setYears('5'); setSalvage(''); setRate('20'); setMethod('straight'); };

  return (
    <Page
      title="Vehicle Depreciation"
      subtitle="Estimate resale value over time"
      actions={<Btn onClick={reset}>Reset</Btn>}
    >
      <div className="grid cols-2" style={{ alignItems: 'start' }}>
        <Card title="Vehicle details">
          <div className="form-row">
            <Field label="Purchase price" error={priceErr} required>
              <NumberInput value={price} onChange={(e) => setPrice(e.target.value)}
                placeholder="e.g. 4500000" inputMode="decimal" invalid={!!priceErr} />
            </Field>
            <Field label="Years owned" error={yearsErr} required>
              <NumberInput value={years} onChange={(e) => setYears(e.target.value)}
                placeholder="5" inputMode="numeric" invalid={!!yearsErr} />
            </Field>
          </div>
          <Field label="Method">
            <Segmented<Method>
              value={method}
              onChange={setMethod}
              options={[
                { value: 'straight', label: 'Straight-line' },
                { value: 'declining', label: 'Declining %' },
              ]}
            />
          </Field>
          {method === 'straight' ? (
            <Field label="Salvage value" error={salvageErr} hint="Defaults to 10% of price if left empty">
              <NumberInput value={salvage} onChange={(e) => setSalvage(e.target.value)}
                placeholder="e.g. 450000" inputMode="decimal" invalid={!!salvageErr} />
            </Field>
          ) : (
            <Field label="Depreciation rate (% per year)" error={rateErr} required>
              <NumberInput value={rate} onChange={(e) => setRate(e.target.value)}
                placeholder="e.g. 20" inputMode="decimal" invalid={!!rateErr} />
            </Field>
          )}
          <p className="small muted">
            {method === 'straight'
              ? 'Straight-line spreads (price − salvage) evenly across the years.'
              : 'Declining-balance applies the rate to the remaining value each year — faster early depreciation, like real resale.'}
          </p>
        </Card>
        <div className="result-panel" aria-live="polite">
          <div className="rp-label">Estimated current value</div>
          <div className="rp-value">{valid ? fmtMoney(currentValue) : '—'}</div>
          <div className="kv"><span className="k">Total depreciation</span><span className="v">{valid ? fmtMoney(totalDep) : '—'}</span></div>
          <div className="kv"><span className="k">Value retained</span><span className="v">{valid ? fmtPct((currentValue / p!) * 100) : '—'}</span></div>
          <div className="kv"><span className="k">Avg. per year</span><span className="v">{valid ? fmtMoney(totalDep / y!) : '—'}</span></div>
        </div>
      </div>

      {valid && rows.length > 0 && (
        <Card title="Year-by-year schedule" style={{ marginTop: 16 }}>
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>Year</th><th>Depreciation</th><th>Book value</th></tr></thead>
              <tbody>
                <tr><td>0 (purchase)</td><td>—</td><td>{fmtMoney(p!)}</td></tr>
                {rows.map((row) => (
                  <tr key={row.year}>
                    <td>{row.year}</td>
                    <td>{fmtMoney(row.dep)}</td>
                    <td style={{ fontWeight: 700 }}>{fmtMoney(row.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="small muted" style={{ marginTop: 10 }}>
            Estimates only — actual resale depends on condition, mileage, demand and market.
          </p>
        </Card>
      )}
    </Page>
  );
}
