import React, { useEffect, useMemo, useState } from 'react';
import { Page, Card, Field, NumberInput, Select, Btn, Segmented, Badge, Stat } from '../../../components/ui';
import { DynIcon } from '../../../components/DynIcon';
import { Navigation } from 'lucide-react';
import { db } from '../../../storage/db';
import { useSettings } from '../../../app/settings';
import { getPrayerTimes, PRAYER_METHODS, PrayerTimes } from '../../../lib/islamic';
import { fmtTime, fmtDateLong, todayISO } from '../../../lib/format';
import { useGeoLocation } from '../lib/location';

const ORDER: (keyof PrayerTimes)[] = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

export default function PrayerTimesPage() {
  const { prefs: livePrefs, update } = useSettings();
  const { lat, lng, setLat, setLng, locating, geoError, useDeviceLocation, latNum, lngNum } = useGeoLocation('prayer');
  const [asr, setAsr] = useState('1');

  useEffect(() => {
    let alive = true;
    db.get<{ key: string; value: unknown }>('settings', 'prayerAsr').then((r) => {
      if (alive && typeof r?.value === 'string') setAsr(r.value === '2' ? '2' : '1');
    }).catch(() => {});
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    db.set('settings', 'prayerAsr', asr).catch(() => {});
  }, [asr]);

  const times: PrayerTimes | null = useMemo(() => {
    if (latNum === null || lngNum === null) return null;
    if (latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) return null;
    try {
      return getPrayerTimes(new Date(), latNum, lngNum, livePrefs.prayerMethod || 'karachi', asr === '2' ? 2 : 1);
    } catch {
      return null;
    }
  }, [latNum, lngNum, livePrefs.prayerMethod, asr]);

  const nextPrayer = useMemo(() => {
    if (!times) return null;
    const now = new Date();
    const cur = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    for (const k of ORDER) {
      if (k === 'Sunrise') continue;
      if (times[k] > cur) return k;
    }
    return 'Fajr'; // tomorrow
  }, [times]);

  const latErr = lat !== '' && latNum === null ? 'Enter a valid latitude.' : '';
  const lngErr = lng !== '' && lngNum === null ? 'Enter a valid longitude.' : '';

  return (
    <Page
      title="Prayer Times"
      subtitle={fmtDateLong(todayISO())}
      actions={<Btn variant="primary" icon={<Navigation size={15} />} onClick={useDeviceLocation} disabled={locating}>
        {locating ? 'Locating…' : 'Use my location'}
      </Btn>}
    >
      {geoError && <Card className="b-amber"><p className="small" style={{ margin: 0 }}>{geoError}</p></Card>}

      <Card title="Location & method">
        <div className="form-row">
          <Field label="Latitude" error={latErr || undefined}>
            <NumberInput value={lat} onChange={(e) => setLat(e.target.value)} placeholder="31.5204"
              inputMode="decimal" invalid={!!latErr} />
          </Field>
          <Field label="Longitude" error={lngErr || undefined}>
            <NumberInput value={lng} onChange={(e) => setLng(e.target.value)} placeholder="74.3587"
              inputMode="decimal" invalid={!!lngErr} />
          </Field>
        </div>
        <div className="form-row">
          <Field label="Calculation method">
            <Select value={livePrefs.prayerMethod || 'karachi'}
              onChange={(e) => update({ prayerMethod: e.target.value })}>
              {Object.entries(PRAYER_METHODS).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
            </Select>
          </Field>
          <Field label="Asr calculation">
            <Segmented value={asr} onChange={setAsr} options={[
              { value: '1', label: 'Shafi‘i' },
              { value: '2', label: 'Hanafi' },
            ]} />
          </Field>
        </div>
      </Card>

      {times ? (
        <>
          <div className="grid cols-3" style={{ marginTop: 16 }}>
            {ORDER.map((k) => {
              const isNext = nextPrayer === k;
              return (
                <Stat key={k} label={k}
                  value={fmtTime(times[k])}
                  sub={isNext ? 'Next prayer' : k === 'Sunrise' ? 'Shurūq' : ''}
                  icon={<DynIcon name="Clock" />}
                  tone={isNext ? 'gold' : 'navy'} />
              );
            })}
          </div>
          {nextPrayer && (
            <Card style={{ marginTop: 16 }}>
              <p style={{ margin: 0 }}>
                <Badge tone="gold">Next: {nextPrayer}</Badge>{' '}
                <span className="muted">at {fmtTime(times[nextPrayer])}</span>
              </p>
            </Card>
          )}
        </>
      ) : (
        <Card style={{ marginTop: 16 }}>
          <p className="muted">Enter valid coordinates to calculate prayer times.</p>
        </Card>
      )}

      <Card style={{ marginTop: 16 }}>
        <p className="small muted" style={{ margin: 0 }}>
          Times are calculated astronomically on your device — no internet needed. They may differ
          slightly from your local mosque timetable; follow your local announcement for fasting and Eid.
        </p>
      </Card>
    </Page>
  );
}
