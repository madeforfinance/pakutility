import React, { useMemo, useState } from 'react';
import { Page, Card, Field, NumberInput, Badge } from '../../../components/ui';
import { fmtNum, fmtPct, parseAmount } from '../../../lib/format';

export default function MarksRequiredPage() {
  const [desired, setDesired] = useState('');
  const [total, setTotal] = useState('');
  const [obtained, setObtained] = useState('');

  const { outcome, error } = useMemo(() => {
    if (desired.trim() === '' || total.trim() === '' || obtained.trim() === '')
      return { outcome: null, error: '' };
    const d = parseAmount(desired);
    const t = parseAmount(total);
    const o = parseAmount(obtained);
    if (d === null || d <= 0 || d > 100) return { outcome: null, error: 'Please enter a target percentage between 1 and 100.' };
    if (t === null || t <= 0) return { outcome: null, error: 'Please enter valid total marks.' };
    if (o === null || o < 0 || o > t) return { outcome: null, error: 'Obtained marks must be between 0 and total marks.' };
    const targetMarks = (d / 100) * t;
    const needed = targetMarks - o;
    const remaining = t - o;
    if (needed <= 0) return { outcome: { kind: 'achieved' as const, needed: 0, remaining }, error: '' };
    if (needed > remaining) return { outcome: { kind: 'impossible' as const, needed, remaining }, error: '' };
    return {
      outcome: {
        kind: 'possible' as const,
        needed,
        remaining,
        pctOfRemaining: remaining > 0 ? (needed / remaining) * 100 : 0,
      },
      error: '',
    };
  }, [desired, total, obtained]);

  return (
    <Page title="Marks Required" subtitle="How many more marks do you need for your target?">
      <Card title="Your target">
        <div className="form-row">
          <Field label="Desired percentage" required>
            <NumberInput value={desired} onChange={(e) => setDesired(e.target.value)} placeholder="e.g. 85" autoFocus />
          </Field>
          <Field label="Total marks" required>
            <NumberInput value={total} onChange={(e) => setTotal(e.target.value)} placeholder="e.g. 1100" />
          </Field>
          <Field label="Obtained so far" required error={error || undefined}>
            <NumberInput value={obtained} onChange={(e) => setObtained(e.target.value)} placeholder="e.g. 640" />
          </Field>
        </div>
      </Card>

      {outcome && (
        <div className="result-panel" role="status" aria-live="polite">
          {outcome.kind === 'achieved' && (
            <>
              <div className="rp-label">Result</div>
              <div className="rp-value">Target achieved</div>
              <div className="kv"><span className="k">Status</span><span className="v">You have already secured your desired percentage.</span></div>
            </>
          )}
          {outcome.kind === 'impossible' && (
            <>
              <div className="rp-label">Result</div>
              <div className="rp-value">Not possible</div>
              <div className="kv"><span className="k">You would need</span><span className="v num">{fmtNum(outcome.needed, 1)} marks</span></div>
              <div className="kv"><span className="k">But only</span><span className="v num">{fmtNum(outcome.remaining, 1)} marks remain</span></div>
            </>
          )}
          {outcome.kind === 'possible' && (
            <>
              <div className="rp-label">Marks still needed</div>
              <div className="rp-value num">{fmtNum(outcome.needed, 1)}</div>
              <div className="kv"><span className="k">Marks remaining</span><span className="v num">{fmtNum(outcome.remaining, 1)}</span></div>
              <div className="kv"><span className="k">Needed in remaining</span><span className="v num">{fmtPct(outcome.pctOfRemaining, 1)}</span></div>
            </>
          )}
        </div>
      )}

      <Card title="How it works">
        <p className="muted" style={{ margin: 0 }}>
          <Badge tone="blue">Formula</Badge>
          <span style={{ marginLeft: 8 }}>
            Marks needed = (target % × total marks) − marks obtained so far.
          </span>
        </p>
      </Card>
    </Page>
  );
}
