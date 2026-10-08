/* Countdown — live dd/hh/mm/ss countdown to any date & time. */
import React, { useState } from 'react';
import { Hourglass } from 'lucide-react';
import { Page, Card, Field, TextInput } from '../../../components/ui';
import { useNow, fmtCountdown } from '../lib/timers';

const pad = (n: number) => String(n).padStart(2, '0');

function toLocalInput(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function defaultTarget(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  d.setHours(9, 0, 0, 0);
  return toLocalInput(d);
}

export default function CountdownPage() {
  const [target, setTarget] = useState(defaultTarget);
  const [label, setLabel] = useState('Product launch');
  const now = useNow(1000);

  const t = target ? new Date(target).getTime() : NaN;
  const valid = target !== '' && !Number.isNaN(t);
  const diff = valid ? t - now : 0;
  const parts = fmtCountdown(diff);

  return (
    <Page title="Countdown" subtitle="Live countdown to any date and time.">
      <Card title="Target">
        <div className="grid cols-2">
          <Field label="Event name">
            <TextInput value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Flight to Karachi" maxLength={60} />
          </Field>
          <Field label="Date & time" required>
            <TextInput type="datetime-local" value={target} onChange={(e) => setTarget(e.target.value)} />
          </Field>
        </div>
        {!valid ? (
          <p className="error" role="alert">Please pick a valid date and time.</p>
        ) : diff > 0 ? (
          <div style={{ marginTop: 8 }}>
            <p className="timer-sub" style={{ fontSize: 16 }}>
              <Hourglass size={15} style={{ verticalAlign: -2 }} /> {label.trim() || 'Countdown'}
            </p>
            <div className="count-grid" role="timer" aria-label={`${parts.d} days, ${parts.h} hours, ${parts.m} minutes, ${parts.s} seconds remaining`}>
              <div className="count-box"><b>{parts.d}</b><span>Days</span></div>
              <div className="count-box"><b>{parts.h}</b><span>Hours</span></div>
              <div className="count-box"><b>{parts.m}</b><span>Minutes</span></div>
              <div className="count-box"><b>{parts.s}</b><span>Seconds</span></div>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <div className="timer-display">Time's up!</div>
            <p className="muted">{label.trim() || 'The countdown'} has been reached.</p>
          </div>
        )}
      </Card>
    </Page>
  );
}
