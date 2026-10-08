/* Freelance Hourly Rate — what you must charge from income goals, expenses & fees. */
import React, { useEffect, useState } from 'react';
import { CircleDollarSign } from 'lucide-react';
import { Page, Card, Field, NumberInput, Stat } from '../../../components/ui';
import { parseAmount, fmtMoney, fmtMoneyFull, fmtNum } from '../../../lib/format';
import { db } from '../../../storage/db';

export default function FreelanceRatePage() {
  const [income, setIncome] = useState('');
  const [hours, setHours] = useState('80');
  const [expenses, setExpenses] = useState('');
  const [fee, setFee] = useState('10');
  const [err, setErr] = useState('');

  useEffect(() => {
    db.get<{ key: string; value: number }>('settings', 'platformFee').then((r) => {
      if (r && typeof r.value === 'number') setFee(String(r.value));
    });
  }, []);

  const inc = parseAmount(income);
  const hrs = parseAmount(hours);
  const exp = parseAmount(expenses);
  const feePct = parseAmount(fee);
  const valid = inc !== null && inc > 0 && hrs !== null && hrs > 0
    && exp !== null && exp >= 0 && feePct !== null && feePct >= 0 && feePct < 100;

  const grossNeeded = valid ? (inc as number) + (exp as number) : 0;
  const effectiveHours = valid ? (hrs as number) * (1 - (feePct as number) / 100) : 0;
  const rate = effectiveHours > 0 ? grossNeeded / effectiveHours : 0;

  const check = (v: string, setter: (s: string) => void, ok: (n: number | null) => boolean, msg: string) => {
    setter(v);
    const n = parseAmount(v);
    setErr(ok(n) ? '' : msg);
  };

  return (
    <Page title="Freelance Hourly Rate" subtitle="The hourly rate your income goals actually require.">
      <Card title="Your numbers">
        <div className="grid cols-2">
          <Field label="Desired monthly income" required hint="Take-home target after expenses">
            <NumberInput value={income} placeholder="e.g. 150000"
              onChange={(e) => check(e.target.value, setIncome, (n) => n !== null && n > 0, 'Enter an income above zero.')} />
          </Field>
          <Field label="Billable hours / month" required hint="Hours you can actually bill clients">
            <NumberInput value={hours} placeholder="e.g. 80"
              onChange={(e) => check(e.target.value, setHours, (n) => n !== null && n > 0, 'Enter billable hours above zero.')} />
          </Field>
          <Field label="Monthly business expenses" hint="Internet, tools, workspace…">
            <NumberInput value={expenses} placeholder="e.g. 15000"
              onChange={(e) => check(e.target.value, setExpenses, (n) => n !== null && n >= 0, 'Enter zero or more.')} />
          </Field>
          <Field label="Platform fee %" hint="e.g. Upwork 10%, Fiverr 20%">
            <NumberInput value={fee} placeholder="10"
              onChange={(e) => check(e.target.value, setFee, (n) => n !== null && n >= 0 && n < 100, 'Enter 0–99.')} />
          </Field>
        </div>
        {err && <p className="error" role="alert">{err}</p>}
        {valid ? (
          <div style={{ marginTop: 16 }}>
            <Stat label="Required hourly rate" value={fmtMoney(rate)} sub={fmtMoneyFull(rate, 2)}
              icon={<CircleDollarSign size={20} />} tone="navy" />
            <div className="result-line"><span>Gross needed per month</span>
              <strong className="num">{fmtMoney(grossNeeded)}</strong></div>
            <div className="result-line"><span>Effective billable hours (after {fmtNum(feePct, 1)}% fee)</span>
              <strong className="num">{fmtNum(effectiveHours, 1)}h</strong></div>
            <div className="result-line"><span>Equivalent day rate (8h)</span>
              <strong className="num">{fmtMoney(rate * 8)}</strong></div>
            <p className="muted small" style={{ marginTop: 10 }}>
              Formula: (income + expenses) ÷ (billable hours × (1 − fee %)). Raise your rate or
              billable hours if the number looks too high to sell.
            </p>
          </div>
        ) : (
          <p className="muted" style={{ marginTop: 12 }}>Enter your income target and billable hours to compute your rate.</p>
        )}
      </Card>
    </Page>
  );
}
