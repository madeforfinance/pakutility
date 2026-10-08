import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Page, Card, Btn, IconBtn, Field, TextInput, NumberInput, Select, Textarea,
         Modal, ConfirmDialog, EmptyState, Badge, Stat } from '../../../components/ui';
import { DynIcon } from '../../../components/DynIcon';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { db } from '../../../storage/db';
import { useLive } from '../../../hooks/useLive';
import { toast } from '../../../lib/toast';
import { addTransaction, Txn, PAYMENT_METHODS } from '../../../lib/money';
import { parseAmount, fmtMoney, fmtDate, fmtInt, todayISO } from '../../../lib/format';
import { Vehicle, EXPENSE_KINDS, VehicleExpenseExtra } from '../lib/vehicle';

type VehicleTxn = Txn & VehicleExpenseExtra;

interface FormState {
  vehicleId: string; kind: string; amount: string; date: string;
  odometer: string; method: string; note: string;
}

const emptyForm = (vehicleId: string): FormState => ({
  vehicleId, kind: 'Fuel', amount: '', date: todayISO(), odometer: '', method: 'Cash', note: '',
});

export default function VehicleExpensesPage() {
  const [params, setParams] = useSearchParams();
  const { data: txns } = useLive(() => db.all<VehicleTxn>('transactions'), []);
  const { data: vehicles } = useLive(() => db.all<Vehicle>('vehicles'), []);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<VehicleTxn | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm(''));
  const [formErr, setFormErr] = useState('');
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [kindFilter, setKindFilter] = useState('All');

  const vMap = useMemo(() => new Map((vehicles || []).map((v) => [v.id, v])), [vehicles]);
  const expenses = useMemo(
    () => (txns || []).filter((t) => t.source === 'vehicle:fuel').sort((a, b) => (b.date < a.date ? -1 : 1)),
    [txns],
  );
  const filtered = kindFilter === 'All' ? expenses : expenses.filter((e) => e.expenseKind === kindFilter);
  const monthTotal = expenses
    .filter((e) => e.date.slice(0, 7) === todayISO().slice(0, 7))
    .reduce((s, e) => s + e.amount, 0);

  const openNew = (prefill?: Partial<FormState>) => {
    setEditing(null);
    setForm({ ...emptyForm((vehicles || [])[0]?.id || ''), ...prefill });
    setFormErr('');
    setFormOpen(true);
  };

  // Deep link: /vehicle/fuel?new=1
  useEffect(() => {
    if (params.get('new') === '1') {
      openNew();
      setParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openEdit = (t: VehicleTxn) => {
    setEditing(t);
    setForm({
      vehicleId: t.vehicleId || '', kind: t.expenseKind || 'Fuel', amount: String(t.amount),
      date: t.date, odometer: t.odometer ? String(t.odometer) : '', method: t.method, note: t.note,
    });
    setFormErr('');
    setFormOpen(true);
  };

  const save = async () => {
    const amount = parseAmount(form.amount);
    if (amount === null || amount <= 0) { setFormErr('Please enter a valid amount.'); return; }
    if (!form.date) { setFormErr('Please pick a date.'); return; }
    const odoRaw = form.odometer === '' ? undefined : parseAmount(form.odometer);
    if (form.odometer !== '' && (odoRaw === null || odoRaw === undefined || odoRaw < 0)) { setFormErr('Please enter a valid odometer reading.'); return; }
    const odo: number | undefined = odoRaw === null ? undefined : odoRaw;

    try {
      if (editing) {
        await db.put('transactions', {
          ...editing, amount, date: form.date, note: form.note.trim(),
          method: form.method, vehicleId: form.vehicleId || undefined,
          expenseKind: form.kind, odometer: odo,
        } as VehicleTxn);
        toast.success('Expense updated');
      } else {
        const id = await addTransaction({
          type: 'expense', amount, category: 'Transport', date: form.date,
          note: form.note.trim() || `${form.kind} expense`,
          method: form.method, source: 'vehicle:fuel',
        });
        // Attach vehicle metadata to the same record (single source of truth).
        const rec = await db.get<VehicleTxn>('transactions', id);
        if (rec) {
          await db.put('transactions', {
            ...rec, vehicleId: form.vehicleId || undefined, expenseKind: form.kind, odometer: odo,
          } as VehicleTxn);
        }
        toast.success('Expense logged in Money → Expenses');
      }
      setFormOpen(false);
    } catch {
      toast.error('Could not save. Please try again.');
    }
  };

  const remove = async () => {
    if (!confirmId) return;
    try {
      await db.remove('transactions', confirmId);
      toast.success('Expense deleted');
    } catch {
      toast.error('Could not delete. Please try again.');
    }
    setConfirmId(null);
  };

  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));

  return (
    <Page
      title="Vehicle Expenses"
      subtitle="Fuel, service, repairs & insurance — also recorded in Money → Expenses"
      actions={<Btn variant="primary" icon={<Plus size={16} />} onClick={() => openNew()}>Log expense</Btn>}
    >
      <div className="grid cols-3" style={{ marginBottom: 16 }}>
        <Stat label="This month" value={fmtMoney(monthTotal)} icon={<DynIcon name="Wallet" />} />
        <Stat label="Total entries" value={fmtInt(expenses.length)} icon={<DynIcon name="Receipt" />} />
        <Stat label="Vehicles" value={fmtInt(vehicles?.length || 0)} icon={<DynIcon name="Car" />} />
      </div>

      <Card title="History" actions={
        <Select value={kindFilter} onChange={(e) => setKindFilter(e.target.value)} aria-label="Filter by kind" style={{ width: 150 }}>
          <option>All</option>{EXPENSE_KINDS.map((k) => <option key={k}>{k}</option>)}
        </Select>
      }>
        {filtered.length === 0 ? (
          <EmptyState icon={<DynIcon name="Fuel" />} title="No vehicle expenses yet"
            text="Log fuel fill-ups, services and repairs. They appear in Money → Expenses automatically."
            action={<Btn variant="primary" icon={<Plus size={16} />} onClick={() => openNew()}>Log expense</Btn>} />
        ) : (
          <div>
            {filtered.map((t) => (
              <div className="list-row" key={t.id}>
                <div className="lr-ic"><DynIcon name={t.expenseKind === 'Fuel' ? 'Fuel' : 'Wrench'} /></div>
                <div className="lr-main">
                  <div className="lr-title">{t.expenseKind || 'Expense'} · {vMap.get(t.vehicleId || '')?.name || 'Vehicle'}</div>
                  <div className="lr-sub">{fmtDate(t.date)}{t.odometer ? ` · ${fmtInt(t.odometer)} km` : ''}{t.note ? ` · ${t.note}` : ''}</div>
                </div>
                <div className="lr-right">
                  <div style={{ fontWeight: 800 }}>{fmtMoney(t.amount)}</div>
                  <Badge tone="gray">{t.method}</Badge>
                </div>
                <div className="row-actions">
                  <IconBtn label="Edit expense" onClick={() => openEdit(t)}><Pencil size={15} /></IconBtn>
                  <IconBtn label="Delete expense" onClick={() => setConfirmId(t.id)}><Trash2 size={15} /></IconBtn>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? 'Edit expense' : 'Log vehicle expense'}
        actions={<><Btn onClick={() => setFormOpen(false)}>Cancel</Btn><Btn variant="primary" onClick={save}>Save</Btn></>}>
        <div className="form-row">
          <Field label="Vehicle">
            <Select value={form.vehicleId} onChange={(e) => set({ vehicleId: e.target.value })}>
              <option value="">— Select —</option>
              {(vehicles || []).map((v) => <option key={v.id} value={v.id}>{v.name}{v.plate ? ` (${v.plate})` : ''}</option>)}
            </Select>
          </Field>
          <Field label="Kind" required>
            <Select value={form.kind} onChange={(e) => set({ kind: e.target.value })}>
              {EXPENSE_KINDS.map((k) => <option key={k}>{k}</option>)}
            </Select>
          </Field>
        </div>
        <div className="form-row">
          <Field label="Amount" error={formErr || undefined} required>
            <NumberInput value={form.amount} onChange={(e) => set({ amount: e.target.value })}
              placeholder="e.g. 8500" inputMode="decimal" />
          </Field>
          <Field label="Date" required>
            <TextInput type="date" value={form.date} onChange={(e) => set({ date: e.target.value })} max={todayISO()} />
          </Field>
        </div>
        <div className="form-row">
          <Field label="Odometer (km)" hint="Optional">
            <NumberInput value={form.odometer} onChange={(e) => set({ odometer: e.target.value })}
              placeholder="e.g. 45200" inputMode="numeric" />
          </Field>
          <Field label="Payment method">
            <Select value={form.method} onChange={(e) => set({ method: e.target.value })}>
              {PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="Note" hint="Optional">
          <Textarea value={form.note} onChange={(e) => set({ note: e.target.value })}
            placeholder="e.g. Full tank, Shell DHA" rows={2} />
        </Field>
        <p className="small muted">Saved with category <b>Transport</b> in Money → Expenses (source: vehicle).</p>
      </Modal>

      <ConfirmDialog open={confirmId !== null} title="Delete expense?"
        message="This will also remove it from Money → Expenses. This cannot be undone."
        onConfirm={remove} onCancel={() => setConfirmId(null)} />
    </Page>
  );
}
