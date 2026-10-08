/* Leave Tracker — annual entitlement vs leaves taken (stored in `events` as kind:'leave'). */
import React, { useEffect, useState } from 'react';
import { Trash2, Plus, CalendarDays } from 'lucide-react';
import { db, uid } from '../../../storage/db';
import { useLive } from '../../../hooks/useLive';
import {
  Page, Card, Btn, IconBtn, Field, TextInput, Textarea,
  ConfirmDialog, EmptyState, Stat, Badge, ProgressBar,
} from '../../../components/ui';
import { toast } from '../../../lib/toast';
import { parseAmount, fmtDate, todayISO, daysUntil } from '../../../lib/format';

interface LeaveEvent {
  id: string;
  title: string;
  date: string;
  kind: 'leave';
  note: string;
}

export default function LeaveTrackerPage() {
  const { data: events } = useLive(() => db.all<LeaveEvent>('events'), []);
  const [entitlement, setEntitlement] = useState('20');
  const [title, setTitle] = useState('Annual leave');
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    db.get<{ key: string; value: number }>('settings', 'leaveEntitlement').then((r) => {
      if (r && typeof r.value === 'number') setEntitlement(String(r.value));
    });
  }, []);

  const leaves = (events || [])
    .filter((e) => e.kind === 'leave')
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  const ent = parseAmount(entitlement);
  const used = leaves.length;
  const remaining = ent !== null ? Math.max(0, ent - used) : null;

  const saveEntitlement = async () => {
    const v = parseAmount(entitlement);
    if (v === null || v < 0 || v > 365) {
      toast.error('Please enter a valid entitlement (0–365 days).');
      return;
    }
    await db.set('settings', 'leaveEntitlement', v);
    toast.success('Leave entitlement saved.');
  };

  const addLeave = async () => {
    if (!title.trim()) {
      toast.error('Please enter a reason for the leave.');
      return;
    }
    if (!date) {
      toast.error('Please pick a date.');
      return;
    }
    const entry: LeaveEvent = {
      id: uid(),
      title: title.trim().slice(0, 80),
      date,
      kind: 'leave',
      note: note.trim().slice(0, 200),
    };
    await db.add('events', entry);
    setNote('');
    toast.success('Leave recorded.');
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    await db.remove('events', deleteId);
    setDeleteId(null);
    toast.success('Leave entry deleted.');
  };

  return (
    <Page title="Leave Tracker" subtitle="Track your annual leave entitlement, leaves taken and balance.">
      <div className="grid cols-2">
        <Card title="Leave balance">
          <Field label="Annual entitlement (days)" hint="Saved on this device">
            <div style={{ display: 'flex', gap: 8 }}>
              <TextInput value={entitlement} inputMode="numeric" onChange={(e) => setEntitlement(e.target.value)}
                aria-label="Annual leave entitlement in days" style={{ flex: 1 }} />
              <Btn variant="secondary" onClick={saveEntitlement}>Save</Btn>
            </div>
          </Field>
          {remaining !== null && ent !== null && ent > 0 && (
            <div style={{ marginTop: 14 }}>
              <Stat label="Leaves remaining" value={`${remaining} / ${ent}`} icon={<CalendarDays size={20} />} tone="navy" />
              <div style={{ marginTop: 10 }}>
                <ProgressBar value={used} max={ent} />
                <p className="muted small" style={{ marginTop: 6 }}>{used} taken • {remaining} remaining</p>
              </div>
            </div>
          )}
        </Card>

        <Card title="Record a leave">
          <Field label="Reason" required>
            <TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Annual leave" maxLength={80} />
          </Field>
          <Field label="Date" required>
            <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Note (optional)">
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={200} placeholder="Any details…" />
          </Field>
          <Btn variant="primary" icon={<Plus size={16} />} onClick={addLeave}>Add leave</Btn>
        </Card>
      </div>

      <Card title="Leave history" subtitle={`${leaves.length} record${leaves.length === 1 ? '' : 's'}`}>
        {leaves.length === 0 ? (
          <EmptyState title="No leaves recorded"
            text="Record your first leave above to start tracking your balance." />
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>Reason</th><th>Date</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>
                {leaves.map((l) => {
                  const d = daysUntil(l.date);
                  return (
                    <tr key={l.id}>
                      <td><strong>{l.title}</strong>{l.note && <div className="muted small">{l.note}</div>}</td>
                      <td>{fmtDate(l.date)}</td>
                      <td>
                        {d !== null && d > 0 ? <Badge tone="blue">Upcoming</Badge>
                          : d === 0 ? <Badge tone="gold">Today</Badge>
                            : <Badge tone="gray">Taken</Badge>}
                      </td>
                      <td>
                        <div className="row-actions">
                          <IconBtn label={`Delete leave on ${l.date}`} onClick={() => setDeleteId(l.id)}>
                            <Trash2 size={16} />
                          </IconBtn>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <ConfirmDialog open={!!deleteId} title="Delete leave entry"
        message="This leave record will be permanently deleted."
        onConfirm={confirmDelete} onCancel={() => setDeleteId(null)} />
    </Page>
  );
}
