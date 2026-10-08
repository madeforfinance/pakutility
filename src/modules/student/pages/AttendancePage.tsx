import React, { useMemo, useState } from 'react';
import { Page, Card, Field, NumberInput, Badge, ProgressBar } from '../../../components/ui';
import { fmtNum, fmtPct, parseAmount } from '../../../lib/format';

export default function AttendancePage() {
  const [total, setTotal] = useState('');
  const [attended, setAttended] = useState('');
  const [target, setTarget] = useState('75');

  const { current, plan, error } = useMemo(() => {
    if (total.trim() === '' || attended.trim() === '') return { current: null, plan: null, error: '' };
    const t = parseAmount(total);
    const a = parseAmount(attended);
    const p = target.trim() === '' ? 75 : parseAmount(target);
    if (t === null || t <= 0) return { current: null, plan: null, error: 'Please enter a valid total number of classes.' };
    if (a === null || a < 0 || a > t) return { current: null, plan: null, error: 'Attended classes must be between 0 and total classes.' };
    if (p === null || p <= 0 || p > 100) return { current: null, plan: null, error: 'Target must be between 1 and 100.' };
    const pct = (a / t) * 100;
    let plan: { canMiss: number } | { mustAttend: number | 'all' } | null = null;
    if (pct >= p) {
      plan = { canMiss: Math.max(0, Math.floor((a * 100) / p - t)) };
    } else if (p >= 100) {
      plan = { mustAttend: 'all' };
    } else {
      plan = { mustAttend: Math.max(0, Math.ceil((p * t - 100 * a) / (100 - p))) };
    }
    return { current: pct, plan, error: '' };
  }, [total, attended, target]);

  return (
    <Page title="Attendance Calculator" subtitle="Know your percentage — and your margin.">
      <Card title="Your classes">
        <div className="form-row">
          <Field label="Total classes held" required>
            <NumberInput value={total} onChange={(e) => setTotal(e.target.value)} placeholder="e.g. 40" autoFocus />
          </Field>
          <Field label="Classes attended" required error={error || undefined}>
            <NumberInput value={attended} onChange={(e) => setAttended(e.target.value)} placeholder="e.g. 32" />
          </Field>
          <Field label="Target %" hint="Usually 75%">
            <NumberInput value={target} onChange={(e) => setTarget(e.target.value)} placeholder="75" />
          </Field>
        </div>
      </Card>

      {current !== null && (
        <div className="result-panel" role="status" aria-live="polite">
          <div className="rp-label">Current attendance</div>
          <div className="rp-value num">{fmtPct(current, 1)}</div>
          <ProgressBar value={current} max={100} />
          <div style={{ marginTop: 12 }}>
            {plan && 'canMiss' in plan && (
              <div className="kv">
                <span className="k">You can miss</span>
                <span className="v num" style={{ fontSize: 20, fontWeight: 800 }}>
                  {plan.canMiss} more {plan.canMiss === 1 ? 'class' : 'classes'}
                </span>
              </div>
            )}
            {plan && 'mustAttend' in plan && (
              <div className="kv">
                <span className="k">To reach {target || 75}%</span>
                <span className="v num" style={{ fontSize: 20, fontWeight: 800 }}>
                  {plan.mustAttend === 'all'
                    ? 'Attend all remaining classes'
                    : `Attend the next ${plan.mustAttend} ${plan.mustAttend === 1 ? 'class' : 'classes'} without missing`}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      <Card title="Typical requirement">
        <p className="muted" style={{ margin: 0 }}>
          <Badge tone={current !== null && current >= 75 ? 'green' : 'amber'}>{current !== null ? fmtPct(current, 1) : '—'}</Badge>
          <span style={{ marginLeft: 8 }}>
            Most Pakistani universities and boards require at least 75% attendance to sit in exams.
            Formula: attendance % = (attended ÷ total) × 100.
          </span>
        </p>
      </Card>
    </Page>
  );
}
