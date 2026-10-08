/* Tasks — today / upcoming / completed, priorities, recurring. Honors ?new=1. */
import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Page, Card, Btn, Field, TextInput, Textarea, Select, Modal,
         ConfirmDialog, EmptyState, Badge, Tabs } from '../../../components/ui';
import { DynIcon } from '../../../components/DynIcon';
import { useLive } from '../../../hooks/useLive';
import { db, uid } from '../../../storage/db';
import { toast } from '../../../lib/toast';
import { fmtDate, todayISO, parseISODate, nowISO } from '../../../lib/format';

interface Task {
  id: string; title: string; note: string; dueDate: string;
  priority: 'low' | 'medium' | 'high'; done: boolean;
  recurring?: 'daily' | 'weekly' | 'monthly'; createdAt: string;
}

const EMPTY: {
  title: string; note: string; dueDate: string;
  priority: 'low' | 'medium' | 'high'; recurring: '' | 'daily' | 'weekly' | 'monthly';
} = { title: '', note: '', dueDate: todayISO(), priority: 'medium', recurring: '' };

function pad(n: number) { return String(n).padStart(2, '0'); }

function nextOccurrence(iso: string, r: 'daily' | 'weekly' | 'monthly'): string {
  const d = parseISODate(iso) || new Date();
  if (r === 'daily') d.setDate(d.getDate() + 1);
  else if (r === 'weekly') d.setDate(d.getDate() + 7);
  else d.setMonth(d.getMonth() + 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const PRI_TONE: Record<string, 'gray' | 'blue' | 'amber' | 'red'> = { low: 'gray', medium: 'blue', high: 'red' };

export default function TasksPage() {
  const { data } = useLive(() => db.all<Task>('tasks'), []);
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState('today');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const openNew = () => { setEditing(null); setForm({ ...EMPTY, dueDate: todayISO() }); setModalOpen(true); };

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      openNew();
      setSearchParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const today = todayISO();

  const groups = useMemo(() => {
    const all = data || [];
    const open = all.filter((t) => !t.done);
    const tdy = open.filter((t) => t.dueDate && t.dueDate <= today).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    const upc = open.filter((t) => !t.dueDate || t.dueDate > today).sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999'));
    const done = all.filter((t) => t.done).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 50);
    return { today: tdy, upcoming: upc, completed: done };
  }, [data, today]);

  const list = tab === 'today' ? groups.today : tab === 'upcoming' ? groups.upcoming : groups.completed;

  const set = (k: keyof typeof EMPTY, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const save = async () => {
    if (!form.title.trim()) { toast.error('Please enter a task title.'); return; }
    try {
      if (editing) {
        await db.put('tasks', { ...editing, title: form.title.trim(), note: form.note, dueDate: form.dueDate,
          priority: form.priority, recurring: form.recurring || undefined });
        toast.success('Task updated.');
      } else {
        await db.add('tasks', { id: uid(), title: form.title.trim(), note: form.note, dueDate: form.dueDate,
          priority: form.priority, done: false, recurring: form.recurring || undefined, createdAt: nowISO() });
        toast.success('Task added.');
      }
      setModalOpen(false);
    } catch { toast.error('Could not save the task.'); }
  };

  const toggleDone = async (t: Task) => {
    try {
      if (!t.done && t.recurring) {
        // auto-create the next occurrence before completing this one
        await db.add('tasks', {
          id: uid(), title: t.title, note: t.note,
          dueDate: nextOccurrence(t.dueDate || today, t.recurring),
          priority: t.priority, done: false, recurring: t.recurring, createdAt: nowISO(),
        });
        toast.info(`Next ${t.recurring} occurrence created.`);
      }
      await db.put('tasks', { ...t, done: !t.done });
      if (!t.done) toast.success('Task completed.');
    } catch { toast.error('Could not update the task.'); }
  };

  const remove = async () => {
    if (!confirmId) return;
    try { await db.remove('tasks', confirmId); toast.success('Task deleted.'); }
    catch { toast.error('Could not delete the task.'); }
    setConfirmId(null);
  };

  const openEdit = (t: Task) => {
    setEditing(t);
    setForm({ title: t.title, note: t.note, dueDate: t.dueDate, priority: t.priority, recurring: t.recurring || '' });
    setModalOpen(true);
  };

  return (
    <Page
      title="Tasks"
      subtitle="Stay on top of everything, one day at a time."
      actions={<Btn variant="primary" icon={<DynIcon name="Plus" size={16} />} onClick={openNew}>New task</Btn>}
    >
      <Tabs
        tabs={[
          { value: 'today', label: `Today (${groups.today.length})` },
          { value: 'upcoming', label: `Upcoming (${groups.upcoming.length})` },
          { value: 'completed', label: 'Completed' },
        ]}
        value={tab} onChange={setTab}
      />

      <Card>
        {list.length === 0 ? (
          <EmptyState
            icon={<DynIcon name="CheckSquare" size={40} />}
            title={tab === 'completed' ? 'Nothing completed yet' : 'All clear'}
            text={tab === 'completed' ? 'Completed tasks will appear here.' : 'No tasks here. Add one to get started.'}
            action={tab !== 'completed' ? <Btn variant="primary" onClick={openNew}>Add task</Btn> : undefined}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {list.map((t) => {
              const overdue = !t.done && t.dueDate && t.dueDate < today;
              return (
                <div key={t.id} className="card" style={{ margin: 0, padding: '12px 14px' }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <button
                      aria-label={t.done ? 'Mark as not done' : 'Mark as done'}
                      onClick={() => toggleDone(t)}
                      style={{
                        width: 26, height: 26, borderRadius: '50%', flexShrink: 0, marginTop: 2,
                        border: `2px solid ${t.done ? 'var(--green)' : 'var(--border)'}`,
                        background: t.done ? 'var(--green)' : 'transparent', color: '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                      }}
                    >
                      {t.done && <DynIcon name="CheckSquare" size={14} />}
                    </button>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, textDecoration: t.done ? 'line-through' : 'none', opacity: t.done ? 0.65 : 1 }}>
                        {t.title}
                      </div>
                      {t.note && <div className="muted small" style={{ marginTop: 2 }}>{t.note}</div>}
                      <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                        <Badge tone={PRI_TONE[t.priority]}>{t.priority}</Badge>
                        {t.dueDate && (
                          <Badge tone={overdue ? 'red' : 'gray'}>
                            {overdue ? `Overdue • ${fmtDate(t.dueDate)}` : fmtDate(t.dueDate)}
                          </Badge>
                        )}
                        {t.recurring && <Badge tone="blue"><DynIcon name="Repeat" size={12} /> {t.recurring}</Badge>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                      <Btn size="sm" variant="ghost" aria-label="Edit task" onClick={() => openEdit(t)}>
                        <DynIcon name="Pencil" size={14} />
                      </Btn>
                      <Btn size="sm" variant="ghost" aria-label="Delete task" onClick={() => setConfirmId(t.id)}>
                        <DynIcon name="Trash2" size={14} />
                      </Btn>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Modal
        open={modalOpen} onClose={() => setModalOpen(false)}
        title={editing ? 'Edit task' : 'New task'}
        actions={
          <>
            <Btn variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Btn>
            <Btn variant="primary" onClick={save}>{editing ? 'Save changes' : 'Add task'}</Btn>
          </>
        }
      >
        <Field label="Title" required>
          <TextInput value={form.title} placeholder="e.g. Pay electricity bill" onChange={(e) => set('title', e.target.value)} autoFocus />
        </Field>
        <Field label="Note">
          <Textarea rows={2} value={form.note} placeholder="Optional details" onChange={(e) => set('note', e.target.value)} />
        </Field>
        <div className="form-grid">
          <Field label="Due date">
            <TextInput type="date" value={form.dueDate} onChange={(e) => set('dueDate', e.target.value)} />
          </Field>
          <Field label="Priority">
            <Select value={form.priority} onChange={(e) => set('priority', e.target.value)}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </Select>
          </Field>
        </div>
        <Field label="Repeats" hint="Completing a repeating task auto-creates the next one.">
          <Select value={form.recurring} onChange={(e) => set('recurring', e.target.value as typeof EMPTY.recurring)}>
            <option value="">Does not repeat</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </Select>
        </Field>
      </Modal>

      <ConfirmDialog open={!!confirmId} title="Delete task?" message="This task will be permanently deleted."
        onConfirm={remove} onCancel={() => setConfirmId(null)} />
    </Page>
  );
}
