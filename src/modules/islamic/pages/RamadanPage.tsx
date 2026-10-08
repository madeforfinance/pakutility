import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Page, Card, Badge, ProgressBar, EmptyState, Stat } from '../../../components/ui';
import { DynIcon } from '../../../components/DynIcon';
import { db } from '../../../storage/db';
import { prefs } from '../../../lib/prefs';
import { hijriToday, islamicEventsForHijriYear, HIJRI_MONTHS } from '../../../lib/islamic';
import { fmtDate, fmtInt, todayISO, addDaysISO, daysUntil, parseISODate } from '../../../lib/format';

interface DayCheck { fast: boolean; taraweeh: boolean; quran: boolean; }
type Checklist = Record<string, DayCheck>; // '1'..'30'

const COLS: { key: keyof DayCheck; label: string }[] = [
  { key: 'fast', label: 'Fast' },
  { key: 'taraweeh', label: 'Taraweeh' },
  { key: 'quran', label: "Qur'an" },
];

export default function RamadanPage() {
  const adj = prefs.hijriAdjustment || 0;
  const hy = hijriToday(adj).y;
  const storageKey = `ramadan-${hy}`;
  const [checks, setChecks] = useState<Checklist>({});
  const [loaded, setLoaded] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let alive = true;
    db.get<{ key: string; value: unknown }>('settings', storageKey).then((r) => {
      if (alive) {
        const v = r?.value;
        if (v && typeof v === 'object') setChecks(v as Checklist);
        setLoaded(true);
      }
    }).catch(() => { if (alive) setLoaded(true); });
    return () => {
      alive = false;
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  useEffect(() => {
    if (!loaded) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      db.set('settings', storageKey, checks).catch(() => {});
    }, 600);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [checks, loaded, storageKey]);

  const events = useMemo(() => islamicEventsForHijriYear(hy), [hy]);
  const ramadanStart = events.find((e) => e.name.includes('1st Ramadan'))?.gregorian || '';
  const eidFitr = events.find((e) => e.name === 'Eid-ul-Fitr')?.gregorian || '';
  const nextRamadanStart = useMemo(() => {
    const e = islamicEventsForHijriYear(hy + 1).find((x) => x.name.includes('1st Ramadan'));
    return e?.gregorian || '';
  }, [hy]);

  const today = todayISO();
  const dToRamadan = daysUntil(ramadanStart);
  const dToEid = daysUntil(eidFitr);

  const phase: 'before' | 'during' | 'after' =
    ramadanStart && today < ramadanStart ? 'before'
    : eidFitr && today < eidFitr ? 'during'
    : 'after';

  const toggle = (day: number, key: keyof DayCheck) => {
    const k = String(day);
    setChecks((c) => {
      const prev: DayCheck = c[k] || { fast: false, taraweeh: false, quran: false };
      return { ...c, [k]: { ...prev, [key]: !prev[key] } };
    });
  };

  const fastsDone = Object.values(checks).filter((c) => c.fast).length;
  const taraweehDone = Object.values(checks).filter((c) => c.taraweeh).length;
  const quranDone = Object.values(checks).filter((c) => c.quran).length;

  const ramadanDay = phase === 'during' && ramadanStart
    ? Math.min(30, Math.max(1, Math.round((parseISODate(today)!.getTime() - parseISODate(ramadanStart)!.getTime()) / 86400000) + 1))
    : 0;

  return (
    <Page title="Ramadan Tracker" subtitle={`${HIJRI_MONTHS[8]} ${hy} AH`}>
      <div className="grid cols-3" style={{ marginBottom: 16 }}>
        <Stat label="Fasts" value={`${fmtInt(fastsDone)} / 30`} icon={<DynIcon name="Moon" />} tone="gold" />
        <Stat label="Taraweeh" value={`${fmtInt(taraweehDone)} / 30`} icon={<DynIcon name="Moon" />} />
        <Stat label="Qur'an days" value={`${fmtInt(quranDone)} / 30`} icon={<DynIcon name="BookOpen" />} />
      </div>

      <Card title="Countdown" className={phase === 'during' ? 'b-gold' : undefined}>
        {phase === 'before' && dToRamadan !== null && (
          <p style={{ margin: 0, fontSize: 16 }}>
            <Badge tone="gold">{dToRamadan === 0 ? 'Today!' : `${fmtInt(dToRamadan)} days`}</Badge>{' '}
            until <b>1st Ramadan</b> <span className="muted">({ramadanStart ? fmtDate(ramadanStart) : '—'} approx.)</span>
          </p>
        )}
        {phase === 'during' && (
          <div>
            <p style={{ margin: '0 0 8px', fontSize: 16 }}>
              <Badge tone="gold">Day {ramadanDay} of Ramadan</Badge>{' '}
              {dToEid !== null && dToEid > 0 && (
                <span className="muted">· {fmtInt(dToEid)} day{dToEid === 1 ? '' : 's'} to Eid-ul-Fitr ({eidFitr ? fmtDate(eidFitr) : '—'})</span>
              )}
            </p>
            <ProgressBar value={(fastsDone / 30) * 100} />
          </div>
        )}
        {phase === 'after' && (
          <p style={{ margin: 0, fontSize: 16 }}>
            <Badge tone="gold">{fmtInt(daysUntil(nextRamadanStart) || 0)} days</Badge>{' '}
            until next Ramadan <span className="muted">({nextRamadanStart ? fmtDate(nextRamadanStart) : '—'} approx.)</span>
          </p>
        )}
        <p className="small muted" style={{ marginBottom: 0 }}>
          Dates are estimates from the tabular calendar — the actual start depends on moon sighting.
        </p>
      </Card>

      <Card title="30-day checklist" subtitle="Tap to mark each day" style={{ marginTop: 16 }}>
        {!loaded ? (
          <p className="muted">Loading…</p>
        ) : (
          <div className="table-wrap">
            <table className="data" style={{ minWidth: 420 }}>
              <thead>
                <tr>
                  <th>Day</th>
                  {COLS.map((c) => <th key={c.key}>{c.label}</th>)}
                  <th>Gregorian</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 30 }, (_, i) => {
                  const day = i + 1;
                  const giso = ramadanStart ? addDaysISO(ramadanStart, i) : '';
                  const isCurrent = phase === 'during' && day === ramadanDay;
                  const chk = checks[String(day)] || { fast: false, taraweeh: false, quran: false };
                  return (
                    <tr key={day} style={isCurrent ? { background: 'var(--surface-2)' } : undefined}>
                      <td style={{ fontWeight: 800 }}>
                        {day}{isCurrent && <Badge tone="gold">today</Badge>}
                      </td>
                      {COLS.map((c) => (
                        <td key={c.key}>
                          <input
                            type="checkbox"
                            checked={!!chk[c.key]}
                            onChange={() => toggle(day, c.key)}
                            aria-label={`${c.label} day ${day}`}
                            style={{ width: 22, height: 22, accentColor: 'var(--navy)', cursor: 'pointer' }}
                          />
                        </td>
                      ))}
                      <td className="muted small">{giso ? fmtDate(giso) : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="small muted" style={{ marginTop: 10, marginBottom: 0 }}>
          Laylat-ul-Qadr is sought in the odd nights of the last 10 days (21st, 23rd, 25th, 27th, 29th).
        </p>
      </Card>

      {phase === 'before' && (
        <div style={{ marginTop: 16 }}>
          <EmptyState icon={<DynIcon name="Moon" />} title="Ramadan is coming"
            text="Your checklist is ready. Come back on the 1st of Ramadan to start marking your days." />
        </div>
      )}
    </Page>
  );
}
