/* Shared quotation / invoice builder for the Professional module.
   Saves to the `quotations` / `invoices` stores (exact shared shapes),
   previews as HTML and exports a professional PDF via createPdf. */
import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Pencil, Copy, Download, Eye } from 'lucide-react';
import { db } from '../../../storage/db';
import { useLive } from '../../../hooks/useLive';
import {
  Page, Card, Btn, IconBtn, Field, TextInput, NumberInput, Select,
  Modal, ConfirmDialog, EmptyState, Badge,
} from '../../../components/ui';
import { toast } from '../../../lib/toast';
import {
  toNum, parseAmount, fmtMoneyFull, fmtDate, todayISO, addDaysISO,
} from '../../../lib/format';
import { prefs } from '../../../lib/prefs';
import { createPdf, pdfText, pdfKV, pdfTable, pdfTotal, PdfDoc } from '../../../lib/pdf';

export interface DocItem {
  desc: string;
  qty: number;
  rate: number;
  discount: number;
}

export interface SavedDoc {
  id: string;
  number: string;
  customerName: string;
  date: string;
  dueDate?: string;
  validUntil?: string;
  items: DocItem[];
  taxRate: number;
  notes: string;
  status?: string;
}

interface ItemForm {
  desc: string;
  qty: string;
  rate: string;
  discount: string;
}

type Kind = 'quotation' | 'invoice';

const CFG: Record<Kind, {
  store: 'quotations' | 'invoices';
  prefix: string;
  title: string;
  subtitle: string;
  extraLabel: string;
  extraKey: 'dueDate' | 'validUntil';
  extraDefaultDays: number;
  statuses: string[];
}> = {
  quotation: {
    store: 'quotations', prefix: 'QUO', title: 'Client Quotation',
    subtitle: 'Create professional quotations for clients — preview and export as PDF.',
    extraLabel: 'Valid until', extraKey: 'validUntil', extraDefaultDays: 30,
    statuses: [],
  },
  invoice: {
    store: 'invoices', prefix: 'INV', title: 'Freelance Invoice',
    subtitle: 'Create professional invoices — preview, export as PDF and track payment status.',
    extraLabel: 'Due date', extraKey: 'dueDate', extraDefaultDays: 14,
    statuses: ['draft', 'sent', 'paid'],
  },
};

export const lineTotal = (qty: number, rate: number, discount: number) =>
  Math.max(0, qty) * Math.max(0, rate) * (1 - Math.min(100, Math.max(0, discount)) / 100);

export function docTotals(items: DocItem[], taxRate: number) {
  const sub = items.reduce((s, it) => s + lineTotal(it.qty, it.rate, it.discount), 0);
  const tax = sub * (Math.max(0, taxRate) / 100);
  return { sub, tax, total: sub + tax };
}

function nextNumber(docs: SavedDoc[], prefix: string): string {
  let max = 0;
  for (const d of docs) {
    const m = new RegExp(`^${prefix}-(\\d+)$`).exec(d.number || '');
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `${prefix}-${String(max + 1).padStart(4, '0')}`;
}

function buildPdf(kind: Kind, d: SavedDoc) {
  const cfg = CFG[kind];
  const { sub, tax, total } = docTotals(d.items, d.taxRate);
  const filename = `${cfg.prefix}-${d.number.replace(/[^A-Za-z0-9-]/g, '')}.pdf`;
  const title = kind === 'invoice' ? 'INVOICE' : 'QUOTATION';
  return createPdf(filename, title, (p: PdfDoc) => {
    pdfKV(p, 'Document no.', d.number);
    pdfKV(p, 'Date', fmtDate(d.date));
    pdfKV(p, cfg.extraLabel, fmtDate(kind === 'invoice' ? d.dueDate : d.validUntil) || '—');
    pdfKV(p, 'Billed to', d.customerName);
    if (kind === 'invoice' && d.status) pdfKV(p, 'Status', d.status.toUpperCase());
    pdfText(p, '', { gap: 4 });
    pdfTable(
      p,
      ['Description', 'Qty', 'Rate', 'Disc %', 'Amount'],
      d.items.map((it) => [
        it.desc,
        String(it.qty),
        fmtMoneyFull(it.rate),
        it.discount ? `${it.discount}%` : '—',
        fmtMoneyFull(lineTotal(it.qty, it.rate, it.discount)),
      ]),
      [0.4, 0.1, 0.18, 0.12, 0.2],
      { alignRight: [1, 2, 3, 4] },
    );
    pdfKV(p, 'Subtotal', fmtMoneyFull(sub));
    pdfKV(p, `Tax (${d.taxRate}%)`, fmtMoneyFull(tax));
    pdfTotal(p, 'TOTAL', fmtMoneyFull(total));
    if (d.notes.trim()) {
      pdfText(p, 'Notes', { bold: true, size: 10 });
      pdfText(p, d.notes.trim());
    }
  });
}

/** HTML preview rendered inside a modal. */
function DocPreview({ kind, d }: { kind: Kind; d: SavedDoc }) {
  const cfg = CFG[kind];
  const { sub, tax, total } = docTotals(d.items, d.taxRate);
  const row: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', padding: '4px 0' };
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ background: '#0B1F3A', color: '#fff', padding: '18px 20px' }}>
        <div style={{ fontSize: 20, fontWeight: 800 }}>{kind === 'invoice' ? 'INVOICE' : 'QUOTATION'}</div>
        <div style={{ color: '#D4AF37', fontSize: 12, marginTop: 4 }}>
          {prefs.businessName || 'PakUtility'} • {d.number}
        </div>
      </div>
      <div style={{ padding: '16px 20px', fontSize: 14 }}>
        <div style={row}><span className="muted">Billed to</span><strong>{d.customerName}</strong></div>
        <div style={row}><span className="muted">Date</span><span>{fmtDate(d.date)}</span></div>
        <div style={row}>
          <span className="muted">{cfg.extraLabel}</span>
          <span>{fmtDate(kind === 'invoice' ? d.dueDate : d.validUntil)}</span>
        </div>
        {kind === 'invoice' && d.status && (
          <div style={row}><span className="muted">Status</span><span>{d.status.toUpperCase()}</span></div>
        )}
        <table style={{ width: '100%', marginTop: 12, borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--bg-soft)', textAlign: 'left' }}>
              <th style={{ padding: 8 }}>Description</th>
              <th style={{ padding: 8, textAlign: 'right' }}>Qty</th>
              <th style={{ padding: 8, textAlign: 'right' }}>Rate</th>
              <th style={{ padding: 8, textAlign: 'right' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {d.items.map((it, i) => (
              <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                <td style={{ padding: 8 }}>{it.desc}{it.discount ? ` (−${it.discount}%)` : ''}</td>
                <td style={{ padding: 8, textAlign: 'right' }}>{it.qty}</td>
                <td style={{ padding: 8, textAlign: 'right' }}>{fmtMoneyFull(it.rate)}</td>
                <td style={{ padding: 8, textAlign: 'right' }}>{fmtMoneyFull(lineTotal(it.qty, it.rate, it.discount))}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ ...row, marginTop: 8 }}><span className="muted">Subtotal</span><span>{fmtMoneyFull(sub)}</span></div>
        <div style={row}><span className="muted">Tax ({d.taxRate}%)</span><span>{fmtMoneyFull(tax)}</span></div>
        <div style={{ ...row, fontWeight: 800, fontSize: 16, borderTop: '2px solid #0B1F3A', marginTop: 6, paddingTop: 10 }}>
          <span>Total</span><span>{fmtMoneyFull(total)}</span>
        </div>
        {d.notes.trim() && <p className="muted small" style={{ marginTop: 12 }}>{d.notes}</p>}
      </div>
    </div>
  );
}

export default function DocBuilder({ kind }: { kind: Kind }) {
  const cfg = CFG[kind];
  const { data: docs } = useLive(() => db.all<SavedDoc>(cfg.store), [cfg.store]);
  const list = useMemo(
    () => [...(docs || [])].sort((a, b) => (a.date < b.date ? 1 : -1)),
    [docs],
  );

  const [customerName, setCustomerName] = useState('');
  const [date, setDate] = useState(todayISO());
  const [extraDate, setExtraDate] = useState(addDaysISO(todayISO(), cfg.extraDefaultDays));
  const [items, setItems] = useState<ItemForm[]>([{ desc: '', qty: '1', rate: '', discount: '' }]);
  const [taxRate, setTaxRate] = useState('0');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('draft');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ customer?: string; items?: string }>({});
  const [previewDoc, setPreviewDoc] = useState<SavedDoc | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [number, setNumber] = useState('');

  // Keep the document number fresh (first load + after saves)
  useEffect(() => {
    if (!editingId && !number && docs) setNumber(nextNumber(docs, cfg.prefix));
  }, [docs, editingId, number, cfg.prefix]);

  const parsedItems: DocItem[] = items.map((it) => ({
    desc: it.desc.trim(),
    qty: toNum(it.qty),
    rate: toNum(it.rate),
    discount: Math.min(100, Math.max(0, toNum(it.discount))),
  }));
  const kept = parsedItems.filter((it) => it.desc || it.qty > 0 || it.rate > 0);
  const totals = docTotals(kept, toNum(taxRate));

  const setItem = (i: number, patch: Partial<ItemForm>) =>
    setItems((prev) => prev.map((it, j) => (j === i ? { ...it, ...patch } : it)));

  const resetForm = (freshDocs?: SavedDoc[]) => {
    setCustomerName('');
    setDate(todayISO());
    setExtraDate(addDaysISO(todayISO(), cfg.extraDefaultDays));
    setItems([{ desc: '', qty: '1', rate: '', discount: '' }]);
    setTaxRate('0');
    setNotes('');
    setStatus('draft');
    setEditingId(null);
    setErrors({});
    setNumber(nextNumber(freshDocs || list, cfg.prefix));
  };

  const validate = (): SavedDoc | null => {
    const errs: { customer?: string; items?: string } = {};
    if (!customerName.trim()) errs.customer = 'Please enter the client name.';
    if (kept.length === 0) errs.items = 'Add at least one item with a description.';
    else {
      const badQty = kept.some((it) => !(it.qty > 0));
      if (badQty) errs.items = 'Each item needs a quantity greater than zero.';
      const noDesc = kept.some((it) => !it.desc);
      if (!errs.items && noDesc) errs.items = 'Each item needs a description.';
    }
    const tax = parseAmount(taxRate);
    if (tax === null || tax < 0 || tax > 100) errs.items = errs.items || 'Tax rate must be between 0 and 100.';
    setErrors(errs);
    if (Object.keys(errs).length > 0) return null;
    const doc: SavedDoc = {
      id: editingId || '',
      number: editingId ? (list.find((d) => d.id === editingId)?.number || number) : number,
      customerName: customerName.trim(),
      date,
      items: kept,
      taxRate: toNum(taxRate),
      notes: notes.trim(),
    };
    doc[cfg.extraKey] = extraDate;
    if (kind === 'invoice') doc.status = status;
    return doc;
  };

  const handleSave = async () => {
    const doc = validate();
    if (!doc) return;
    try {
      if (editingId) {
        await db.put(cfg.store, doc);
        toast.success(`${cfg.title} ${doc.number} updated.`);
      } else {
        await db.add(cfg.store, doc);
        toast.success(`${cfg.title} ${doc.number} saved.`);
      }
      const fresh = await db.all<SavedDoc>(cfg.store);
      resetForm(fresh);
    } catch {
      toast.error('Could not save. Please try again.');
    }
  };

  const handlePdf = async (doc: SavedDoc | null) => {
    const target = doc || validate();
    if (!target) {
      toast.error('Please complete the form before exporting.');
      return;
    }
    try {
      await buildPdf(kind, target);
      toast.success('PDF downloaded.');
    } catch {
      toast.error('PDF export failed. Please try again.');
    }
  };

  const startEdit = (d: SavedDoc) => {
    setEditingId(d.id);
    setNumber(d.number);
    setCustomerName(d.customerName);
    setDate(d.date);
    setExtraDate((kind === 'invoice' ? d.dueDate : d.validUntil) || '');
    setItems(d.items.map((it) => ({
      desc: it.desc, qty: String(it.qty), rate: String(it.rate),
      discount: it.discount ? String(it.discount) : '',
    })));
    setTaxRate(String(d.taxRate));
    setNotes(d.notes);
    setStatus(d.status || 'draft');
    setErrors({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const duplicate = (d: SavedDoc) => {
    startEdit({ ...d, id: '' });
    setEditingId(null);
    setNumber(nextNumber(list, cfg.prefix));
    toast.info('Duplicated — save to create a new document.');
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    await db.remove(cfg.store, deleteId);
    setDeleteId(null);
    toast.success('Deleted.');
  };

  const statusTone = (s?: string) =>
    s === 'paid' ? 'green' : s === 'sent' ? 'blue' : 'gray';

  return (
    <Page
      title={cfg.title}
      subtitle={cfg.subtitle}
      actions={<Btn variant="primary" icon={<Eye size={16} />} onClick={() => {
        const d = validate();
        if (d) setPreviewDoc(d);
      }}>Preview</Btn>}
    >
      <Card title={editingId ? `Edit ${number}` : `New ${cfg.title} — ${number || '…'}`}>
        <div className="grid cols-2">
          <Field label="Client name" required error={errors.customer}>
            <TextInput value={customerName} onChange={(e) => setCustomerName(e.target.value)}
              placeholder="e.g. Ahmed Raza" maxLength={80} />
          </Field>
          <div className="grid cols-2">
            <Field label="Date">
              <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label={cfg.extraLabel}>
              <TextInput type="date" value={extraDate} onChange={(e) => setExtraDate(e.target.value)} />
            </Field>
          </div>
        </div>
        {kind === 'invoice' && (
          <Field label="Status">
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              {cfg.statuses.map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
            </Select>
          </Field>
        )}

        <h4 style={{ margin: '18px 0 8px' }}>Items</h4>
        {errors.items && <p className="error" role="alert" style={{ marginTop: 0 }}>{errors.items}</p>}
        {items.map((it, i) => (
          <div key={i} className="doc-item-row">
            <Field label={i === 0 ? 'Description' : undefined}>
              <TextInput value={it.desc} onChange={(e) => setItem(i, { desc: e.target.value })}
                placeholder="Service / product description" maxLength={120} aria-label={`Item ${i + 1} description`} />
            </Field>
            <Field label={i === 0 ? 'Qty' : undefined}>
              <NumberInput value={it.qty} onChange={(e) => setItem(i, { qty: e.target.value })}
                placeholder="1" aria-label={`Item ${i + 1} quantity`} />
            </Field>
            <Field label={i === 0 ? 'Rate' : undefined}>
              <NumberInput value={it.rate} onChange={(e) => setItem(i, { rate: e.target.value })}
                placeholder="0" aria-label={`Item ${i + 1} rate`} />
            </Field>
            <Field label={i === 0 ? 'Disc %' : undefined}>
              <NumberInput value={it.discount} onChange={(e) => setItem(i, { discount: e.target.value })}
                placeholder="0" aria-label={`Item ${i + 1} discount percent`} />
            </Field>
            <div className="doc-item-del">
              <IconBtn label={`Remove item ${i + 1}`} onClick={() =>
                setItems((prev) => (prev.length > 1 ? prev.filter((_, j) => j !== i) : [{ desc: '', qty: '1', rate: '', discount: '' }]))}>
                <Trash2 size={16} />
              </IconBtn>
            </div>
          </div>
        ))}
        <Btn variant="ghost" size="sm" icon={<Plus size={15} />}
          onClick={() => setItems((prev) => [...prev, { desc: '', qty: '1', rate: '', discount: '' }])}>
          Add item
        </Btn>

        <div className="grid cols-2" style={{ marginTop: 16 }}>
          <Field label="Tax %">
            <NumberInput value={taxRate} onChange={(e) => setTaxRate(e.target.value)} placeholder="0" />
          </Field>
          <Field label="Notes">
            <TextInput value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Payment terms, thank-you note…" maxLength={200} />
          </Field>
        </div>

        <div className="totals-box">
          <div><span className="muted">Subtotal</span><span className="num">{fmtMoneyFull(totals.sub)}</span></div>
          <div><span className="muted">Tax ({toNum(taxRate)}%)</span><span className="num">{fmtMoneyFull(totals.tax)}</span></div>
          <div className="grand"><span>Total</span><span className="num">{fmtMoneyFull(totals.total)}</span></div>
        </div>

        <div className="btn-row" style={{ marginTop: 16 }}>
          <Btn variant="primary" onClick={handleSave}>{editingId ? 'Update' : 'Save'}</Btn>
          <Btn variant="gold" icon={<Download size={16} />} onClick={() => handlePdf(null)}>Save &amp; PDF</Btn>
          {editingId && <Btn variant="ghost" onClick={() => resetForm()}>Cancel edit</Btn>}
        </div>
      </Card>

      <Card title={`Saved ${kind === 'invoice' ? 'invoices' : 'quotations'}`} subtitle={`${list.length} document${list.length === 1 ? '' : 's'}`}>
        {list.length === 0 ? (
          <EmptyState title={`No ${kind === 'invoice' ? 'invoices' : 'quotations'} yet`}
            text={`Create your first ${cfg.title.toLowerCase()} above — it will appear here for re-print and PDF export.`} />
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr><th>Number</th><th>Client</th><th>Date</th><th style={{ textAlign: 'right' }}>Total</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr>
              </thead>
              <tbody>
                {list.map((d) => (
                  <tr key={d.id}>
                    <td><strong>{d.number}</strong></td>
                    <td>{d.customerName}</td>
                    <td>{fmtDate(d.date)}</td>
                    <td style={{ textAlign: 'right' }} className="num">{fmtMoneyFull(docTotals(d.items, d.taxRate).total)}</td>
                    <td>{kind === 'invoice' && d.status ? <Badge tone={statusTone(d.status)}>{d.status}</Badge> : <span className="muted">—</span>}</td>
                    <td>
                      <div className="row-actions">
                        <IconBtn label="Preview" onClick={() => setPreviewDoc(d)}><Eye size={16} /></IconBtn>
                        <IconBtn label="Download PDF" onClick={() => handlePdf(d)}><Download size={16} /></IconBtn>
                        <IconBtn label="Edit" onClick={() => startEdit(d)}><Pencil size={16} /></IconBtn>
                        <IconBtn label="Duplicate" onClick={() => duplicate(d)}><Copy size={16} /></IconBtn>
                        <IconBtn label="Delete" onClick={() => setDeleteId(d.id)}><Trash2 size={16} /></IconBtn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={!!previewDoc} onClose={() => setPreviewDoc(null)}
        title={previewDoc ? `${cfg.title} ${previewDoc.number}` : ''} wide
        actions={previewDoc && <>
          <Btn variant="ghost" onClick={() => setPreviewDoc(null)}>Close</Btn>
          <Btn variant="gold" icon={<Download size={16} />} onClick={() => handlePdf(previewDoc)}>Download PDF</Btn>
        </>}>
        {previewDoc && <DocPreview kind={kind} d={previewDoc} />}
      </Modal>

      <ConfirmDialog open={!!deleteId} title={`Delete ${kind}`}
        message="This document will be permanently deleted. This cannot be undone."
        onConfirm={confirmDelete} onCancel={() => setDeleteId(null)} />
    </Page>
  );
}
