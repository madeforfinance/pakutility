/* Date difference + add/subtract days. */
import React, { useMemo, useState } from 'react';
import { Page, Card, Field, TextInput, NumberInput, Stat, EmptyState } from '../../../components/ui';
import { DynIcon } from '../../../components/DynIcon';
import { parseISODate, fmtInt, fmtNum, fmtDate, addDaysISO, todayISO, toNum } from '../../../lib/format';

export default function DateDiffPage() {
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [base, setBase] = useState(todayISO());
  const [n, setN] = useState('30');

  const diff = useMemo(() => {
    const da = parseISODate(a);
    const db = parseISODate(b);
    if (!da || !db) return null;
    const days = Math.abs(Math.round((db.getTime() - da.getTime()) / 86400000));
    const dir = da.getTime() === db.getTime() ? 'same' : da.getTime() < db.getTime() ? 'after' : 'before';
    return { days, weeks: days / 7, months: days / 30.44, years: days / 365.25, dir };
  }, [a, b]);

  const shifted = useMemo(() => {
    const d = parseISODate(base);
    if (!d) return null;
    const days = toNum(n, NaN);
    if (!Number.isFinite(days)) return { error: 'Please enter a valid number of days.' };
    const iso = addDaysISO(base, Math.trunc(days));
    const dt = parseISODate(iso)!;
    return { iso, weekday: dt.toLocaleDateString('en-PK', { weekday: 'long' }), error: null as string | null };
  }, [base, n]);

  return (
    <Page title="Date Difference" subtitle="Days between two dates, or add/subtract days from a date.">
      <div className="grid cols-2">
        <Card title="Difference between dates">
          <div className="form-grid">
            <Field label="From date"><TextInput type="date" value={a} onChange={(e) => setA(e.target.value)} /></Field>
            <Field label="To date"><TextInput type="date" value={b} onChange={(e) => setB(e.target.value)} /></Field>
          </div>
          {!diff ? (
            <EmptyState icon={<DynIcon name="CalendarDays" size={36} />} title="Pick two dates"
              text="The difference in days, weeks, months and years will appear here." />
          ) : (
            <>
              {diff.dir !== 'same' && (
                <p className="muted small" style={{ marginTop: 0 }}>
                  {fmtDate(a)} is {diff.dir === 'after' ? 'before' : 'after'} {fmtDate(b)}.
                </p>
              )}
              <div className="grid cols-2">
                <Stat label="Days" value={fmtInt(diff.days)} icon={<DynIcon name="CalendarDays" size={20} />} tone="navy" />
                <Stat label="Weeks" value={fmtNum(diff.weeks, 1)} icon={<DynIcon name="Calendar" size={20} />} tone="gold" />
                <Stat label="Months" value={fmtNum(diff.months, 1)} icon={<DynIcon name="Moon" size={20} />} tone="blue" />
                <Stat label="Years" value={fmtNum(diff.years, 2)} icon={<DynIcon name="Hourglass" size={20} />} tone="green" />
              </div>
            </>
          )}
        </Card>

        <Card title="Add / subtract days">
          <div className="form-grid">
            <Field label="Start date"><TextInput type="date" value={base} onChange={(e) => setBase(e.target.value)} /></Field>
            <Field label="Days (+ add, − subtract)"><NumberInput value={n} onChange={(e) => setN(e.target.value)} placeholder="e.g. 30 or -15" /></Field>
          </div>
          {!shifted ? (
            <EmptyState icon={<DynIcon name="ArrowLeftRight" size={36} />} title="Enter days"
              text="Use a negative number to go back in time." />
          ) : shifted.error ? (
            <p className="error" role="alert" style={{ margin: 0 }}>{shifted.error}</p>
          ) : (
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <div className="muted small">Result</div>
              <div style={{ fontSize: 30, fontWeight: 800 }}>{fmtDate(shifted.iso)}</div>
              <div className="muted">{shifted.weekday}</div>
            </div>
          )}
        </Card>
      </div>
    </Page>
  );
}
