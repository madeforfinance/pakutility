/* Calendar — month grid aggregating events, tasks, exams, assignments, holidays. */
import React, { useMemo, useState } from 'react';
import { Page, Card, Btn, IconBtn, Field, TextInput, Textarea, Select, Modal, Badge } from '../../../components/ui';
import { DynIcon } from '../../../components/DynIcon';
import { useLive } from '../../../hooks/useLive';
import { db, uid } from '../../../storage/db';
import { toast } from '../../../lib/toast';
import { prefs } from '../../../lib/prefs';
import { fmtDate, fmtTime, todayISO } from '../../../lib/format';
import holidaysData from '../../../data/holidays.json';

interface CalItem { label: string; sub?: string; kind: string; tone: 'blue' | 'green' | 'amber' | 'red' | 'gray' | 'gold'; }

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function pad(n: number) { return String(n).padStart(2, '0'); }

const KIND_OPTS = [
  { value: 'event', label: 'Event' },
  { value: 'birthday', label: 'Birthday' },
  { value: 'anniversary', label: 'Anniversary' },
  { value: 'bill', label: 'Bill due' },
  { value: 'exam', label: 'Exam' },
  { value: 'holiday', label: 'Holiday' },
];

export default function CalendarPage() {
  const now = new Date();
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [selected, setSelected] = useState<string | null>(null);
  const [dayOpen, setDayOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ title: '', date: todayISO(), time: '', kind: 'event', note: '' });

  const { data: events } = useLive(() => db.all<any>('events'), []);
  const { data: tasks } = useLive(() => db.all<any>('tasks'), []);
  const { data: exams } = useLive(() => db.all<any>('exams'), []);
  const { data: assignments } = useLive(() => db.all<any>('assignments'), []);

  const itemsByDate = useMemo(() => {
    const map: Record<string, CalItem[]> = {};
    const push = (date: string | undefined, item: CalItem) => {
      if (!date) return;
      const key = date.slice(0, 10);
      (map[key] = map[key] || []).push(item);
    };
    (events || []).forEach((e: any) => push(e.date, {
      label: e.title, sub: [e.time ? fmtTime(e.time) : '', e.note].filter(Boolean).join(' • '),
      kind: e.kind || 'event', tone: 'blue',
    }));
    (tasks || []).forEach((t: any) => { if (!t.done) push(t.dueDate, { label: t.title, kind: 'task', tone: 'amber' }); });
    (exams || []).forEach((x: any) => push(x.date, {
      label: x.title, sub: [x.time ? fmtTime(x.time) : '', x.venue].filter(Boolean).join(' • '),
      kind: 'exam', tone: 'red',
    }));
    (assignments || []).forEach((a: any) => { if (!a.done) push(a.dueDate, { label: a.title, kind: 'assignment', tone: 'gold' }); });
    // Pakistan fixed public holidays for the viewed year
    const fixed: { day: number; month: number; name: string }[] = (holidaysData as any).fixed || [];
    fixed.forEach((h) => push(`${ym.y}-${pad(h.month)}-${pad(h.day)}`, { label: h.name, kind: 'holiday', tone: 'green' }));
    return map;
  }, [events, tasks, exams, assignments, ym.y]);

  const fdow = prefs.firstDayOfWeek;
  const orderedDow = useMemo(() => Array.from({ length: 7 }, (_, i) => DOW[(fdow + i) % 7]), [fdow]);

  const cells = useMemo(() => {
    const first = new Date(ym.y, ym.m, 1).getDay();
    const offset = (first - fdow + 7) % 7;
    const daysInMonth = new Date(ym.y, ym.m + 1, 0).getDate();
    const daysPrev = new Date(ym.y, ym.m, 0).getDate();
    const out: { iso: string; day: number; other: boolean }[] = [];
    for (let i = offset - 1; i >= 0; i--) {
      const d = daysPrev - i;
      const pm = ym.m === 0 ? 11 : ym.m - 1;
      const py = ym.m === 0 ? ym.y - 1 : ym.y;
      out.push({ iso: `${py}-${pad(pm + 1)}-${pad(d)}`, day: d, other: true });
    }
    for (let d = 1; d <= daysInMonth; d++) out.push({ iso: `${ym.y}-${pad(ym.m + 1)}-${pad(d)}`, day: d, other: false });
    while (out.length % 7 !== 0) {
      const last = out[out.length - 1];
      const dt = new Date(last.iso + 'T00:00:00');
      dt.setDate(dt.getDate() + 1);
      out.push({ iso: `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`, day: dt.getDate(), other: true });
    }
    return out;
  }, [ym, fdow]);

  const today = todayISO();
  const dayItems = selected ? itemsByDate[selected] || [] : [];

  const shift = (dir: number) => setYm((p) => {
    const dt = new Date(p.y, p.m + dir, 1);
    return { y: dt.getFullYear(), m: dt.getMonth() };
  });

  const openAdd = (date: string) => { setForm({ title: '', date, time: '', kind: 'event', note: '' }); setAddOpen(true); };

  const saveEvent = async () => {
    if (!form.title.trim()) { toast.error('Please enter an event title.'); return; }
    try {
      await db.add('events', { id: uid(), title: form.title.trim(), date: form.date, time: form.time || undefined,
        kind: form.kind, note: form.note });
      toast.success('Event added.');
      setAddOpen(false);
    } catch { toast.error('Could not save the event.'); }
  };

  return (
    <Page
      title="Calendar"
      subtitle="Events, tasks, exams and assignments in one view."
      actions={<Btn variant="primary" icon={<DynIcon name="Plus" size={16} />} onClick={() => openAdd(selected || today)}>Add event</Btn>}
    >
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <IconBtn label="Previous month" onClick={() => shift(-1)}><DynIcon name="ChevronRight" size={18} /></IconBtn>
          <h3 style={{ margin: 0 }}>{MONTHS[ym.m]} {ym.y}</h3>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <Btn size="sm" variant="ghost" onClick={() => { const n = new Date(); setYm({ y: n.getFullYear(), m: n.getMonth() }); }}>Today</Btn>
            <IconBtn label="Next month" onClick={() => shift(1)}>
              <span style={{ display: 'inline-block', transform: 'rotate(180deg)' }}><DynIcon name="ChevronRight" size={18} /></span>
            </IconBtn>
          </div>
        </div>

        <div className="cal-grid">
          {orderedDow.map((d) => <div key={d} className="cal-dow">{d}</div>)}
          {cells.map((c) => {
            const items = itemsByDate[c.iso] || [];
            return (
              <button
                key={c.iso}
                className={`cal-day${c.other ? ' other' : ''}${c.iso === today ? ' today' : ''}${c.iso === selected ? ' selected' : ''}`}
                onClick={() => { setSelected(c.iso); setDayOpen(true); }}
                aria-label={`${fmtDate(c.iso)}${items.length ? `, ${items.length} items` : ''}`}
              >
                <span>{c.day}</span>
                {items.length > 0 && <span className="dot" aria-hidden />}
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 14 }} className="muted small">
          <span><Badge tone="blue">Event</Badge></span>
          <span><Badge tone="amber">Task</Badge></span>
          <span><Badge tone="red">Exam</Badge></span>
          <span><Badge tone="gold">Assignment</Badge></span>
          <span><Badge tone="green">Holiday</Badge></span>
        </div>
      </Card>

      {/* Day detail */}
      <Modal open={dayOpen} onClose={() => setDayOpen(false)} title={selected ? fmtDate(selected) : ''}
        actions={<><Btn variant="ghost" onClick={() => setDayOpen(false)}>Close</Btn>
          <Btn variant="primary" onClick={() => { setDayOpen(false); if (selected) openAdd(selected); }}>Add event</Btn></>}>
        {dayItems.length === 0 ? (
          <p className="muted">Nothing scheduled for this day.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {dayItems.map((it, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 12px',
                border: '1px solid var(--border)', borderRadius: 10 }}>
                <Badge tone={it.tone}>{it.kind}</Badge>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600 }}>{it.label}</div>
                  {it.sub && <div className="muted small">{it.sub}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* Add event */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add event"
        actions={<><Btn variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Btn>
          <Btn variant="primary" onClick={saveEvent}>Save event</Btn></>}>
        <Field label="Title" required>
          <TextInput value={form.title} placeholder="e.g. Ammi's birthday" onChange={(e) => setForm({ ...form, title: e.target.value })} autoFocus />
        </Field>
        <div className="form-grid">
          <Field label="Date" required>
            <TextInput type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </Field>
          <Field label="Time (optional)">
            <TextInput type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
          </Field>
        </div>
        <Field label="Type">
          <Select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
            {KIND_OPTS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
          </Select>
        </Field>
        <Field label="Note">
          <Textarea rows={2} value={form.note} placeholder="Optional note" onChange={(e) => setForm({ ...form, note: e.target.value })} />
        </Field>
      </Modal>
    </Page>
  );
}
