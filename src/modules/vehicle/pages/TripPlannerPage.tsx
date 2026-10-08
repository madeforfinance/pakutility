import React, { useState } from 'react';
import { Page, Card, Field, NumberInput, Btn } from '../../../components/ui';
import { prefs } from '../../../lib/prefs';
import { parseAmount, fmtNum, fmtMoney } from '../../../lib/format';

export default function TripPlannerPage() {
  const [distance, setDistance] = useState('');
  const [mileage, setMileage] = useState(prefs.mileage ? String(prefs.mileage) : '12');
  const [price, setPrice] = useState(prefs.fuelPrice ? String(prefs.fuelPrice) : '260');
  const [passengers, setPassengers] = useState('4');
  const [toll, setToll] = useState('');
  const [parking, setParking] = useState('');
  const [other, setOther] = useState('');

  const d = parseAmount(distance);
  const m = parseAmount(mileage);
  const p = parseAmount(price);
  const n = parseAmount(passengers);
  const tl = parseAmount(toll) ?? 0;
  const pk = parseAmount(parking) ?? 0;
  const ot = parseAmount(other) ?? 0;

  const dErr = distance !== '' && (d === null || d <= 0) ? 'Please enter a valid distance.' : '';
  const mErr = mileage !== '' && (m === null || m <= 0) ? 'Please enter a valid mileage.' : '';
  const pErr = price !== '' && (p === null || p < 0) ? 'Please enter a valid fuel price.' : '';
  const nErr = passengers !== '' && (n === null || n < 1) ? 'At least 1 passenger.' : '';
  const optErr = (toll !== '' && parseAmount(toll) === null) || (parking !== '' && parseAmount(parking) === null) || (other !== '' && parseAmount(other) === null)
    ? 'Extra costs must be valid numbers.' : '';

  const valid = d !== null && d > 0 && m !== null && m > 0 && p !== null && p >= 0 && n !== null && n >= 1 && !optErr;
  const fuelNeeded = valid ? d! / m! : 0;
  const fuelCost = fuelNeeded * (p || 0);
  const total = fuelCost + tl + pk + ot;
  const perPerson = n && n > 0 ? total / n : 0;

  const reset = () => {
    setDistance(''); setToll(''); setParking(''); setOther(''); setPassengers('4');
    setMileage(prefs.mileage ? String(prefs.mileage) : '12');
    setPrice(prefs.fuelPrice ? String(prefs.fuelPrice) : '260');
  };

  return (
    <Page
      title="Trip Planner"
      subtitle="Full cost of a road trip, split per person"
      actions={<Btn onClick={reset}>Reset</Btn>}
    >
      <div className="grid cols-2" style={{ alignItems: 'start' }}>
        <Card title="Trip details">
          <div className="form-row">
            <Field label="Distance (km)" error={dErr} required>
              <NumberInput value={distance} onChange={(e) => setDistance(e.target.value)}
                placeholder="e.g. 1200" inputMode="decimal" invalid={!!dErr} />
            </Field>
            <Field label="Passengers" error={nErr} required>
              <NumberInput value={passengers} onChange={(e) => setPassengers(e.target.value)}
                placeholder="e.g. 4" inputMode="numeric" invalid={!!nErr} />
            </Field>
          </div>
          <div className="form-row">
            <Field label="Mileage (km/l)" error={mErr}>
              <NumberInput value={mileage} onChange={(e) => setMileage(e.target.value)}
                inputMode="decimal" invalid={!!mErr} />
            </Field>
            <Field label="Fuel price / litre" error={pErr}>
              <NumberInput value={price} onChange={(e) => setPrice(e.target.value)}
                inputMode="decimal" invalid={!!pErr} />
            </Field>
          </div>
          <div className="form-row">
            <Field label="Tolls (total)">
              <NumberInput value={toll} onChange={(e) => setToll(e.target.value)}
                placeholder="0" inputMode="decimal" />
            </Field>
            <Field label="Parking">
              <NumberInput value={parking} onChange={(e) => setParking(e.target.value)}
                placeholder="0" inputMode="decimal" />
            </Field>
          </div>
          <Field label="Other expenses" error={optErr || undefined}>
            <NumberInput value={other} onChange={(e) => setOther(e.target.value)}
              placeholder="Food, stays, etc." inputMode="decimal" />
          </Field>
        </Card>
        <div className="result-panel" aria-live="polite">
          <div className="rp-label">Total trip cost</div>
          <div className="rp-value">{valid ? fmtMoney(total) : '—'}</div>
          <div className="kv"><span className="k">Fuel required</span><span className="v">{valid ? `${fmtNum(fuelNeeded)} L` : '—'}</span></div>
          <div className="kv"><span className="k">Fuel cost</span><span className="v">{valid ? fmtMoney(fuelCost) : '—'}</span></div>
          <div className="kv"><span className="k">Tolls + parking + other</span><span className="v">{valid ? fmtMoney(tl + pk + ot) : '—'}</span></div>
          <div className="kv"><span className="k">Per person ({valid ? Math.round(n!) : '—'})</span><span className="v">{valid ? fmtMoney(perPerson) : '—'}</span></div>
        </div>
      </div>
    </Page>
  );
}
