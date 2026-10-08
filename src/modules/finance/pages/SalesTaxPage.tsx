import React, { useMemo, useState } from 'react';
import { Page, Card, Field, NumberInput, Segmented } from '../../../components/ui';
import { fmtMoney, fmtPct, parseAmount } from '../../../lib/format';
import { SALES_TAX_RATE, SALES_TAX_NOTE } from '../lib/tax';
import { TaxDisclaimer } from '../components/TaxDisclaimer';

export default function SalesTaxPage() {
  const [mode, setMode] = useState<'exclusive' | 'inclusive'>('exclusive');
  const [amountRaw, setAmountRaw] = useState('10000');
  const [rateRaw, setRateRaw] = useState(String(SALES_TAX_RATE * 100));

  const { error, amountError, result } = useMemo(() => {
    const amount = parseAmount(amountRaw);
    if (amount === null || amount < 0)
      return { error: '', amountError: 'Please enter a valid amount.', result: null };
    const rate = parseAmount(rateRaw);
    if (rate === null || rate < 0)
      return { error: 'Please enter a valid tax rate.', amountError: '', result: null };
    const r = rate / 100;
    if (mode === 'exclusive') {
      const tax = amount * r;
      return { error: '', amountError: '', result: { base: amount, tax, total: amount + tax } };
    }
    const base = r > 0 ? amount / (1 + r) : amount;
    return { error: '', amountError: '', result: { base, tax: amount - base, total: amount } };
  }, [amountRaw, rateRaw, mode]);

  return (
    <Page title="Sales Tax Calculator" subtitle="Add sales tax to a price, or extract it from a tax-inclusive price.">
      <div className="grid cols-2">
        <div>
          <Card title="Calculation">
            <div className="grid">
              <Segmented
                options={[{ value: 'exclusive', label: 'Tax exclusive (+ tax)' }, { value: 'inclusive', label: 'Tax inclusive (extract)' }]}
                value={mode} onChange={setMode}
              />
              <Field label={mode === 'exclusive' ? 'Amount (before tax)' : 'Amount (including tax)'} error={amountError} required>
                <NumberInput value={amountRaw} onChange={(e) => setAmountRaw(e.target.value)} placeholder="e.g. 10000" />
              </Field>
              <Field label="Sales tax rate (%)" error={error} hint={SALES_TAX_NOTE} required>
                <NumberInput value={rateRaw} onChange={(e) => setRateRaw(e.target.value)} placeholder="18" />
              </Field>
            </div>
          </Card>
          <div style={{ marginTop: 16 }}>
            <TaxDisclaimer />
          </div>
        </div>
        <div className="result-panel" aria-live="polite">
          <div className="rp-label">Result</div>
          {result ? (
            <>
              <div className="rp-value num">{fmtMoney(result.total)}</div>
              <div className="kv"><span className="k">Base amount</span><span className="v num">{fmtMoney(result.base)}</span></div>
              <div className="kv"><span className="k">Sales tax ({fmtPct(parseAmount(rateRaw) ?? 0, 2)})</span><span className="v num">{fmtMoney(result.tax)}</span></div>
              <div className="kv"><span className="k">Total</span><span className="v num">{fmtMoney(result.total)}</span></div>
            </>
          ) : (
            <p style={{ color: '#b9c4d8', margin: 0 }}>Enter valid values to see the result.</p>
          )}
        </div>
      </div>
    </Page>
  );
}
