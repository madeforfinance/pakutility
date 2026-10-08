import React, { useState } from 'react';
import { Page, Card, Field, NumberInput, TextInput, Btn, IconBtn, EmptyState } from '../../../components/ui';
import { DynIcon } from '../../../components/DynIcon';
import { Trash2, Plus } from 'lucide-react';
import { parseAmount, fmtMoney, toNum } from '../../../lib/format';

interface TollRow { id: number; name: string; amount: string; }

let rowSeq = 1;

export default function TollSplitPage() {
  const [rows, setRows] = useState<TollRow[]>([{ id: rowSeq++, name: '', amount: '' }]);
  const [fuelCost, setFuelCost] = useState('');
  const [people, setPeople] = useState('4');

  const addRow = () => setRows((r) => [...r, { id: rowSeq++, name: '', amount: '' }]);
  const removeRow = (id: number) => setRows((r) => (r.length > 1 ? r.filter((x) => x.id !== id) : r));
  const updateRow = (id: number, patch: Partial<TollRow>) =>
    setRows((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const tollTotal = rows.reduce((s, r) => s + toNum(parseAmount(r.amount)), 0);
  const fuel = toNum(parseAmount(fuelCost));
  const n = parseAmount(people);
  const invalidRow = rows.some((r) => r.amount !== '' && parseAmount(r.amount) === null);
  const fuelErr = fuelCost !== '' && parseAmount(fuelCost) === null ? 'Enter a valid amount.' : '';
  const nErr = people !== '' && (n === null || n < 1) ? 'At least 1 person.' : '';
  const valid = !invalidRow && !fuelErr && !nErr && n !== null && n >= 1;

  const total = tollTotal + fuel;
  const perPerson = valid && n! > 0 ? total / n! : 0;

  return (
    <Page title="Toll & Cost Split" subtitle="Add every toll plaza, then split the total fairly">
      <div className="grid cols-2" style={{ alignItems: 'start' }}>
        <Card title="Toll plazas" actions={<Btn size="sm" icon={<Plus size={15} />} onClick={addRow}>Add toll</Btn>}>
          {rows.map((r) => (
            <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '1fr 130px 40px', gap: 10, marginBottom: 10 }}>
              <TextInput value={r.name} onChange={(e) => updateRow(r.id, { name: e.target.value })}
                placeholder="Plaza name (optional)" aria-label="Toll plaza name" />
              <NumberInput value={r.amount} onChange={(e) => updateRow(r.id, { amount: e.target.value })}
                placeholder="Amount" inputMode="decimal" aria-label="Toll amount"
                invalid={r.amount !== '' && parseAmount(r.amount) === null} />
              <IconBtn label="Remove toll" onClick={() => removeRow(r.id)} disabled={rows.length <= 1}>
                <Trash2 size={16} />
              </IconBtn>
            </div>
          ))}
          <div className="form-row" style={{ marginTop: 6 }}>
            <Field label="Fuel cost (total)" error={fuelErr || undefined}>
              <NumberInput value={fuelCost} onChange={(e) => setFuelCost(e.target.value)}
                placeholder="0" inputMode="decimal" invalid={!!fuelErr} />
            </Field>
            <Field label="People sharing" error={nErr || undefined} required>
              <NumberInput value={people} onChange={(e) => setPeople(e.target.value)}
                placeholder="4" inputMode="numeric" invalid={!!nErr} />
            </Field>
          </div>
        </Card>
        <div className="result-panel" aria-live="polite">
          <div className="rp-label">Each person pays</div>
          <div className="rp-value">{valid ? fmtMoney(perPerson) : '—'}</div>
          <div className="kv"><span className="k">Tolls ({rows.filter((r) => r.amount !== '').length})</span><span className="v">{fmtMoney(tollTotal)}</span></div>
          <div className="kv"><span className="k">Fuel</span><span className="v">{fmtMoney(fuel)}</span></div>
          <div className="kv"><span className="k">Total</span><span className="v">{fmtMoney(total)}</span></div>
          {rows.length === 0 || (tollTotal === 0 && fuel === 0) ? (
            <EmptyState icon={<DynIcon name="Split" />} title="No costs yet"
              text="Add toll plazas and the fuel cost to split them." />
          ) : null}
        </div>
      </div>
    </Page>
  );
}
