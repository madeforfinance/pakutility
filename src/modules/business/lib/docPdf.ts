/* Client-side PDF export for invoices, quotations and receipts (jsPDF, bundled). */
import { createPdf, pdfKV, pdfTable, pdfTotal, pdfText } from '../../../lib/pdf';
import { fmtDate, fmtMoney } from '../../../lib/format';
import { docSubtotal, docTax, docGrandTotal, lineTotal, amountInWords } from './docs';
import type { Invoice, Quotation, ReceiptDoc } from './types';

function itemRows(items: { desc: string; qty: number; rate: number; discount: number }[]): string[][] {
  return items.map((it) => [
    it.desc || '—',
    String(it.qty),
    fmtMoney(it.rate),
    `${it.discount || 0}%`,
    fmtMoney(lineTotal(it)),
  ]);
}

function totalsBlock(p: Parameters<Parameters<typeof createPdf>[2]>[0], sub: number, taxRate: number, tax: number, grand: number) {
  pdfText(p, `Subtotal:  ${fmtMoney(sub)}`);
  pdfText(p, `Tax (${taxRate || 0}%):  ${fmtMoney(tax)}`);
  pdfTotal(p, 'Grand Total', fmtMoney(grand));
}

export async function invoicePdf(inv: Invoice): Promise<void> {
  const sub = docSubtotal(inv.items);
  const tax = docTax(sub, inv.taxRate);
  await createPdf(`${inv.number}.pdf`, `Invoice ${inv.number}`, (p) => {
    pdfKV(p, 'Invoice No.', inv.number);
    pdfKV(p, 'Customer', inv.customerName || '—');
    pdfKV(p, 'Date', fmtDate(inv.date));
    pdfKV(p, 'Due Date', fmtDate(inv.dueDate));
    pdfKV(p, 'Status', inv.status.toUpperCase());
    pdfText(p, '');
    pdfTable(
      p,
      ['Description', 'Qty', 'Rate', 'Disc %', 'Amount'],
      itemRows(inv.items),
      [0.42, 0.1, 0.18, 0.12, 0.18],
      { alignRight: [1, 2, 3, 4] },
    );
    totalsBlock(p, sub, inv.taxRate, tax, sub + tax);
    if (inv.notes) pdfText(p, `Notes: ${inv.notes}`);
  });
}

export async function quotationPdf(q: Quotation): Promise<void> {
  const sub = docSubtotal(q.items);
  const tax = docTax(sub, q.taxRate);
  await createPdf(`${q.number}.pdf`, `Quotation ${q.number}`, (p) => {
    pdfKV(p, 'Quotation No.', q.number);
    pdfKV(p, 'Customer', q.customerName || '—');
    pdfKV(p, 'Date', fmtDate(q.date));
    pdfKV(p, 'Valid Until', fmtDate(q.validUntil));
    pdfKV(p, 'Status', q.status.toUpperCase());
    pdfText(p, '');
    pdfTable(
      p,
      ['Description', 'Qty', 'Rate', 'Disc %', 'Amount'],
      itemRows(q.items),
      [0.42, 0.1, 0.18, 0.12, 0.18],
      { alignRight: [1, 2, 3, 4] },
    );
    totalsBlock(p, sub, q.taxRate, tax, sub + tax);
    if (q.notes) pdfText(p, `Notes: ${q.notes}`);
  });
}

export async function receiptPdf(r: ReceiptDoc): Promise<void> {
  await createPdf(`${r.number}.pdf`, `Receipt ${r.number}`, (p) => {
    pdfKV(p, 'Receipt No.', r.number);
    pdfKV(p, 'Received From', r.customerName || '—');
    pdfKV(p, 'Date', fmtDate(r.date));
    pdfKV(p, 'Payment Method', r.method);
    pdfText(p, '');
    pdfTable(
      p,
      ['Description', 'Amount'],
      [[r.description || 'Payment received', fmtMoney(r.amount)]],
      [0.7, 0.3],
      { alignRight: [1] },
    );
    pdfTotal(p, 'Amount Received', fmtMoney(r.amount));
    pdfText(p, `In words: ${amountInWords(r.amount)} Rupees Only`);
  });
}
