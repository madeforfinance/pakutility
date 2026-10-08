import React, { useMemo } from 'react';
import { Page, Card, Field, NumberInput, Btn } from '../../../components/ui';
import { Navigation } from 'lucide-react';
import { qiblaBearing } from '../../../lib/islamic';
import { fmtNum } from '../../../lib/format';
import { useGeoLocation } from '../lib/location';

function CompassDial({ bearing }: { bearing: number }) {
  const ticks = Array.from({ length: 12 }, (_, i) => i * 30);
  return (
    <svg viewBox="0 0 220 220" width="220" height="220" role="img"
      aria-label={`Qibla bearing ${Math.round(bearing)} degrees from north`}
      style={{ maxWidth: '100%', height: 'auto' }}>
      <circle cx="110" cy="110" r="104" fill="var(--surface)" stroke="var(--border-strong)" strokeWidth="2" />
      <circle cx="110" cy="110" r="88" fill="none" stroke="var(--border)" strokeWidth="1" />
      {ticks.map((t) => {
        const rad = (t * Math.PI) / 180;
        const x1 = 110 + 96 * Math.sin(rad);
        const y1 = 110 - 96 * Math.cos(rad);
        const x2 = 110 + 88 * Math.sin(rad);
        const y2 = 110 - 88 * Math.cos(rad);
        return <line key={t} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--muted)" strokeWidth={t % 90 === 0 ? 3 : 1.5} />;
      })}
      <text x="110" y="26" textAnchor="middle" fontSize="16" fontWeight="800" fill="var(--gold-deep)">N</text>
      <text x="110" y="204" textAnchor="middle" fontSize="14" fontWeight="700" fill="var(--muted)">S</text>
      <text x="198" y="116" textAnchor="middle" fontSize="14" fontWeight="700" fill="var(--muted)">E</text>
      <text x="22" y="116" textAnchor="middle" fontSize="14" fontWeight="700" fill="var(--muted)">W</text>
      {/* Qibla arrow, rotated by bearing */}
      <g transform={`rotate(${bearing} 110 110)`}>
        <line x1="110" y1="110" x2="110" y2="34" stroke="var(--gold)" strokeWidth="6" strokeLinecap="round" />
        <polygon points="110,22 102,40 118,40" fill="var(--gold)" />
      </g>
      <circle cx="110" cy="110" r="9" fill="var(--navy)" />
      <circle cx="110" cy="110" r="4" fill="#fff" />
    </svg>
  );
}

export default function QiblaPage() {
  const { lat, lng, setLat, setLng, locating, geoError, useDeviceLocation, latNum, lngNum } = useGeoLocation('qibla');

  const bearing = useMemo(() => {
    if (latNum === null || lngNum === null) return null;
    if (latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) return null;
    try {
      return qiblaBearing(latNum, lngNum);
    } catch {
      return null;
    }
  }, [latNum, lngNum]);

  const latErr = lat !== '' && latNum === null ? 'Enter a valid latitude.' : '';
  const lngErr = lng !== '' && lngNum === null ? 'Enter a valid longitude.' : '';

  return (
    <Page
      title="Qibla Finder"
      subtitle="Face the Kaaba from wherever you are"
      actions={<Btn variant="primary" icon={<Navigation size={15} />} onClick={useDeviceLocation} disabled={locating}>
        {locating ? 'Locating…' : 'Use my location'}
      </Btn>}
    >
      {geoError && <Card className="b-amber"><p className="small" style={{ margin: 0 }}>{geoError}</p></Card>}

      <div className="grid cols-2" style={{ alignItems: 'start' }}>
        <Card title="Your location">
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
          <p className="small muted">
            The Qibla bearing is computed mathematically on your device. Hold your phone flat with the
            top pointing <b>north</b> (use any compass), then turn toward the gold arrow.
          </p>
        </Card>

        <Card title="Qibla direction">
          {bearing === null ? (
            <p className="muted">Enter valid coordinates to find the Qibla.</p>
          ) : (
            <div style={{ textAlign: 'center' }} aria-live="polite">
              <CompassDial bearing={bearing} />
              <div style={{ fontSize: 30, fontWeight: 800, marginTop: 8 }}>{fmtNum(bearing, 1)}°</div>
              <div className="muted small">from true north, clockwise</div>
            </div>
          )}
        </Card>
      </div>

      <Card style={{ marginTop: 16 }}>
        <p className="small muted" style={{ margin: 0 }}>
          Tip: for the most accurate reading, calibrate your phone compass (move it in a figure-8),
          hold it away from metal objects and magnets, and stand away from large electronics.
        </p>
      </Card>
    </Page>
  );
}
