/* Shared HTML preview for invoices, quotations and receipts.
   Used for on-screen preview AND printing (print CSS isolates this block). */
import React from 'react';
import { prefs } from '../../../lib/prefs';
import { fmtDate, fmtMoney } from '../../../lib/format';
import { docSubtotal, docTax, docGrandTotal, lineTotal, amountInWords } from '../lib/docs';
import type { Invoice, Quotation, ReceiptDoc } from '../lib/types';

type Kind = 'invoice' | 'quotation' | 'receipt';

const KIND_TITLE: Record<Kind, string> = {
  invoice: 'INVOICE',
  quotation: 'QUOTATION',
  receipt: 'RECEIPT',
};

const STATUS_TONE: Record<string, string> = {
  paid: '#12805c',
  accepted: '#12805c',
  sent: '#175cd3',
  draft: '#667085',
};

const PRINT_CSS = [
  '@media print {',
  '  body * { visibility: hidden !important; }',
  '  .pu-doc-print, .pu-doc-print * { visibility: visible !important; }',
  '  .pu-doc-print { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; margin: 0 !important; }',
  '}',
].join('\n');

export function DocPreview({ kind, doc }: { kind: Kind; doc: Invoice | Quotation | ReceiptDoc }) {
  const b = prefs;
  const title = KIND_TITLE[kind];
  const customerName = doc.customerName || '—';
  const isReceipt = kind === 'receipt';
  const r = doc as ReceiptDoc;
  const iq = doc as Invoice | Quotation;
  const sub = isReceipt ? 0 : docSubtotal(iq.items);
  const tax = isReceipt ? 0 : docTax(sub, iq.taxRate);
  const total = isReceipt ? r.amount : docGrandTotal(iq.items, iq.taxRate);
  const status = (doc as { status?: string }).status;
  const secondDateLabel = kind === 'invoice' ? 'Due Date' : kind === 'quotation' ? 'Valid Until' : 'Payment Method';
  const secondDateValue = kind === 'invoice'
    ? fmtDate((iq as Invoice).dueDate)
    : kind === 'quotation'
      ? fmtDate((iq as Quotation).validUntil)
      : r.method;

  return (
    <div>
      <style>{PRINT_CSS}</style>
      <div className="pu-doc-print" style={styles.sheet}>
        <div style={styles.header}>
          <div>
            <div style={styles.brand}>{b.businessName || 'PakUtility Business'}</div>
            <div style={styles.brandSub}>
              {[b.businessAddress, [b.businessPhone, b.businessEmail].filter(Boolean).join('  |  ')]
                .filter(Boolean)
                .join('  |  ')}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={styles.docTitle}>{title}</div>
            <div style={styles.docNumber}>{doc.number}</div>
            {status && (
              <span style={{ ...styles.status, color: STATUS_TONE[status] || '#667085', borderColor: STATUS_TONE[status] || '#667085' }}>
                {status.toUpperCase()}
              </span>
            )}
          </div>
        </div>

        <div style={styles.metaGrid}>
          <div>
            <div style={styles.metaLabel}>Billed To</div>
            <div style={styles.metaValue}>{customerName}</div>
          </div>
          <div>
            <div style={styles.metaLabel}>Date</div>
            <div style={styles.metaValue}>{fmtDate(doc.date)}</div>
          </div>
          <div>
            <div style={styles.metaLabel}>{secondDateLabel}</div>
            <div style={styles.metaValue}>{secondDateValue}</div>
          </div>
        </div>

        {!isReceipt && (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={{ ...styles.th, textAlign: 'left' }}>Description</th>
                <th style={styles.th}>Qty</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Rate</th>
                <th style={styles.th}>Disc %</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {iq.items.map((it, i) => (
                <tr key={i}>
                  <td style={styles.td}>{it.desc || '—'}</td>
                  <td style={{ ...styles.td, textAlign: 'center' }}>{it.qty}</td>
                  <td style={{ ...styles.td, textAlign: 'right' }}>{fmtMoney(it.rate)}</td>
                  <td style={{ ...styles.td, textAlign: 'center' }}>{it.discount || 0}%</td>
                  <td style={{ ...styles.td, textAlign: 'right' }}>{fmtMoney(lineTotal(it))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {isReceipt && (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={{ ...styles.th, textAlign: 'left' }}>Description</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={styles.td}>{r.description || 'Payment received'}</td>
                <td style={{ ...styles.td, textAlign: 'right' }}>{fmtMoney(r.amount)}</td>
              </tr>
            </tbody>
          </table>
        )}

        <div style={styles.totals}>
          {!isReceipt && (
            <div style={{ width: 260 }}>
              <div style={styles.totalRow}><span>Subtotal</span><span>{fmtMoney(sub)}</span></div>
              <div style={styles.totalRow}><span>Tax ({iq.taxRate || 0}%)</span><span>{fmtMoney(tax)}</span></div>
            </div>
          )}
          <div style={styles.grandRow}>
            <span>{isReceipt ? 'Amount Received' : 'Grand Total'}</span>
            <span>{fmtMoney(total)}</span>
          </div>
          {isReceipt && <div style={styles.words}>In words: {amountInWords(r.amount)} Rupees Only</div>}
        </div>

        {!isReceipt && iq.notes && (
          <div style={styles.notes}>
            <div style={styles.metaLabel}>Notes</div>
            <div style={{ whiteSpace: 'pre-wrap', marginTop: 4 }}>{iq.notes}</div>
          </div>
        )}

        <div style={styles.footer}>Generated with PakUtility &middot; Developed by ASNA Consultancy</div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  sheet: { background: '#fff', color: '#172033', borderRadius: 12, overflow: 'hidden', border: '1px solid #e4e9f2' },
  header: { background: '#0B1F3A', color: '#fff', padding: '22px 26px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 },
  brand: { fontSize: 19, fontWeight: 800, letterSpacing: 0.2 },
  brandSub: { fontSize: 11.5, color: '#c8d2e4', marginTop: 6, lineHeight: 1.5 },
  docTitle: { fontSize: 12, letterSpacing: 3, color: '#D4AF37', fontWeight: 700 },
  docNumber: { fontSize: 20, fontWeight: 800, marginTop: 4 },
  status: { display: 'inline-block', marginTop: 8, fontSize: 10.5, fontWeight: 700, border: '1.5px solid', borderRadius: 20, padding: '2px 10px', background: '#fff' },
  metaGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 14, padding: '18px 26px', borderBottom: '1px solid #eef1f6' },
  metaLabel: { fontSize: 10.5, textTransform: 'uppercase', letterSpacing: 1, color: '#667085', fontWeight: 700 },
  metaValue: { fontSize: 14, fontWeight: 600, marginTop: 4 },
  table: { width: '100%', borderCollapse: 'collapse', marginTop: 6 },
  th: { background: '#F6F8FB', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6, color: '#667085', padding: '10px 14px', borderBottom: '1px solid #e4e9f2', textAlign: 'center' },
  td: { fontSize: 13.5, padding: '10px 14px', borderBottom: '1px solid #f0f3f8' },
  totals: { padding: '16px 26px', display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' },
  totalRow: { display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: 13.5, color: '#3d4a63', padding: '2px 0' },
  grandRow: { display: 'flex', justifyContent: 'space-between', width: 260, fontSize: 16, fontWeight: 800, color: '#0B1F3A', borderTop: '2px solid #0B1F3A', paddingTop: 8, marginTop: 4 },
  words: { fontSize: 12, color: '#667085', fontStyle: 'italic', alignSelf: 'flex-start', marginTop: 4 },
  notes: { padding: '0 26px 8px', fontSize: 13, color: '#3d4a63' },
  footer: { marginTop: 18, padding: '12px 26px', background: '#F6F8FB', fontSize: 11, color: '#667085', textAlign: 'center' },
};
