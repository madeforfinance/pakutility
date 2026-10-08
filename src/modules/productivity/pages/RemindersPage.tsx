/* Reminders — CRUD + browser-notification opt-in + due-now checks while open. */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Page, Card, Btn, Field, TextInput, Textarea, Modal,
         ConfirmDialog, EmptyState, Badge, Switch } from '../../../components/ui';
import { DynIcon } from '../../../components/DynIcon';
import { useLive } from '../../../hooks/useLive';
import { db, uid } from '../../../storage/db';
import { toast } from '../../../lib/toast';
import { fmtDate, fmtTime, todayISO } from '../../../lib/format';
import { useSettings } from '../../../app/settings';

interface Reminder { id: string; title: string; date: string; time: string; note: string; done: boolean; }

const EMPTY = { title: '', date: todayISO(), time: '', note: '' };

function dateTimeMs(r: Reminder): number | null {
  const ms = new Date(`${r.date}T${r.time || '00:00'}:00`).getTime();
  return Number.isFinite(ms) ? ms : null;
}

export default function RemindersPage() {
  const { data } = useLive(() => db.all<Reminder>('reminders'), []);
  const { prefs: snap, update } = useSettings();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Reminder | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const toastedRef = useRef<Set<string>>(new Set());

  // Fire in-app toasts (and browser notifications when enabled) for reminders
  // that become due while the app is open. Honest scope: no background scheduling.
  useEffect(() => {
    const check = async () => {
      const all = await db.all<Reminder>('reminders');
      const now = Date.now();
      for (const r of all) {
        if (r.done || toastedRef.current.has(r.id)) continue;
        const ms = dateTimeMs(r);
        if (ms == null) continue;
        if (ms <= now && ms > now - 120000) {
          toastedRef.current.add(r.id);
          toast.info(`Reminder: ${r.title}`);
          if (snap.notifications && 'Notification' in window && Notification.permission === 'granted') {
            try { new Notification('PakUtility reminder', { body: r.title }); } catch { /* ignore */ }
          }
        }
      }
    };
    check();
    const t = setInterval(check, 30000);
    return () => clearInterval(t);
  }, [snap.notifications]);

  const sorted = useMemo(() => {
    const list = [...(data || [])];
    list.sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      return (a.date + (a.time || '')).localeCompare(b.date + (b.time || ''));
    });
    return list;
  }, [data]);

  const dueNow = useMemo(() => {
    const now = Date.now();
    return sorted.filter((r) => {
      if (r.done) return false;
      const ms = dateTimeMs(r);
      return ms != null && ms <= now;
    });
  }, [sorted]);

  const set = (k: keyof typeof EMPTY, v: string) => setForm((p) => ({ ...p, [k]: v }));
  const openNew = () => { setEditing(null); setForm({ ...EMPTY, date: todayISO() }); setModalOpen(true); };
  const openEdit = (r: Reminder) => { setEditing(r); setForm({ title: r.title, date: r.date, time: r.time, note: r.note }); setModalOpen(true); };

  const save = async () => {
    if (!form.title.trim()) { toast.error('Please enter a reminder title.'); return; }
    if (!form.date) { toast.error('Please pick a date.'); return; }
    try {
      if (editing) {
        await db.put('reminders', { ...editing, title: form.title.trim(), date: form.date, time: form.time, note: form.note });
        toast.success('Reminder updated.');
      } else {
        await db.add('reminders', { id: uid(), title: form.title.trim(), date: form.date, time: form.time, note: form.note, done: false });
        toast.success('Reminder added.');
      }
      setModalOpen(false);
    } catch { toast.error('Could not save the reminder.'); }
  };

  const toggleDone = async (r: Reminder) => {
    try { await db.put('reminders', { ...r, done: !r.done }); }
    catch { toast.error('Could not update the reminder.'); }
  };

  const remove = async () => {
    if (!confirmId) return;
    try { await db.remove('reminders', confirmId); toast.success('Reminder deleted.'); }
    catch { toast.error('Could not delete the reminder.'); }
    setConfirmId(null);
  };

  const enableNotifications = async () => {
    if (!('Notification' in window)) {
      toast.error('Browser notifications are not supported on this device. In-app reminders will still work.');
      return;
    }
    try {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        await update({ notifications: true });
        toast.success('Browser notifications enabled.');
      } else {
        toast.info('Notification permission was not granted. In-app reminders will still work.');
      }
    } catch {
      toast.error('Could not enable notifications. In-app reminders will still work.');
    }
  };

  return (
    <Page
      title="Reminders"
      subtitle="Get nudged for bills, birthdays, renewals and more."
      actions={<Btn variant="primary" icon={<DynIcon name="Plus" size={16} />} onClick={openNew}>New reminder</Btn>}
    >
      {dueNow.length > 0 && (
        <Card title="Due now" actions={<Badge tone="red">{dueNow.length} overdue</Badge>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {dueNow.map((r) => (
              <div key={r.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '10px 12px',
                border: '1px solid var(--red-border, #f3c2bd)', borderRadius: 10, background: 'var(--red-bg, #fef3f2)' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700 }}>{r.title}</div>
                  <div className="muted small">{fmtDate(r.date)}{r.time ? ` • ${fmtTime(r.time)}` : ''}</div>
                </div>
                <Btn size="sm" variant="secondary" onClick={() => toggleDone(r)}>Mark done</Btn>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card
        title="Notifications"
        subtitle="Browser notifications work while the app is open. In-app reminders always work."
        actions={
          snap.notifications
            ? <Badge tone="green">Enabled</Badge>
            : <Btn size="sm" variant="secondary" icon={<DynIcon name="Bell" size={14} />} onClick={enableNotifications}>Enable browser notifications</Btn>
        }
      >
        <Switch
          label="Remind me in the browser"
          checked={snap.notifications}
          onChange={(e) => { update({ notifications: e.target.checked }); }}
        />
      </Card>

      <Card title="All reminders">
        {sorted.length === 0 ? (
          <EmptyState
            icon={<DynIcon name="Bell" size={40} />}
            title="No reminders yet"
            text="Add reminders for bill due dates, birthdays, document renewals and anything you shouldn't forget."
            action={<Btn variant="primary" onClick={openNew}>Add your first reminder</Btn>}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {sorted.map((r) => (
              <div key={r.id} className="card" style={{ margin: 0, padding: '12px 14px', opacity: r.done ? 0.65 : 1 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <button
                    aria-label={r.done ? 'Mark as not done' : 'Mark as done'}
                    onClick={() => toggleDone(r)}
                    style={{
                      width: 26, height: 26, borderRadius: '50%', flexShrink: 0, marginTop: 2,
                      border: `2px solid ${r.done ? 'var(--green)' : 'var(--border)'}`,
                      background: r.done ? 'var(--green)' : 'transparent', color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                    }}
                  >
                    {r.done && <DynIcon name="CheckSquare" size={14} />}
                  </button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, textDecoration: r.done ? 'line-through' : 'none' }}>{r.title}</div>
                    <div className="muted small" style={{ marginTop: 2 }}>
                      {fmtDate(r.date)}{r.time ? ` • ${fmtTime(r.time)}` : ' • all day'}{r.note ? ` • ${r.note}` : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                    <Btn size="sm" variant="ghost" aria-label="Edit reminder" onClick={() => openEdit(r)}><DynIcon name="Pencil" size={14} /></Btn>
                    <Btn size="sm" variant="ghost" aria-label="Delete reminder" onClick={() => setConfirmId(r.id)}><DynIcon name="Trash2" size={14} /></Btn>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit reminder' : 'New reminder'}
        actions={<><Btn variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Btn>
          <Btn variant="primary" onClick={save}>{editing ? 'Save changes' : 'Add reminder'}</Btn></>}>
        <Field label="Title" required>
          <TextInput value={form.title} placeholder="e.g. Pay internet bill" onChange={(e) => set('title', e.target.value)} autoFocus />
        </Field>
        <div className="form-grid">
          <Field label="Date" required>
            <TextInput type="date" value={form.date} onChange={(e) => set('date', e.target.value)} />
          </Field>
          <Field label="Time (optional)">
            <TextInput type="time" value={form.time} onChange={(e) => set('time', e.target.value)} />
          </Field>
        </div>
        <Field label="Note">
          <Textarea rows={2} value={form.note} placeholder="Optional note" onChange={(e) => set('note', e.target.value)} />
        </Field>
      </Modal>

      <ConfirmDialog open={!!confirmId} title="Delete reminder?" message="This reminder will be permanently deleted."
        onConfirm={remove} onCancel={() => setConfirmId(null)} />
    </Page>
  );
}
