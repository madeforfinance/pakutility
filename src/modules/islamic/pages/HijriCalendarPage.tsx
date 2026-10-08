import React, { useMemo, useState } from 'react';
import { Page, Card, Btn, IconBtn } from '../../../components/ui';
import { DynIcon } from '../../../components/DynIcon';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { prefs } from '../../../lib/prefs';
import {
  gregorianToHijri, hijriToGregorian, hijriToday, fmtHijri, HIJRI_MONTHS,
  islamicEventsForHijriYear,
} from '../../../lib/islamic';
import { fmtDate, addDaysISO, parseISODate } from '../../../lib/format';

function isHijriLeapYear(hy: number): boolean {
  return ((11 * hy + 14) % 30) < 11;
}

function daysInHijriMonth(hy: number, hm: number): number {
  if (hm === 12) return isHijriLeapYear(hy) ? 30 : 29;
  return hm % 2 === 1 ? 30 : 29;
}

/** Gregorian ISO date of a Hijri day, honoring the user's moon-sighting adjustment. */
function hijriDayToISO(hy: number, hm: number, hd: number, adj: number): string {
  const g = hijriToGregorian(hy, hm, hd);
  const iso = `${g.y}-${String(g.m).padStart(2, '0')}-${String(g.d).padStart(2, '0')}`;
  return addDaysISO(iso, -adj);
}

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function HijriCalendarPage() {
  const adj = prefs.hijriAdjustment || 0;
  const today = hijriToday(adj);
  const [hy, setHy] = useState(today.y);
  const [hm, setHm] = useState(today.m);

  const firstDay = prefs.firstDayOfWeek ?? 1;
  const orderedDow = useMemo(() => {
    const arr: string[] = [];
    for (let i = 0; i < 7; i++) arr.push(DOW[(firstDay + i) % 7]);
    return arr;
  }, [firstDay]);

  const days = daysInHijriMonth(hy, hm);
  const firstISO = hijriDayToISO(hy, hm, 1, adj);
  const lastISO = hijriDayToISO(hy, hm, days, adj);
  const firstWeekday = parseISODate(firstISO)?.getDay() ?? 0;
  const leadBlanks = (firstWeekday - firstDay + 7) % 7;

  const eventDays = useMemo(() => {
    const set = new Map<number, string>();
    for (const e of islamicEventsForHijriYear(hy)) {
      const m = /^(\d+)\s/.exec(e.hijri);
      if (m) {
        const d = parseInt(m[1], 10);
        // Rough month match by event name to avoid cross-month collisions.
        const monthIdx = HIJRI_MONTHS.findIndex((mo) => e.hijri.includes(mo));
        if (monthIdx + 1 === hm) set.set(d, e.name);
      }
    }
    return set;
  }, [hy, hm]);

  const prev = () => {
    if (hm === 1) { setHy(hy - 1); setHm(12); } else setHm(hm - 1);
  };
  const next = () => {
    if (hm === 12) { setHy(hy + 1); setHm(1); } else setHm(hm + 1);
  };
  const goToday = () => { setHy(today.y); setHm(today.m); };

  const cells: (number | null)[] = [
    ...Array<null>(leadBlanks).fill(null),
    ...Array.from({ length: days }, (_, i) => i + 1),
  ];

  return (
    <Page
      title="Hijri Calendar"
      subtitle={`Today: ${fmtHijri(today)}`}
      actions={<Btn onClick={goToday}>Today</Btn>}
    >
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <IconBtn label="Previous month" onClick={prev}><ChevronLeft size={20} /></IconBtn>
          <h3 style={{ margin: 0, textAlign: 'center' }}>
            {HIJRI_MONTHS[hm - 1]} {hy} AH
            <div className="small muted" style={{ fontWeight: 400 }}>
              {fmtDate(firstISO)} – {fmtDate(lastISO)}
            </div>
          </h3>
          <IconBtn label="Next month" onClick={next}><ChevronRight size={20} /></IconBtn>
        </div>
        <div className="cal-grid" role="grid" aria-label={`${HIJRI_MONTHS[hm - 1]} ${hy}`}>
          {orderedDow.map((d) => <div className="cal-dow" key={d}>{d}</div>)}
          {cells.map((d, i) => {
            if (d === null) return <div key={`b${i}`} />;
            const iso = hijriDayToISO(hy, hm, d, adj);
            const gDate = parseISODate(iso);
            const isToday = d === today.d && hm === today.m && hy === today.y;
            const ev = eventDays.get(d);
            return (
              <div key={d} className={`cal-day${isToday ? ' today' : ''}`} role="gridcell"
                title={`${fmtHijri({ y: hy, m: hm, d })} · ${fmtDate(iso)}${ev ? ` · ${ev}` : ''}`}
                style={ev && !isToday ? { borderColor: 'var(--gold)', borderStyle: 'dashed' } : undefined}>
                <span>{d}</span>
                <span className="tiny muted">{gDate ? gDate.getDate() : ''}</span>
                {ev && <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--gold)' }} />}
              </div>
            );
          })}
        </div>
        <p className="small muted" style={{ marginTop: 12, marginBottom: 0 }}>
          <DynIcon name="Info" /> Islamic dates can vary by a day depending on local moon sighting in Pakistan.
          Adjust in Settings → Islamic if your local announcement differs.
        </p>
      </Card>
    </Page>
  );
}
