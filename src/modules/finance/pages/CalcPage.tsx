import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Page, Card, Btn, Field, NumberInput, EmptyState } from '../../../components/ui';
import { CALC_DEFS, CalcDef } from '../lib/calcs';
import { parseAmount } from '../../../lib/format';

export default function CalcPage() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const def: CalcDef | undefined = id ? CALC_DEFS[id] : undefined;

  const [inputs, setInputs] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    if (def) for (const f of def.fields) init[f.key] = f.def !== undefined ? String(f.def) : '';
    return init;
  });

  // Reset inputs when switching calculators via in-page navigation
  const [lastId, setLastId] = useState(id);
  if (id !== lastId) {
    setLastId(id);
    const init: Record<string, string> = {};
    if (def) for (const f of def.fields) init[f.key] = f.def !== undefined ? String(f.def) : '';
    setInputs(init);
  }

  const { values, errors, results } = useMemo(() => {
    if (!def) return { values: {}, errors: {}, results: null as null | { label: string; value: string; highlight?: boolean }[] };
    const values: Record<string, number> = {};
    const errors: Record<string, string> = {};
    let ok = true;
    for (const f of def.fields) {
      const raw = inputs[f.key] ?? '';
      const n = parseAmount(raw);
      if (n === null) {
        errors[f.key] = 'Please enter a valid number.';
        ok = false;
      } else if (f.min !== undefined && n < f.min) {
        errors[f.key] = `Must be at least ${f.min}.`;
        ok = false;
      } else {
        values[f.key] = n;
      }
    }
    let results = null;
    if (ok) {
      try {
        results = def.compute(values);
      } catch {
        results = null;
      }
    }
    return { values, errors, results };
  }, [def, inputs]);

  if (!def) {
    return (
      <Page title="Calculator not found">
        <EmptyState
          title="Calculator not found"
          text="This calculator does not exist. Browse all calculators from the hub."
          action={<Btn variant="primary" onClick={() => nav('/finance/calculators')}>All calculators</Btn>}
        />
      </Page>
    );
  }

  const highlight = results?.find((r) => r.highlight);
  const rest = results?.filter((r) => !r.highlight) ?? [];

  return (
    <Page
      title={def.title}
      subtitle={def.description}
      actions={
        <Btn variant="ghost" icon={<ArrowLeft size={16} />} onClick={() => nav('/finance/calculators')}>
          All calculators
        </Btn>
      }
    >
      <div className="grid cols-2">
        <Card title="Inputs">
          <div className="grid">
            {def.fields.map((f) => (
              <Field key={f.key} label={f.label} hint={f.hint} error={errors[f.key]} required>
                <NumberInput
                  value={inputs[f.key] ?? ''}
                  invalid={!!errors[f.key]}
                  onChange={(e) => setInputs((s) => ({ ...s, [f.key]: e.target.value }))}
                  placeholder={f.def !== undefined ? String(f.def) : '0'}
                  aria-label={f.label}
                />
              </Field>
            ))}
          </div>
        </Card>
        <div className="result-panel" aria-live="polite">
          <div className="rp-label">Result</div>
          {results && highlight ? (
            <>
              <div className="rp-value num">{highlight.value}</div>
              {rest.map((r, i) => (
                <div className="kv" key={i}>
                  <span className="k">{r.label}</span>
                  <span className="v num">{r.value}</span>
                </div>
              ))}
              {def.note && <p style={{ marginTop: 12, fontSize: 12.5, color: '#b9c4d8' }}>{def.note}</p>}
            </>
          ) : (
            <p style={{ color: '#b9c4d8', margin: 0 }}>Enter valid values to see results.</p>
          )}
        </div>
      </div>
    </Page>
  );
}
