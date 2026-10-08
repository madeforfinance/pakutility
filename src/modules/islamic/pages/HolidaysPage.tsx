import React, { useMemo } from 'react';
import { Page, Card, Badge, EmptyState, Segmented } from '../../../components/ui';
import { DynIcon } from '../../../components/DynIcon';
import { prefs } from '../../../lib/prefs';
import { hijriToGregorian, hijriToday, HIJRI_MONTHS } from '../../../lib/islamic';
import { fmtDate, fmtInt, todayISO, daysUntil, parseISODate, addDaysISO } from '../../../lib/format';
import holidaysData from '../../../data/holidays.json';

interface Holiday { name: string; date: string; kind: 'National' | 'Islamic'; }

function hijriToISO(hy: number, hm: number, hd: number, adj: number): string {
  const g = hijriToGregorian(hy, hm, hd);
  const iso = `${g.y}-${String(g.m).padStart(2, '0')}-${String(g.d).padStart(2, '0')}`;
  return addDaysISO(iso, -adj);
}

export default function HolidaysPage() {
  const [filter, setFilter] = React.useState<'All' | 'National' | 'Islamic'>('All');
  const year = new Date().getFullYear();
  const adj = prefs.hijriAdjustment || 0;
  const hy = hijriToday(adj).y;

  const holidays = useMemo<Holiday[]>(() => {
    const list: Holiday[] = [];
    const fixed = (holidaysData as { fixed: { day: number; month: number; name: string }[] }).fixed || [];
    for (const h of fixed) {
      list.push({
        name: h.name,
        date: `${year}-${String(h.month).padStart(2, '0')}-${String(h.day).padStart(2, '0')}`,
        kind: 'National',
      });
    }
    // Islamic holidays for the hijri years overlapping this gregorian year.
    const islamicDefs = [
      { name: 'Eid-ul-Fitr (1 Shawwal)', m: 10, d: 1 },
      { name: 'Eid-ul-Adha (10 Dhul-Hijjah)', m: 12, d: 10 },
      { name: 'Ashura (9 Muharram)', m: 1, d: 9 },
      { name: 'Ashura (10 Muharram)', m: 1, d: 10 },
      { name: 'Eid Milad-un-Nabi (12 Rabi-ul-Awwal)', m: 3, d: 12 },
    ];
    for (const y of [hy - 1, hy, hy + 1]) {
      for (const def of islamicDefs) {
        const iso = hijriToISO(y, def.m, def.d, adj);
        if (iso.slice(0, 4) === String(year)) {
          list.push({ name: def.name, date: iso, kind: 'Islamic' });
        }
      }
    }
    return list.sort((a, b) => (a.date < b.date ? -1 : 1));
  }, [year, hy, adj]);

  const shown = filter === 'All' ? holidays : holidays.filter((h) => h.kind === filter);
  const upcoming = holidays.filter((h) => h.date >= todayISO()).length;

  return (
    <Page
      title="Pakistan Holidays"
      subtitle={`${year} · ${fmtInt(upcoming)} upcoming`}
      actions={
        <Segmented value={filter} onChange={(v) => setFilter(v as typeof filter)} options={[
          { value: 'All', label: 'All' },
          { value: 'National', label: 'National' },
          { value: 'Islamic', label: 'Islamic' },
        ]} />
      }
    >
      <Card>
        {shown.length === 0 ? (
          <EmptyState icon={<DynIcon name="Landmark" />} title="No holidays in this filter"
            text="Try a different filter." />
        ) : (
          <div>
            {shown.map((h, i) => {
              const left = daysUntil(h.date);
              const past = h.date < todayISO();
              const weekday = parseISODate(h.date)?.toLocaleDateString('en-GB', { weekday: 'long' }) || '';
              return (
                <div className="list-row" key={`${h.date}-${i}`} style={past ? { opacity: 0.55 } : undefined}>
                  <div className="lr-ic"><DynIcon name={h.kind === 'National' ? 'Landmark' : 'Moon'} /></div>
                  <div className="lr-main">
                    <div className="lr-title">{h.name}</div>
                    <div className="lr-sub">{fmtDate(h.date)}{weekday ? ` · ${weekday}` : ''}</div>
                  </div>
                  <div className="lr-right" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <Badge tone={h.kind === 'National' ? 'green' : 'gold'}>{h.kind}</Badge>
                    {!past && left !== null && (
                      <Badge tone={left === 0 ? 'gold' : 'gray'}>
                        {left === 0 ? 'Today' : `in ${fmtInt(left)}d`}
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <p className="small muted" style={{ marginTop: 12, marginBottom: 0 }}>
          Islamic holidays ({HIJRI_MONTHS[0]}, {HIJRI_MONTHS[2]}, {HIJRI_MONTHS[9]}, {HIJRI_MONTHS[11]}) are
          subject to moon sighting and may shift by a day. National holidays follow the official calendar.
        </p>
      </Card>
    </Page>
  );
}
