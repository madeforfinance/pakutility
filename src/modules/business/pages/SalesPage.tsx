/* Record Sale: product picker, stock decrement, auto finance entries (revenue + COGS). */
import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { db, uid } from '../../../storage/db';
import { useLive } from '../../../hooks/useLive';
import {
  Page, Card, Btn, IconBtn, Field, TextInput, NumberInput, Select, Textarea,
  Modal, ConfirmDialog, EmptyState, Badge,
} from '../../../components/ui';
import { DynIcon } from '../../../components/DynIcon';
import { toast } from '../../../lib/toast';
import { fmtMoney, fmtInt, fmtDate, todayISO, toNum } from '../../../lib/format';
import { addTransaction, PAYMENT_METHODS, type Txn } from '../../../lib/money';
import type { Product, Customer, Sale } from '../lib/types';
import { saleRevenue, saleProfit } from '../lib/docs';

async function removeLinkedTxns(sourceId: string) {
  const txns = await db.all<Txn>('transactions');
  for (const t of txns) {
    if (t.sourceId === sourceId) await db.remove('transactions', t.id);
  }
}

export default function SalesPage() {
  const { data } = useLive(
    async () => ({
      sales: await db.all<Sale>('sales'),
      products: await db.all<Product>('products'),
      customers: await db.all<Customer>('customers'),
    }),
    [],
  );
  const sales = useMemo(
    () => [...(data?.sales || [])].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)),
    [data],
  );
  const products = useMemo(
    () => [...(data?.products || [])].sort((a, b) => a.name.localeCompare(b.name)),
    [data],
  );
  const customers = data?.customers || [];

  const [open, setOpen] = useState(false);
  const [productId, setProductId] = useState('');
  const [qty, setQty] = useState('1');
  const [customerId, setCustomerId] = useState('');
  const [date, setDate] = useState(todayISO());
  const [method, setMethod] = useState(PAYMENT_METHODS[0]);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [del, setDel] = useState<Sale | null>(null);

  const product = products.find((p) => p.id === productId);
  const qtyNum = Math.floor(toNum(qty));
  const revenue = product ? qtyNum * product.price : 0;

  const reset = () => {
    setProductId(''); setQty('1'); setCustomerId(''); setDate(todayISO());
    setMethod(PAYMENT_METHODS[0]); setNote(''); setError('');
  };

  const save = async () => {
    if (!product) { setError('Please select a product.'); return; }
    if (!(qtyNum > 0)) { setError('Quantity must be at least 1.'); return; }
    if (qtyNum > product.qty) {
      setError(`Only ${fmtInt(product.qty)} of "${product.name}" in stock. Reduce quantity or add stock in Products.`);
      return;
    }
    if (!date) { setError('Please pick a date.'); return; }
    setSaving(true);
    try {
      const sale: Sale = {
        id: uid('sale_'),
        productId: product.id,
        productName: product.name,
        qty: qtyNum,
        price: product.price,
        cost: product.cost,
        date,
        customerId: customerId || undefined,
        note: note.trim(),
      };
      await db.add('sales', sale);
      await db.put('products', { ...product, qty: product.qty - qtyNum });
      const custName = customers.find((c) => c.id === customerId)?.name;
      await addTransaction({
        type: 'income', amount: qtyNum * product.price, category: 'Business', date, method,
        note: `Sale — ${product.name} × ${qtyNum}${custName ? ` (${custName})` : ''}`,
        source: 'business:sale', sourceId: sale.id,
      });
      await addTransaction({
        type: 'expense', amount: qtyNum * product.cost, category: 'Business', date, method,
        note: `Cost of goods — ${product.name} × ${qtyNum}`,
        source: 'business:cogs', sourceId: sale.id,
      });
      toast.success(`Sale recorded: ${fmtMoney(qtyNum * product.price)}`);
      setOpen(false);
      reset();
    } catch (e) {
      setError('Could not record the sale. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!del) return;
    if (del.productId) {
      const p = await db.get<Product>('products', del.productId);
      if (p) await db.put('products', { ...p, qty: p.qty + del.qty });
    }
    await removeLinkedTxns(del.id);
    await db.remove('sales', del.id);
    toast.success('Sale deleted. Stock restored and linked entries removed.');
    setDel(null);
  };

  const totalRevenue = sales.reduce((s, x) => s + saleRevenue(x.qty, x.price), 0);

  return (
    <Page
      title="Record Sale"
      subtitle={sales.length ? `${sales.length} sale${sales.length === 1 ? '' : 's'} · ${fmtMoney(totalRevenue)} revenue` : 'Sell a product in one step'}
      actions={<Btn variant="primary" icon={<DynIcon name="Plus" size={16} />} onClick={() => { reset(); setOpen(true); }} disabled={products.length === 0}>New sale</Btn>}
    >
      {products.length === 0 && (
        <EmptyState
          icon={<DynIcon name="ShoppingCart" size={30} />}
          title="Add products first"
          text="You need at least one product with stock before you can record a sale."
          action={<Link to="/business/products" className="btn btn-primary">Go to Products</Link>}
        />
      )}

      {products.length > 0 && sales.length === 0 && (
        <EmptyState
          icon={<DynIcon name="ShoppingCart" size={30} />}
          title="No sales yet"
          text="Record a sale: stock drops automatically and revenue + cost are posted to your finance records."
          action={<Btn variant="primary" onClick={() => { reset(); setOpen(true); }}>Record first sale</Btn>}
        />
      )}

      {sales.length > 0 && (
        <Card>
          <div className="biz-list">
            {sales.map((s) => (
              <div className="biz-row" key={s.id}>
                <div className="biz-row-main">
                  <strong>{s.productName}</strong>
                  <small>{fmtDate(s.date)} · {fmtInt(s.qty)} × {fmtMoney(s.price)}{s.note ? ` · ${s.note}` : ''}</small>
                </div>
                <div className="biz-row-side">
                  <div style={{ textAlign: 'right' }}>
                    <strong className="num">{fmtMoney(saleRevenue(s.qty, s.price))}</strong>
                    <div><Badge tone={saleProfit(s.qty, s.price, s.cost) >= 0 ? 'green' : 'red'}>Profit {fmtMoney(saleProfit(s.qty, s.price, s.cost))}</Badge></div>
                  </div>
                  <IconBtn label={`Delete sale of ${s.productName}`} onClick={() => setDel(s)}><DynIcon name="Trash2" size={16} /></IconBtn>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Record sale"
        actions={<><Btn variant="ghost" onClick={() => setOpen(false)}>Cancel</Btn><Btn variant="primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Record sale'}</Btn></>}>
        {error && <div className="biz-errors" role="alert">{error}</div>}
        <Field label="Product" required>
          <Select value={productId} onChange={(e) => setProductId(e.target.value)}>
            <option value="">Select product…</option>
            {products.map((p) => (
              <option key={p.id} value={p.id} disabled={p.qty <= 0}>
                {p.name} — {fmtMoney(p.price)} ({fmtInt(p.qty)} in stock){p.qty <= 0 ? ' — out of stock' : ''}
              </option>
            ))}
          </Select>
        </Field>
        <div className="biz-form-2">
          <Field label="Quantity" required hint={product ? `${fmtInt(product.qty)} available` : undefined}>
            <NumberInput value={qty} min={1} step={1} onChange={(e) => setQty(e.target.value)} />
          </Field>
          <Field label="Date" required>
            <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Customer (optional)">
            <Select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">Walk-in</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="Payment method">
            <Select value={method} onChange={(e) => setMethod(e.target.value)}>
              {PAYMENT_METHODS.map((mm) => <option key={mm} value={mm}>{mm}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="Note"><TextInput value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note" /></Field>
        {product && qtyNum > 0 && (
          <div className="biz-totals">
            <div><span>{fmtInt(qtyNum)} × {fmtMoney(product.price)}</span><span>{fmtMoney(revenue)}</span></div>
            <div className="grand"><span>Total revenue</span><span>{fmtMoney(revenue)}</span></div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!del}
        title="Delete sale?"
        message={`Delete this sale of "${del?.productName}"? Stock will be restored and its finance entries removed.`}
        onConfirm={remove}
        onCancel={() => setDel(null)}
      />
    </Page>
  );
}
