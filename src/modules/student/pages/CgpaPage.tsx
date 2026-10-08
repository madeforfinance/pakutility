import React, { useMemo, useState } from 'react';
import { Plus, Trash2, RotateCcw } from 'lucide-react';
import { Page, Card, Btn, IconBtn, Field, TextInput, NumberInput, EmptyState } from '../../../components/ui';
import { fmtNum, toNum } from '../../../lib/format';

interface Row {
  id: number;
  semester: string;
  credits: string;
  gpa: string;
}

let nextId = 1;
const blankRow = (): Row => ({ id: nextId++, semester: '', credits: '', gpa: '' });

export default function CgpaPage() {
  const [rows, setRows] = useState<Row[]>([blankRow(), blankRow()]);

  const patch = (id: number, p: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...p } : r)));

  const result = useMemo(() => {
    let qp = 0;
    let credits = 0;
    let valid = 0;
    for (const r of rows) {
      const c = toNum(r.credits);
      const g = toNum(r.gpa);
      if (c > 0 && g >= 0 && g <= 4) {
        qp += c * g;
        credits += c;
        valid++;
      }
    }
    return { cgpa: credits > 0 ? qp / credits : null, credits, valid };
  }, [rows]);

  return (
    <Page
      title="CGPA Calculator"
      subtitle="Cumulative GPA from all completed semesters."
      actions={<Btn variant="ghost" icon={<RotateCcw size={16} />} onClick={() => setRows([blankRow(), blankRow()])}>Reset</Btn>}
    >
      <Card
        title="Semesters"
        actions={<Btn variant="secondary" size="sm" icon={<Plus size={15} />} onClick={() => setRows((rs) => [...rs, blankRow()])}>Add semester</Btn>}
      >
        {rows.length === 0 ? (
          <EmptyState title="No semesters" text="Add a semester to begin." action={<Btn variant="secondary" icon={<Plus size={16} />} onClick={() => setRows([blankRow()])}>Add semester</Btn>} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {rows.map((r, i) => (
              <div key={r.id} className="card" style={{ padding: 12, margin: 0 }}>
                <div className="form-row" style={{ alignItems: 'end' }}>
                  <div style={{ flex: 2, minWidth: 120 }}>
                    <Field label={i === 0 ? 'Semester' : undefined}>
                      <TextInput value={r.semester} onChange={(e) => patch(r.id, { semester: e.target.value })} placeholder={`Semester ${i + 1}`} aria-label={`Semester ${i + 1} name`} />
                    </Field>
                  </div>
                  <div style={{ flex: 1, minWidth: 90 }}>
                    <Field label={i === 0 ? 'Credit hours' : undefined}>
                      <NumberInput value={r.credits} onChange={(e) => patch(r.id, { credits: e.target.value })} aria-label={`Semester ${i + 1} credit hours`} />
                    </Field>
                  </div>
                  <div style={{ flex: 1, minWidth: 90 }}>
                    <Field label={i === 0 ? 'GPA' : undefined}>
                      <NumberInput value={r.gpa} onChange={(e) => patch(r.id, { gpa: e.target.value })} placeholder="0–4" aria-label={`Semester ${i + 1} GPA`} />
                    </Field>
                  </div>
                  <IconBtn label={`Remove semester ${i + 1}`} onClick={() => setRows((rs) => rs.filter((x) => x.id !== r.id))}>
                    <Trash2 size={16} />
                  </IconBtn>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="result-panel" role="status" aria-live="polite">
        <div className="rp-label">Cumulative CGPA</div>
        <div className="rp-value num">{result.cgpa === null ? '—' : fmtNum(result.cgpa, 2)}</div>
        <div className="kv"><span className="k">Total credit hours</span><span className="v num">{fmtNum(result.credits, 1)}</span></div>
        <div className="kv"><span className="k">Semesters counted</span><span className="v num">{result.valid}</span></div>
      </div>
      <p className="muted small">CGPA = Σ (semester GPA × credit hours) ÷ total credit hours. GPA values must be between 0 and 4.</p>
    </Page>
  );
}
