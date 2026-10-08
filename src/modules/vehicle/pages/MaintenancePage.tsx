import React, { useMemo, useState } from 'react';
import { Page, Card, Btn, IconBtn, Field, TextInput, NumberInput, Select, Textarea,
         Modal, ConfirmDialog, EmptyState, Badge, Stat } from '../../../components/ui';
import { DynIcon } from '../../../components/DynIcon';
import { Plus, Pencil, Trash2, Bell } from 'lucide-react';
import { db, uid } from '../../../storage/db';
import { useLive } from '../../../hooks/useLive';
import { toast } from '../../../lib/toast';
import { Txn } from '../../../lib/money';
import { parseAmount, fmtMoney, fmtDate, fmtInt, todayISO, addDaysISO, daysUntil } from '../../../lib/format';
import { Vehicle, MaintenanceRecord, MAINT_KINDS, currentOdometer } from '../lib/vehicle';

interface FormState {
  vehicleId: string; kind: MaintenanceRecord['kind']; date: string;
  odometer: string; cost: string; note: string; nextDue: string; nextOdometer: string;
}

const emptyForm = (vehicleId: string): FormState => ({
  vehicleId, kind: 'Oil change', date: todayISO(), odometer: '', cost: '', note: '', nextDue: '', nextOdometer: '',
});

export default function MaintenancePage() {
  const { data: records } = useLive(() => db.all<MaintenanceRecord>('maintenance'), []);
  const { data: vehicles } = useLive(() => db.all<Vehicle>('vehicles'), []);
  const { data: txns } = useLive(() => db.all<Txn & { vehicleId?: string; odometer?: number }>('transactions'), []);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<MaintenanceRecord | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm(''));
  const [formErr, setFormErr] = useState('');
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const vMap = useMemo(() => new Map((vehicles || []).map((v) => [v.id, v])), [vehicles]);
  const sorted = useMemo(
    () => (records || []).slice().sort((a, b) => (b.date < a.date ? -1 : 1)),
    [records],
  );

  const upcoming = useMemo(() => {
    const out: { rec: MaintenanceRecord; reason: string }[] = [];
    for (const r of records || []) {
      const cur = currentOdometer(r.vehicleId, records || [], txns || []);
      const dLeft = daysUntil(r.nextDue || null);
      if (dLeft !== null && dLeft >= 0 && dLeft <= 30) {
        out.push({ rec: r, reason: dLeft === 0 ? 'Due today' : `Due in ${dLeft} day${dLeft === 1 ? '' : 's'}` });
        continue;
      }
      if (r.nextOdometer > 0 && cur > 0) {
        const kmLeft = r.nextOdometer - cur;
        if (kmLeft <= 500 && kmLeft >= -200) {
          out.push({ rec: r, reason: kmLeft <= 0 ? 'Odometer reached' : `${fmtInt(kmLeft)} km left` });
        }
      }
    }
    return out;
  }, [records, txns]);

  const openNew = (kind?: MaintenanceRecord['kind']) => {
    setEditing(null);
    const f = emptyForm((vehicles || [])[0]?.id || '');
    if (kind === 'Oil change') {
      f.kind = 'Oil change';
      f.nextDue = addDaysISO(todayISO(), 90);
      f.nextOdometer = '';
    } else if (kind === 'Tyres') {
      f.kind = 'Tyres';
      f.nextDue = addDaysISO(todayISO(), 730);
    } else if (kind) {
      f.kind = kind;
    }
    setForm(f); setFormErr(''); setFormOpen(true);
  };

  const openEdit = (r: MaintenanceRecord) => {
    setEditing(r);
    setForm({
      vehicleId: r.vehicleId, kind: r.kind, date: r.date,
      odometer: r.odometer ? String(r.odometer) : '', cost: r.cost ? String(r.cost) : '',
      note: r.note, nextDue: r.nextDue, nextOdometer: r.nextOdometer ? String(r.nextOdometer) : '',
    });
    setFormErr(''); setFormOpen(true);
  };

  const save = async () => {
    if (!form.date) { setFormErr('Please pick a date.'); return; }
    const odo = form.odometer === '' ? 0 : parseAmount(form.odometer);
    const cost = form.cost === '' ? 0 : parseAmount(form.cost);
    const nextOdo = form.nextOdometer === '' ? 0 : parseAmount(form.nextOdometer);
    if (odo === null || odo < 0) { setFormErr('Please enter a valid odometer reading.'); return; }
    if (cost === null || cost < 0) { setFormErr('Please enter a valid cost.'); return; }
    if (nextOdo === null || nextOdo < 0) { setFormErr('Please enter a valid next-service odometer.'); return; }
    const rec: MaintenanceRecord = {
      id: editing?.id || uid('mnt_'), vehicleId: form.vehicleId, kind: form.kind,
      date: form.date, odometer: odo, cost: cost || 0, note: form.note.trim(),
      nextDue: form.nextDue, nextOdometer: nextOdo,
    };
    try {
      if (editing) await db.put('maintenance', rec);
      else await db.add('maintenance', rec);
      toast.success(editing ? 'Record updated' : 'Maintenance recorded');
      setFormOpen(false);
    } catch {
      toast.error('Could not save. Please try again.');
    }
  };

  const remove = async () => {
    if (!confirmId) return;
    try { await db.remove('maintenance', confirmId); toast.success('Record deleted'); }
    catch { toast.error('Could not delete. Please try again.'); }
    setConfirmId(null);
  };

  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));
  const hasVehicles = (vehicles || []).length > 0;

  return (
    <Page
      title="Maintenance Tracker"
      subtitle="Services, oil changes, tyres and insurance — with reminders"
      actions={<Btn variant="primary" icon={<Plus size={16} />} onClick={() => openNew()}>Add record</Btn>}
    >
      {upcoming.length > 0 && (
        <Card title="Upcoming reminders" subtitle="Due within 30 days or odometer nearly reached" className="b-amber" >
          <div className="chip-row">
            {upcoming.map(({ rec, reason }) => (
              <Badge key={rec.id} tone="amber">
                <Bell size={12} style={{ verticalAlign: -1 }} />{' '}
                {rec.kind} · {vMap.get(rec.vehicleId)?.name || 'Vehicle'} — {reason}
              </Badge>
            ))}
          </div>
        </Card>
      )}

      <Card title="Quick templates" subtitle="Prefill the form with common service intervals">
        <div className="chip-row">
          <Btn size="sm" icon={<DynIcon name="Droplets" />} onClick={() => openNew('Oil change')}>Oil change · 90 days / 5,000 km</Btn>
          <Btn size="sm" icon={<DynIcon name="CircleCheck" />} onClick={() => openNew('Tyres')}>Tyres · 2 years</Btn>
          <Btn size="sm" icon={<DynIcon name="ShieldCheck" />} onClick={() => openNew('Insurance')}>Insurance renewal</Btn>
        </div>
      </Card>

      <div className="grid cols-3" style={{ margin: '16px 0' }}>
        <Stat label="Records" value={fmtInt(sorted.length)} icon={<DynIcon name="Wrench" />} />
        <Stat label="Reminders due" value={fmtInt(upcoming.length)} icon={<DynIcon name="Bell" />} />
        <Stat label="Total spent" value={fmtMoney(sorted.reduce((s, r) => s + r.cost, 0))} icon={<DynIcon name="Wallet" />} />
      </div>

      <Card title="Service history">
        {sorted.length === 0 ? (
          <EmptyState icon={<DynIcon name="Wrench" />} title="No maintenance records"
            text="Record oil changes, tyre replacements and services to get timely reminders."
            action={hasVehicles
              ? <Btn variant="primary" icon={<Plus size={16} />} onClick={() => openNew()}>Add record</Btn>
              : undefined} />
        ) : (
          <div>
            {sorted.map((r) => (
              <div className="list-row" key={r.id}>
                <div className="lr-ic"><DynIcon name="Wrench" /></div>
                <div className="lr-main">
                  <div className="lr-title">{r.kind} · {vMap.get(r.vehicleId)?.name || 'Vehicle'}</div>
                  <div className="lr-sub">
                    {fmtDate(r.date)}
                    {r.odometer > 0 ? ` · ${fmtInt(r.odometer)} km` : ''}
                    {r.nextDue ? ` · next due ${fmtDate(r.nextDue)}` : ''}
                    {r.nextOdometer > 0 ? ` · next @ ${fmtInt(r.nextOdometer)} km` : ''}
                    {r.note ? ` · ${r.note}` : ''}
                  </div>
                </div>
                <div className="lr-right" style={{ fontWeight: 800 }}>{r.cost > 0 ? fmtMoney(r.cost) : '—'}</div>
                <div className="row-actions">
                  <IconBtn label="Edit record" onClick={() => openEdit(r)}><Pencil size={15} /></IconBtn>
                  <IconBtn label="Delete record" onClick={() => setConfirmId(r.id)}><Trash2 size={15} /></IconBtn>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? 'Edit record' : 'Add maintenance record'}
        actions={<><Btn onClick={() => setFormOpen(false)}>Cancel</Btn><Btn variant="primary" onClick={save}>Save</Btn></>}>
        {!hasVehicles && (
          <p className="small" style={{ color: 'var(--gold-deep)' }}>
            Tip: add a vehicle first in <b>My Vehicles</b> so records link to it.
          </p>
        )}
        <div className="form-row">
          <Field label="Vehicle">
            <Select value={form.vehicleId} onChange={(e) => set({ vehicleId: e.target.value })}>
              <option value="">— Select —</option>
              {(vehicles || []).map((v) => <option key={v.id} value={v.id}>{v.name}{v.plate ? ` (${v.plate})` : ''}</option>)}
            </Select>
          </Field>
          <Field label="Kind" required>
            <Select value={form.kind} onChange={(e) => set({ kind: e.target.value as MaintenanceRecord['kind'] })}>
              {MAINT_KINDS.map((k) => <option key={k}>{k}</option>)}
            </Select>
          </Field>
        </div>
        <div className="form-row">
          <Field label="Date" error={formErr || undefined} required>
            <TextInput type="date" value={form.date} onChange={(e) => set({ date: e.target.value })} max={todayISO()} />
          </Field>
          <Field label="Odometer (km)" hint="Optional">
            <NumberInput value={form.odometer} onChange={(e) => set({ odometer: e.target.value })}
              placeholder="e.g. 45200" inputMode="numeric" />
          </Field>
        </div>
        <div className="form-row">
          <Field label="Next due date" hint="Reminder date">
            <TextInput type="date" value={form.nextDue} onChange={(e) => set({ nextDue: e.target.value })} />
          </Field>
          <Field label="Next due odometer (km)" hint="Reminder mileage">
            <NumberInput value={form.nextOdometer} onChange={(e) => set({ nextOdometer: e.target.value })}
              placeholder="e.g. 50200" inputMode="numeric" />
          </Field>
        </div>
        <div className="form-row">
          <Field label="Cost" hint="Optional">
            <NumberInput value={form.cost} onChange={(e) => set({ cost: e.target.value })}
              placeholder="e.g. 6500" inputMode="decimal" />
          </Field>
          <Field label="Note" hint="Optional">
            <TextInput value={form.note} onChange={(e) => set({ note: e.target.value })}
              placeholder="e.g. 10W-30, oil + filter" maxLength={120} />
          </Field>
        </div>
      </Modal>

      <ConfirmDialog open={confirmId !== null} title="Delete record?"
        message="This maintenance record will be permanently removed."
        onConfirm={remove} onCancel={() => setConfirmId(null)} />
    </Page>
  );
}
