/* Formatting helpers — currency, numbers, dates. Never emit NaN/undefined. */
import { prefs } from './prefs';

export function toNum(v: unknown, fallback = 0): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = parseFloat(v.replace(/,/g, '').trim());
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}

/** Parse user-entered amount; returns null when invalid so callers can show a friendly error. */
export function parseAmount(v: string): number | null {
  if (v == null) return null;
  const n = parseFloat(String(v).replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : null;
}

export function fmtNum(n: unknown, digits = 2): string {
  const v = toNum(n);
  return v.toLocaleString(prefs.numberFormat === 'en-US' ? 'en-US' : 'en-PK', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function fmtInt(n: unknown): string {
  return fmtNum(n, 0);
}

export function fmtMoney(n: unknown, digits = 0): string {
  const v = toNum(n);
  const abs = Math.abs(v);
  const formatted =
    abs >= 10000000
      ? `${fmtNum(v / 10000000, 2)} Cr`
      : abs >= 100000
        ? `${fmtNum(v / 100000, 2)} L`
        : fmtNum(v, digits);
  return `${prefs.currency} ${formatted}`;
}

export function fmtMoneyFull(n: unknown, digits = 0): string {
  return `${prefs.currency} ${fmtNum(n, digits)}`;
}

export function fmtPct(n: unknown, digits = 1): string {
  return `${fmtNum(n, digits)}%`;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Accepts 'YYYY-MM-DD' or a Date. Returns '' for invalid input. */
export function fmtDate(input: string | Date | undefined | null): string {
  if (!input) return '';
  const d = typeof input === 'string' ? parseISODate(input) : input;
  if (!d || Number.isNaN(d.getTime())) return '';
  const dd = pad(d.getDate());
  const mm = pad(d.getMonth() + 1);
  const yyyy = d.getFullYear();
  switch (prefs.dateFormat) {
    case 'MM/DD/YYYY':
      return `${mm}/${dd}/${yyyy}`;
    case 'YYYY-MM-DD':
      return `${yyyy}-${mm}-${dd}`;
    default:
      return `${dd}/${mm}/${yyyy}`;
  }
}

export function fmtDateLong(input: string | Date | undefined | null): string {
  if (!input) return '';
  const d = typeof input === 'string' ? parseISODate(input) : input;
  if (!d || Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-PK', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export function fmtTime(hm: string | undefined | null): string {
  if (!hm) return '';
  const m = /^(\d{1,2}):(\d{2})/.exec(hm);
  if (!m) return hm;
  let h = parseInt(m[1], 10);
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m[2]} ${ap}`;
}

export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function nowISO(): string {
  return new Date().toISOString();
}

export function parseISODate(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || '');
  if (!m) return null;
  const d = new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function addDaysISO(iso: string, days: number): string {
  const d = parseISODate(iso) || new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Whole days from today until iso date (negative if past). */
export function daysUntil(iso: string | undefined | null): number | null {
  const d = parseISODate(iso || '');
  if (!d) return null;
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - t.getTime()) / 86400000);
}

export function monthKey(iso: string): string {
  return (iso || '').slice(0, 7); // YYYY-MM
}

export function monthLabel(key: string): string {
  const m = /^(\d{4})-(\d{2})/.exec(key);
  if (!m) return key;
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${names[parseInt(m[2], 10) - 1]} ${m[1]}`;
}

export function timeAgo(iso: string | undefined | null): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const s = Math.floor((Date.now() - then) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  const d = Math.floor(s / 86400);
  if (d === 1) return 'yesterday';
  if (d < 30) return `${d}d ago`;
  return fmtDate(iso.slice(0, 10));
}

export function escapeHtml(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
