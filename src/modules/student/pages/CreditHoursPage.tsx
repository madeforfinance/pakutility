import React, { useMemo, useState } from 'react';
import { Plus, Trash2, RotateCcw } from 'lucide-react';
import { Page, Card, Btn, IconBtn, Field, TextInput, NumberInput, EmptyState } from '../../../components/ui';
import { fmtNum, toNum } from '../../../lib/format';

interface Row {
  id: number;
  course: string;
  credits: string;
}

let nextId = 1;
const blankRow = (): Row => ({ id: nextId++, course: '', credits: '3' });

export default function CreditHoursPage() {
  const [rows, setRows] = useState<Row[]>([blankRow(), blankRow(), blankRow()]);

  const patch = (id: number, p: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...p } : r)));

  const result = useMemo(() => {
    let total = 0;
    let valid = 0;
    for (const r of rows) {
      const c = toNum(r.credits);
      if (c > 0) {
        total += c;
        valid++;
      }
    }
    return { total, studyHours: total * 2, valid };
  }, [rows]);

  return (
    <Page
      title="Credit Hour Calculator"
      subtitle="Total credit hours and estimated weekly study time."
      actions={
        <>
          <Btn variant="ghost" icon={<RotateCcw size={16} />} onClick={() => setRows([blankRow(), blankRow(), blankRow()])}>Reset</Btn>
          <Btn variant="secondary" icon={<Plus size={16} />} onClick={() => setRows((rs) => [...rs, blankRow()])}>Add course</Btn>
        </>
      }
    >
      <Card title="Courses">
        {rows.length === 0 ? (
          <EmptyState title="No courses" text="Add a course to begin." action={<Btn variant="secondary" icon={<Plus size={16} />} onClick={() => setRows([blankRow()])}>Add course</Btn>} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {rows.map((r, i) => (
              <div key={r.id} className="card" style={{ padding: 12, margin: 0 }}>
                <div className="form-row" style={{ alignItems: 'end' }}>
                  <div style={{ flex: 3, minWidth: 140 }}>
                    <Field label={i === 0 ? 'Course' : undefined}>
                      <TextInput value={r.course} onChange={(e) => patch(r.id, { course: e.target.value })} placeholder={`Course ${i + 1}`} aria-label={`Course ${i + 1} name`} />
                    </Field>
                  </div>
                  <div style={{ flex: 1, minWidth: 90 }}>
                    <Field label={i === 0 ? 'Credit hours' : undefined}>
                      <NumberInput value={r.credits} onChange={(e) => patch(r.id, { credits: e.target.value })} aria-label={`Course ${i + 1} credit hours`} />
                    </Field>
                  </div>
                  <IconBtn label={`Remove course ${i + 1}`} onClick={() => setRows((rs) => rs.filter((x) => x.id !== r.id))}>
                    <Trash2 size={16} />
                  </IconBtn>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="result-panel" role="status" aria-live="polite">
        <div className="rp-label">Total credit hours</div>
        <div className="rp-value num">{fmtNum(result.total, 1)}</div>
        <div className="kv"><span className="k">Courses counted</span><span className="v num">{result.valid}</span></div>
        <div className="kv"><span className="k">Est. weekly study time</span><span className="v num" style={{ fontSize: 20, fontWeight: 800 }}>{fmtNum(result.studyHours, 1)} hrs/week</span></div>
      </div>
      <p className="muted small">The 2× rule: plan about 2 hours of study per week for every credit hour (1 hour in class + 1 hour self-study per credit).</p>
    </Page>
  );
}
