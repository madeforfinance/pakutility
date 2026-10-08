/* Timestamp-based timer helpers — survive re-renders, cleaned up on unmount. */
import { useEffect, useState } from 'react';

/** Re-renders the component every `ms` with the current timestamp. */
export function useNow(ms = 250): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), ms);
    return () => window.clearInterval(id);
  }, [ms]);
  return now;
}

const p2 = (n: number) => String(n).padStart(2, '0');

/** mm:ss or hh:mm:ss for stopwatch-style displays. */
export function fmtDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${p2(h)}:${p2(m)}:${p2(s)}` : `${p2(m)}:${p2(s)}`;
}

/** Split milliseconds into days + hh:mm:ss parts for countdowns. */
export function fmtCountdown(ms: number): { d: number; h: string; m: string; s: string } {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    d: Math.floor(total / 86400),
    h: p2(Math.floor((total % 86400) / 3600)),
    m: p2(Math.floor((total % 3600) / 60)),
    s: p2(total % 60),
  };
}

/** 'HH:MM' → minutes since midnight, or null when invalid. */
export function hmToMin(s: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** minutes → '7h 30m' */
export function minToHM(mins: number): string {
  const m = Math.max(0, Math.round(mins));
  const h = Math.floor(m / 60);
  const r = m % 60;
  return h > 0 ? `${h}h ${r}m` : `${r}m`;
}
