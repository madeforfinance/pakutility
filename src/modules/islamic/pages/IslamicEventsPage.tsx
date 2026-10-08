import React, { useMemo } from 'react';
import { Page, Card, Badge, EmptyState } from '../../../components/ui';
import { DynIcon } from '../../../components/DynIcon';
import { prefs } from '../../../lib/prefs';
import { hijriToday, islamicEventsForHijriYear } from '../../../lib/islamic';
import { fmtDate, fmtInt, todayISO, daysUntil, parseISODate } from '../../../lib/format';

export default function IslamicEventsPage() {
  const hy = hijriToday(prefs.hijriAdjustment || 0).y;

  const upcoming = useMemo(() => {
    const today = todayISO();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + 365);
    const cutoffISO = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, '0')}-${String(cutoff.getDate()).padStart(2, '0')}`;
    const all = [...islamicEventsForHijriYear(hy), ...islamicEventsForHijriYear(hy + 1)];
    return all
      .filter((e) => e.gregorian >= today && e.gregorian <= cutoffISO)
      .sort((a, b) => (a.gregorian < b.gregorian ? -1 : 1));
  }, [hy]);

  return (
    <Page title="Islamic Events" subtitle={`Upcoming observances · ${hy}–${hy + 1} AH`}>
      <Card>
        {upcoming.length === 0 ? (
          <EmptyState icon={<DynIcon name="Calendar" />} title="No upcoming events"
            text="Check back later for the next Islamic observances." />
        ) : (
          <div>
            {upcoming.map((e, i) => {
              const left = daysUntil(e.gregorian);
              const weekday = parseISODate(e.gregorian)?.toLocaleDateString('en-GB', { weekday: 'long' }) || '';
              return (
                <div className="list-row" key={`${e.gregorian}-${i}`}>
                  <div className="lr-ic"><DynIcon name="Moon" /></div>
                  <div className="lr-main">
                    <div className="lr-title">{e.name}</div>
                    <div className="lr-sub">{e.hijri} · {fmtDate(e.gregorian)}{weekday ? ` · ${weekday}` : ''}</div>
                  </div>
                  <div className="lr-right">
                    {left !== null && (
                      <Badge tone={left === 0 ? 'gold' : left <= 30 ? 'amber' : 'gray'}>
                        {left === 0 ? 'Today' : `in ${fmtInt(left)} day${left === 1 ? '' : 's'}`}
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <p className="small muted" style={{ marginTop: 12, marginBottom: 0 }}>
          Dates follow the tabular Islamic calendar and can shift by a day with local moon sighting in Pakistan.
        </p>
      </Card>
    </Page>
  );
}
