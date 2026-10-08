import React, { useState } from 'react';
import { Page, Card, Field, NumberInput, Btn, EmptyState } from '../../../components/ui';
import { DynIcon } from '../../../components/DynIcon';
import { parseAmount, fmtNum } from '../../../lib/format';

export default function MileagePage() {
  const [distance, setDistance] = useState('');
  const [fuel, setFuel] = useState('');

  const d = parseAmount(distance);
  const f = parseAmount(fuel);
  const dErr = distance !== '' && (d === null || d <= 0) ? 'Please enter a valid distance.' : '';
  const fErr = fuel !== '' && (f === null || f <= 0) ? 'Please enter a valid fuel quantity.' : '';
  const valid = d !== null && d > 0 && f !== null && f > 0;

  const mileage = valid ? d! / f! : 0;
  const per100 = valid ? (f! / d!) * 100 : 0;

  return (
    <Page
      title="Mileage Calculator"
      subtitle="Find your vehicle's real-world fuel average"
      actions={<Btn onClick={() => { setDistance(''); setFuel(''); }}>Reset</Btn>}
    >
      <Card title="Fill-up readings" subtitle="Use a full tank: note the odometer, drive, refill, and enter both numbers.">
        <div className="form-row">
          <Field label="Distance driven (km)" error={dErr} required>
            <NumberInput value={distance} onChange={(e) => setDistance(e.target.value)}
              placeholder="e.g. 420" inputMode="decimal" invalid={!!dErr} />
          </Field>
          <Field label="Fuel used (litres)" error={fErr} required>
            <NumberInput value={fuel} onChange={(e) => setFuel(e.target.value)}
              placeholder="e.g. 35" inputMode="decimal" invalid={!!fErr} />
          </Field>
        </div>
      </Card>
      {valid ? (
        <div className="result-panel" aria-live="polite" style={{ marginTop: 16 }}>
          <div className="rp-label">Your mileage</div>
          <div className="rp-value">{fmtNum(mileage)} km/l</div>
          <div className="kv"><span className="k">Fuel per 100 km</span><span className="v">{fmtNum(per100)} L</span></div>
          <div className="kv"><span className="k">Rating</span><span className="v">
            {mileage >= 15 ? 'Excellent' : mileage >= 12 ? 'Good' : mileage >= 9 ? 'Average' : 'Low — consider a tune-up'}
          </span></div>
        </div>
      ) : (
        <div style={{ marginTop: 16 }}>
          <EmptyState icon={<DynIcon name="Gauge" />} title="Enter your readings"
            text="Distance driven and fuel used give you an accurate km-per-litre figure." />
        </div>
      )}
    </Page>
  );
}
