/* Salary per Day — monthly salary → per-day rate. */
import React, { useState } from 'react';
import { Banknote } from 'lucide-react';
import { Page, Card, Field, NumberInput, Stat } from '../../../components/ui';
import { parseAmount, fmtMoney, fmtMoneyFull } from '../../../lib/format';

export default function SalaryDayPage() {
  const [salary, setSalary] = useState('');
  const [days, setDays] = useState('26');
  const [salaryErr, setSalaryErr] = useState('');
  const [daysErr, setDaysErr] = useState('');

  const s = parseAmount(salary);
  const d = parseAmount(days);
  const valid = s !== null && s >= 0 && d !== null && d > 0 && d <= 31;
  const perDay = valid ? (s as number) / (d as number) : null;

  return (
    <Page title="Salary per Day" subtitle="Convert your monthly salary into a per-day rate.">
      <Card title="Your salary">
        <div className="grid cols-2">
          <Field label="Monthly salary" required error={salaryErr || undefined}
            hint={!salaryErr ? 'Gross monthly salary' : undefined}>
            <NumberInput value={salary} placeholder="e.g. 80000"
              onChange={(e) => {
                setSalary(e.target.value);
                const v = parseAmount(e.target.value);
                setSalaryErr(v === null || v < 0 ? 'Please enter a valid amount.' : '');
              }} />
          </Field>
          <Field label="Working days per month" required error={daysErr || undefined}
            hint={!daysErr ? 'Typically 26 (6-day week) or 22 (5-day week)' : undefined}>
            <NumberInput value={days} placeholder="26"
              onChange={(e) => {
                setDays(e.target.value);
                const v = parseAmount(e.target.value);
                setDaysErr(v === null || v <= 0 || v > 31 ? 'Enter a value between 1 and 31.' : '');
              }} />
          </Field>
        </div>
        {perDay !== null ? (
          <div style={{ marginTop: 16 }}>
            <Stat label="Salary per day" value={fmtMoney(perDay)} sub={fmtMoneyFull(perDay, 2)}
              icon={<Banknote size={20} />} tone="navy" />
            <div className="result-line"><span>Per week ({Math.round((d as number) / 4.33)} days avg)</span>
              <strong className="num">{fmtMoney(perDay * ((d as number) / 4.33))}</strong></div>
          </div>
        ) : (
          <p className="muted" style={{ marginTop: 12 }}>Enter your salary and working days to see your per-day rate.</p>
        )}
      </Card>
    </Page>
  );
}
