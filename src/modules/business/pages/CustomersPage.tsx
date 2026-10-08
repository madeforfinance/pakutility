/* Customer management: CRUD, search, per-customer sales + invoice totals. */
import React, { useMemo, useState } from 'react';
import { db, uid } from '../../../storage/db';
import { useLive } from '../../../hooks/useLive';
import {
  Page, Card, Btn, IconBtn, Field, TextInput, Textarea, Modal, ConfirmDialog,
  EmptyState, SearchInput, Badge,
} from '../../../components/ui';
import { DynIcon } from '../../../components/DynIcon';
import { toast } from '../../../lib/toast';
import { fmtMoney, fmtDate, nowISO } from '../../../lib/format';
import type { Customer, Sale, Invoice } from '../lib/types';
import { docGrandTotal, saleRevenue } from '../lib/docs';

const blank = (): Customer => ({
  id: '', name: '', phone: '', email: '', address: '', note: '', createdAt: nowISO(),
});

export default function CustomersPage() {
  const { data } = useLive(
    async () => ({
      customers: await db.all<Customer>('customers'),
      sales: await db.all<Sale>('sales'),
      invoices: await db.all<Invoice>('invoices'),
    }),
    [],
  );
  const customers = useMemo(
    () => [...(data?.customers || [])].sort((a, b) => a.name.localeCompare(b.name)),
    [data],
  );
  const sales = data?.sales || [];
  const invoices = data?.invoices || [];

  const [q, setQ] = useState('');
  const [form, setForm] = useState<Customer | null>(null);
  const [detail, setDetail] = useState<Customer | null>(null);
  const [del, setDel] = useState<Customer | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  const filtered = customers.filter((c) => {
    const s = q.trim().toLowerCase();
    if (!s) return true;
    return [c.name, c.phone, c.email, c.address].some((v) => (v || '').toLowerCase().includes(s));
  });

  const totalsFor = (id: string) => {
    const cs = sales.filter((s) => s.customerId === id);
    const iv = invoices.filter((i) => i.customerId === id);
    return {
      saleCount: cs.length,
      saleRevenue: cs.reduce((s, x) => s + saleRevenue(x.qty, x.price), 0),
      invCount: iv.length,
      invTotal: iv.reduce((s, x) => s + docGrandTotal(x.items, x.taxRate), 0),
    };
  };

  const openNew = () => { setErrors([]); setForm(blank()); };
  const openEdit = (c: Customer) => { setErrors([]); setForm({ ...c }); };

  const save = async () => {
    if (!form) return;
    const errs: string[] = [];
    if (!form.name.trim()) errs.push('Customer name is required.');
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errs.push('Email address looks invalid.');
    setErrors(errs);
    if (errs.length) return;
    const rec: Customer = {
      ...form,
      id: form.id || uid('cus_'),
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      address: form.address.trim(),
      note: form.note.trim(),
      createdAt: form.createdAt || nowISO(),
    };
    if (form.id) {
      await db.put('customers', rec);
      toast.success('Customer updated');
    } else {
      await db.add('customers', rec);
      toast.success('Customer added');
    }
    setForm(null);
  };

  const remove = async () => {
    if (!del) return;
    await db.remove('customers', del.id);
    toast.success('Customer deleted. Their sales records were kept.');
    setDel(null);
    setDetail(null);
  };

  const set = (patch: Partial<Customer>) => setForm((f) => (f ? { ...f, ...patch } : f));

  return (
    <Page
      title="Customers"
      subtitle={`${customers.length} customer${customers.length === 1 ? '' : 's'}`}
      actions={<Btn variant="primary" icon={<DynIcon name="Plus" size={16} />} onClick={openNew}>Add customer</Btn>}
    >
      <div style={{ marginBottom: 14, maxWidth: 420 }}>
        <SearchInput value={q} onChange={setQ} placeholder="Search name, phone, email…" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<DynIcon name="Users" size={30} />}
          title={q ? 'No matching customers' : 'No customers yet'}
          text={q ? 'Try a different search.' : 'Add your customers to track their sales, invoices and payments.'}
          action={!q ? <Btn variant="primary" onClick={openNew}>Add customer</Btn> : undefined}
        />
      ) : (
        <Card>
          <div className="biz-list">
            {filtered.map((c) => {
              const t = totalsFor(c.id);
              return (
                <div className="biz-row" key={c.id}>
                  <button className="biz-row-main" onClick={() => setDetail(c)} aria-label={`View ${c.name}`}>
                    <strong>{c.name}</strong>
                    <small>{[c.phone, c.email].filter(Boolean).join(' · ') || 'No contact details'}</small>
                  </button>
                  <div className="biz-row-side">
                    {t.saleRevenue + t.invTotal > 0 && <Badge tone="blue">{fmtMoney(t.saleRevenue + t.invTotal)}</Badge>}
                    <IconBtn label={`Edit ${c.name}`} onClick={() => openEdit(c)}><DynIcon name="Pencil" size={16} /></IconBtn>
                    <IconBtn label={`Delete ${c.name}`} onClick={() => setDel(c)}><DynIcon name="Trash2" size={16} /></IconBtn>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Add / edit */}
      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? 'Edit customer' : 'Add customer'}
        actions={<><Btn variant="ghost" onClick={() => setForm(null)}>Cancel</Btn><Btn variant="primary" onClick={save}>{form?.id ? 'Save changes' : 'Add customer'}</Btn></>}>
        {errors.length > 0 && (
          <div className="biz-errors" role="alert"><ul style={{ margin: 0, paddingLeft: 18 }}>{errors.map((e, i) => <li key={i}>{e}</li>)}</ul></div>
        )}
        <Field label="Name" required><TextInput value={form?.name || ''} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Ahmed Traders" /></Field>
        <div className="biz-form-2">
          <Field label="Phone"><TextInput value={form?.phone || ''} onChange={(e) => set({ phone: e.target.value })} placeholder="03xx xxxxxxx" /></Field>
          <Field label="Email"><TextInput type="email" value={form?.email || ''} onChange={(e) => set({ email: e.target.value })} placeholder="name@example.com" /></Field>
        </div>
        <Field label="Address"><TextInput value={form?.address || ''} onChange={(e) => set({ address: e.target.value })} placeholder="Shop / street / city" /></Field>
        <Field label="Notes"><Textarea value={form?.note || ''} onChange={(e) => set({ note: e.target.value })} rows={2} /></Field>
      </Modal>

      {/* Detail */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.name || 'Customer'}
        actions={<><Btn variant="ghost" onClick={() => setDetail(null)}>Close</Btn>{detail && <Btn variant="secondary" onClick={() => { openEdit(detail); setDetail(null); }}>Edit</Btn>}</>}>
        {detail && (() => {
          const t = totalsFor(detail.id);
          return (
            <div>
              {(detail.phone || detail.email || detail.address) && (
                <div className="biz-kv">
                  {detail.phone && <div><span>Phone</span><span>{detail.phone}</span></div>}
                  {detail.email && <div><span>Email</span><span>{detail.email}</span></div>}
                  {detail.address && <div><span>Address</span><span>{detail.address}</span></div>}
                  <div><span>Customer since</span><span>{fmtDate(detail.createdAt.slice(0, 10))}</span></div>
                </div>
              )}
              {detail.note && <p className="muted" style={{ whiteSpace: 'pre-wrap' }}>{detail.note}</p>}
              <div className="biz-stat-grid" style={{ marginTop: 12 }}>
                <div className="biz-mini-stat"><span>Sales</span><strong>{t.saleCount}</strong><small>{fmtMoney(t.saleRevenue)}</small></div>
                <div className="biz-mini-stat"><span>Invoices</span><strong>{t.invCount}</strong><small>{fmtMoney(t.invTotal)}</small></div>
                <div className="biz-mini-stat"><span>Total business</span><strong className="num">{fmtMoney(t.saleRevenue + t.invTotal)}</strong><small>lifetime</small></div>
              </div>
            </div>
          );
        })()}
      </Modal>

      <ConfirmDialog
        open={!!del}
        title="Delete customer?"
        message={`Delete "${del?.name}"? Their sales and invoice records will be kept for your reports.`}
        onConfirm={remove}
        onCancel={() => setDel(null)}
      />
    </Page>
  );
}
