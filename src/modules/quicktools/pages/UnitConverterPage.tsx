/* Unit converter — temperature, length, weight, area, volume, speed, data. */
import React, { useMemo, useState } from 'react';
import { Page, Card, Field, TextInput, Select, Segmented } from '../../../components/ui';
import { DynIcon } from '../../../components/DynIcon';
import { toNum, fmtNum } from '../../../lib/format';

interface Unit { id: string; label: string; toBase: number; }
interface Cat { id: string; name: string; base: string; units: Unit[]; formula: (from: string, to: string) => string; }

const linear = (id: string, name: string, base: string, units: Unit[]): Cat => ({
  id, name, base, units,
  formula: (from, to) => {
    const f = units.find((u) => u.id === from)!;
    const t = units.find((u) => u.id === to)!;
    return `1 ${f.label} = ${fmtNum(f.toBase / t.toBase, 6)} ${t.label}`;
  },
});

const CATS: Cat[] = [
  {
    id: 'temp', name: 'Temperature', base: '°C',
    units: [{ id: 'C', label: '°C', toBase: 1 }, { id: 'F', label: '°F', toBase: 1 }, { id: 'K', label: 'K', toBase: 1 }],
    formula: (from, to) => `°C = (°F − 32) × 5/9   •   K = °C + 273.15${from !== to ? `  (converting ${from} → ${to})` : ''}`,
  },
  linear('length', 'Length', 'm', [
    { id: 'mm', label: 'Millimetre', toBase: 0.001 }, { id: 'cm', label: 'Centimetre', toBase: 0.01 },
    { id: 'm', label: 'Metre', toBase: 1 }, { id: 'km', label: 'Kilometre', toBase: 1000 },
    { id: 'in', label: 'Inch', toBase: 0.0254 }, { id: 'ft', label: 'Foot', toBase: 0.3048 },
    { id: 'yd', label: 'Yard', toBase: 0.9144 }, { id: 'mi', label: 'Mile', toBase: 1609.344 },
  ]),
  linear('weight', 'Weight', 'kg', [
    { id: 'mg', label: 'Milligram', toBase: 1e-6 }, { id: 'g', label: 'Gram', toBase: 0.001 },
    { id: 'kg', label: 'Kilogram', toBase: 1 }, { id: 'ton', label: 'Tonne', toBase: 1000 },
    { id: 'oz', label: 'Ounce', toBase: 0.0283495 }, { id: 'lb', label: 'Pound', toBase: 0.453592 },
  ]),
  linear('area', 'Area', 'm²', [
    { id: 'cm2', label: 'cm²', toBase: 1e-4 }, { id: 'm2', label: 'm²', toBase: 1 },
    { id: 'km2', label: 'km²', toBase: 1e6 }, { id: 'ft2', label: 'ft²', toBase: 0.092903 },
    { id: 'yd2', label: 'yd²', toBase: 0.836127 }, { id: 'marla', label: 'Marla', toBase: 25.2929 },
    { id: 'kanal', label: 'Kanal', toBase: 505.857 }, { id: 'acre', label: 'Acre', toBase: 4046.86 },
    { id: 'hec', label: 'Hectare', toBase: 10000 },
  ]),
  linear('volume', 'Volume', 'L', [
    { id: 'ml', label: 'Millilitre', toBase: 0.001 }, { id: 'l', label: 'Litre', toBase: 1 },
    { id: 'm3', label: 'm³', toBase: 1000 }, { id: 'ft3', label: 'ft³', toBase: 28.3168 },
    { id: 'gal', label: 'Gallon (US)', toBase: 3.78541 },
  ]),
  linear('speed', 'Speed', 'km/h', [
    { id: 'ms', label: 'm/s', toBase: 3.6 }, { id: 'kmh', label: 'km/h', toBase: 1 },
    { id: 'mph', label: 'mph', toBase: 1.60934 },
  ]),
  linear('data', 'Data storage', 'B', [
    { id: 'b', label: 'Bytes', toBase: 1 }, { id: 'kb', label: 'KB', toBase: 1024 },
    { id: 'mb', label: 'MB', toBase: 1048576 }, { id: 'gb', label: 'GB', toBase: 1073741824 },
    { id: 'tb', label: 'TB', toBase: 1099511627776 },
  ]),
];

function convert(cat: Cat, value: number, from: string, to: string): number {
  if (cat.id === 'temp') {
    let c: number;
    if (from === 'C') c = value;
    else if (from === 'F') c = (value - 32) * (5 / 9);
    else c = value - 273.15;
    if (to === 'C') return c;
    if (to === 'F') return c * (9 / 5) + 32;
    return c + 273.15;
  }
  const f = cat.units.find((u) => u.id === from)!;
  const t = cat.units.find((u) => u.id === to)!;
  return (value * f.toBase) / t.toBase;
}

export default function UnitConverterPage() {
  const [catId, setCatId] = useState('length');
  const [from, setFrom] = useState('km');
  const [to, setTo] = useState('m');
  const [val, setVal] = useState('1');

  const cat = CATS.find((c) => c.id === catId)!;

  const result = useMemo(() => {
    const v = toNum(val, NaN);
    if (!Number.isFinite(v)) return null;
    return convert(cat, v, from, to);
  }, [cat, val, from, to]);

  const pickCat = (id: string) => {
    const c = CATS.find((x) => x.id === id)!;
    setCatId(id);
    setFrom(c.units[0].id);
    setTo(c.units[1] ? c.units[1].id : c.units[0].id);
  };

  return (
    <Page title="Unit Converter" subtitle="Temperature, length, weight, area, volume, speed and data.">
      <div style={{ maxWidth: 620, margin: '0 auto' }}>
        <Card>
          <Field label="Category">
            <Segmented
              options={CATS.map((c) => ({ value: c.id, label: c.name }))}
              value={catId} onChange={pickCat}
            />
          </Field>
          <div className="form-grid">
            <Field label="Value">
              <TextInput inputMode="decimal" value={val} onChange={(e) => setVal(e.target.value)} placeholder="Enter value" />
            </Field>
            <div style={{ display: 'flex', gap: 8 }}>
              <Field label="From" >
                <Select value={from} onChange={(e) => setFrom(e.target.value)}>
                  {cat.units.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
                </Select>
              </Field>
              <Field label="To">
                <Select value={to} onChange={(e) => setTo(e.target.value)}>
                  {cat.units.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
                </Select>
              </Field>
            </div>
          </div>

          <div style={{ textAlign: 'center', padding: '18px 0 6px' }}>
            <div className="muted small">Result</div>
            <div style={{ fontSize: 38, fontWeight: 800 }} className="num" aria-live="polite">
              {result == null ? '—' : fmtNum(result, 6)}
            </div>
            <div className="muted">{cat.units.find((u) => u.id === to)?.label}</div>
            <div className="muted small" style={{ marginTop: 10 }}>
              <DynIcon name="Info" size={13} /> {cat.formula(from, to)}
            </div>
          </div>
        </Card>
      </div>
    </Page>
  );
}
