/* Document math + numbering helpers for invoices / quotations / receipts. */
import type { DocItem } from './types';
import { toNum } from '../../../lib/format';

export function lineTotal(it: DocItem): number {
  const qty = toNum(it.qty);
  const rate = toNum(it.rate);
  const disc = Math.min(100, Math.max(0, toNum(it.discount)));
  return qty * rate * (1 - disc / 100);
}

export function docSubtotal(items: DocItem[]): number {
  return items.reduce((s, it) => s + lineTotal(it), 0);
}

export function docTax(subtotal: number, taxRate: number): number {
  return subtotal * (Math.max(0, toNum(taxRate)) / 100);
}

export function docGrandTotal(items: DocItem[], taxRate: number): number {
  const sub = docSubtotal(items);
  return sub + docTax(sub, taxRate);
}

/** Next sequential document number, e.g. INV-0001, from existing numbers. */
export function nextNumber(prefix: string, existing: string[]): string {
  let max = 0;
  for (const n of existing) {
    const m = /(\d+)\s*$/.exec(n || '');
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `${prefix}-${String(max + 1).padStart(4, '0')}`;
}

export function saleRevenue(qty: number, price: number): number {
  return toNum(qty) * toNum(price);
}

export function saleProfit(qty: number, price: number, cost: number): number {
  return toNum(qty) * (toNum(price) - toNum(cost));
}

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen',
];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function wordsUnder1000(n: number): string {
  let out = '';
  if (n >= 100) {
    out += ONES[Math.floor(n / 100)] + ' Hundred';
    n %= 100;
    if (n) out += ' ';
  }
  if (n >= 20) {
    out += TENS[Math.floor(n / 10)];
    n %= 10;
    if (n) out += ' ' + ONES[n];
  } else if (n > 0) {
    out += ONES[n];
  }
  return out;
}

/** Amount in words (Pakistani numbering: thousand / lakh / crore). */
export function amountInWords(amount: number): string {
  const n = Math.round(Math.max(0, toNum(amount)));
  if (n === 0) return 'Zero';
  const parts: string[] = [];
  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const rest = n % 1000;
  if (crore) parts.push(wordsUnder1000(crore) + ' Crore');
  if (lakh) parts.push(wordsUnder1000(lakh) + ' Lakh');
  if (thousand) parts.push(wordsUnder1000(thousand) + ' Thousand');
  if (rest) parts.push(wordsUnder1000(rest));
  return parts.join(' ');
}

export function downloadCsv(filename: string, rows: (string | number)[][]): void {
  const csv = rows
    .map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\r\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
