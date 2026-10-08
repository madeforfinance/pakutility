/* Invoices: list, builder, preview/print/PDF, status flow, duplicate. */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { db, uid } from '../../../storage/db';
import { useLive } from '../../../hooks/useLive';
import {
  Page, Card, Btn, IconBtn, Modal, ConfirmDialog, EmptyState, SearchInput,
  Badge, Select,
} from '../../../components/ui';
import { DynIcon } from '../../../components/DynIcon';
import { toast } from '../../../lib/toast';
import { fmtMoney, fmtDate, todayISO } from '../../../lib/format';
import { addTransaction, type Txn } from '../../../lib/money';
import type { Customer, Invoice } from '../lib/types';
import { docGrandTotal, nextNumber } from '../lib/docs';
import { DocForm, type DocValue } from '../components/DocForm';
import { DocPreview } from '../components/DocPreview';
import { invoicePdf } from '../lib/docPdf';

type Status = Invoice['status'];

export default function InvoicesPage() {
  const { data } = useLive(
    async () => ({
      invoices: await db.all<Invoice>('invoices'),
      customers: await db.all<Customer>('customers'),
    }),
    [],
  );
  const invoices = useMemo(
    () => [...(data?.invoices || [])].sort((a, b) => (a.date < b.date ? 1 : -1)),
    [data],
  );
  const customers = data?.customers || [];

  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | Status>('all');
  const [builder, setBuilder] = useState<{ initial: Invoice | null } | null>(null);
  const [preview, setPreview] = useState<Invoice | null>(null);
  const [del, setDel] = useState<Invoice | null>(null);
  const [printing, setPrinting] = useState(false);

  const [params, setParams] = useSearchParams();
  const deepLinkDone = useRef(false);
  useEffect(() => {
    if (!deepLinkDone.current && params.get('new') === '1') {
      deepLinkDone.current = true;
      setBuilder({ initial: null });
      params.delete('new');
      setParams(params, { replace: true });
    }
  }, [params, setParams]);

  const filtered = invoices.filter((inv) => {
    const s = q.trim().toLowerCase();
    const okQ = !s || [inv.number, inv.customerName].some((v) => (v || '').toLowerCase().includes(s));
    const okS = statusFilter === 'all' || inv.status === statusFilter;
    return okQ && okS;
  });

  const totalOutstanding = invoices
    .filter((i) => i.status !== 'paid')
    .reduce((s, i) => s + docGrandTotal(i.items, i.taxRate), 0);

  const openNew = () => setBuilder({ initial: null });
  const openEdit = (inv: Invoice) => setBuilder({ initial: { ...inv, items: inv.items.map((i) => ({ ...i })) } });

  const saveDoc = async (doc: DocValue) => {
    const inv = doc as Invoice;
    if (builder?.initial?.id) {
      await db.put('invoices', { ...inv, id: builder.initial.id });
      toast.success(`Invoice ${inv.number} updated`);
    } else {
      const rec: Invoice = { ...inv, id: uid('inv_') };
      await db.add('invoices', rec);
      toast.success(`Invoice ${inv.number} created`);
    }
    setBuilder(null);
  };

  const duplicate = async (inv: Invoice) => {
    const number = nextNumber('INV', invoices.map((i) => i.number));
    const copy: Invoice = {
      ...inv,
      id: uid('inv_'),
      number,
      date: todayISO(),
      status: 'draft',
      items: inv.items.map((i) => ({ ...i })),
    };
    await db.add('invoices', copy);
    toast.success(`Duplicated as ${number}`);
  };

  const remove = async () => {
    if (!del) return;
    const txns = await db.all<Txn>('transactions');
    for (const t of txns) {
      if (t.sourceId === del.id && t.source === 'business:invoice') await db.remove('transactions', t.id);
    }
    await db.remove('invoices', del.id);
    toast.success(`Invoice ${del.number} deleted`);
    setDel(null);
  };

  const setStatus = async (inv: Invoice, status: Status) => {
    const txns = await db.all<Txn>('transactions');
    const existing = txns.find((t) => t.sourceId === inv.id && t.source === 'business:invoice');
    if (status === 'paid' && !existing) {
      await addTransaction({
        type: 'income',
        amount: docGrandTotal(inv.items, inv.taxRate),
        category: 'Business',
        date: todayISO(),
        note: `Invoice ${inv.number} paid — ${inv.customerName}`,
        source: 'business:invoice',
        sourceId: inv.id,
      });
      toast.success(`Invoice ${inv.number} marked paid — income recorded`);
    } else if (status !== 'paid' && existing) {
      await db.remove('transactions', existing.id);
      toast.success(`Invoice ${inv.number} marked ${status} — income entry removed`);
    } else {
      toast.success(`Invoice ${inv.number} marked ${status}`);
    }
    await db.put('invoices', { ...inv, status });
  };

  const doPdf = async (inv: Invoice) => {
    try {
      await invoicePdf(inv);
      toast.success('PDF downloaded');
    } catch (e) {
      toast.error('Could not generate PDF. Please try again.');
    }
  };

  const statusTone = (s: Status): 'green' | 'blue' | 'gray' =>
    s === 'paid' ? 'green' : s === 'sent' ? 'blue' : 'gray';

  return (
    <Page
      title="Invoices"
      subtitle={invoices.length ? `${invoices.length} invoice${invoices.length === 1 ? '' : 's'} · ${fmtMoney(totalOutstanding)} outstanding` : 'Professional invoices with PDF export'}
      actions={<Btn variant="primary" icon={<DynIcon name="Plus" size={16} />} onClick={openNew}>New invoice</Btn>}
    >
      <div className="biz-toolbar">
        <div style={{ maxWidth: 340, flex: 1 }}>
          <SearchInput value={q} onChange={setQ} placeholder="Search number or customer…" />
        </div>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'all' | Status)} aria-label="Filter by status" style={{ maxWidth: 180 }}>
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="paid">Paid</option>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<DynIcon name="Receipt" size={30} />}
          title={q || statusFilter !== 'all' ? 'No matching invoices' : 'No invoices yet'}
          text={q || statusFilter !== 'all' ? 'Try a different search or filter.' : 'Create invoices with items, tax and discounts — then print or download as PDF.'}
          action={!q && statusFilter === 'all' ? <Btn variant="primary" onClick={openNew}>Create invoice</Btn> : undefined}
        />
      ) : (
        <Card>
          <div className="biz-list">
            {filtered.map((inv) => (
              <div className="biz-row" key={inv.id}>
                <button className="biz-row-main" onClick={() => setPreview(inv)} aria-label={`Preview invoice ${inv.number}`}>
                  <strong>{inv.number} <span className="muted">· {inv.customerName || 'No customer'}</span></strong>
                  <small>{fmtDate(inv.date)} · Due {fmtDate(inv.dueDate)} · <Badge tone={statusTone(inv.status)}>{inv.status}</Badge></small>
                </button>
                <div className="biz-row-side">
                  <strong className="num">{fmtMoney(docGrandTotal(inv.items, inv.taxRate))}</strong>
                  <IconBtn label={`Preview ${inv.number}`} onClick={() => setPreview(inv)}><DynIcon name="Eye" size={16} /></IconBtn>
                  <IconBtn label={`Edit ${inv.number}`} onClick={() => openEdit(inv)}><DynIcon name="Pencil" size={16} /></IconBtn>
                  <IconBtn label={`Duplicate ${inv.number}`} onClick={() => duplicate(inv)}><DynIcon name="Copy" size={16} /></IconBtn>
                  <IconBtn label={`Delete ${inv.number}`} onClick={() => setDel(inv)}><DynIcon name="Trash2" size={16} /></IconBtn>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Builder */}
      <Modal open={!!builder} onClose={() => setBuilder(null)} wide
        title={builder?.initial ? `Edit invoice ${builder.initial.number}` : 'New invoice'}>
        {builder && (
          <DocForm
            kind="invoice"
            initial={builder.initial}
            customers={customers}
            defaultNumber={nextNumber('INV', invoices.map((i) => i.number))}
            onSave={saveDoc}
            onCancel={() => setBuilder(null)}
          />
        )}
      </Modal>

      {/* Preview + print/PDF */}
      <Modal open={!!preview} onClose={() => setPreview(null)} wide title={preview ? `Invoice ${preview.number}` : 'Invoice preview'}
        actions={preview ? (
          <div className="no-print" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {preview.status !== 'paid'
              ? <Btn variant="secondary" onClick={() => { setStatus(preview, 'paid'); setPreview({ ...preview, status: 'paid' }); }}>Mark paid</Btn>
              : <Btn variant="secondary" onClick={() => { setStatus(preview, 'sent'); setPreview({ ...preview, status: 'sent' }); }}>Mark unpaid</Btn>}
            <Btn variant="secondary" icon={<DynIcon name="Printer" size={15} />} onClick={() => { setPrinting(true); setTimeout(() => { window.print(); setPrinting(false); }, 60); }} disabled={printing}>
              {printing ? 'Printing…' : 'Print'}
            </Btn>
            <Btn variant="primary" icon={<DynIcon name="Download" size={15} />} onClick={() => doPdf(preview)}>PDF</Btn>
          </div>
        ) : undefined}>
        {preview && <DocPreview kind="invoice" doc={preview} />}
      </Modal>

      <ConfirmDialog
        open={!!del}
        title="Delete invoice?"
        message={`Delete invoice "${del?.number}"? Its linked income entry (if paid) will also be removed.`}
        onConfirm={remove}
        onCancel={() => setDel(null)}
      />
    </Page>
  );
}
