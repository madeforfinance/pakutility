import React, { useState } from 'react';
import { Page, Card, Btn, IconBtn, Field, TextInput, NumberInput, Select,
         Modal, ConfirmDialog, EmptyState, Badge } from '../../../components/ui';
import { DynIcon } from '../../../components/DynIcon';
import { Plus, Pencil, Trash2, Star } from 'lucide-react';
import { db, uid } from '../../../storage/db';
import { useLive } from '../../../hooks/useLive';
import { toast } from '../../../lib/toast';
import { useSettings } from '../../../app/settings';
import { parseAmount, fmtNum } from '../../../lib/format';
import { Vehicle, VEHICLE_TYPES } from '../lib/vehicle';

interface FormState { name: string; plate: string; type: string; mileage: string; }
const emptyForm: FormState = { name: '', plate: '', type: 'Car', mileage: '' };

export default function VehiclesPage() {
  const { prefs: livePrefs, update } = useSettings();
  const { data: vehicles } = useLive(() => db.all<Vehicle>('vehicles'), []);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formErr, setFormErr] = useState('');
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const openNew = () => { setEditing(null); setForm(emptyForm); setFormErr(''); setFormOpen(true); };
  const openEdit = (v: Vehicle) => {
    setEditing(v);
    setForm({ name: v.name, plate: v.plate, type: v.type, mileage: v.mileage ? String(v.mileage) : '' });
    setFormErr(''); setFormOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) { setFormErr('Please enter a vehicle name.'); return; }
    const mileage = form.mileage === '' ? 0 : parseAmount(form.mileage);
    if (mileage === null || mileage < 0) { setFormErr('Please enter a valid mileage.'); return; }
    const rec: Vehicle = {
      id: editing?.id || uid('veh_'),
      name: form.name.trim(), plate: form.plate.trim().toUpperCase(),
      type: form.type, mileage: mileage || 0,
    };
    try {
      if (editing) await db.put('vehicles', rec);
      else await db.add('vehicles', rec);
      // First vehicle (or edited default) becomes default automatically when none set.
      if (!livePrefs.defaultVehicleId && !editing) {
        await update({ defaultVehicleId: rec.id, mileage: rec.mileage || livePrefs.mileage });
      }
      toast.success(editing ? 'Vehicle updated' : 'Vehicle added');
      setFormOpen(false);
    } catch {
      toast.error('Could not save. Please try again.');
    }
  };

  const setDefault = async (v: Vehicle) => {
    try {
      await update({
        defaultVehicleId: v.id,
        mileage: v.mileage > 0 ? v.mileage : livePrefs.mileage,
      });
      toast.success(`${v.name} is now the default vehicle`);
    } catch {
      toast.error('Could not update default. Please try again.');
    }
  };

  const remove = async () => {
    if (!confirmId) return;
    try {
      await db.remove('vehicles', confirmId);
      if (livePrefs.defaultVehicleId === confirmId) await update({ defaultVehicleId: '' });
      toast.success('Vehicle deleted');
    } catch {
      toast.error('Could not delete. Please try again.');
    }
    setConfirmId(null);
  };

  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));
  const list = vehicles || [];

  return (
    <Page
      title="My Vehicles"
      subtitle="Your cars and bikes — the default feeds the fuel calculators"
      actions={<Btn variant="primary" icon={<Plus size={16} />} onClick={openNew}>Add vehicle</Btn>}
    >
      <Card title={`Vehicles (${list.length})`}>
        {list.length === 0 ? (
          <EmptyState icon={<DynIcon name="Car" />} title="No vehicles yet"
            text="Add your car or bike with its number plate and mileage. The default vehicle pre-fills fuel calculators."
            action={<Btn variant="primary" icon={<Plus size={16} />} onClick={openNew}>Add vehicle</Btn>} />
        ) : (
          <div>
            {list.map((v) => {
              const isDefault = livePrefs.defaultVehicleId === v.id;
              return (
                <div className="list-row" key={v.id}>
                  <div className="lr-ic"><DynIcon name="Car" /></div>
                  <div className="lr-main">
                    <div className="lr-title">
                      {v.name} {isDefault && <Badge tone="gold"><Star size={11} style={{ verticalAlign: -1 }} /> Default</Badge>}
                    </div>
                    <div className="lr-sub">
                      {[v.type, v.plate || null, v.mileage > 0 ? `${fmtNum(v.mileage, 1)} km/l` : null].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                  <div className="row-actions">
                    {!isDefault && (
                      <Btn size="sm" onClick={() => setDefault(v)}>Set default</Btn>
                    )}
                    <IconBtn label="Edit vehicle" onClick={() => openEdit(v)}><Pencil size={15} /></IconBtn>
                    <IconBtn label="Delete vehicle" onClick={() => setConfirmId(v.id)}><Trash2 size={15} /></IconBtn>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? 'Edit vehicle' : 'Add vehicle'}
        actions={<><Btn onClick={() => setFormOpen(false)}>Cancel</Btn><Btn variant="primary" onClick={save}>Save</Btn></>}>
        <Field label="Name" error={formErr || undefined} required>
          <TextInput value={form.name} onChange={(e) => set({ name: e.target.value })}
            placeholder="e.g. Honda City" maxLength={60} />
        </Field>
        <div className="form-row">
          <Field label="Number plate" hint="Optional">
            <TextInput value={form.plate} onChange={(e) => set({ plate: e.target.value })}
              placeholder="e.g. LHR-1234" maxLength={20} />
          </Field>
          <Field label="Type">
            <Select value={form.type} onChange={(e) => set({ type: e.target.value })}>
              {VEHICLE_TYPES.map((t) => <option key={t}>{t}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="Mileage (km per litre)" hint="Used as the default in fuel calculators">
          <NumberInput value={form.mileage} onChange={(e) => set({ mileage: e.target.value })}
            placeholder="e.g. 12" inputMode="decimal" />
        </Field>
      </Modal>

      <ConfirmDialog open={confirmId !== null} title="Delete vehicle?"
        message="Maintenance records and expenses stay in history, but this vehicle will be removed."
        onConfirm={remove} onCancel={() => setConfirmId(null)} />
    </Page>
  );
}
