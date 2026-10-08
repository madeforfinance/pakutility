/* Project Pricing — hours × rate + expenses + margin → quote price breakdown. */
import React, { useState } from 'react';
import { Briefcase } from 'lucide-react';
import { Page, Card, Field, NumberInput, Stat } from '../../../components/ui';
import { parseAmount, fmtMoney, fmtMoneyFull, fmtNum } from '../../../lib/format';

export default function ProjectPricingPage() {
  const [hours, setHours] = useState('');
  const [rate, setRate] = useState('');
  const [expenses, setExpenses] = useState('');
  const [margin, setMargin] = useState('20');
  const [err, setErr] = useState('');

  const h = parseAmount(hours);
  const r = parseAmount(rate);
  const e = parseAmount(expenses);
  const m = parseAmount(margin);
  const valid = h !== null && h > 0 && r !== null && r >= 0 && e !== null && e >= 0
    && m !== null && m >= 0 && m <= 500;

  const labor = valid ? (h as number) * (r as number) : 0;
  const cost = labor + (valid ? (e as number) : 0);
  const marginAmt = cost * ((valid ? (m as number) : 0) / 100);
  const price = cost + marginAmt;

  const check = (v: string, setter: (s: string) => void, ok: (n: number | null) => boolean, msg: string) => {
    setter(v);
    const n = parseAmount(v);
    setErr(ok(n) ? '' : msg);
  };

  return (
    <Page title="Project Pricing" subtitle="Build a profitable quote from hours, rate, expenses and margin.">
      <Card title="Project inputs">
        <div className="grid cols-2">
          <Field label="Estimated hours" required>
            <NumberInput value={hours} placeholder="e.g. 40"
              onChange={(e) => check(e.target.value, setHours, (n) => n !== null && n > 0, 'Enter hours above zero.')} />
          </Field>
          <Field label="Hourly rate" required>
            <NumberInput value={rate} placeholder="e.g. 2500"
              onChange={(e) => check(e.target.value, setRate, (n) => n !== null && n >= 0, 'Enter a valid rate.')} />
          </Field>
          <Field label="Project expenses" hint="Stock, subcontractors, travel…">
            <NumberInput value={expenses} placeholder="e.g. 5000"
              onChange={(e) => check(e.target.value, setExpenses, (n) => n !== null && n >= 0, 'Enter zero or more.')} />
          </Field>
          <Field label="Profit margin %" hint="Your markup on total cost">
            <NumberInput value={margin} placeholder="20"
              onChange={(e) => check(e.target.value, setMargin, (n) => n !== null && n >= 0 && n <= 500, 'Enter 0–500.')} />
          </Field>
        </div>
        {err && <p className="error" role="alert">{err}</p>}
        {valid ? (
          <div style={{ marginTop: 16 }}>
            <Stat label="Quote price" value={fmtMoney(price)} sub={fmtMoneyFull(price, 2)}
              icon={<Briefcase size={20} />} tone="gold" />
            <div className="result-line"><span>Labour ({fmtNum(h, 1)}h × {fmtMoney(r)})</span>
              <strong className="num">{fmtMoney(labor)}</strong></div>
            <div className="result-line"><span>Expenses</span>
              <strong className="num">{fmtMoney(e)}</strong></div>
            <div className="result-line"><span>Total cost</span>
              <strong className="num">{fmtMoney(cost)}</strong></div>
            <div className="result-line"><span>Profit margin ({fmtNum(m, 1)}%)</span>
              <strong className="num">{fmtMoney(marginAmt)}</strong></div>
            <p className="muted small" style={{ marginTop: 10 }}>
              Send this figure as your quotation — use Client Quotation to make it official.
            </p>
          </div>
        ) : (
          <p className="muted" style={{ marginTop: 12 }}>Enter the project hours and your rate to build the quote.</p>
        )}
      </Card>
    </Page>
  );
}
