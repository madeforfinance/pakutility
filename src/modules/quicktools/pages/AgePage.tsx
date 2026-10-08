/* Age calculator — exact age, totals, weekday born, next birthday countdown. */
import React, { useMemo, useState } from 'react';
import { Page, Card, Field, TextInput, Stat, EmptyState } from '../../../components/ui';
import { DynIcon } from '../../../components/DynIcon';
import { parseISODate, fmtInt, todayISO, daysUntil } from '../../../lib/format';

export default function AgePage() {
  const [dob, setDob] = useState('');

  type AgeRes =
    | { error: string }
    | { years: number; months: number; days: number; totalDays: number; weekday: string; nextIn: number; error: null };

  const res: AgeRes | null = useMemo((): AgeRes | null => {
    if (!dob) return null;
    const birth = parseISODate(dob);
    if (!birth) return { error: 'Please enter a valid date of birth.' };
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    if (birth.getTime() > now.getTime()) return { error: 'Date of birth cannot be in the future.' };

    let years = now.getFullYear() - birth.getFullYear();
    let months = now.getMonth() - birth.getMonth();
    let days = now.getDate() - birth.getDate();
    if (days < 0) {
      months -= 1;
      const prevMonthDays = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
      days += prevMonthDays;
    }
    if (months < 0) { years -= 1; months += 12; }

    const totalDays = Math.round((now.getTime() - birth.getTime()) / 86400000);
    const weekday = birth.toLocaleDateString('en-PK', { weekday: 'long' });

    // next birthday
    let nb = `${now.getFullYear()}-${dob.slice(5)}`;
    let nd = daysUntil(nb);
    if (nd == null || nd < 0) {
      nb = `${now.getFullYear() + 1}-${dob.slice(5)}`;
      nd = daysUntil(nb);
    }
    return { years, months, days, totalDays, weekday, nextIn: nd ?? 0, error: null };
  }, [dob]);

  return (
    <Page title="Age Calculator" subtitle="Find out your exact age in years, months and days.">
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <Card>
          <Field label="Date of birth">
            <TextInput type="date" value={dob} max={todayISO()} onChange={(e) => setDob(e.target.value)} />
          </Field>
        </Card>

        {!res ? (
          <EmptyState icon={<DynIcon name="Cake" size={40} />} title="Enter your date of birth"
            text="Your exact age, total days lived and next birthday countdown will appear here." />
        ) : res.error != null ? (
          <Card><p className="error" role="alert" style={{ margin: 0 }}>{res.error}</p></Card>
        ) : (
          <>
            <div className="grid cols-3">
              <Stat label="Years" value={String(res.years)} icon={<DynIcon name="Cake" size={20} />} tone="navy" />
              <Stat label="Months" value={String(res.months)} icon={<DynIcon name="CalendarDays" size={20} />} tone="gold" />
              <Stat label="Days" value={String(res.days)} icon={<DynIcon name="Sun" size={20} />} tone="blue" />
            </div>
            <Card title="More details">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 15 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="muted">Total months</span><strong className="num">{fmtInt(res.years * 12 + res.months)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="muted">Total weeks</span><strong className="num">{fmtInt(Math.floor(res.totalDays / 7))}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="muted">Total days lived</span><strong className="num">{fmtInt(res.totalDays)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="muted">Born on</span><strong>{res.weekday}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="muted">Next birthday</span>
                  <strong>{res.nextIn === 0 ? 'Today — happy birthday!' : `in ${res.nextIn} day${res.nextIn === 1 ? '' : 's'}`}</strong>
                </div>
              </div>
            </Card>
          </>
        )}
      </div>
    </Page>
  );
}
