/* Shared builder form for invoices and quotations. */
import React, { useMemo, useState } from 'react';
import {
  Btn, Field, TextInput, NumberInput, Select, Textarea, IconBtn,
} from '../../../components/ui';
import { DynIcon } from '../../../components/DynIcon';
import { toast } from '../../../lib/toast';
import { parseAmount, toNum, fmtMoney, todayISO, addDaysISO } from '../../../lib/format';
import { docSubtotal, docTax, docGrandTotal, lineTotal } from '../lib/docs';
import type { Customer, DocItem, Invoice, Quotation } from '../lib/types';

type Kind = 'invoice' | 'quotation';
export type DocValue = Invoice | Quotation;

interface Props {
  kind: Kind;
  initial: DocValue | null;
  customers: Customer[];
  defaultNumber: string;
  onSave: (doc: DocValue) => Promise<void>;
  onCancel: () => void;
}

const emptyItem = (): DocItem => ({ desc: '', qty: 1, rate: 0, discount: 0 });

export function DocForm({ kind, initial, customers, defaultNumber, onSave, onCancel }: Props) {
  const isInv = kind === 'invoice';
  const [number, setNumber] = useState(initial?.number || defaultNumber);
  const [customerId, setCustomerId] = useState(initial?.customerId || '');
  const [customerName, setCustomerName] = useState(initial?.customerName || '');
  const [date, setDate] = useState(initial?.date || todayISO());
  const [secondDate, setSecondDate] = useState(
    initial ? (isInv ? (initial as Invoice).dueDate : (initial as Quotation).validUntil) : addDaysISO(todayISO(), isInv ? 14 : 30),
  );
  const [items, setItems] = useState<DocItem[]>(
    initial && initial.items.length ? initial.items.map((i) => ({ ...i })) : [emptyItem()],
  );
  const [taxRate, setTaxRate] = useState(String(initial?.taxRate ?? 0));
  const [notes, setNotes] = useState(initial?.notes || '');
  const [status, setStatus] = useState<string>(initial?.status || 'draft');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const sub = useMemo(() => docSubtotal(items), [items]);
  const tax = useMemo(() => docTax(sub, toNum(taxRate)), [sub, taxRate]);
  const grand = sub + tax;

  const setItem = (idx: number, patch: Partial<DocItem>) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };

  const pickCustomer = (id: string) => {
    setCustomerId(id);
    const c = customers.find((x) => x.id === id);
    setCustomerName(c ? c.name : '');
  };

  const validate = (): boolean => {
    const errs: string[] = [];
    if (!number.trim()) errs.push('Document number is required.');
    if (!customerName.trim()) errs.push('Customer name is required.');
    if (!date) errs.push('Date is required.');
    const validItems = items.filter((it) => it.desc.trim() || toNum(it.qty) > 0 || toNum(it.rate) > 0);
    if (!validItems.length) errs.push('Add at least one item with a description.');
    validItems.forEach((it, i) => {
      if (toNum(it.qty) <= 0) errs.push(`Item ${i + 1}: quantity must be greater than 0.`);
      if (toNum(it.rate) < 0) errs.push(`Item ${i + 1}: rate cannot be negative.`);
      if (toNum(it.discount) < 0 || toNum(it.discount) > 100) errs.push(`Item ${i + 1}: discount must be 0–100%.`);
    });
    if (parseAmount(taxRate) === null || toNum(taxRate) < 0 || toNum(taxRate) > 100)
      errs.push('Tax rate must be a number between 0 and 100.');
    setErrors(errs);
    return errs.length === 0;
  };

  const save = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const cleanItems = items
        .filter((it) => it.desc.trim() || toNum(it.qty) > 0 || toNum(it.rate) > 0)
        .map((it) => ({ desc: it.desc.trim(), qty: toNum(it.qty), rate: toNum(it.rate), discount: toNum(it.discount) }));
      const base = {
        number: number.trim(),
        customerId,
        customerName: customerName.trim(),
        date,
        items: cleanItems,
        taxRate: toNum(taxRate),
        notes: notes.trim(),
      };
      const doc: DocValue = isInv
        ? { ...(initial as Invoice | null), id: initial?.id || '', ...base, dueDate: secondDate, status: status as Invoice['status'] }
        : { ...(initial as Quotation | null), id: initial?.id || '', ...base, validUntil: secondDate, status: status as Quotation['status'] };
      await onSave(doc);
    } catch (e) {
      toast.error('Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const statusOptions = isInv ? ['draft', 'sent', 'paid'] : ['draft', 'sent', 'accepted'];

  return (
    <div>
      {errors.length > 0 && (
        <div className="biz-errors" role="alert">
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {errors.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        </div>
      )}
      <div className="biz-form-2">
        <Field label={isInv ? 'Invoice number' : 'Quotation number'} required>
          <TextInput value={number} onChange={(e) => setNumber(e.target.value)} />
        </Field>
        <Field label="Date" required>
          <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Customer">
          <Select value={customerId} onChange={(e) => pickCustomer(e.target.value)}>
            <option value="">Walk-in / manual name</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Field>
        <Field label={isInv ? 'Due date' : 'Valid until'}>
          <TextInput type="date" value={secondDate} onChange={(e) => setSecondDate(e.target.value)} />
        </Field>
      </div>
      <Field label="Customer name" required hint="Auto-filled when you pick a saved customer.">
        <TextInput value={customerName} onChange={(e) => { setCustomerName(e.target.value); setCustomerId(''); }} placeholder="e.g. Ahmed Traders" />
      </Field>

      <Field label="Items" required>
        <div className="biz-items">
          <div className="biz-items-head">
            <span>Description</span><span>Qty</span><span>Rate</span><span>Disc %</span><span>Amount</span><span />
          </div>
          {items.map((it, i) => (
            <div className="biz-items-row" key={i}>
              <TextInput value={it.desc} onChange={(e) => setItem(i, { desc: e.target.value })} placeholder="Item / service" aria-label={`Item ${i + 1} description`} />
              <NumberInput value={it.qty} min={0} onChange={(e) => setItem(i, { qty: toNum(e.target.value) })} aria-label={`Item ${i + 1} quantity`} />
              <NumberInput value={it.rate} min={0} onChange={(e) => setItem(i, { rate: toNum(e.target.value) })} aria-label={`Item ${i + 1} rate`} />
              <NumberInput value={it.discount} min={0} max={100} onChange={(e) => setItem(i, { discount: toNum(e.target.value) })} aria-label={`Item ${i + 1} discount percent`} />
              <span className="biz-line-total">{fmtMoney(lineTotal(it))}</span>
              <IconBtn label={`Remove item ${i + 1}`} onClick={() => setItems((p) => (p.length > 1 ? p.filter((_, j) => j !== i) : [emptyItem()]))}>
                <DynIcon name="Trash2" size={16} />
              </IconBtn>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 8 }}>
          <Btn variant="secondary" size="sm" icon={<DynIcon name="Plus" size={15} />} onClick={() => setItems((p) => [...p, emptyItem()])}>
            Add item
          </Btn>
        </div>
      </Field>

      <div className="biz-form-2">
        <Field label="Tax rate (%)">
          <NumberInput value={taxRate} min={0} max={100} onChange={(e) => setTaxRate(e.target.value)} />
        </Field>
        <Field label="Status">
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            {statusOptions.map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
          </Select>
        </Field>
      </div>

      <Field label="Notes">
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Payment terms, bank details…" />
      </Field>

      <div className="biz-totals">
        <div><span>Subtotal</span><span>{fmtMoney(sub)}</span></div>
        <div><span>Tax ({toNum(taxRate) || 0}%)</span><span>{fmtMoney(tax)}</span></div>
        <div className="grand"><span>Grand total</span><span>{fmtMoney(grand)}</span></div>
      </div>

      <div className="modal-foot" style={{ padding: '16px 0 0' }}>
        <Btn variant="ghost" onClick={onCancel}>Cancel</Btn>
        <Btn variant="primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : initial ? 'Save changes' : isInv ? 'Create invoice' : 'Create quotation'}</Btn>
      </div>
    </div>
  );
}
