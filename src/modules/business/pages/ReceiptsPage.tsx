/* Receipts: record payments received, preview/print/PDF, finance posting. */
import React, { useMemo, useState } from 'react';
import { db, uid } from '../../../storage/db';
import { useLive } from '../../../hooks/useLive';
import {
  Page, Card, Btn, IconBtn, Field, TextInput, NumberInput, Select, Textarea,
  Modal, ConfirmDialog, EmptyState, SearchInput,
} from '../../../components/ui';
import { DynIcon } from '../../../components/DynIcon';
import { toast } from '../../../lib/toast';
import { fmtMoney, fmtDate, todayISO, parseAmount, toNum } from '../../../lib/format';
import { addTransaction, PAYMENT_METHODS, type Txn } from '../../../lib/money';
import type { ReceiptDoc } from '../lib/types';
import { nextNumber } from '../lib/docs';
import { DocPreview } from '../components/DocPreview';
import { receiptPdf } from '../lib/docPdf';

const blank = (): ReceiptDoc => ({
  id: '', number: '', customerName: '', amount: 0, method: PAYMENT_METHODS[0], date: todayISO(), description: '',
});

/** Keep the finance entry in sync with the receipt (create or update). */
async function syncReceiptTxn(r: ReceiptDoc) {
  const txns = await db.all<Txn>('transactions');
  const existing = txns.find((t) => t.sourceId === r.id && t.source === 'business:receipt');
  if (existing) {
    await db.put('transactions', {
      ...existing,
      amount: r.amount,
      date: r.date,
      method: r.method,
      note: `Receipt ${r.number} — ${r.customerName}${r.description ? `: ${r.description}` : ''}`,
    });
  } else {
    await addTransaction({
      type: 'income',
      amount: r.amount,
      category: 'Business',
      date: r.date,
      method: r.method,
      note: `Receipt ${r.number} — ${r.customerName}${r.description ? `: ${r.description}` : ''}`,
      source: 'business:receipt',
      sourceId: r.id,
    });
  }
}

export default function ReceiptsPage() {
  const { data } = useLive(async () => ({ receipts: await db.all<ReceiptDoc>('receipts') }), []);
  const receipts = useMemo(
    () => [...(data?.receipts || [])].sort((a, b) => (a.date < b.date ? 1 : -1)),
    [data],
  );

  const [q, setQ] = useState('');
  const [form, setForm] = useState<ReceiptDoc | null>(null);
  const [preview, setPreview] = useState<ReceiptDoc | null>(null);
  const [del, setDel] = useState<ReceiptDoc | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [printing, setPrinting] = useState(false);

  const filtered = receipts.filter((r) => {
    const s = q.trim().toLowerCase();
    return !s || [r.number, r.customerName, r.description].some((v) => (v || '').toLowerCase().includes(s));
  });

  const totalReceived = receipts.reduce((s, r) => s + toNum(r.amount), 0);

  const openNew = () => {
    setErrors([]);
    setForm({ ...blank(), number: nextNumber('RCT', receipts.map((r) => r.number)) });
  };
  const openEdit = (r: ReceiptDoc) => { setErrors([]); setForm({ ...r }); };
  const set = (patch: Partial<ReceiptDoc>) => setForm((f) => (f ? { ...f, ...patch } : f));

  const save = async () => {
    if (!form) return;
    const errs: string[] = [];
    if (!form.number.trim()) errs.push('Receipt number is required.');
    if (!form.customerName.trim()) errs.push('Customer name is required.');
    const amt = parseAmount(String(form.amount));
    if (amt === null || amt <= 0) errs.push('Amount must be greater than 0.');
    if (!form.date) errs.push('Date is required.');
    setErrors(errs);
    if (errs.length) return;
    const rec: ReceiptDoc = {
      ...form,
      id: form.id || uid('rct_'),
      number: form.number.trim(),
      customerName: form.customerName.trim(),
      amount: amt as number,
      description: form.description.trim(),
    };
    if (form.id) {
      await db.put('receipts', rec);
      toast.success(`Receipt ${rec.number} updated`);
    } else {
      await db.add('receipts', rec);
      toast.success(`Receipt ${rec.number} saved — income recorded`);
    }
    await syncReceiptTxn(rec);
    setForm(null);
  };

  const remove = async () => {
    if (!del) return;
    const txns = await db.all<Txn>('transactions');
    for (const t of txns) {
      if (t.sourceId === del.id && t.source === 'business:receipt') await db.remove('transactions', t.id);
    }
    await db.remove('receipts', del.id);
    toast.success(`Receipt ${del.number} deleted`);
    setDel(null);
  };

  const doPdf = async (r: ReceiptDoc) => {
    try {
      await receiptPdf(r);
      toast.success('PDF downloaded');
    } catch (e) {
      toast.error('Could not generate PDF. Please try again.');
    }
  };

  return (
    <Page
      title="Receipts"
      subtitle={receipts.length ? `${receipts.length} receipt${receipts.length === 1 ? '' : 's'} · ${fmtMoney(totalReceived)} received` : 'Payment receipts with PDF export'}
      actions={<Btn variant="primary" icon={<DynIcon name="Plus" size={16} />} onClick={openNew}>New receipt</Btn>}
    >
      <div style={{ marginBottom: 14, maxWidth: 420 }}>
        <SearchInput value={q} onChange={setQ} placeholder="Search number, customer…" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<DynIcon name="FileCheck" size={30} />}
          title={q ? 'No matching receipts' : 'No receipts yet'}
          text={q ? 'Try a different search.' : 'Record payments you receive — each receipt posts income to your finance records automatically.'}
          action={!q ? <Btn variant="primary" onClick={openNew}>New receipt</Btn> : undefined}
        />
      ) : (
        <Card>
          <div className="biz-list">
            {filtered.map((r) => (
              <div className="biz-row" key={r.id}>
                <button className="biz-row-main" onClick={() => setPreview(r)} aria-label={`Preview receipt ${r.number}`}>
                  <strong>{r.number} <span className="muted">· {r.customerName}</span></strong>
                  <small>{fmtDate(r.date)} · {r.method}{r.description ? ` · ${r.description}` : ''}</small>
                </button>
                <div className="biz-row-side">
                  <strong className="num">{fmtMoney(r.amount)}</strong>
                  <IconBtn label={`Preview ${r.number}`} onClick={() => setPreview(r)}><DynIcon name="Eye" size={16} /></IconBtn>
                  <IconBtn label={`Edit ${r.number}`} onClick={() => openEdit(r)}><DynIcon name="Pencil" size={16} /></IconBtn>
                  <IconBtn label={`Delete ${r.number}`} onClick={() => setDel(r)}><DynIcon name="Trash2" size={16} /></IconBtn>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? `Edit receipt ${form.number}` : 'New receipt'}
        actions={<><Btn variant="ghost" onClick={() => setForm(null)}>Cancel</Btn><Btn variant="primary" onClick={save}>{form?.id ? 'Save changes' : 'Save receipt'}</Btn></>}>
        {errors.length > 0 && (
          <div className="biz-errors" role="alert"><ul style={{ margin: 0, paddingLeft: 18 }}>{errors.map((e, i) => <li key={i}>{e}</li>)}</ul></div>
        )}
        <div className="biz-form-2">
          <Field label="Receipt number" required><TextInput value={form?.number || ''} onChange={(e) => set({ number: e.target.value })} /></Field>
          <Field label="Date" required><TextInput type="date" value={form?.date || ''} onChange={(e) => set({ date: e.target.value })} /></Field>
        </div>
        <Field label="Received from (customer)" required><TextInput value={form?.customerName || ''} onChange={(e) => set({ customerName: e.target.value })} placeholder="e.g. Ahmed Traders" /></Field>
        <div className="biz-form-2">
          <Field label="Amount" required><NumberInput value={form?.amount ?? 0} min={0} onChange={(e) => set({ amount: toNum(e.target.value) })} /></Field>
          <Field label="Payment method">
            <Select value={form?.method || PAYMENT_METHODS[0]} onChange={(e) => set({ method: e.target.value })}>
              {PAYMENT_METHODS.map((mm) => <option key={mm} value={mm}>{mm}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="Description"><Textarea value={form?.description || ''} onChange={(e) => set({ description: e.target.value })} rows={2} placeholder="What was this payment for?" /></Field>
      </Modal>

      <Modal open={!!preview} onClose={() => setPreview(null)} wide title={preview ? `Receipt ${preview.number}` : 'Receipt preview'}
        actions={preview ? (
          <div className="no-print" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <Btn variant="secondary" icon={<DynIcon name="Printer" size={15} />} onClick={() => { setPrinting(true); setTimeout(() => { window.print(); setPrinting(false); }, 60); }} disabled={printing}>
              {printing ? 'Printing…' : 'Print'}
            </Btn>
            <Btn variant="primary" icon={<DynIcon name="Download" size={15} />} onClick={() => doPdf(preview)}>PDF</Btn>
          </div>
        ) : undefined}>
        {preview && <DocPreview kind="receipt" doc={preview} />}
      </Modal>

      <ConfirmDialog
        open={!!del}
        title="Delete receipt?"
        message={`Delete receipt "${del?.number}"? Its linked income entry will also be removed.`}
        onConfirm={remove}
        onCancel={() => setDel(null)}
      />
    </Page>
  );
}
