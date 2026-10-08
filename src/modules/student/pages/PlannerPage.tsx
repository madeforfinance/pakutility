import React, { useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, BookOpen, ClipboardList, FileCheck, AlarmClock } from 'lucide-react';
import { db, uid } from '../../../storage/db';
import { useLive } from '../../../hooks/useLive';
import {
  Page, Card, Btn, IconBtn, Field, TextInput, NumberInput, Select, Textarea,
  Switch, Segmented, Modal, ConfirmDialog, EmptyState, Tabs, Badge,
} from '../../../components/ui';
import { toast } from '../../../lib/toast';
import { fmtDate, fmtTime, todayISO, daysUntil, parseAmount, toNum } from '../../../lib/format';
import { SUBJECT_COLORS } from '../lib/grades';

interface Subject { id: string; name: string; creditHours: number; color: string }
interface Assignment { id: string; subjectId: string; title: string; dueDate: string; done: boolean; priority: 'low' | 'medium' | 'high' }
interface Exam { id: string; subjectId: string; title: string; date: string; time?: string; venue?: string; note?: string }

type Tab = 'subjects' | 'assignments' | 'exams';

const PRIORITIES = [
  { value: 'low' as const, label: 'Low' },
  { value: 'medium' as const, label: 'Medium' },
  { value: 'high' as const, label: 'High' },
];

function dueBadge(dueDate: string, done: boolean): { label: string; tone: 'green' | 'red' | 'amber' | 'blue' | 'gray' } {
  if (done) return { label: 'Done', tone: 'green' };
  const d = daysUntil(dueDate);
  if (d === null) return { label: 'No date', tone: 'gray' };
  if (d < 0) return { label: `Overdue by ${Math.abs(d)}d`, tone: 'red' };
  if (d === 0) return { label: 'Due today', tone: 'amber' };
  if (d <= 3) return { label: `${d}d left`, tone: 'amber' };
  return { label: `${d}d left`, tone: 'blue' };
}

export default function PlannerPage() {
  const { data: subjects } = useLive(() => db.all<Subject>('subjects'), []);
  const { data: assignments } = useLive(() => db.all<Assignment>('assignments'), []);
  const { data: exams } = useLive(() => db.all<Exam>('exams'), []);
  const [tab, setTab] = useState<Tab>('subjects');

  const [subjectModal, setSubjectModal] = useState<null | { editing?: Subject }>(null);
  const [sName, setSName] = useState('');
  const [sCredits, setSCredits] = useState('');
  const [sColor, setSColor] = useState(SUBJECT_COLORS[0]);
  const [sError, setSError] = useState('');

  const [assignModal, setAssignModal] = useState<null | { editing?: Assignment }>(null);
  const [aSubject, setASubject] = useState('');
  const [aTitle, setATitle] = useState('');
  const [aDue, setADue] = useState(todayISO());
  const [aPriority, setAPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [aDone, setADone] = useState(false);
  const [aError, setAError] = useState('');

  const [examModal, setExamModal] = useState<null | { editing?: Exam }>(null);
  const [eSubject, setESubject] = useState('');
  const [eTitle, setETitle] = useState('');
  const [eDate, setEDate] = useState(todayISO());
  const [eTime, setETime] = useState('');
  const [eVenue, setEVenue] = useState('');
  const [eNote, setENote] = useState('');
  const [eError, setEError] = useState('');

  const [deleteAsk, setDeleteAsk] = useState<null | { kind: Tab; id: string; label: string }>(null);

  const subjectName = (id: string) => (subjects || []).find((s) => s.id === id)?.name || '—';
  const subjectColor = (id: string) => (subjects || []).find((s) => s.id === id)?.color || '#667085';

  const sortedAssignments = useMemo(
    () =>
      (assignments || [])
        .slice()
        .sort((a, b) => Number(a.done) - Number(b.done) || (a.dueDate || '9999').localeCompare(b.dueDate || '9999')),
    [assignments],
  );

  const sortedExams = useMemo(
    () => (exams || []).slice().sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999')),
    [exams],
  );

  const nextExam = useMemo(() => {
    const t = todayISO();
    return sortedExams.find((e) => (e.date || '') >= t) || null;
  }, [sortedExams]);

  /* ----- subjects ----- */
  function openSubjectModal(editing?: Subject) {
    setSName(editing?.name || '');
    setSCredits(editing ? String(editing.creditHours) : '');
    setSColor(editing?.color || SUBJECT_COLORS[0]);
    setSError('');
    setSubjectModal(editing ? { editing } : {});
  }
  async function submitSubject() {
    const name = sName.trim();
    if (!name) { setSError('Please enter a subject name.'); return; }
    const credits = sCredits.trim() === '' ? 0 : parseAmount(sCredits);
    if (credits === null || credits < 0) { setSError('Please enter valid credit hours.'); return; }
    if (subjectModal?.editing) {
      await db.put('subjects', { ...subjectModal.editing, name, creditHours: credits, color: sColor });
      toast.success('Subject updated.');
    } else {
      await db.add('subjects', { id: uid('sub_'), name, creditHours: credits, color: sColor });
      toast.success('Subject added.');
    }
    setSubjectModal(null);
  }

  /* ----- assignments ----- */
  function openAssignModal(editing?: Assignment) {
    const list = subjects || [];
    setASubject(editing?.subjectId || list[0]?.id || '');
    setATitle(editing?.title || '');
    setADue(editing?.dueDate || todayISO());
    setAPriority(editing?.priority || 'medium');
    setADone(editing?.done || false);
    setAError('');
    setAssignModal(editing ? { editing } : {});
  }
  async function submitAssignment() {
    const title = aTitle.trim();
    if (!title) { setAError('Please enter an assignment title.'); return; }
    if (!aSubject) { setAError('Please add a subject first.'); return; }
    if (!aDue) { setAError('Please pick a due date.'); return; }
    const payload = { subjectId: aSubject, title, dueDate: aDue, done: aDone, priority: aPriority };
    if (assignModal?.editing) {
      await db.put('assignments', { ...assignModal.editing, ...payload });
      toast.success('Assignment updated.');
    } else {
      await db.add('assignments', { id: uid('asg_'), ...payload });
      toast.success('Assignment added.');
    }
    setAssignModal(null);
  }
  async function toggleAssignment(a: Assignment) {
    await db.put('assignments', { ...a, done: !a.done });
  }

  /* ----- exams ----- */
  function openExamModal(editing?: Exam) {
    const list = subjects || [];
    setESubject(editing?.subjectId || list[0]?.id || '');
    setETitle(editing?.title || '');
    setEDate(editing?.date || todayISO());
    setETime(editing?.time || '');
    setEVenue(editing?.venue || '');
    setENote(editing?.note || '');
    setEError('');
    setExamModal(editing ? { editing } : {});
  }
  async function submitExam() {
    const title = eTitle.trim();
    if (!title) { setEError('Please enter an exam title.'); return; }
    if (!eSubject) { setEError('Please add a subject first.'); return; }
    if (!eDate) { setEError('Please pick a date.'); return; }
    const payload = { subjectId: eSubject, title, date: eDate, time: eTime, venue: eVenue.trim(), note: eNote.trim() };
    if (examModal?.editing) {
      await db.put('exams', { ...examModal.editing, ...payload });
      toast.success('Exam updated.');
    } else {
      await db.add('exams', { id: uid('exm_'), ...payload });
      toast.success('Exam added.');
    }
    setExamModal(null);
  }

  async function doDelete() {
    if (!deleteAsk) return;
    const store = deleteAsk.kind === 'subjects' ? 'subjects' : deleteAsk.kind === 'assignments' ? 'assignments' : 'exams';
    await db.remove(store, deleteAsk.id);
    toast.success('Deleted.');
    setDeleteAsk(null);
  }

  const tabActions: Record<Tab, React.ReactNode> = {
    subjects: <Btn variant="primary" icon={<Plus size={16} />} onClick={() => openSubjectModal()}>Add subject</Btn>,
    assignments: <Btn variant="primary" icon={<Plus size={16} />} onClick={() => openAssignModal()}>Add assignment</Btn>,
    exams: <Btn variant="primary" icon={<Plus size={16} />} onClick={() => openExamModal()}>Add exam</Btn>,
  };

  return (
    <Page title="Study Planner" subtitle="Subjects, assignments and exams in one place." actions={tabActions[tab]}>
      {nextExam && tab !== 'subjects' && (
        <div className="result-panel" style={{ marginBottom: 16 }} role="status">
          <div className="rp-label">Next exam · {subjectName(nextExam.subjectId)}</div>
          <div className="rp-value num">
            {(() => { const d = daysUntil(nextExam.date); return d === 0 ? 'Today' : d === 1 ? 'Tomorrow' : `${d} days left`; })()}
          </div>
          <div className="kv"><span className="k">Exam</span><span className="v">{nextExam.title}</span></div>
          <div className="kv"><span className="k">Date</span><span className="v">{fmtDate(nextExam.date)}{nextExam.time ? ` · ${fmtTime(nextExam.time)}` : ''}</span></div>
          {nextExam.venue && <div className="kv"><span className="k">Venue</span><span className="v">{nextExam.venue}</span></div>}
        </div>
      )}

      <Card>
        <Tabs
          value={tab}
          onChange={(v) => setTab(v as Tab)}
          tabs={[
            { value: 'subjects', label: `Subjects (${(subjects || []).length})` },
            { value: 'assignments', label: `Assignments (${(assignments || []).filter((a) => !a.done).length} open)` },
            { value: 'exams', label: `Exams (${(exams || []).length})` },
          ]}
        />

        <div style={{ marginTop: 12 }}>
          {tab === 'subjects' && (
            (subjects || []).length === 0 ? (
              <EmptyState
                icon={<BookOpen size={40} />}
                title="No subjects yet"
                text="Add your subjects first — assignments and exams link to them."
                action={<Btn variant="primary" icon={<Plus size={16} />} onClick={() => openSubjectModal()}>Add subject</Btn>}
              />
            ) : (
              <div className="grid cols-3">
                {(subjects || []).map((s) => (
                  <div className="card" key={s.id} style={{ margin: 0, borderTop: `4px solid ${s.color}` }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 800 }}>{s.name}</div>
                        <div className="muted small">
                          {toNum(s.creditHours) > 0 ? `${toNum(s.creditHours)} credit hrs · ` : ''}
                          {(assignments || []).filter((a) => a.subjectId === s.id && !a.done).length} open tasks
                        </div>
                      </div>
                      <div className="row-actions">
                        <IconBtn label={`Edit ${s.name}`} onClick={() => openSubjectModal(s)}><Pencil size={15} /></IconBtn>
                        <IconBtn label={`Delete ${s.name}`} onClick={() => setDeleteAsk({ kind: 'subjects', id: s.id, label: s.name })}><Trash2 size={15} /></IconBtn>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {tab === 'assignments' && (
            sortedAssignments.length === 0 ? (
              <EmptyState
                icon={<ClipboardList size={40} />}
                title="No assignments"
                text="Add homework, projects and coursework with due dates."
                action={<Btn variant="primary" icon={<Plus size={16} />} onClick={() => openAssignModal()}>Add assignment</Btn>}
              />
            ) : (
              <div className="list">
                {sortedAssignments.map((a) => {
                  const b = dueBadge(a.dueDate, a.done);
                  return (
                    <div className="list-row" key={a.id}>
                      <button
                        type="button"
                        onClick={() => toggleAssignment(a)}
                        aria-label={a.done ? `Mark ${a.title} as not done` : `Mark ${a.title} as done`}
                        aria-pressed={a.done}
                        style={{
                          width: 26, height: 26, borderRadius: 8, flex: '0 0 26px',
                          border: '2px solid var(--border)',
                          borderColor: a.done ? '#12805c' : undefined,
                          background: a.done ? '#12805c' : 'transparent',
                          color: '#fff', display: 'flex', alignItems: 'center',
                          justifyContent: 'center', cursor: 'pointer', padding: 0,
                        }}
                      >
                        {a.done && <span aria-hidden style={{ fontSize: 15, fontWeight: 800 }}>✓</span>}
                      </button>
                      <div className="lr-main">
                        <div className="lr-title" style={a.done ? { textDecoration: 'line-through', color: 'var(--muted)' } : undefined}>
                          {a.title}
                        </div>
                        <div className="lr-sub">
                          <span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: '50%', background: subjectColor(a.subjectId), marginRight: 6 }} aria-hidden />
                          {subjectName(a.subjectId)} · due {fmtDate(a.dueDate)}
                        </div>
                        <div style={{ marginTop: 4, display: 'flex', gap: 6 }}>
                          <Badge tone={b.tone}>{b.label}</Badge>
                          <Badge tone={a.priority === 'high' ? 'red' : a.priority === 'medium' ? 'amber' : 'gray'}>{a.priority}</Badge>
                        </div>
                      </div>
                      <div className="lr-right">
                        <div className="row-actions" style={{ justifyContent: 'flex-end' }}>
                          <IconBtn label={`Edit ${a.title}`} onClick={() => openAssignModal(a)}><Pencil size={15} /></IconBtn>
                          <IconBtn label={`Delete ${a.title}`} onClick={() => setDeleteAsk({ kind: 'assignments', id: a.id, label: a.title })}><Trash2 size={15} /></IconBtn>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}

          {tab === 'exams' && (
            sortedExams.length === 0 ? (
              <EmptyState
                icon={<FileCheck size={40} />}
                title="No exams scheduled"
                text="Add exams with dates, times and venues to get countdowns."
                action={<Btn variant="primary" icon={<Plus size={16} />} onClick={() => openExamModal()}>Add exam</Btn>}
              />
            ) : (
              <div className="list">
                {sortedExams.map((e) => {
                  const d = daysUntil(e.date);
                  const past = d !== null && d < 0;
                  return (
                    <div className="list-row" key={e.id}>
                      <div className="lr-ic"><AlarmClock size={19} /></div>
                      <div className="lr-main">
                        <div className="lr-title">{e.title}</div>
                        <div className="lr-sub">
                          <span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: '50%', background: subjectColor(e.subjectId), marginRight: 6 }} aria-hidden />
                          {subjectName(e.subjectId)} · {fmtDate(e.date)}{e.time ? ` · ${fmtTime(e.time)}` : ''}
                          {e.venue ? ` · ${e.venue}` : ''}
                        </div>
                        {e.note && <div className="lr-sub">{e.note}</div>}
                        <div style={{ marginTop: 4 }}>
                          {past
                            ? <Badge tone="gray">Completed</Badge>
                            : <Badge tone={d !== null && d <= 7 ? 'amber' : 'blue'}>
                                {d === 0 ? 'Today' : d === 1 ? 'Tomorrow' : `${d} days left`}
                              </Badge>}
                        </div>
                      </div>
                      <div className="lr-right">
                        <div className="row-actions" style={{ justifyContent: 'flex-end' }}>
                          <IconBtn label={`Edit ${e.title}`} onClick={() => openExamModal(e)}><Pencil size={15} /></IconBtn>
                          <IconBtn label={`Delete ${e.title}`} onClick={() => setDeleteAsk({ kind: 'exams', id: e.id, label: e.title })}><Trash2 size={15} /></IconBtn>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>
      </Card>

      {/* Subject modal */}
      <Modal open={subjectModal !== null} onClose={() => setSubjectModal(null)} title={subjectModal?.editing ? 'Edit subject' : 'Add subject'}
        actions={<><Btn variant="ghost" onClick={() => setSubjectModal(null)}>Cancel</Btn><Btn variant="primary" onClick={submitSubject}>{subjectModal?.editing ? 'Save' : 'Add'}</Btn></>}>
        <Field label="Subject name" required error={sError || undefined}>
          <TextInput value={sName} onChange={(e) => setSName(e.target.value)} placeholder="e.g. Accounting, Physics" autoFocus />
        </Field>
        <Field label="Credit hours">
          <NumberInput value={sCredits} onChange={(e) => setSCredits(e.target.value)} placeholder="e.g. 3" />
        </Field>
        <Field label="Color">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {SUBJECT_COLORS.map((c) => (
              <button
                key={c} type="button" onClick={() => setSColor(c)}
                aria-label={`Color ${c}`} aria-pressed={sColor === c}
                style={{ width: 34, height: 34, borderRadius: '50%', background: c, border: sColor === c ? '3px solid var(--gold)' : '2px solid var(--border)', cursor: 'pointer' }}
              />
            ))}
          </div>
        </Field>
      </Modal>

      {/* Assignment modal */}
      <Modal open={assignModal !== null} onClose={() => setAssignModal(null)} title={assignModal?.editing ? 'Edit assignment' : 'Add assignment'}
        actions={<><Btn variant="ghost" onClick={() => setAssignModal(null)}>Cancel</Btn><Btn variant="primary" onClick={submitAssignment}>{assignModal?.editing ? 'Save' : 'Add'}</Btn></>}>
        <Field label="Title" required error={aError || undefined}>
          <TextInput value={aTitle} onChange={(e) => setATitle(e.target.value)} placeholder="e.g. Chapter 5 exercises" autoFocus />
        </Field>
        <div className="form-row">
          <Field label="Subject" required>
            <Select value={aSubject} onChange={(e) => setASubject(e.target.value)}>
              {(subjects || []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </Field>
          <Field label="Due date" required>
            <TextInput type="date" value={aDue} onChange={(e) => setADue(e.target.value)} />
          </Field>
        </div>
        <Field label="Priority">
          <Segmented options={PRIORITIES} value={aPriority} onChange={setAPriority} />
        </Field>
        {assignModal?.editing && <Switch label="Completed" checked={aDone} onChange={(e) => setADone(e.target.checked)} />}
        {(subjects || []).length === 0 && <p className="muted small">Add a subject first (Subjects tab) before creating assignments.</p>}
      </Modal>

      {/* Exam modal */}
      <Modal open={examModal !== null} onClose={() => setExamModal(null)} title={examModal?.editing ? 'Edit exam' : 'Add exam'}
        actions={<><Btn variant="ghost" onClick={() => setExamModal(null)}>Cancel</Btn><Btn variant="primary" onClick={submitExam}>{examModal?.editing ? 'Save' : 'Add'}</Btn></>}>
        <Field label="Exam title" required error={eError || undefined}>
          <TextInput value={eTitle} onChange={(e) => setETitle(e.target.value)} placeholder="e.g. Mid-term, Final paper" autoFocus />
        </Field>
        <div className="form-row">
          <Field label="Subject" required>
            <Select value={eSubject} onChange={(e) => setESubject(e.target.value)}>
              {(subjects || []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </Field>
          <Field label="Date" required>
            <TextInput type="date" value={eDate} onChange={(e) => setEDate(e.target.value)} />
          </Field>
        </div>
        <div className="form-row">
          <Field label="Time">
            <TextInput type="time" value={eTime} onChange={(e) => setETime(e.target.value)} />
          </Field>
          <Field label="Venue">
            <TextInput value={eVenue} onChange={(e) => setEVenue(e.target.value)} placeholder="e.g. Room 204" />
          </Field>
        </div>
        <Field label="Note">
          <Textarea value={eNote} onChange={(e) => setENote(e.target.value)} rows={2} placeholder="Syllabus, tips…" />
        </Field>
        {(subjects || []).length === 0 && <p className="muted small">Add a subject first (Subjects tab) before creating exams.</p>}
      </Modal>

      <ConfirmDialog
        open={deleteAsk !== null}
        title="Delete?"
        message={`Delete “${deleteAsk?.label}”? This cannot be undone.`}
        onConfirm={doDelete}
        onCancel={() => setDeleteAsk(null)}
      />
    </Page>
  );
}
