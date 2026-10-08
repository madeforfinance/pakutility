/* Products & inventory: CRUD, low-stock badges, quick stock adjust. */
import React, { useMemo, useState } from 'react';
import { db, uid } from '../../../storage/db';
import { useLive } from '../../../hooks/useLive';
import {
  Page, Card, Btn, IconBtn, Field, TextInput, NumberInput, Modal, ConfirmDialog,
  EmptyState, SearchInput, Badge, Select,
} from '../../../components/ui';
import { DynIcon } from '../../../components/DynIcon';
import { toast } from '../../../lib/toast';
import { fmtMoney, fmtInt, parseAmount, toNum } from '../../../lib/format';
import type { Product } from '../lib/types';
import { LOW_STOCK_AT } from '../lib/types';

const blank = (): Product => ({ id: '', name: '', sku: '', price: 0, cost: 0, qty: 0, category: '' });

export default function ProductsPage() {
  const { data } = useLive(async () => ({ products: await db.all<Product>('products') }), []);
  const products = useMemo(
    () => [...(data?.products || [])].sort((a, b) => a.name.localeCompare(b.name)),
    [data],
  );

  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [form, setForm] = useState<Product | null>(null);
  const [del, setDel] = useState<Product | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  const categories = useMemo(
    () => [...new Set(products.map((p) => p.category).filter(Boolean))].sort(),
    [products],
  );

  const filtered = products.filter((p) => {
    const s = q.trim().toLowerCase();
    const okQ = !s || [p.name, p.sku, p.category].some((v) => (v || '').toLowerCase().includes(s));
    const okC = !cat || p.category === cat;
    return okQ && okC;
  });

  const lowCount = products.filter((p) => p.qty <= LOW_STOCK_AT).length;
  const stockValue = products.reduce((s, p) => s + p.qty * p.cost, 0);

  const openNew = () => { setErrors([]); setForm(blank()); };
  const openEdit = (p: Product) => { setErrors([]); setForm({ ...p }); };
  const set = (patch: Partial<Product>) => setForm((f) => (f ? { ...f, ...patch } : f));

  const save = async () => {
    if (!form) return;
    const errs: string[] = [];
    if (!form.name.trim()) errs.push('Product name is required.');
    if (parseAmount(String(form.price)) === null || form.price < 0) errs.push('Sale price must be 0 or more.');
    if (parseAmount(String(form.cost)) === null || form.cost < 0) errs.push('Cost must be 0 or more.');
    if (!Number.isInteger(toNum(form.qty)) || toNum(form.qty) < 0) errs.push('Quantity must be a whole number, 0 or more.');
    setErrors(errs);
    if (errs.length) return;
    const rec: Product = {
      ...form,
      id: form.id || uid('prd_'),
      name: form.name.trim(),
      sku: form.sku.trim(),
      price: toNum(form.price),
      cost: toNum(form.cost),
      qty: Math.floor(toNum(form.qty)),
      category: form.category.trim(),
    };
    if (form.id) {
      await db.put('products', rec);
      toast.success('Product updated');
    } else {
      await db.add('products', rec);
      toast.success('Product added');
    }
    setForm(null);
  };

  const remove = async () => {
    if (!del) return;
    await db.remove('products', del.id);
    toast.success('Product deleted');
    setDel(null);
  };

  const adjust = async (p: Product, delta: number) => {
    const next = p.qty + delta;
    if (next < 0) {
      toast.error('Stock cannot go below 0.');
      return;
    }
    await db.put('products', { ...p, qty: next });
    toast.success(`${p.name}: stock ${delta > 0 ? '+' : ''}${delta} → ${next}`);
  };

  return (
    <Page
      title="Products & Inventory"
      subtitle={`${products.length} product${products.length === 1 ? '' : 's'} · stock value ${fmtMoney(stockValue)}`}
      actions={<Btn variant="primary" icon={<DynIcon name="Plus" size={16} />} onClick={openNew}>Add product</Btn>}
    >
      <div className="biz-toolbar">
        <div style={{ maxWidth: 340, flex: 1 }}>
          <SearchInput value={q} onChange={setQ} placeholder="Search name, SKU…" />
        </div>
        <Select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Filter by category" style={{ maxWidth: 200 }}>
          <option value="">All categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
        {lowCount > 0 && <Badge tone="amber">{lowCount} low stock</Badge>}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<DynIcon name="Package" size={30} />}
          title={q || cat ? 'No matching products' : 'No products yet'}
          text={q || cat ? 'Try a different search or filter.' : 'Add your products with sale price, cost and stock quantity.'}
          action={!q && !cat ? <Btn variant="primary" onClick={openNew}>Add product</Btn> : undefined}
        />
      ) : (
        <Card>
          <div className="biz-list">
            {filtered.map((p) => {
              const low = p.qty <= LOW_STOCK_AT;
              return (
                <div className="biz-row" key={p.id}>
                  <button className="biz-row-main" onClick={() => openEdit(p)} aria-label={`Edit ${p.name}`}>
                    <strong>{p.name} {p.sku && <span className="muted">· {p.sku}</span>}</strong>
                    <small>
                      Price {fmtMoney(p.price)} · Cost {fmtMoney(p.cost)}
                      {p.category ? ` · ${p.category}` : ''}
                    </small>
                  </button>
                  <div className="biz-row-side">
                    {low ? <Badge tone="amber">Low: {fmtInt(p.qty)}</Badge> : <Badge tone="gray">{fmtInt(p.qty)} in stock</Badge>}
                    <IconBtn label={`Decrease stock of ${p.name}`} onClick={() => adjust(p, -1)}><span aria-hidden="true" style={{ fontSize: 18, fontWeight: 700, lineHeight: 1 }}>−</span></IconBtn>
                    <IconBtn label={`Increase stock of ${p.name}`} onClick={() => adjust(p, 1)}><DynIcon name="Plus" size={16} /></IconBtn>
                    <IconBtn label={`Delete ${p.name}`} onClick={() => setDel(p)}><DynIcon name="Trash2" size={16} /></IconBtn>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? 'Edit product' : 'Add product'}
        actions={<><Btn variant="ghost" onClick={() => setForm(null)}>Cancel</Btn><Btn variant="primary" onClick={save}>{form?.id ? 'Save changes' : 'Add product'}</Btn></>}>
        {errors.length > 0 && (
          <div className="biz-errors" role="alert"><ul style={{ margin: 0, paddingLeft: 18 }}>{errors.map((e, i) => <li key={i}>{e}</li>)}</ul></div>
        )}
        <Field label="Product name" required><TextInput value={form?.name || ''} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Basmati Rice 5kg" /></Field>
        <div className="biz-form-2">
          <Field label="SKU / code"><TextInput value={form?.sku || ''} onChange={(e) => set({ sku: e.target.value })} placeholder="Optional" /></Field>
          <Field label="Category"><TextInput value={form?.category || ''} onChange={(e) => set({ category: e.target.value })} placeholder="e.g. Grocery" /></Field>
          <Field label="Sale price" required hint="Price you sell it for."><NumberInput value={form?.price ?? 0} min={0} onChange={(e) => set({ price: toNum(e.target.value) })} /></Field>
          <Field label="Cost" required hint="What it costs you (for profit)."><NumberInput value={form?.cost ?? 0} min={0} onChange={(e) => set({ cost: toNum(e.target.value) })} /></Field>
        </div>
        <Field label="Stock quantity" required><NumberInput value={form?.qty ?? 0} min={0} step={1} onChange={(e) => set({ qty: Math.floor(toNum(e.target.value)) })} /></Field>
      </Modal>

      <ConfirmDialog
        open={!!del}
        title="Delete product?"
        message={`Delete "${del?.name}"? Past sales records keep its name for your reports.`}
        onConfirm={remove}
        onCancel={() => setDel(null)}
      />
    </Page>
  );
}
