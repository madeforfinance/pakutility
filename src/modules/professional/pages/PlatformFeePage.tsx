/* Platform Fee Calculator — fee deduction + reverse gross-up. Fee % persisted in settings. */
import React, { useEffect, useState } from 'react';
import { Percent } from 'lucide-react';
import { Page, Card, Btn, Field, NumberInput, Segmented, Stat } from '../../../components/ui';
import { toast } from '../../../lib/toast';
import { parseAmount, fmtMoney, fmtMoneyFull, fmtNum } from '../../../lib/format';
import { db } from '../../../storage/db';

export default function PlatformFeePage() {
  const [mode, setMode] = useState<'deduct' | 'grossup'>('deduct');
  const [amount, setAmount] = useState('');
  const [fee, setFee] = useState('10');
  const [err, setErr] = useState('');

  useEffect(() => {
    db.get<{ key: string; value: number }>('settings', 'platformFee').then((r) => {
      if (r && typeof r.value === 'number') setFee(String(r.value));
    });
  }, []);

  const persistFee = async (v: string) => {
    const n = parseAmount(v);
    if (n !== null && n >= 0 && n < 100) {
      await db.set('settings', 'platformFee', n);
    }
  };

  const a = parseAmount(amount);
  const f = parseAmount(fee);
  const valid = a !== null && a > 0 && f !== null && f >= 0 && f < 100;

  let feeAmt = 0;
  let result = 0;
  if (valid) {
    if (mode === 'deduct') {
      feeAmt = (a as number) * ((f as number) / 100);
      result = (a as number) - feeAmt;
    } else {
      result = (a as number) / (1 - (f as number) / 100);
      feeAmt = result - (a as number);
    }
  }

  return (
    <Page title="Platform Fee Calculator" subtitle="What marketplaces take — and what to charge to net your target.">
      <Card title="Fee calculation">
        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            { value: 'deduct', label: 'Earnings → net received' },
            { value: 'grossup', label: 'Want net → charge this' },
          ]}
        />
        <div className="grid cols-2" style={{ marginTop: 14 }}>
          <Field label={mode === 'deduct' ? 'Client payment (earnings)' : 'Net amount you want'} required>
            <NumberInput value={amount} placeholder="e.g. 50000"
              onChange={(e) => {
                setAmount(e.target.value);
                const n = parseAmount(e.target.value);
                setErr(n === null || n <= 0 ? 'Please enter an amount above zero.' : '');
              }} />
          </Field>
          <Field label="Platform fee %" required hint="Saved automatically on this device">
            <NumberInput value={fee} placeholder="10"
              onChange={(e) => {
                setFee(e.target.value);
                const n = parseAmount(e.target.value);
                setErr(n === null || n < 0 || n >= 100 ? 'Enter a fee between 0 and 99.' : '');
              }}
              onBlur={(e) => persistFee(e.target.value)} />
          </Field>
        </div>
        {err && <p className="error" role="alert">{err}</p>}
        {valid ? (
          <div style={{ marginTop: 16 }}>
            <Stat
              label={mode === 'deduct' ? 'You receive' : 'Charge the client'}
              value={fmtMoney(result)} sub={fmtMoneyFull(result, 2)}
              icon={<Percent size={20} />} tone="navy" />
            <div className="result-line"><span>Platform fee ({fmtNum(f, 2)}%)</span>
              <strong className="num">{fmtMoney(feeAmt)}</strong></div>
            <div className="result-line"><span>Effective rate kept</span>
              <strong className="num">{fmtNum(mode === 'deduct' ? (result / (a as number)) * 100 : ((a as number) / result) * 100, 1)}%</strong></div>
            <div className="btn-row" style={{ marginTop: 12 }}>
              <Btn variant="ghost" size="sm" onClick={() => { persistFee(fee); toast.success('Platform fee saved.'); }}>
                Save fee as default
              </Btn>
            </div>
          </div>
        ) : (
          <p className="muted" style={{ marginTop: 12 }}>Enter an amount and the platform fee %.</p>
        )}
      </Card>
    </Page>
  );
}
