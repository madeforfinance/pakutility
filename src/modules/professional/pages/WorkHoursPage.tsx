/* Work Hours Calculator — single day + weekly planner with regular/overtime split. */
import React, { useState } from 'react';
import { Clock } from 'lucide-react';
import { Page, Card, Field, TextInput, NumberInput, Stat } from '../../../components/ui';
import { fmtNum } from '../../../lib/format';
import { hmToMin, minToHM } from '../lib/timers';

const BASELINE = 8 * 60; // 8h regular baseline in minutes
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

interface DayRow { start: string; end: string; brk: string; off: boolean }

function dayMinutes(start: string, end: string, brk: string): number | null {
  const s = hmToMin(start);
  const e = hmToMin(end);
  if (s === null || e === null) return null;
  let diff = e - s;
  if (diff <= 0) diff += 24 * 60; // overnight shift
  const b = Math.max(0, Number(brk) || 0);
  return Math.max(0, diff - b);
}

const emptyWeek = (): DayRow[] =>
  DAYS.map((_, i) => ({ start: '09:00', end: '17:00', brk: '60', off: i >= 5 }));

export default function WorkHoursPage() {
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('17:00');
  const [brk, setBrk] = useState('60');
  const [week, setWeek] = useState<DayRow[]>(emptyWeek);

  const single = dayMinutes(start, end, brk);
  const singleReg = single === null ? null : Math.min(single, BASELINE);
  const singleOt = single === null ? null : Math.max(0, single - BASELINE);

  const setRow = (i: number, patch: Partial<DayRow>) =>
    setWeek((prev) => prev.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const weekMins = week.map((r) => (r.off ? 0 : dayMinutes(r.start, r.end, r.brk)));
  const weekTotal = weekMins.reduce<number>((s, m) => s + (m || 0), 0);
  const weekReg = Math.min(weekTotal, 5 * BASELINE);
  const weekOt = Math.max(0, weekTotal - 5 * BASELINE);
  const weekValid = weekMins.every((m) => m !== null);

  return (
    <Page title="Work Hours Calculator" subtitle="Daily and weekly hours with a regular / overtime split (8h baseline).">
      <div className="grid cols-2">
        <Card title="Single day">
          <div className="grid cols-3">
            <Field label="Start time"><TextInput type="time" value={start} onChange={(e) => setStart(e.target.value)} /></Field>
            <Field label="End time"><TextInput type="time" value={end} onChange={(e) => setEnd(e.target.value)} /></Field>
            <Field label="Break (min)"><NumberInput value={brk} onChange={(e) => setBrk(e.target.value)} placeholder="60" /></Field>
          </div>
          {single === null ? (
            <p className="error" role="alert">Please enter valid start and end times.</p>
          ) : (
            <div style={{ marginTop: 12 }}>
              <Stat label="Total hours" value={minToHM(single)} sub={`${fmtNum(single / 60, 2)} hours`} icon={<Clock size={20} />} tone="navy" />
              <div className="result-line"><span>Regular (up to 8h)</span><strong className="num">{minToHM(singleReg || 0)}</strong></div>
              <div className="result-line"><span>Overtime</span><strong className="num">{minToHM(singleOt || 0)}</strong></div>
            </div>
          )}
        </Card>

        <Card title="Weekly planner" subtitle="Untick days off. Overnight shifts are supported.">
          <div className="week-grid">
            {DAYS.map((d, i) => (
              <div className="week-row" key={d}>
                <label className="check-row day-name">
                  <input type="checkbox" checked={!week[i].off} onChange={(e) => setRow(i, { off: !e.target.checked })} aria-label={`${d} working day`} />
                  <span>{d.slice(0, 3)}</span>
                </label>
                <Field><TextInput type="time" value={week[i].start} disabled={week[i].off}
                  onChange={(e) => setRow(i, { start: e.target.value })} aria-label={`${d} start`} /></Field>
                <Field><TextInput type="time" value={week[i].end} disabled={week[i].off}
                  onChange={(e) => setRow(i, { end: e.target.value })} aria-label={`${d} end`} /></Field>
                <Field><NumberInput value={week[i].brk} disabled={week[i].off}
                  onChange={(e) => setRow(i, { brk: e.target.value })} aria-label={`${d} break minutes`} placeholder="Break" /></Field>
              </div>
            ))}
          </div>
          {!weekValid ? (
            <p className="error" role="alert">Please enter valid times for all working days.</p>
          ) : (
            <div className="week-total">
              <Stat label="Week total" value={minToHM(weekTotal)} sub={`${fmtNum(weekTotal / 60, 2)} hours`} tone="gold" />
              <Stat label="Regular (40h)" value={minToHM(weekReg)} tone="blue" />
              <Stat label="Overtime" value={minToHM(weekOt)} tone={weekOt > 0 ? 'green' : 'blue'} />
            </div>
          )}
        </Card>
      </div>
    </Page>
  );
}
