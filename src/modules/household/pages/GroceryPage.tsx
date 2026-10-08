import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Pencil, Trash2, ShoppingCart, Receipt, Check } from 'lucide-react';
import { db, uid } from '../../../storage/db';
import { useLive } from '../../../hooks/useLive';
import {
  Page, Card, Btn, IconBtn, Field, TextInput, NumberInput, Select, Switch,
  Modal, ConfirmDialog, EmptyState, SearchInput, Chip, Badge,
} from '../../../components/ui';
import { toast } from '../../../lib/toast';
import { fmtMoney, nowISO, parseAmount, toNum } from '../../../lib/format';
import { addTransaction } from '../../../lib/money';
import { GroceryList, GroceryItem, GROCERY_CATEGORIES, GROCERY_UNITS } from '../lib/types';

const SORTS = [
  { value: 'status', label: 'To buy first' },
  { value: 'name', label: 'Name' },
  { value: 'category', label: 'Category' },
  { value: 'price', label: 'Price (high first)' },
];

interface ItemForm {
  name: string;
  qty: string;
  unit: string;
  price: string;
  category: string;
  done: boolean;
}
const emptyItemForm = (): ItemForm => ({ name: '', qty: '1', unit: 'pcs', price: '', category: 'Grocery', done: false });

export default function GroceryPage() {
  const { data: lists } = useLive(() => db.all<GroceryList>('groceryLists'), []);
  const [params, setParams] = useSearchParams();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [listModal, setListModal] = useState<null | { editing?: GroceryList }>(null);
  const [listName, setListName] = useState('');
  const [itemModal, setItemModal] = useState<null | { editing?: GroceryItem }>(null);
  const [form, setForm] = useState<ItemForm>(emptyItemForm());
  const [formError, setFormError] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('status');
  const [confirm, setConfirm] = useState<null | 'deleteList' | 'clearPurchased' | 'recordExpense'>(null);
  const [deleteTarget, setDeleteTarget] = useState<GroceryItem | null>(null);

  const sorted = useMemo(() => (lists || []).slice().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)), [lists]);

  useEffect(() => {
    if (params.get('new') === '1') {
      setListModal({});
      setParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!activeId && sorted.length > 0) setActiveId(sorted[0].id);
    if (activeId && sorted.length > 0 && !sorted.some((l) => l.id === activeId)) setActiveId(sorted[0].id);
  }, [sorted, activeId]);

  const active = sorted.find((l) => l.id === activeId) || null;

  async function saveActive(list: GroceryList) {
    await db.put('groceryLists', list);
  }

  function openListModal(editing?: GroceryList) {
    setListName(editing ? editing.name : '');
    setListModal(editing ? { editing } : {});
  }

  async function submitList() {
    const name = listName.trim();
    if (!name) {
      toast.error('Please enter a list name.');
      return;
    }
    if (listModal?.editing) {
      await saveActive({ ...listModal.editing, name });
      toast.success('List renamed.');
    } else {
      const id = await db.add('groceryLists', { id: uid('gl_'), name, createdAt: nowISO(), items: [] });
      setActiveId(id);
      toast.success('List created.');
    }
    setListModal(null);
    setListName('');
  }

  function openItemModal(editing?: GroceryItem) {
    setForm(
      editing
        ? { name: editing.name, qty: String(editing.qty), unit: editing.unit, price: editing.price ? String(editing.price) : '', category: editing.category, done: editing.done }
        : emptyItemForm(),
    );
    setFormError('');
    setItemModal(editing ? { editing } : {});
  }

  async function submitItem() {
    if (!active) return;
    const name = form.name.trim();
    if (!name) {
      setFormError('Please enter an item name.');
      return;
    }
    const qty = parseAmount(form.qty);
    if (qty === null || qty <= 0) {
      setFormError('Please enter a valid quantity.');
      return;
    }
    const price = form.price.trim() === '' ? 0 : parseAmount(form.price);
    if (price === null || price < 0) {
      setFormError('Please enter a valid price.');
      return;
    }
    const items = active.items.slice();
    if (itemModal?.editing) {
      const i = items.findIndex((x) => x.id === itemModal.editing!.id);
      if (i >= 0) items[i] = { ...items[i], name, qty, unit: form.unit, price, category: form.category, done: form.done };
      toast.success('Item updated.');
    } else {
      items.push({ id: uid('gi_'), name, qty, unit: form.unit, price, category: form.category, done: false });
      toast.success('Item added.');
    }
    await saveActive({ ...active, items });
    setItemModal(null);
  }

  async function toggleDone(item: GroceryItem) {
    if (!active) return;
    await saveActive({ ...active, items: active.items.map((x) => (x.id === item.id ? { ...x, done: !x.done } : x)) });
  }

  async function doClearPurchased() {
    if (!active) return;
    const remaining = active.items.filter((x) => !x.done);
    await saveActive({ ...active, items: remaining });
    setConfirm(null);
    toast.success('Purchased items cleared.');
  }

  async function doDeleteList() {
    if (!active) return;
    await db.remove('groceryLists', active.id);
    setConfirm(null);
    setListModal(null);
    setActiveId(null);
    toast.success('List deleted.');
  }

  async function doRecordExpense() {
    if (!active) return;
    const purchasedTotal = active.items.filter((i) => i.done).reduce((s, i) => s + toNum(i.price) * toNum(i.qty), 0);
    if (purchasedTotal <= 0) {
      toast.error('No purchased items to record yet.');
      return;
    }
    await addTransaction({
      type: 'expense',
      amount: purchasedTotal,
      category: 'Food',
      note: `Grocery — ${active.name}`,
      method: 'Cash',
      source: 'household:grocery',
      sourceId: active.id,
    });
    setConfirm(null);
    toast.success('Purchase recorded in Money → Expenses.');
  }

  const visibleItems = useMemo(() => {
    if (!active) return [];
    const q = search.trim().toLowerCase();
    let items = active.items.filter(
      (i) => !q || i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q),
    );
    items = items.slice().sort((a, b) => {
      switch (sort) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'category':
          return a.category.localeCompare(b.category) || a.name.localeCompare(b.name);
        case 'price':
          return toNum(b.price) * toNum(b.qty) - toNum(a.price) * toNum(a.qty);
        default:
          return Number(a.done) - Number(b.done) || a.name.localeCompare(b.name);
      }
    });
    return items;
  }, [active, search, sort]);

  const totals = useMemo(() => {
    const items = active?.items || [];
    const estimated = items.reduce((s, i) => s + toNum(i.price) * toNum(i.qty), 0);
    const purchased = items.filter((i) => i.done).reduce((s, i) => s + toNum(i.price) * toNum(i.qty), 0);
    const bought = items.filter((i) => i.done).length;
    return { estimated, purchased, remaining: estimated - purchased, bought, total: items.length };
  }, [active]);

  return (
    <Page
      title="Grocery Lists"
      subtitle="Plan shopping, tick off purchases and record the spend."
      actions={<Btn variant="primary" icon={<Plus size={16} />} onClick={() => openListModal()}>New list</Btn>}
    >
      {sorted.length === 0 ? (
        <Card>
          <EmptyState
            icon={<ShoppingCart size={40} />}
            title="No grocery lists yet"
            text="Create your first list — add items with quantities and prices, then tick them off as you shop."
            action={<Btn variant="primary" icon={<Plus size={16} />} onClick={() => openListModal()}>Create list</Btn>}
          />
        </Card>
      ) : (
        <>
          <div className="chip-row" role="tablist" aria-label="Grocery lists">
            {sorted.map((l) => (
              <Chip key={l.id} active={l.id === activeId} onClick={() => setActiveId(l.id)}>
                {l.name} <span className="muted">· {l.items.filter((i) => i.done).length}/{l.items.length}</span>
              </Chip>
            ))}
          </div>

          {active && (
            <Card
              title={active.name}
              actions={
                <div className="row-actions">
                  <IconBtn label="Add item" onClick={() => openItemModal()}><Plus size={17} /></IconBtn>
                  <IconBtn label="Rename list" onClick={() => openListModal(active)}><Pencil size={16} /></IconBtn>
                  <IconBtn label="Delete list" onClick={() => setConfirm('deleteList')}><Trash2 size={16} /></IconBtn>
                </div>
              }
            >
              <div className="form-row" style={{ marginBottom: 12 }}>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <SearchInput value={search} onChange={setSearch} placeholder="Search items…" />
                </div>
                <div style={{ width: 190 }}>
                  <Select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort items">
                    {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </Select>
                </div>
              </div>

              {active.items.length === 0 ? (
                <EmptyState
                  icon={<ShoppingCart size={40} />}
                  title="List is empty"
                  text="Add the items you need to buy."
                  action={<Btn variant="secondary" icon={<Plus size={16} />} onClick={() => openItemModal()}>Add item</Btn>}
                />
              ) : visibleItems.length === 0 ? (
                <EmptyState icon={<ShoppingCart size={40} />} title="No matches" text="Try a different search." />
              ) : (
                <div className="list">
                  {visibleItems.map((item) => (
                    <div className="list-row" key={item.id}>
                      <button
                        type="button"
                        onClick={() => toggleDone(item)}
                        aria-label={item.done ? `Mark ${item.name} as not purchased` : `Mark ${item.name} as purchased`}
                        aria-pressed={item.done}
                        style={{
                          width: 26, height: 26, borderRadius: 8, flex: '0 0 26px',
                          border: '2px solid var(--border)',
                          borderColor: item.done ? '#12805c' : undefined,
                          background: item.done ? '#12805c' : 'transparent',
                          color: '#fff', display: 'flex', alignItems: 'center',
                          justifyContent: 'center', cursor: 'pointer', padding: 0,
                        }}
                      >
                        {item.done && <Check size={15} strokeWidth={3} />}
                      </button>
                      <div className="lr-main">
                        <div className="lr-title" style={item.done ? { textDecoration: 'line-through', color: 'var(--muted)' } : undefined}>
                          {item.name}
                        </div>
                        <div className="lr-sub">
                          {toNum(item.qty)} {item.unit} · {item.category}
                          {item.done && <Badge tone="green">Purchased</Badge>}
                        </div>
                      </div>
                      <div className="lr-right">
                        <div className="num" style={{ fontWeight: 700 }}>
                          {toNum(item.price) > 0 ? fmtMoney(toNum(item.price) * toNum(item.qty)) : '—'}
                        </div>
                        <div className="row-actions" style={{ justifyContent: 'flex-end', marginTop: 4 }}>
                          <IconBtn label={`Edit ${item.name}`} onClick={() => openItemModal(item)}><Pencil size={15} /></IconBtn>
                          <IconBtn label={`Delete ${item.name}`} onClick={() => setDeleteTarget(item)}><Trash2 size={15} /></IconBtn>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {active.items.length > 0 && (
                <>
                  <div className="divider" />
                  <div className="grid cols-3" style={{ marginBottom: 12 }}>
                    <div><div className="muted small" style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Estimated total</div><div className="num" style={{ fontWeight: 800, fontSize: 17 }}>{fmtMoney(totals.estimated)}</div></div>
                    <div><div className="muted small" style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Purchased</div><div className="num" style={{ fontWeight: 800, fontSize: 17 }}>{fmtMoney(totals.purchased)}</div><div className="muted small">{totals.bought} of {totals.total} items</div></div>
                    <div><div className="muted small" style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Remaining</div><div className="num" style={{ fontWeight: 800, fontSize: 17 }}>{fmtMoney(totals.remaining)}</div></div>
                  </div>
                  <div className="form-row">
                    <Btn variant="gold" icon={<Receipt size={16} />} onClick={() => setConfirm('recordExpense')} disabled={totals.purchased <= 0}>
                      Record purchase as expense
                    </Btn>
                    <Btn variant="ghost" onClick={() => setConfirm('clearPurchased')} disabled={totals.bought === 0}>
                      Clear purchased
                    </Btn>
                  </div>
                </>
              )}
            </Card>
          )}
        </>
      )}

      {/* New / rename list modal */}
      <Modal
        open={listModal !== null}
        onClose={() => { setListModal(null); setListName(''); }}
        title={listModal?.editing ? 'Rename list' : 'New grocery list'}
        actions={
          <>
            <Btn variant="ghost" onClick={() => { setListModal(null); setListName(''); }}>Cancel</Btn>
            <Btn variant="primary" onClick={submitList}>{listModal?.editing ? 'Save' : 'Create'}</Btn>
          </>
        }
      >
        <Field label="List name" required>
          <TextInput value={listName} onChange={(e) => setListName(e.target.value)} placeholder="e.g. Weekly sabzi, Monthly ration" autoFocus />
        </Field>
      </Modal>

      {/* Add / edit item modal */}
      <Modal
        open={itemModal !== null}
        onClose={() => setItemModal(null)}
        title={itemModal?.editing ? 'Edit item' : 'Add item'}
        actions={
          <>
            <Btn variant="ghost" onClick={() => setItemModal(null)}>Cancel</Btn>
            <Btn variant="primary" onClick={submitItem}>{itemModal?.editing ? 'Save' : 'Add'}</Btn>
          </>
        }
      >
        <Field label="Item name" required error={formError || undefined}>
          <TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Atta, doodh, pyaz" autoFocus />
        </Field>
        <div className="form-row">
          <Field label="Quantity" required>
            <NumberInput value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} />
          </Field>
          <Field label="Unit">
            <Select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
              {GROCERY_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
            </Select>
          </Field>
        </div>
        <div className="form-row">
          <Field label="Est. price (per unit)">
            <NumberInput value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="0" />
          </Field>
          <Field label="Category">
            <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {GROCERY_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>
        </div>
        {itemModal?.editing && <Switch label="Marked as purchased" checked={form.done} onChange={(e) => setForm({ ...form, done: e.target.checked })} />}
      </Modal>

      <ConfirmDialog
        open={confirm === 'deleteList'}
        title="Delete list?"
        message={`Delete “${active?.name}” and all its items? This cannot be undone.`}
        onConfirm={doDeleteList}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm === 'clearPurchased'}
        title="Clear purchased items?"
        message="Remove all purchased (ticked) items from this list?"
        confirmLabel="Clear"
        onConfirm={doClearPurchased}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm === 'recordExpense'}
        title="Record as expense?"
        message={`Record ${fmtMoney(totals.purchased)} as a Food expense in Money → Expenses?`}
        confirmLabel="Record"
        onConfirm={doRecordExpense}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete item?"
        message={`Delete “${deleteTarget?.name}” from the list?`}
        onConfirm={async () => {
          if (active && deleteTarget) {
            await saveActive({ ...active, items: active.items.filter((x) => x.id !== deleteTarget.id) });
            toast.success('Item deleted.');
          }
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </Page>
  );
}
