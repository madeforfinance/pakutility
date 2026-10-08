/* Salary per Hour — monthly salary → hourly rate. */
import React, { useState } from 'react';
import { Timer } from 'lucide-react';
import { Page, Card, Field, NumberInput, Stat } from '../../../components/ui';
import { parseAmount, fmtMoney, fmtMoneyFull, fmtNum } from '../../../lib/format';

export default function SalaryHourPage() {
  const [salary, setSalary] = useState('');
  const [hoursWeek, setHoursWeek] = useState('48');
  const [salaryErr, setSalaryErr] = useState('');
  const [hoursErr, setHoursErr] = useState('');

  const s = parseAmount(salary);
  const h = parseAmount(hoursWeek);
  const valid = s !== null && s >= 0 && h !== null && h > 0 && h <= 168;
  const monthlyHours = valid ? (h as number) * (52 / 12) : null;
  const perHour = valid && monthlyHours ? (s as number) / monthlyHours : null;

  return (
    <Page title="Salary per Hour" subtitle="Convert your monthly salary into an hourly rate.">
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
          <Field label="Hours worked per week" required error={hoursErr || undefined}
            hint={!hoursErr ? 'Standard in Pakistan is often 48' : undefined}>
            <NumberInput value={hoursWeek} placeholder="48"
              onChange={(e) => {
                setHoursWeek(e.target.value);
                const v = parseAmount(e.target.value);
                setHoursErr(v === null || v <= 0 || v > 168 ? 'Enter a value between 1 and 168.' : '');
              }} />
          </Field>
        </div>
        {perHour !== null ? (
          <div style={{ marginTop: 16 }}>
            <Stat label="Salary per hour" value={fmtMoney(perHour)} sub={fmtMoneyFull(perHour, 2)}
              icon={<Timer size={20} />} tone="navy" />
            <div className="result-line"><span>Hours per month (avg)</span>
              <strong className="num">{fmtNum(monthlyHours, 1)}</strong></div>
            <div className="result-line"><span>Per 8-hour day</span>
              <strong className="num">{fmtMoney(perHour * 8)}</strong></div>
          </div>
        ) : (
          <p className="muted" style={{ marginTop: 12 }}>Enter your salary and weekly hours to see your hourly rate.</p>
        )}
      </Card>
    </Page>
  );
}
