/* Quotations: list, builder, preview/print/PDF, convert to invoice. */
import React, { useMemo, useState } from 'react';
import { db, uid } from '../../../storage/db';
import { useLive } from '../../../hooks/useLive';
import {
  Page, Card, Btn, IconBtn, Modal, ConfirmDialog, EmptyState, SearchInput,
  Badge, Select,
} from '../../../components/ui';
import { DynIcon } from '../../../components/DynIcon';
import { toast } from '../../../lib/toast';
import { fmtMoney, fmtDate, todayISO } from '../../../lib/format';
import type { Customer, Invoice, Quotation } from '../lib/types';
import { docGrandTotal, nextNumber } from '../lib/docs';
import { DocForm, type DocValue } from '../components/DocForm';
import { DocPreview } from '../components/DocPreview';
import { quotationPdf } from '../lib/docPdf';

type Status = Quotation['status'];

export default function QuotationsPage() {
  const { data } = useLive(
    async () => ({
      quotations: await db.all<Quotation>('quotations'),
      customers: await db.all<Customer>('customers'),
      invoices: await db.all<Invoice>('invoices'),
    }),
    [],
  );
  const quotations = useMemo(
    () => [...(data?.quotations || [])].sort((a, b) => (a.date < b.date ? 1 : -1)),
    [data],
  );
  const customers = data?.customers || [];
  const invoices = data?.invoices || [];

  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | Status>('all');
  const [builder, setBuilder] = useState<{ initial: Quotation | null } | null>(null);
  const [preview, setPreview] = useState<Quotation | null>(null);
  const [del, setDel] = useState<Quotation | null>(null);
  const [printing, setPrinting] = useState(false);

  const filtered = quotations.filter((qt) => {
    const s = q.trim().toLowerCase();
    const okQ = !s || [qt.number, qt.customerName].some((v) => (v || '').toLowerCase().includes(s));
    const okS = statusFilter === 'all' || qt.status === statusFilter;
    return okQ && okS;
  });

  const openNew = () => setBuilder({ initial: null });
  const openEdit = (qt: Quotation) => setBuilder({ initial: { ...qt, items: qt.items.map((i) => ({ ...i })) } });

  const saveDoc = async (doc: DocValue) => {
    const qt = doc as Quotation;
    if (builder?.initial?.id) {
      await db.put('quotations', { ...qt, id: builder.initial.id });
      toast.success(`Quotation ${qt.number} updated`);
    } else {
      await db.add('quotations', { ...qt, id: uid('quo_') });
      toast.success(`Quotation ${qt.number} created`);
    }
    setBuilder(null);
  };

  const duplicate = async (qt: Quotation) => {
    const number = nextNumber('QUO', quotations.map((x) => x.number));
    await db.add('quotations', {
      ...qt, id: uid('quo_'), number, date: todayISO(), status: 'draft',
      items: qt.items.map((i) => ({ ...i })),
    });
    toast.success(`Duplicated as ${number}`);
  };

  const convertToInvoice = async (qt: Quotation) => {
    const number = nextNumber('INV', invoices.map((i) => i.number));
    const inv: Invoice = {
      id: uid('inv_'),
      number,
      customerId: qt.customerId,
      customerName: qt.customerName,
      date: todayISO(),
      dueDate: qt.validUntil,
      items: qt.items.map((i) => ({ ...i })),
      taxRate: qt.taxRate,
      notes: qt.notes,
      status: 'draft',
    };
    await db.add('invoices', inv);
    await db.put('quotations', { ...qt, status: 'accepted' });
    toast.success(`Converted to invoice ${number}`);
    setPreview(null);
  };

  const remove = async () => {
    if (!del) return;
    await db.remove('quotations', del.id);
    toast.success(`Quotation ${del.number} deleted`);
    setDel(null);
  };

  const setStatus = async (qt: Quotation, status: Status) => {
    await db.put('quotations', { ...qt, status });
    toast.success(`Quotation ${qt.number} marked ${status}`);
    setPreview((p) => (p && p.id === qt.id ? { ...p, status } : p));
  };

  const doPdf = async (qt: Quotation) => {
    try {
      await quotationPdf(qt);
      toast.success('PDF downloaded');
    } catch (e) {
      toast.error('Could not generate PDF. Please try again.');
    }
  };

  const statusTone = (s: Status): 'green' | 'blue' | 'gray' =>
    s === 'accepted' ? 'green' : s === 'sent' ? 'blue' : 'gray';

  return (
    <Page
      title="Quotations"
      subtitle={quotations.length ? `${quotations.length} quotation${quotations.length === 1 ? '' : 's'}` : 'Professional quotations with PDF export'}
      actions={<Btn variant="primary" icon={<DynIcon name="Plus" size={16} />} onClick={openNew}>New quotation</Btn>}
    >
      <div className="biz-toolbar">
        <div style={{ maxWidth: 340, flex: 1 }}>
          <SearchInput value={q} onChange={setQ} placeholder="Search number or customer…" />
        </div>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'all' | Status)} aria-label="Filter by status" style={{ maxWidth: 180 }}>
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="accepted">Accepted</option>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<DynIcon name="FileText" size={30} />}
          title={q || statusFilter !== 'all' ? 'No matching quotations' : 'No quotations yet'}
          text={q || statusFilter !== 'all' ? 'Try a different search or filter.' : 'Send polished quotations, then convert accepted ones to invoices in one tap.'}
          action={!q && statusFilter === 'all' ? <Btn variant="primary" onClick={openNew}>Create quotation</Btn> : undefined}
        />
      ) : (
        <Card>
          <div className="biz-list">
            {filtered.map((qt) => (
              <div className="biz-row" key={qt.id}>
                <button className="biz-row-main" onClick={() => setPreview(qt)} aria-label={`Preview quotation ${qt.number}`}>
                  <strong>{qt.number} <span className="muted">· {qt.customerName || 'No customer'}</span></strong>
                  <small>{fmtDate(qt.date)} · Valid until {fmtDate(qt.validUntil)} · <Badge tone={statusTone(qt.status)}>{qt.status}</Badge></small>
                </button>
                <div className="biz-row-side">
                  <strong className="num">{fmtMoney(docGrandTotal(qt.items, qt.taxRate))}</strong>
                  <IconBtn label={`Preview ${qt.number}`} onClick={() => setPreview(qt)}><DynIcon name="Eye" size={16} /></IconBtn>
                  <IconBtn label={`Edit ${qt.number}`} onClick={() => openEdit(qt)}><DynIcon name="Pencil" size={16} /></IconBtn>
                  <IconBtn label={`Duplicate ${qt.number}`} onClick={() => duplicate(qt)}><DynIcon name="Copy" size={16} /></IconBtn>
                  <IconBtn label={`Delete ${qt.number}`} onClick={() => setDel(qt)}><DynIcon name="Trash2" size={16} /></IconBtn>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Modal open={!!builder} onClose={() => setBuilder(null)} wide
        title={builder?.initial ? `Edit quotation ${builder.initial.number}` : 'New quotation'}>
        {builder && (
          <DocForm
            kind="quotation"
            initial={builder.initial}
            customers={customers}
            defaultNumber={nextNumber('QUO', quotations.map((x) => x.number))}
            onSave={saveDoc}
            onCancel={() => setBuilder(null)}
          />
        )}
      </Modal>

      <Modal open={!!preview} onClose={() => setPreview(null)} wide title={preview ? `Quotation ${preview.number}` : 'Quotation preview'}
        actions={preview ? (
          <div className="no-print" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <Btn variant="secondary" onClick={() => convertToInvoice(preview)}>Convert to invoice</Btn>
            {preview.status !== 'accepted' && <Btn variant="secondary" onClick={() => setStatus(preview, 'accepted')}>Mark accepted</Btn>}
            <Btn variant="secondary" icon={<DynIcon name="Printer" size={15} />} onClick={() => { setPrinting(true); setTimeout(() => { window.print(); setPrinting(false); }, 60); }} disabled={printing}>
              {printing ? 'Printing…' : 'Print'}
            </Btn>
            <Btn variant="primary" icon={<DynIcon name="Download" size={15} />} onClick={() => doPdf(preview)}>PDF</Btn>
          </div>
        ) : undefined}>
        {preview && <DocPreview kind="quotation" doc={preview} />}
      </Modal>

      <ConfirmDialog
        open={!!del}
        title="Delete quotation?"
        message={`Delete quotation "${del?.number}"? This cannot be undone.`}
        onConfirm={remove}
        onCancel={() => setDel(null)}
      />
    </Page>
  );
}
