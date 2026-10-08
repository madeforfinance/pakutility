import React, { useMemo, useState } from 'react';
import { Plus, Trash2, RotateCcw } from 'lucide-react';
import { Page, Card, Btn, IconBtn, Field, TextInput, NumberInput, Select, EmptyState } from '../../../components/ui';
import { fmtNum, toNum } from '../../../lib/format';
import { GRADE_SCALE } from '../lib/grades';

interface Row {
  id: number;
  course: string;
  credits: string;
  grade: string;
  points: string;
}

let nextId = 1;
const blankRow = (): Row => ({ id: nextId++, course: '', credits: '3', grade: 'A', points: '4.0' });

function pointsForGrade(g: string): string {
  return String(GRADE_SCALE.find((x) => x.grade === g)?.points ?? 0);
}

export default function GpaPage() {
  const [rows, setRows] = useState<Row[]>([blankRow(), blankRow(), blankRow()]);

  const patch = (id: number, p: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...p } : r)));

  const result = useMemo(() => {
    let qp = 0;
    let credits = 0;
    let valid = 0;
    for (const r of rows) {
      const c = toNum(r.credits);
      const p = toNum(r.points);
      if (c > 0 && Number.isFinite(p)) {
        qp += c * p;
        credits += c;
        valid++;
      }
    }
    return { gpa: credits > 0 ? qp / credits : null, credits, qp, valid };
  }, [rows]);

  return (
    <Page
      title="GPA Calculator"
      subtitle="Semester GPA from courses, credit hours and grades (4.0 scale)."
      actions={<Btn variant="ghost" icon={<RotateCcw size={16} />} onClick={() => setRows([blankRow(), blankRow(), blankRow()])}>Reset</Btn>}
    >
      <Card
        title="Courses"
        actions={<Btn variant="secondary" size="sm" icon={<Plus size={15} />} onClick={() => setRows((rs) => [...rs, blankRow()])}>Add course</Btn>}
      >
        {rows.length === 0 ? (
          <EmptyState title="No courses" text="Add a course to begin." action={<Btn variant="secondary" icon={<Plus size={16} />} onClick={() => setRows([blankRow()])}>Add course</Btn>} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {rows.map((r, i) => (
              <div key={r.id} className="card" style={{ padding: 12, margin: 0 }}>
                <div className="form-row" style={{ alignItems: 'end' }}>
                  <div style={{ flex: 2, minWidth: 140 }}>
                    <Field label={i === 0 ? 'Course' : undefined}>
                      <TextInput value={r.course} onChange={(e) => patch(r.id, { course: e.target.value })} placeholder={`Course ${i + 1}`} aria-label={`Course ${i + 1} name`} />
                    </Field>
                  </div>
                  <div style={{ flex: 1, minWidth: 80 }}>
                    <Field label={i === 0 ? 'Credits' : undefined}>
                      <NumberInput value={r.credits} onChange={(e) => patch(r.id, { credits: e.target.value })} aria-label={`Course ${i + 1} credit hours`} />
                    </Field>
                  </div>
                  <div style={{ flex: 1, minWidth: 90 }}>
                    <Field label={i === 0 ? 'Grade' : undefined}>
                      <Select
                        value={r.grade}
                        onChange={(e) => patch(r.id, { grade: e.target.value, points: pointsForGrade(e.target.value) })}
                        aria-label={`Course ${i + 1} grade`}
                      >
                        {GRADE_SCALE.map((g) => <option key={g.grade} value={g.grade}>{g.grade}</option>)}
                      </Select>
                    </Field>
                  </div>
                  <div style={{ flex: 1, minWidth: 80 }}>
                    <Field label={i === 0 ? 'Points' : undefined} hint={i === 0 ? 'Editable' : undefined}>
                      <NumberInput value={r.points} onChange={(e) => patch(r.id, { points: e.target.value })} aria-label={`Course ${i + 1} grade points`} />
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
        <div className="rp-label">Semester GPA</div>
        <div className="rp-value num">{result.gpa === null ? '—' : fmtNum(result.gpa, 2)}</div>
        <div className="kv"><span className="k">Total credit hours</span><span className="v num">{fmtNum(result.credits, 1)}</span></div>
        <div className="kv"><span className="k">Quality points</span><span className="v num">{fmtNum(result.qp, 2)}</span></div>
        <div className="kv"><span className="k">Courses counted</span><span className="v num">{result.valid}</span></div>
      </div>
      <p className="muted small">GPA = total quality points ÷ total credit hours. Only rows with credit hours above zero are counted.</p>
    </Page>
  );
}
