/* Currency converter — saved local rates first, optional online refresh.
   Rates are "per 1 PKR" (matches prefs.exchangeRates). Never blocks offline use. */
import React, { useMemo, useState } from 'react';
import { Page, Card, Field, TextInput, NumberInput, Select, Btn, Badge } from '../../../components/ui';
import { DynIcon } from '../../../components/DynIcon';
import { toast } from '../../../lib/toast';
import { toNum, fmtNum, parseAmount } from '../../../lib/format';
import { useSettings } from '../../../app/settings';

const CURRS = ['PKR', 'USD', 'EUR', 'GBP', 'AED', 'SAR'];

export default function CurrencyPage() {
  const { prefs: snap, update } = useSettings();
  const [amount, setAmount] = useState('1000');
  const [from, setFrom] = useState('PKR');
  const [to, setTo] = useState('USD');
  const [online, setOnline] = useState<boolean | null>(null); // null = never refreshed
  const [busy, setBusy] = useState(false);
  const [edit, setEdit] = useState<Record<string, string>>({});

  const rates = snap.exchangeRates || {};

  const result = useMemo(() => {
    const amt = toNum(amount, NaN);
    if (!Number.isFinite(amt)) return null;
    const rf = from === 'PKR' ? 1 : rates[from];
    const rt = to === 'PKR' ? 1 : rates[to];
    if (!rf || !rt || rf <= 0 || rt <= 0) return null;
    const inPkr = amt / rf;
    return inPkr * rt;
  }, [amount, from, to, rates]);

  const refLine = useMemo(() => {
    if (from === 'PKR' || !rates[from] || rates[from] <= 0) return null;
    return `1 ${from} = ${fmtNum(1 / rates[from], 2)} PKR`;
  }, [from, rates]);

  const startEdit = () => {
    const e: Record<string, string> = {};
    CURRS.filter((c) => c !== 'PKR').forEach((c) => { e[c] = String(rates[c] ?? ''); });
    setEdit(e);
  };

  const saveRates = async () => {
    const next: Record<string, number> = {};
    for (const c of CURRS.filter((x) => x !== 'PKR')) {
      const v = parseAmount(edit[c] || '');
      if (v == null || v <= 0) { toast.error(`Please enter a valid rate for ${c}.`); return; }
      next[c] = v;
    }
    try {
      await update({ exchangeRates: next });
      setEdit({});
      toast.success('Exchange rates saved.');
    } catch { toast.error('Could not save rates.'); }
  };

  const refreshOnline = async () => {
    setBusy(true);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    try {
      const res = await fetch('https://open.er-api.com/v6/latest/PKR', { signal: ctrl.signal });
      if (!res.ok) throw new Error('bad response');
      const json = await res.json();
      if (json.result !== 'success' || !json.rates) throw new Error('bad payload');
      const next: Record<string, number> = {};
      for (const c of CURRS.filter((x) => x !== 'PKR')) {
        const v = Number(json.rates[c]);
        if (Number.isFinite(v) && v > 0) next[c] = v;
        else next[c] = rates[c] || 0;
      }
      if (Object.values(next).some((v) => !(v > 0))) throw new Error('incomplete');
      await update({ exchangeRates: next });
      setOnline(true);
      toast.success('Exchange rates updated.');
    } catch {
      setOnline(false);
      toast.error('Could not fetch rates. Using saved rates.');
    } finally {
      clearTimeout(timer);
      setBusy(false);
    }
  };

  const usingSaved = online !== true;

  return (
    <Page title="Currency Converter" subtitle="Convert between PKR and major currencies.">
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <Card
          actions={usingSaved
            ? <Badge tone="gray">Using saved exchange rates</Badge>
            : <Badge tone="green">Rates refreshed</Badge>}
        >
          <div className="form-grid">
            <Field label="Amount">
              <TextInput inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Enter amount" />
            </Field>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <Field label="From">
                <Select value={from} onChange={(e) => setFrom(e.target.value)}>
                  {CURRS.map((c) => <option key={c} value={c}>{c}</option>)}
                </Select>
              </Field>
              <Btn size="sm" variant="ghost" aria-label="Swap currencies"
                onClick={() => { setFrom(to); setTo(from); }} style={{ marginBottom: 2 }}>
                <DynIcon name="ArrowLeftRight" size={16} />
              </Btn>
              <Field label="To">
                <Select value={to} onChange={(e) => setTo(e.target.value)}>
                  {CURRS.map((c) => <option key={c} value={c}>{c}</option>)}
                </Select>
              </Field>
            </div>
          </div>

          <div style={{ textAlign: 'center', padding: '18px 0 6px' }}>
            <div className="muted small">Result</div>
            <div style={{ fontSize: 38, fontWeight: 800 }} className="num" aria-live="polite">
              {result == null ? '—' : `${fmtNum(result, 2)} ${to}`}
            </div>
            {refLine && <div className="muted small" style={{ marginTop: 6 }}>{refLine}</div>}
          </div>

          <div style={{ marginTop: 10 }}>
            <Btn variant="secondary" block icon={<DynIcon name="Download" size={16} />} onClick={refreshOnline} disabled={busy}>
              {busy ? 'Fetching rates…' : 'Refresh online rates'}
            </Btn>
            <p className="muted small" style={{ marginBottom: 0 }}>
              Online refresh is optional. The converter always works offline with your saved rates.
            </p>
          </div>
        </Card>

        <Card
          title="Saved exchange rates"
          subtitle="Units of currency per 1 PKR. Edit to match your bank or market rate."
          actions={Object.keys(edit).length === 0
            ? <Btn size="sm" variant="secondary" icon={<DynIcon name="Pencil" size={14} />} onClick={startEdit}>Edit</Btn>
            : <><Btn size="sm" variant="ghost" onClick={() => setEdit({})}>Cancel</Btn>
               <Btn size="sm" variant="primary" onClick={saveRates}>Save</Btn></>}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {CURRS.filter((c) => c !== 'PKR').map((c) => (
              <div key={c} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <strong style={{ minWidth: 44 }}>{c}</strong>
                {Object.keys(edit).length === 0 ? (
                  <span className="num muted">1 PKR = {rates[c] ? fmtNum(rates[c], 4) : '—'} {c}</span>
                ) : (
                  <NumberInput value={edit[c] ?? ''} onChange={(e) => setEdit((p) => ({ ...p, [c]: e.target.value }))}
                    aria-label={`${c} rate per 1 PKR`} style={{ maxWidth: 180 }} />
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </Page>
  );
}
