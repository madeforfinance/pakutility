import React, { useMemo, useState } from 'react';
import { Page, Card, Field, NumberInput, Badge } from '../../../components/ui';
import { fmtNum, fmtPct, parseAmount, toNum } from '../../../lib/format';
import { gradeForPercentage } from '../lib/grades';

export default function GradePage() {
  const [earned, setEarned] = useState('');
  const [total, setTotal] = useState('');
  const { result, error } = useMemo(() => {
    if (earned.trim() === '' || total.trim() === '') return { result: null, error: '' };
    const e = parseAmount(earned);
    const t = parseAmount(total);
    if (e === null || e < 0) return { result: null, error: 'Please enter valid obtained marks.' };
    if (t === null || t <= 0) return { result: null, error: 'Please enter valid total marks.' };
    if (e > t) return { result: null, error: 'Obtained marks cannot exceed total marks.' };
    const pct = (e / t) * 100;
    return { result: { pct, band: gradeForPercentage(pct) }, error: '' };
  }, [earned, total]);

  return (
    <Page title="Grade Calculator" subtitle="Marks → percentage, grade and grade points (Pakistani scheme).">
      <Card title="Enter marks">
        <div className="form-row">
          <Field label="Obtained marks" required>
            <NumberInput value={earned} onChange={(e) => setEarned(e.target.value)} placeholder="e.g. 782" autoFocus />
          </Field>
          <Field label="Total marks" required error={error || undefined}>
            <NumberInput value={total} onChange={(e) => setTotal(e.target.value)} placeholder="e.g. 1100" />
          </Field>
        </div>
      </Card>

      {result && (
        <div className="result-panel" role="status" aria-live="polite">
          <div className="rp-label">Percentage</div>
          <div className="rp-value num">{fmtPct(result.pct, 2)}</div>
          <div className="kv"><span className="k">Grade</span><span className="v num" style={{ fontSize: 20, fontWeight: 800 }}>{result.band.grade}</span></div>
          <div className="kv"><span className="k">Grade points</span><span className="v num">{fmtNum(result.band.points, 1)}</span></div>
          <div className="kv"><span className="k">Remarks</span><span className="v">{result.band.remarks}</span></div>
        </div>
      )}

      <Card title="Pakistani grading scheme">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Percentage</th><th>Grade</th><th>Points</th></tr></thead>
            <tbody>
              {[
                ['85% and above', 'A+'], ['80% – 84%', 'A'], ['75% – 79%', 'B+'],
                ['70% – 74%', 'B'], ['65% – 69%', 'C+'], ['60% – 64%', 'C'],
                ['50% – 59%', 'D'], ['Below 50%', 'F'],
              ].map(([p, g]) => (
                <tr key={g} style={result?.band.grade === g ? { background: 'var(--surface-2)' } : undefined}>
                  <td>{p}</td>
                  <td><Badge tone={result?.band.grade === g ? 'gold' : 'gray'}>{g}</Badge></td>
                  <td className="num">{result?.band.grade === g ? fmtNum(result.band.points, 1) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted small" style={{ marginBottom: 0 }}>
          Obtained {toNum(earned)} of {toNum(total)} marks. Individual boards and universities may vary slightly.
        </p>
      </Card>
    </Page>
  );
}
