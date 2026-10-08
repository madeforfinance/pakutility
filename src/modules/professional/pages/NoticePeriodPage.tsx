/* Notice Period Calculator — resignation date + notice days → last working day. */
import React, { useState } from 'react';
import { CalendarClock } from 'lucide-react';
import { Page, Card, Field, TextInput, NumberInput, Stat } from '../../../components/ui';
import { parseAmount, fmtDate, fmtDateLong, todayISO, addDaysISO, daysUntil } from '../../../lib/format';

export default function NoticePeriodPage() {
  const [resign, setResign] = useState(todayISO());
  const [days, setDays] = useState('30');
  const [daysErr, setDaysErr] = useState('');

  const n = parseAmount(days);
  const valid = resign !== '' && n !== null && n >= 0 && n <= 365;
  const lastDay = valid ? addDaysISO(resign, Math.round(n as number)) : '';
  const remaining = valid ? daysUntil(lastDay) : null;

  return (
    <Page title="Notice Period Calculator" subtitle="Find your last working day from your resignation date and notice period.">
      <Card title="Notice details">
        <div className="grid cols-2">
          <Field label="Resignation date" required>
            <TextInput type="date" value={resign} onChange={(e) => setResign(e.target.value)} />
          </Field>
          <Field label="Notice period (days)" required error={daysErr || undefined}
            hint={!daysErr ? 'Common: 30 days (1 month)' : undefined}>
            <NumberInput value={days} placeholder="30"
              onChange={(e) => {
                setDays(e.target.value);
                const v = parseAmount(e.target.value);
                setDaysErr(v === null || v < 0 || v > 365 ? 'Enter 0–365 days.' : '');
              }} />
          </Field>
        </div>
        {valid ? (
          <div style={{ marginTop: 16 }}>
            <Stat label="Last working day" value={fmtDate(lastDay)} sub={fmtDateLong(lastDay)}
              icon={<CalendarClock size={20} />} tone="navy" />
            <div className="result-line">
              <span>Calendar days remaining</span>
              <strong className="num">{remaining !== null && remaining >= 0 ? `${remaining} day${remaining === 1 ? '' : 's'}` : 'Notice period has ended'}</strong>
            </div>
            <p className="muted small" style={{ marginTop: 10 }}>
              Counted in calendar days including weekends. Check your appointment letter — some
              employers count only working days.
            </p>
          </div>
        ) : (
          <p className="muted" style={{ marginTop: 12 }}>Enter your resignation date and notice period.</p>
        )}
      </Card>
    </Page>
  );
}
