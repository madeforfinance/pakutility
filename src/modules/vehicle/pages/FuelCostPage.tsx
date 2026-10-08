import React, { useState } from 'react';
import { Page, Card, Field, NumberInput, Btn } from '../../../components/ui';
import { prefs } from '../../../lib/prefs';
import { parseAmount, fmtNum, fmtMoney } from '../../../lib/format';

export default function FuelCostPage() {
  const [distance, setDistance] = useState('');
  const [mileage, setMileage] = useState(prefs.mileage ? String(prefs.mileage) : '12');
  const [price, setPrice] = useState(prefs.fuelPrice ? String(prefs.fuelPrice) : '260');

  const d = parseAmount(distance);
  const m = parseAmount(mileage);
  const p = parseAmount(price);
  const dErr = distance !== '' && (d === null || d <= 0) ? 'Please enter a valid distance.' : '';
  const mErr = mileage !== '' && (m === null || m <= 0) ? 'Please enter a valid mileage.' : '';
  const pErr = price !== '' && (p === null || p < 0) ? 'Please enter a valid fuel price.' : '';
  const valid = d !== null && d > 0 && m !== null && m > 0 && p !== null && p >= 0;

  const fuelNeeded = valid ? d! / m! : 0;
  const cost = fuelNeeded * (p || 0);

  const reset = () => {
    setDistance('');
    setMileage(prefs.mileage ? String(prefs.mileage) : '12');
    setPrice(prefs.fuelPrice ? String(prefs.fuelPrice) : '260');
  };

  return (
    <Page
      title="Fuel Cost Calculator"
      subtitle="How much fuel will a trip need, and what will it cost?"
      actions={<Btn onClick={reset}>Reset</Btn>}
    >
      <div className="grid cols-2" style={{ alignItems: 'start' }}>
        <Card title="Trip details">
          <div className="form-row">
            <Field label="Distance (km)" error={dErr} required>
              <NumberInput value={distance} onChange={(e) => setDistance(e.target.value)}
                placeholder="e.g. 350" inputMode="decimal" invalid={!!dErr} />
            </Field>
            <Field label="Mileage (km per litre)" error={mErr} hint="Your vehicle's average">
              <NumberInput value={mileage} onChange={(e) => setMileage(e.target.value)}
                placeholder="e.g. 12" inputMode="decimal" invalid={!!mErr} />
            </Field>
          </div>
          <Field label="Fuel price (per litre)" error={pErr} hint="Change the default in Settings">
            <NumberInput value={price} onChange={(e) => setPrice(e.target.value)}
              placeholder="e.g. 260" inputMode="decimal" invalid={!!pErr} />
          </Field>
        </Card>
        <div className="result-panel" aria-live="polite">
          <div className="rp-label">Estimated fuel cost</div>
          <div className="rp-value">{valid ? fmtMoney(cost) : '—'}</div>
          <div className="kv"><span className="k">Fuel needed</span><span className="v">{valid ? `${fmtNum(fuelNeeded)} L` : '—'}</span></div>
          <div className="kv"><span className="k">Distance</span><span className="v">{valid ? `${fmtNum(d!, 0)} km` : '—'}</span></div>
          <div className="kv"><span className="k">Cost per km</span><span className="v">{valid ? fmtMoney(p! / m!) : '—'}</span></div>
          {!valid && <p className="small" style={{ color: '#b9c4d8', marginTop: 12 }}>Enter a distance, mileage and fuel price to see the estimate.</p>}
        </div>
      </div>
    </Page>
  );
}
