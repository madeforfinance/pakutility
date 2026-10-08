import React, { useMemo, useState } from 'react';
import { Page, Card, Btn, IconBtn, Field, TextInput, Select, Textarea,
         Modal, ConfirmDialog, EmptyState, Badge, Stat, Segmented } from '../../../components/ui';
import { DynIcon } from '../../../components/DynIcon';
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight, Flame } from 'lucide-react';
import { db, uid } from '../../../storage/db';
import { useLive } from '../../../hooks/useLive';
import { toast } from '../../../lib/toast';
import { prefs } from '../../../lib/prefs';
import { fmtDate, fmtInt, todayISO, parseISODate, addDaysISO } from '../../../lib/format';

interface FastEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  kind: string; // 'fast'
  note: string; // 'kept' | 'missed' | 'qaza'
  time?: string;
}

type Status = 'kept' | 'missed' | 'qaza';

const STATUS_META: Record<Status, { label: string; tone: 'green' | 'red' | 'amber'; color: string }> = {
  kept: { label: 'Kept', tone: 'green', color: '#1f8a5b' },
  missed: { label: 'Missed', tone: 'red', color: '#c03535' },
  qaza: { label: 'Qaza', tone: 'amber', color: '#a8842a' },
};

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function FastingPage() {
  const { data: events } = useLive(() => db.all<FastEvent>('events'), []);
  const [viewY, setViewY] = useState(() => new Date().getFullYear());
  const [viewM, setViewM] = useState(() => new Date().getMonth());
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<FastEvent | null>(null);
  const [date, setDate] = useState(todayISO());
  const [status, setStatus] = useState<Status>('kept');
  const [note, setNote] = useState('');
  const [formErr, setFormErr] = useState('');
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const fasts = useMemo(() => (events || []).filter((e) => e.kind === 'fast'), [events]);
  const byDate = useMemo(() => new Map(fasts.map((f) => [f.date, f])), [fasts]);

  const firstDay = prefs.firstDayOfWeek ?? 1;
  const monthStart = new Date(viewY, viewM, 1);
  const leadBlanks = (monthStart.getDay() - firstDay + 7) % 7;
  const daysInMonth = new Date(viewY, viewM + 1, 0).getDate();
  const orderedDow = useMemo(() => {
    const arr: string[] = [];
    for (let i = 0; i < 7; i++) arr.push(DOW[(firstDay + i) % 7]);
    return arr;
  }, [firstDay]);

  const streak = useMemo(() => {
    let s = 0;
    let d = todayISO();
    if (!byDate.get(d) || byDate.get(d)!.note !== 'kept') d = addDaysISO(d, -1);
    while (byDate.get(d) && byDate.get(d)!.note === 'kept') {
      s++;
      d = addDaysISO(d, -1);
    }
    return s;
  }, [byDate]);

  const keptThisMonth = fasts.filter((f) => f.date.slice(0, 7) === `${viewY}-${String(viewM + 1).padStart(2, '0')}` && f.note === 'kept').length;
  const qazaPending = fasts.filter((f) => f.note === 'qaza').length;

  const openNew = (forDate?: string) => {
    const d = forDate || todayISO();
    const existing = byDate.get(d);
    if (existing) { openEdit(existing); return; }
    setEditing(null); setDate(d); setStatus('kept'); setNote(''); setFormErr(''); setFormOpen(true);
  };
  const openEdit = (f: FastEvent) => {
    setEditing(f); setDate(f.date); setStatus((f.note as Status) || 'kept');
    setNote(f.title && f.title !== 'Fast' ? f.title : ''); setFormErr(''); setFormOpen(true);
  };

  const save = async () => {
    if (!date) { setFormErr('Please pick a date.'); return; }
    try {
      if (editing) {
        await db.put('events', { ...editing, date, note: status, title: note.trim() || 'Fast' } as FastEvent);
        toast.success('Fast updated');
      } else {
        const existing = byDate.get(date);
        if (existing) {
          await db.put('events', { ...existing, note: status, title: note.trim() || 'Fast' } as FastEvent);
          toast.success('Fast updated');
        } else {
          await db.add('events', { id: uid('fast_'), title: note.trim() || 'Fast', date, kind: 'fast', note: status } as FastEvent);
          toast.success('Fast logged');
        }
      }
      setFormOpen(false);
    } catch {
      toast.error('Could not save. Please try again.');
    }
  };

  const remove = async () => {
    if (!confirmId) return;
    try { await db.remove('events', confirmId); toast.success('Entry deleted'); }
    catch { toast.error('Could not delete. Please try again.'); }
    setConfirmId(null);
  };

  const prevMonth = () => { if (viewM === 0) { setViewY(viewY - 1); setViewM(11); } else setViewM(viewM - 1); };
  const nextMonth = () => { if (viewM === 11) { setViewY(viewY + 1); setViewM(0); } else setViewM(viewM + 1); };
  const monthName = monthStart.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  const recent = fasts.slice().sort((a, b) => (b.date < a.date ? -1 : 1)).slice(0, 10);

  return (
    <Page
      title="Fasting Tracker"
      subtitle="Kept, missed and qaza fasts"
      actions={<Btn variant="primary" icon={<Plus size={16} />} onClick={() => openNew()}>Log fast</Btn>}
    >
      <div className="grid cols-3" style={{ marginBottom: 16 }}>
        <Stat label="Current streak" value={`${fmtInt(streak)} day${streak === 1 ? '' : 's'}`} icon={<Flame size={20} />} tone="gold" />
        <Stat label="Kept this month" value={fmtInt(keptThisMonth)} icon={<DynIcon name="CalendarDays" />} />
        <Stat label="Qaza pending" value={fmtInt(qazaPending)} icon={<DynIcon name="Hourglass" />} />
      </div>

      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <IconBtn label="Previous month" onClick={prevMonth}><ChevronLeft size={20} /></IconBtn>
          <h3 style={{ margin: 0 }}>{monthName}</h3>
          <IconBtn label="Next month" onClick={nextMonth}><ChevronRight size={20} /></IconBtn>
        </div>
        <div className="cal-grid" role="grid" aria-label={monthName}>
          {orderedDow.map((d) => <div className="cal-dow" key={d}>{d}</div>)}
          {Array(leadBlanks).fill(null).map((_, i) => <div key={`b${i}`} />)}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const d = new Date(viewY, viewM, i + 1);
            const iso = `${viewY}-${String(viewM + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`;
            const f = byDate.get(iso);
            const isToday = iso === todayISO();
            return (
              <button key={iso} className={`cal-day${isToday ? ' today' : ''}`}
                onClick={() => openNew(iso)} aria-label={`${fmtDate(iso)}${f ? `, ${STATUS_META[(f.note as Status)]?.label || f.note}` : ', no entry'}`}>
                <span>{d.getDate()}</span>
                {f && (
                  <span title={STATUS_META[(f.note as Status)]?.label}
                    style={{ width: 7, height: 7, borderRadius: '50%', background: STATUS_META[(f.note as Status)]?.color || 'var(--muted)' }} />
                )}
              </button>
            );
          })}
        </div>
        <div className="chip-row" style={{ marginTop: 10 }}>
          {(Object.keys(STATUS_META) as Status[]).map((s) => (
            <span key={s} className="small muted" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_META[s].color }} />
              {STATUS_META[s].label}
            </span>
          ))}
        </div>
      </Card>

      <Card title="Recent entries" style={{ marginTop: 16 }}>
        {recent.length === 0 ? (
          <EmptyState icon={<DynIcon name="CalendarDays" />} title="No fasts logged yet"
            text="Tap any day in the calendar above, or use the button below, to log a fast."
            action={<Btn variant="primary" icon={<Plus size={16} />} onClick={() => openNew()}>Log fast</Btn>} />
        ) : (
          <div>
            {recent.map((f) => {
              const meta = STATUS_META[(f.note as Status)] || STATUS_META.kept;
              return (
                <div className="list-row" key={f.id}>
                  <div className="lr-ic"><DynIcon name="Moon" /></div>
                  <div className="lr-main">
                    <div className="lr-title">{f.title || 'Fast'}</div>
                    <div className="lr-sub">{fmtDate(f.date)} · {parseISODate(f.date)?.toLocaleDateString('en-GB', { weekday: 'long' })}</div>
                  </div>
                  <div className="lr-right"><Badge tone={meta.tone}>{meta.label}</Badge></div>
                  <div className="row-actions">
                    <IconBtn label="Edit entry" onClick={() => openEdit(f)}><Pencil size={15} /></IconBtn>
                    <IconBtn label="Delete entry" onClick={() => setConfirmId(f.id)}><Trash2 size={15} /></IconBtn>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? 'Edit fast' : 'Log fast'}
        actions={<><Btn onClick={() => setFormOpen(false)}>Cancel</Btn><Btn variant="primary" onClick={save}>Save</Btn></>}>
        <div className="form-row">
          <Field label="Date" error={formErr || undefined} required>
            <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} max={todayISO()} />
          </Field>
          <Field label="Status" required>
            <Segmented<Status> value={status} onChange={setStatus} options={[
              { value: 'kept', label: 'Kept' },
              { value: 'missed', label: 'Missed' },
              { value: 'qaza', label: 'Qaza' },
            ]} />
          </Field>
        </div>
        <Field label="Note" hint="Optional">
          <TextInput value={note} onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Monday fast" maxLength={80} />
        </Field>
      </Modal>

      <ConfirmDialog open={confirmId !== null} title="Delete entry?"
        message="This fast entry will be permanently removed."
        onConfirm={remove} onCancel={() => setConfirmId(null)} />
    </Page>
  );
}
