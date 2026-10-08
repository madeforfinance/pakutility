import React, { useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Package } from 'lucide-react';
import { db, uid } from '../../../storage/db';
import { useLive } from '../../../hooks/useLive';
import {
  Page, Card, Btn, IconBtn, Field, TextInput, NumberInput, Select, Textarea,
  Modal, ConfirmDialog, EmptyState, SearchInput, Tabs, Badge,
} from '../../../components/ui';
import { toast } from '../../../lib/toast';
import { fmtDate, todayISO, daysUntil, parseAmount, toNum } from '../../../lib/format';
import { InventoryItem, GROCERY_UNITS } from '../lib/types';

type Filter = 'all' | 'low' | 'expiring' | 'expired';

interface Form {
  name: string; qty: string; unit: string; minQty: string;
  purchaseDate: string; expiryDate: string; note: string;
}
const emptyForm = (): Form => ({
  name: '', qty: '', unit: 'pcs', minQty: '', purchaseDate: todayISO(), expiryDate: '', note: '',
});

function statusOf(item: InventoryItem): { key: 'expired' | 'expiring' | 'low' | 'normal'; label: string; tone: 'red' | 'amber' | 'green' } {
  const days = daysUntil(item.expiryDate);
  if (item.expiryDate && days !== null && days < 0) return { key: 'expired', label: 'Expired', tone: 'red' };
  if (item.expiryDate && days !== null && days <= 14) return { key: 'expiring', label: `Expiring in ${days}d`, tone: 'amber' };
  if (toNum(item.minQty) > 0 && toNum(item.qty) <= toNum(item.minQty)) return { key: 'low', label: 'Low stock', tone: 'amber' };
  return { key: 'normal', label: 'Normal', tone: 'green' };
}

export default function InventoryPage() {
  const { data: items } = useLive(() => db.all<InventoryItem>('inventory'), []);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<null | { editing?: InventoryItem }>(null);
  const [form, setForm] = useState<Form>(emptyForm());
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<InventoryItem | null>(null);

  const counts = useMemo(() => {
    const list = items || [];
    return {
      low: list.filter((i) => toNum(i.minQty) > 0 && toNum(i.qty) <= toNum(i.minQty)).length,
      expiring: list.filter((i) => { const d = daysUntil(i.expiryDate); return i.expiryDate && d !== null && d >= 0 && d <= 14; }).length,
      expired: list.filter((i) => { const d = daysUntil(i.expiryDate); return i.expiryDate && d !== null && d < 0; }).length,
    };
  }, [items]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (items || [])
      .filter((i) => !q || i.name.toLowerCase().includes(q) || (i.note || '').toLowerCase().includes(q))
      .filter((i) => {
        const s = statusOf(i).key;
        if (filter === 'low') return s === 'low';
        if (filter === 'expiring') return s === 'expiring';
        if (filter === 'expired') return s === 'expired';
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [items, search, filter]);

  function openModal(editing?: InventoryItem) {
    setForm(
      editing
        ? {
            name: editing.name, qty: String(editing.qty), unit: editing.unit || 'pcs',
            minQty: editing.minQty ? String(editing.minQty) : '',
            purchaseDate: editing.purchaseDate || todayISO(),
            expiryDate: editing.expiryDate || '', note: editing.note || '',
          }
        : emptyForm(),
    );
    setError('');
    setModal(editing ? { editing } : {});
  }

  async function submit() {
    const name = form.name.trim();
    if (!name) { setError('Please enter an item name.'); return; }
    const qty = parseAmount(form.qty);
    if (qty === null || qty < 0) { setError('Please enter a valid quantity.'); return; }
    const minQty = form.minQty.trim() === '' ? 0 : parseAmount(form.minQty);
    if (minQty === null || minQty < 0) { setError('Please enter a valid minimum stock.'); return; }
    const payload = {
      name, qty, unit: form.unit, minQty,
      purchaseDate: form.purchaseDate, expiryDate: form.expiryDate, note: form.note.trim(),
    };
    if (modal?.editing) {
      await db.put('inventory', { ...modal.editing, ...payload });
      toast.success('Item updated.');
    } else {
      await db.add('inventory', { id: uid('inv_'), ...payload });
      toast.success('Item added.');
    }
    setModal(null);
  }

  return (
    <Page
      title="Home Inventory"
      subtitle="Track pantry stock, minimum levels and expiry dates."
      actions={<Btn variant="primary" icon={<Plus size={16} />} onClick={() => openModal()}>Add item</Btn>}
    >
      <Card>
        <div className="form-row" style={{ marginBottom: 12 }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <SearchInput value={search} onChange={setSearch} placeholder="Search items…" />
          </div>
        </div>
        <Tabs
          value={filter}
          onChange={(v) => setFilter(v as Filter)}
          tabs={[
            { value: 'all', label: `All (${(items || []).length})` },
            { value: 'low', label: `Low stock (${counts.low})` },
            { value: 'expiring', label: `Expiring (${counts.expiring})` },
            { value: 'expired', label: `Expired (${counts.expired})` },
          ]}
        />
        <div style={{ marginTop: 8 }}>
          {!items || items.length === 0 ? (
            <EmptyState
              icon={<Package size={40} />}
              title="No inventory yet"
              text="Add pantry and household items with quantities and expiry dates to get low-stock and expiry alerts."
              action={<Btn variant="primary" icon={<Plus size={16} />} onClick={() => openModal()}>Add first item</Btn>}
            />
          ) : visible.length === 0 ? (
            <EmptyState icon={<Package size={40} />} title="Nothing here" text="No items match this filter." />
          ) : (
            <div className="list">
              {visible.map((item) => {
                const s = statusOf(item);
                const d = daysUntil(item.expiryDate);
                return (
                  <div className="list-row" key={item.id}>
                    <div className="lr-ic"><Package size={19} /></div>
                    <div className="lr-main">
                      <div className="lr-title">{item.name}</div>
                      <div className="lr-sub">
                        {toNum(item.qty)} {item.unit}
                        {toNum(item.minQty) > 0 && ` · min ${toNum(item.minQty)}`}
                        {item.expiryDate && ` · exp ${fmtDate(item.expiryDate)}`}
                        {item.purchaseDate && ` · bought ${fmtDate(item.purchaseDate)}`}
                      </div>
                      {item.note && <div className="lr-sub">{item.note}</div>}
                      <div style={{ marginTop: 4, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <Badge tone={s.tone}>{s.label}</Badge>
                        {s.key === 'normal' && d !== null && item.expiryDate && d > 14 && (
                          <Badge tone="gray">{d} days left</Badge>
                        )}
                      </div>
                    </div>
                    <div className="lr-right">
                      <div className="row-actions" style={{ justifyContent: 'flex-end' }}>
                        <IconBtn label={`Edit ${item.name}`} onClick={() => openModal(item)}><Pencil size={15} /></IconBtn>
                        <IconBtn label={`Delete ${item.name}`} onClick={() => setDeleteTarget(item)}><Trash2 size={15} /></IconBtn>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      <Modal
        open={modal !== null}
        onClose={() => setModal(null)}
        title={modal?.editing ? 'Edit item' : 'Add item'}
        actions={
          <>
            <Btn variant="ghost" onClick={() => setModal(null)}>Cancel</Btn>
            <Btn variant="primary" onClick={submit}>{modal?.editing ? 'Save' : 'Add'}</Btn>
          </>
        }
      >
        <Field label="Item name" required error={error || undefined}>
          <TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Cooking oil, daal, surf" autoFocus />
        </Field>
        <div className="form-row">
          <Field label="Quantity" required>
            <NumberInput value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} placeholder="0" />
          </Field>
          <Field label="Unit">
            <Select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
              {GROCERY_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
            </Select>
          </Field>
          <Field label="Min. stock" hint="Alert when at/below">
            <NumberInput value={form.minQty} onChange={(e) => setForm({ ...form, minQty: e.target.value })} placeholder="0" />
          </Field>
        </div>
        <div className="form-row">
          <Field label="Purchase date">
            <TextInput type="date" value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} />
          </Field>
          <Field label="Expiry date">
            <TextInput type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} />
          </Field>
        </div>
        <Field label="Note">
          <Textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} rows={2} placeholder="Optional note…" />
        </Field>
      </Modal>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete item?"
        message={`Delete “${deleteTarget?.name}” from inventory?`}
        onConfirm={async () => {
          if (deleteTarget) {
            await db.remove('inventory', deleteTarget.id);
            toast.success('Item deleted.');
          }
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </Page>
  );
}
